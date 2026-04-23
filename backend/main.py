from __future__ import annotations

from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="OpenLibrary Lite")

OL_SEARCH = "https://openlibrary.org/search.json"


@app.get("/api/search")
async def search(
    q: str = "",
    page: int = 1,
    limit: int = 20,
    language: Optional[str] = None,
    subjects: Optional[list[str]] = Query(default=None),
    author: Optional[str] = None,
    ebook_access: Optional[str] = None,
):
    # Combine structured fields into the Solr query string
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
    if language:
        params["language"] = language
    if ebook_access:
        params["ebook_access"] = ebook_access

    async with httpx.AsyncClient() as client:
        resp = await client.get(OL_SEARCH, params=params, timeout=15.0)
        resp.raise_for_status()
    return resp.json()


# Serve the built SPA — only present after `make build` or inside Docker
_static = Path(__file__).parent / "static"
if _static.exists():
    app.mount("/", StaticFiles(directory=str(_static), html=True), name="spa")
