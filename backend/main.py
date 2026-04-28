from __future__ import annotations

from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="OpenLibrary Lite")

OL_BASE = "https://openlibrary.org"


@app.get("/api/search")
async def search(
    q: str = "",
    page: int = 1,
    limit: int = 20,
    sort: Optional[str] = None,
    # multi-value params — each repeated key is OR'd on the backend
    language: Optional[list[str]] = Query(default=None),
    genres:   Optional[list[str]] = Query(default=None),
    author:   Optional[list[str]] = Query(default=None),
    subjects: Optional[list[str]] = Query(default=None),
    availability: Optional[str] = None,
    fiction_filter: Optional[str] = Query(default=None, alias="fictionFilter"),
):
    q_parts: list[str] = []
    if q:
        q_parts.append(q)

    # OR multiple authors inside a group
    if author:
        if len(author) == 1:
            q_parts.append(f'author:"{author[0]}"')
        else:
            q_parts.append("(" + " OR ".join(f'author:"{a}"' for a in author) + ")")

    # AND multiple genres — each must match (subject:"a" AND subject:"b")
    if genres:
        for genre in genres:
            q_parts.append(f'subject:"{genre}"')

    # Subjects are OR'd
    if subjects:
        if len(subjects) == 1:
            q_parts.append(f'subject:"{subjects[0]}"')
        else:
            q_parts.append("(" + " OR ".join(f'subject:"{s}"' for s in subjects) + ")")

    # Fiction/Nonfiction pinned filter
    if fiction_filter in ("fiction", "nonfiction"):
        q_parts.append(f'subject:"{fiction_filter}"')

    params: dict = {
        "q": " ".join(q_parts),  # may be empty; fallback added after filters are resolved
        "page": page,
        "limit": limit,
        # 'editions' (bare keyword) triggers OL's Solr block-join inner-hits;
        # the edition sub-docs automatically inherit the work-level fields requested above.
        "fields": (
            "key,title,author_name,cover_i,first_publish_year,"
            "ratings_average,ratings_count,ebook_access,subject,series,"
            "editions"
        ),
    }

    if sort:
        params["sort"] = sort

    # Languages: pass multiple language params to OL (they are OR'd there)
    # httpx handles list values as repeated params automatically
    lang_list = language or []

    # Availability: the 'ebook_access' URL param (not embedded in q) is what triggers
    # OL's Solr block-join inner-hits so editions.docs gets populated in the response.
    # 'readable' includes both IA lending (borrowable) and openly readable (public) books.
    # We add an explicit OR to q_parts so both tiers appear in results, and keep the
    # ebook_access param (set to borrowable) to trigger block-join inner-hits.
    if availability == "readable":
        q_parts.append('(ebook_access:[borrowable TO public])')
        params["q"] = " ".join(q_parts)  # refresh after appending ebook_access filter
        params["ebook_access"] = "borrowable"  # trigger block-join inner-hits
    elif availability == "open":
        params["ebook_access"] = "public"  # OL enum: 'public', not 'open'
    elif availability in ("borrowable", "printdisabled"):
        params["ebook_access"] = availability

    # OL's Solr rejects empty q and q=* — for filter-only browsing, embed the most
    # specific active constraint into q so the query is valid and returns results.
    if not params["q"]:
        if lang_list:
            if len(lang_list) == 1:
                params["q"] = f"language:{lang_list[0]}"
            else:
                params["q"] = "(" + " OR ".join(f"language:{l}" for l in lang_list) + ")"
        elif "ebook_access" in params:
            params["q"] = f"ebook_access:{params['ebook_access']}"
        else:
            params["q"] = "_exists_:key"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OL_BASE}/search.json",
            params={**params, **{f"language": lang_list}} if lang_list else params,
            timeout=15.0,
        )
        resp.raise_for_status()
    return resp.json()


@app.get("/api/authors/search")
async def author_search(q: str = "", limit: int = 10):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OL_BASE}/search/authors.json",
            params={"q": q, "limit": limit},
            timeout=10.0,
        )
        resp.raise_for_status()
    return resp.json()


@app.get("/api/subjects/search")
async def subject_search(q: str = "", limit: int = 10):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OL_BASE}/search/subjects.json",
            params={"q": q, "limit": limit},
            timeout=10.0,
        )
        resp.raise_for_status()
    return resp.json()


@app.get("/api/search/facets")
async def search_facets(q: str = "", rows: int = 30, limit: int = 25):
    """Aggregate subject_facet and author_facet from OL search results for a query."""
    if not q.strip():
        return {"authors": [], "subjects": []}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OL_BASE}/search.json",
            params={"q": q, "fields": "subject_facet,author_facet", "rows": rows},
            timeout=10.0,
        )
        resp.raise_for_status()

    docs = resp.json().get("docs", [])
    subj_counts: dict[str, int] = {}
    auth_index: dict[str, dict] = {}

    for doc in docs:
        for s in doc.get("subject_facet", []):
            subj_counts[s] = subj_counts.get(s, 0) + 1
        for a in doc.get("author_facet", []):
            parts = a.split(" ", 1)
            if len(parts) == 2:
                key, name = parts
                if name not in auth_index:
                    auth_index[name] = {"name": name, "key": key, "count": 0}
                auth_index[name]["count"] += 1

    subjects = sorted(
        [{"name": k, "count": v} for k, v in subj_counts.items()],
        key=lambda x: -x["count"],
    )[:limit]

    authors = sorted(auth_index.values(), key=lambda x: -x["count"])[:12]

    return {"authors": list(authors), "subjects": subjects}


_static = Path(__file__).parent / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="spa")
