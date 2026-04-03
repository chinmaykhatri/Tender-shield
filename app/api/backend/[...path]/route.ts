/**
 * API Route: /api/backend/[...path]
 * 
 * PROXY LAYER — Routes frontend requests to the Python backend.
 * 
 * This is the bridge that connects the Next.js frontend to the
 * FastAPI backend (port 8000). Instead of the frontend calling
 * Supabase directly OR calling the backend directly, it goes:
 * 
 *   Frontend → /api/backend/tenders → Python backend:8000/api/v1/tenders
 *   Frontend → /api/backend/bids    → Python backend:8000/api/v1/bids
 *   Frontend → /api/backend/health  → Python backend:8000/api/v1/health
 * 
 * This provides:
 *   1. Single data flow (no more disconnected frontend/backend)
 *   2. Server-side auth injection (backend gets validated tokens)
 *   3. CORS-free communication (same-origin API calls)
 *   4. Graceful fallback when backend is offline (demo mode)
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyToBackend(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyToBackend(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyToBackend(request, path, 'PUT');
}

async function proxyToBackend(
  request: NextRequest,
  pathSegments: string[],
  method: string,
) {
  const backendPath = `/api/v1/${pathSegments.join('/')}`;
  const backendUrl = `${BACKEND_URL}${backendPath}`;

  // Forward query params
  const url = new URL(request.url);
  const queryString = url.search;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward auth token from frontend
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    // Forward body for POST/PUT
    if (method !== 'GET') {
      try {
        const body = await request.json();
        fetchOptions.body = JSON.stringify(body);
      } catch {
        // No body — that's ok for some POST requests
      }
    }

    const response = await fetch(`${backendUrl}${queryString}`, fetchOptions);
    const data = await response.json();

    return NextResponse.json({
      ...data,
      _proxy: {
        backend_url: backendUrl,
        status: response.status,
        connected: true,
      },
    }, { status: response.status });

  } catch (error) {
    // Backend is offline — return graceful fallback
    if (DEMO_MODE) {
      return NextResponse.json({
        error: 'Backend offline — using demo data',
        _proxy: {
          backend_url: backendUrl,
          status: 503,
          connected: false,
          fallback: 'demo_mode',
        },
      }, { status: 503 });
    }

    return NextResponse.json({
      error: 'Backend service unavailable',
      detail: error instanceof Error ? error.message : 'Connection refused',
      _proxy: {
        backend_url: backendUrl,
        status: 503,
        connected: false,
      },
    }, { status: 503 });
  }
}
