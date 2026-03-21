"""
============================================================================
TenderShield — Standardized API Response Utilities
============================================================================
Provides consistent response envelope format across all API endpoints.
Includes pagination support and error formatting.

Response Envelope:
{
    "success": true/false,
    "data": { ... },
    "error": null or { "code": "...", "message": "...", "detail": "..." },
    "meta": { "page": 1, "per_page": 20, "total": 100, "pages": 5 },
    "timestamp_ist": "2025-03-19T01:15:00+05:30"
}
============================================================================
"""

from typing import Any, Optional, Dict, List
from datetime import datetime, timezone, timedelta
from math import ceil

IST = timezone(timedelta(hours=5, minutes=30))


def success_response(
    data: Any = None,
    message: str = None,
    meta: Dict = None,
    status_code: int = 200,
) -> Dict:
    """Create a standardized success response."""
    response = {
        "success": True,
        "data": data,
        "error": None,
        "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
    }
    if message:
        response["message"] = message
    if meta:
        response["meta"] = meta
    return response


def error_response(
    code: str,
    message: str,
    detail: str = None,
    status_code: int = 400,
) -> Dict:
    """Create a standardized error response."""
    return {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "detail": detail,
        },
        "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
    }


def paginated_response(
    items: List,
    total: int,
    page: int = 1,
    per_page: int = 20,
) -> Dict:
    """Create a paginated response with meta information."""
    total_pages = ceil(total / per_page) if per_page > 0 else 1
    return success_response(
        data=items,
        meta={
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        },
    )


def paginate_list(items: List, page: int = 1, per_page: int = 20) -> Dict:
    """Paginate a Python list and return standardized response."""
    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    return paginated_response(items[start:end], total, page, per_page)
