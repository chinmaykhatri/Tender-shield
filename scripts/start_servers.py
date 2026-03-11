"""
============================================================================
TenderShield — Quick Start Script
============================================================================
Starts backend (port 8000) and AI engine (port 8001) together.

Usage:
  python scripts/start_servers.py

Then open:
  Backend API:    http://localhost:8000/docs
  AI Engine:      http://localhost:8001/docs
  Frontend:       npm run dev → http://localhost:3000
============================================================================
"""

import subprocess
import sys
import os
import time

def main():
    print("\n🛡️  TenderShield — Starting Services\n")

    # Start backend
    print("  [1/2] Starting FastAPI Backend on :8000 ...")
    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app",
         "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    )

    time.sleep(2)

    # Start AI engine
    print("  [2/2] Starting AI Engine on :8001 ...")
    ai_engine = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "ai_engine.main:app",
         "--host", "0.0.0.0", "--port", "8001", "--reload"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    )

    print("\n  ✅ Both services starting!")
    print("  📊 Backend Swagger:  http://localhost:8000/docs")
    print("  🤖 AI Engine Docs:   http://localhost:8001/docs")
    print("  🎨 Frontend:         cd frontend && npm run dev")
    print("\n  Press Ctrl+C to stop all services.\n")

    try:
        backend.wait()
    except KeyboardInterrupt:
        print("\n  🛑 Shutting down...")
        backend.terminate()
        ai_engine.terminate()
        print("  ✅ All services stopped.\n")


if __name__ == "__main__":
    main()
