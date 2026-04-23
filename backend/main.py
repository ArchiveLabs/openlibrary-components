from __future__ import annotations

import json
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

    # OR multiple genres (mapped to OL subject field)
    if genres:
        if len(genres) == 1:
            q_parts.append(f'subject:"{genres[0]}"')
        else:
            q_parts.append("(" + " OR ".join(f'subject:"{g}"' for g in genres) + ")")

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
        "q": " ".join(q_parts) or "*",
        "page": page,
        "limit": limit,
        "fields": (
            "key,title,author_name,cover_i,first_publish_year,"
            "ratings_average,ratings_count,ebook_access,subject,"
            "editions.key,editions.title,editions.language,"
            "editions.ebook_access,editions.cover_i"
        ),
    }

    if sort:
        params["sort"] = sort

    # Languages: pass multiple language params to OL (they are OR'd there)
    # httpx handles list values as repeated params automatically
    lang_list = language or []

    # Availability maps to OL ebook_access / has_fulltext
    if availability == "readable":
        # OL ebook_access is a numeric enum: no_ebook=0, printdisabled=1, borrowable=2, public=3
        # Range [borrowable TO public] = [2,3], correctly excludes printdisabled
        q_parts.append("ebook_access:[borrowable TO public]")
        params["q"] = " ".join(q_parts) or "*"
    elif availability in ("open", "borrowable", "printdisabled"):
        params["ebook_access"] = availability

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
async def search_facets(q: str = ""):
    data = json.dumps({
        "param": {"q": q},
        "path": "/search",
        "query": f"?q={q}&mode=everything",
    })
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{OL_BASE}/partials/SearchFacets.json",
            params={"data": data},
            timeout=10.0,
        )
        resp.raise_for_status()
    return resp.json()


_static = Path(__file__).parent / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="spa")
