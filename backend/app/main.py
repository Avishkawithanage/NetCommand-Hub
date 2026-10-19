"""NetCommand Hub API (Phase 1: command library + configuration generator, no device access)."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import date
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import config
from .diffing import diff_text
from .engine import ValidationFailed, check_personal_body, render
from .loader import Store, load_store
from .schemas import (
    DiffRequest,
    DiffResponse,
    GenerateRequest,
    GenerateResponse,
    PersonalGenerateRequest,
    PersonalTemplate,
    PersonalValidateResponse,
    SearchResponse,
    Template,
)
from .search import SORTS, Filters, search, summarize

log = logging.getLogger("netcommand")


def error_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details}}


def get_store(request: Request) -> Store:
    return request.app.state.store


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.store = load_store(config.DATA_DIR)  # raises ContentError => refuse to start
    log.info("Loaded %d templates", len(app.state.store.templates))
    yield


class BodyLimitMiddleware:
    """Reject request bodies over MAX_BODY_BYTES (declared or streamed)."""

    def __init__(self, app, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers") or [])
        declared = headers.get(b"content-length")
        too_big = JSONResponse(error_body("payload_too_large", "Request body too large"), status_code=413)
        if declared and declared.isdigit() and int(declared) > self.max_bytes:
            return await too_big(scope, receive, send)
        seen = 0

        async def limited_receive():
            nonlocal seen
            msg = await receive()
            if msg["type"] == "http.request":
                seen += len(msg.get("body", b""))
                if seen > self.max_bytes:
                    raise HTTPException(status_code=413, detail="Request body too large")
            return msg

        return await self.app(scope, limited_receive, send)


def create_app() -> FastAPI:
    app = FastAPI(
        title="NetCommand Hub API",
        version="1.0.0",
        description="Multi-vendor network command reference and configuration generator. "
        "Generates text only - never connects to or changes a device.",
        lifespan=lifespan,
    )
    app.add_middleware(BodyLimitMiddleware, max_bytes=config.MAX_BODY_BYTES)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.CORS_ORIGINS,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        resp = await call_next(request)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        if not request.url.path.startswith(("/api", "/docs", "/redoc", "/openapi")):
            resp.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; "
                "connect-src 'self'; frame-ancestors 'none'",
            )
        return resp

    # ------------------------------------------------------------------ error handling
    @app.exception_handler(StarletteHTTPException)
    async def http_exc(_: Request, exc: StarletteHTTPException):
        code = {404: "not_found", 405: "method_not_allowed", 413: "payload_too_large"}.get(exc.status_code, "http_error")
        return JSONResponse(error_body(code, str(exc.detail)), status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def req_validation(_: Request, exc: RequestValidationError):
        details = [
            {"field": ".".join(str(p) for p in e["loc"] if p != "body"), "message": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(error_body("invalid_request", "Request validation failed", details), status_code=422)

    @app.exception_handler(ValidationFailed)
    async def field_validation(_: Request, exc: ValidationFailed):
        return JSONResponse(
            error_body("validation_failed", "One or more fields are invalid", exc.errors), status_code=422
        )

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.exception("Unhandled error")  # stack trace goes to the server log only
        return JSONResponse(error_body("internal_error", "Internal server error"), status_code=500)

    # ------------------------------------------------------------------ routes
    @app.get("/api/health")
    def health(request: Request):
        return {"status": "ok", "templates": len(get_store(request).templates)}

    @app.get("/api/vendors")
    def vendors(request: Request):
        s = get_store(request)
        out = []
        for v in s.catalog.vendors:
            plats = []
            for p in s.catalog.platforms:
                if p.vendor == v.id:
                    n = sum(1 for t in s.templates.values() if t.platform == p.id)
                    plats.append({**p.model_dump(), "template_count": n})
            out.append(
                {**v.model_dump(), "platforms": plats,
                 "template_count": sum(p["template_count"] for p in plats)}
            )
        return out

    @app.get("/api/platforms")
    def platforms(request: Request, vendor: str | None = Query(None, max_length=40)):
        s = get_store(request)
        return [p for p in s.catalog.platforms if vendor is None or p.vendor == vendor]

    @app.get("/api/categories")
    def categories(request: Request):
        s = get_store(request)
        counts: dict[str, int] = {}
        for t in s.templates.values():
            counts[t.category] = counts.get(t.category, 0) + 1
        return [{**c.model_dump(), "template_count": counts.get(c.id, 0)} for c in s.catalog.categories]

    @app.get("/api/stats")
    def stats(request: Request):
        s = get_store(request)
        by_status: dict[str, int] = {}
        for t in s.templates.values():
            by_status[t.verification_status] = by_status.get(t.verification_status, 0) + 1
        recent = sorted(s.templates.values(), key=lambda t: (-t.added_at.toordinal(), t.title, t.id))[:6]
        return {
            "templates": len(s.templates),
            "vendors": len(s.catalog.vendors),
            "platforms": len(s.catalog.platforms),
            "by_status": by_status,
            "recent": [summarize(t) for t in recent],
        }

    @app.get("/api/templates", response_model=SearchResponse)
    def list_templates(
        request: Request,
        q: str = Query("", max_length=200),
        vendor: str | None = Query(None, max_length=40),
        platform: str | None = Query(None, max_length=40),
        category: str | None = Query(None, max_length=40),
        status: str | None = Query(None, max_length=20),
        difficulty: str | None = Query(None, max_length=20),
        kind: str | None = Query(None, max_length=20),
        version: str | None = Query(None, max_length=40),
        sort: str = Query("relevance", max_length=20),
        page: int = Query(1, ge=1, le=10_000),
        page_size: int = Query(20, ge=1, le=100),
        ids: str | None = Query(None, max_length=4000, description="Comma-separated template IDs"),
    ):
        if sort not in SORTS:
            raise HTTPException(422, f"sort must be one of {', '.join(SORTS)}")
        s = get_store(request)
        flt = Filters(vendor, platform, category, status, difficulty, kind, version)
        if ids:  # restrict to specific IDs (used by Favourites / Recently viewed)
            wanted = {i for i in ids.split(",") if i}
            res = search(s, q, flt, sort, 1, 10_000)
            items = [i for i in res.items if i.id in wanted]
            return SearchResponse(total=len(items), page=1, page_size=max(len(items), 1), items=items, facets=res.facets)
        return search(s, q, flt, sort, page, page_size)

    @app.get("/api/search", response_model=SearchResponse)
    def search_alias(request: Request, q: str = Query("", max_length=200), page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
        return search(get_store(request), q, Filters(), "relevance", page, page_size)

    @app.get("/api/templates/{template_id}")
    def template_detail(request: Request, template_id: str):
        s = get_store(request)
        t = s.templates.get(template_id)
        if t is None:
            raise HTTPException(404, f"Template '{template_id}' not found")
        data = t.model_dump(mode="json")
        data["related_templates"] = [summarize(s.templates[r]).model_dump(mode="json") for r in t.related if r in s.templates]
        return data

    @app.post("/api/templates/{template_id}/generate", response_model=GenerateResponse)
    def generate(request: Request, template_id: str, body: GenerateRequest):
        t = get_store(request).templates.get(template_id)
        if t is None:
            raise HTTPException(404, f"Template '{template_id}' not found")
        return render(t, body.values)

    # ------------------------------------------------------------------ personal templates
    def build_personal(s: Store, p: PersonalTemplate) -> tuple[Template, list[str]]:
        problems: dict[str, str] = {}
        platform = s.platform(p.platform)
        if not any(v.id == p.vendor for v in s.catalog.vendors):
            problems["vendor"] = "Unknown vendor"
        if platform is None or platform.vendor != p.vendor:
            problems["platform"] = "Unknown platform for this vendor"
        if not any(c.id == p.category for c in s.catalog.categories):
            problems["category"] = "Unknown category"
        try:
            warnings = check_personal_body(p.template)
        except ValueError as exc:
            problems["template"] = str(exc)
            warnings = []
        if problems:
            raise ValidationFailed(problems)
        try:
            t = Template(
                id=p.id, title=p.title, vendor=p.vendor, platform=p.platform,
                os_versions=[], compatibility_note="Personal template - compatibility not verified.",
                category=p.category, task="personal", kind="config", summary=p.summary,
                difficulty=p.difficulty, verification_status="unverified", added_at=date.today(),
                placeholders=p.placeholders, template=p.template,
                verification_commands=p.verification_commands,
                warnings=["Personal / Unverified template - not reviewed by the project.", *p.warnings],
                tags=p.tags,
            )
        except ValidationError as exc:
            raise ValidationFailed({"template": "; ".join(e["msg"] for e in exc.errors())}) from exc
        return t, warnings

    @app.post("/api/personal/validate", response_model=PersonalValidateResponse)
    def personal_validate(request: Request, body: PersonalTemplate):
        _, warnings = build_personal(get_store(request), body)
        return PersonalValidateResponse(ok=True, warnings=warnings)

    @app.post("/api/personal/generate", response_model=GenerateResponse)
    def personal_generate(request: Request, body: PersonalGenerateRequest):
        t, _ = build_personal(get_store(request), body.template)
        return render(t, body.values)

    # ------------------------------------------------------------------ diff / glossary
    @app.post("/api/diff", response_model=DiffResponse)
    def diff(body: DiffRequest):
        return diff_text(body.original, body.updated, body.ignore_trailing_whitespace, body.ignore_blank_lines)

    @app.get("/api/glossary")
    def glossary(request: Request, q: str = Query("", max_length=100)):
        ql = q.lower().strip()
        items = get_store(request).glossary
        if ql:
            items = [g for g in items if ql in g.term.lower() or ql in g.definition.lower() or any(ql in a.lower() for a in g.aka)]
        return items

    # ------------------------------------------------------------------ built frontend (optional)
    dist = config.FRONTEND_DIST
    if (dist / "index.html").exists():
        if (dist / "assets").exists():
            app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa(full_path: str):
            if full_path.startswith("api/"):
                raise HTTPException(404, "Not found")
            target = (dist / full_path).resolve()
            if full_path and target.is_file() and dist.resolve() in target.parents:
                return FileResponse(target)
            return FileResponse(dist / "index.html")

    return app


app = create_app()
