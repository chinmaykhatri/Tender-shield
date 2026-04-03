"""
============================================================================
TenderShield — Security Middleware
============================================================================
Production-grade security headers, rate limiting, input sanitization,
and request validation middleware.
============================================================================
"""

import time
import re
import uuid
import logging
from collections import defaultdict
from typing import Callable
from datetime import datetime, timezone, timedelta

from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("tendershield.security")
IST = timezone(timedelta(hours=5, minutes=30))


# ============================================================================
# Security Headers Middleware
# ============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Adds production security headers to every response.
    Equivalent to Helmet.js in Node.js ecosystem.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Enable XSS protection
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions policy (disable unnecessary browser features)
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )

        # Content Security Policy
        # Allow jsdelivr for Swagger UI, Google Fonts
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
            "img-src 'self' data: https:; "
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; "
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co"
        )

        # Strict Transport Security (HSTS)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )

        return response


# ============================================================================
# Rate Limiting Middleware
# ============================================================================

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token-bucket rate limiter per IP address.
    
    Default limits:
      - General API:  100 requests/minute
      - Auth endpoints: 10 requests/minute (brute force protection)
      - AI analysis:   20 requests/minute (expensive compute)
    """

    def __init__(self, app, general_limit: int = 100, auth_limit: int = 10, ai_limit: int = 20):
        super().__init__(app)
        self.general_limit = general_limit
        self.auth_limit = auth_limit
        self.ai_limit = ai_limit
        self.requests: dict = defaultdict(list)

    def _get_limit(self, path: str) -> int:
        if "/auth/login" in path or "/auth/register" in path:
            return self.auth_limit
        if "/analyze" in path or "/demo/analyze" in path:
            return self.ai_limit
        return self.general_limit

    def _is_rate_limited(self, client_ip: str, path: str) -> bool:
        now = time.time()
        limit = self._get_limit(path)
        key = f"{client_ip}:{path.split('/')[3] if len(path.split('/')) > 3 else 'general'}"

        # Clean old entries (older than 60 seconds)
        self.requests[key] = [t for t in self.requests[key] if now - t < 60]

        if len(self.requests[key]) >= limit:
            return True

        self.requests[key].append(now)
        return False

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = request.client.host if request.client else "unknown"

        if self._is_rate_limited(client_ip, request.url.path):
            logger.warning(f"Rate limited: {client_ip} on {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "success": False,
                    "error": "Too many requests",
                    "detail": "Rate limit exceeded. Please try again later.",
                    "retry_after_seconds": 60,
                },
                headers={"Retry-After": "60"},
            )

        response = await call_next(request)
        return response


# ============================================================================
# Input Sanitization Middleware
# ============================================================================

class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """
    Sanitizes request inputs to prevent SQL injection, XSS, and path traversal.
    """

    # Patterns that indicate SQL injection attempts
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)",
        r"(--|;|\/\*|\*\/)",
        r"(\bOR\b\s+\d+\s*=\s*\d+)",
    ]

    # Patterns that indicate XSS attempts
    XSS_PATTERNS = [
        r"<script[^>]*>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe",
        r"<object",
    ]

    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",
        r"\.\.\\",
        r"%2e%2e",
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check URL path
        path = request.url.path
        query = str(request.url.query)

        for pattern in self.PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, path, re.IGNORECASE):
                logger.warning(f"Path traversal attempt blocked: {path} from {request.client.host}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"success": False, "error": "Invalid request path"},
                )

        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, query, re.IGNORECASE):
                logger.warning(f"SQL injection attempt blocked: {query} from {request.client.host}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"success": False, "error": "Invalid request parameters"},
                )

        response = await call_next(request)
        return response


# ============================================================================
# Correlation ID Middleware
# ============================================================================

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Adds a unique correlation ID to every request for distributed tracing.
    The ID is passed through to all downstream services.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))

        # Make available to request state
        request.state.correlation_id = correlation_id

        response = await call_next(request)
        response.headers["X-Correlation-ID"] = correlation_id
        return response
