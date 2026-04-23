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
    language: Optional[str] = None,
    subjects: Optional[list[str]] = Query(default=None),
    author: Optional[str] = None,
    ebook_access: Optional[str] = None,
):
    q_parts: list[str] = []
    if q:
        q_parts.append(q)
    if author:
        q_parts.append(f'author:"{author}"')
    for subject in subjects or []:
        q_parts.append(f'subject:"{subject}"')

    params: dict = {
        "q": " ".join(q_parts) or "*",
        "page": page,
        "limit": limit,
        "fields": "key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count,ebook_access,subject",
    }
    if sort:
        params["sort"] = sort
    if language:
        params["language"] = language
    if ebook_access:
        params["ebook_access"] = ebook_access

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{OL_BASE}/search.json", params=params, timeout=15.0)
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
