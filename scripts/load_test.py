"""
============================================================================
TenderShield — Load Testing Script (Locust)
============================================================================
Run: locust -f scripts/load_test.py --host=http://localhost:8000

Simulates realistic government procurement workloads:
  - Officers browsing tenders and creating new ones
  - Bidders querying open tenders and submitting bids
  - Auditors reviewing dashboard and AI alerts
  - NIC admins monitoring system health
============================================================================
"""

import random
from locust import HttpUser, task, between, tag


class OfficerUser(HttpUser):
    """Simulates a Ministry Officer browsing and creating tenders."""
    wait_time = between(2, 8)
    weight = 3

    def on_start(self):
        """Login as officer."""
        res = self.client.post("/api/v1/auth/login", json={
            "email": "officer@morth.gov.in",
            "password": "Tender@2025",
        })
        if res.status_code == 200:
            self.token = res.json().get("access_token", "")
        else:
            self.token = ""

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    @task(5)
    @tag("dashboard")
    def view_dashboard(self):
        self.client.get("/api/v1/dashboard/stats", headers=self.headers)

    @task(3)
    @tag("tenders")
    def list_tenders(self):
        self.client.get("/api/v1/tenders/", headers=self.headers)

    @task(2)
    @tag("events")
    def view_events(self):
        self.client.get("/api/v1/dashboard/events", headers=self.headers)

    @task(1)
    @tag("tenders")
    def create_tender(self):
        self.client.post("/api/v1/tenders/", headers=self.headers, json={
            "title": f"Load Test Tender {random.randint(1000, 9999)}",
            "ministry_code": random.choice(["MoH", "MoRTH", "MoE", "MoD"]),
            "category": random.choice(["GOODS", "WORKS", "SERVICES"]),
            "estimated_value_paise": random.randint(10, 500) * 1_00_00_000 * 100,
            "description": "Load testing tender creation",
        })


class BidderUser(HttpUser):
    """Simulates a bidder browsing open tenders."""
    wait_time = between(3, 10)
    weight = 5

    def on_start(self):
        res = self.client.post("/api/v1/auth/login", json={
            "email": "medtech@medtechsolutions.com",
            "password": "Bid@2025",
        })
        if res.status_code == 200:
            self.token = res.json().get("access_token", "")
        else:
            self.token = ""

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    @task(5)
    @tag("tenders")
    def browse_tenders(self):
        self.client.get("/api/v1/tenders/?status_filter=BIDDING_OPEN", headers=self.headers)

    @task(3)
    @tag("dashboard")
    def view_dashboard(self):
        self.client.get("/api/v1/dashboard/stats", headers=self.headers)


class AuditorUser(HttpUser):
    """Simulates a CAG auditor reviewing AI alerts."""
    wait_time = between(5, 15)
    weight = 1

    def on_start(self):
        res = self.client.post("/api/v1/auth/login", json={
            "email": "auditor@cag.gov.in",
            "password": "Audit@2025",
        })
        if res.status_code == 200:
            self.token = res.json().get("access_token", "")
        else:
            self.token = ""

    @property
    def headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    @task(5)
    @tag("dashboard")
    def view_dashboard(self):
        self.client.get("/api/v1/dashboard/stats", headers=self.headers)

    @task(3)
    @tag("events")
    def view_audit_events(self):
        self.client.get("/api/v1/dashboard/events?topic=audit-events", headers=self.headers)


class HealthCheckUser(HttpUser):
    """Simulates monitoring tools hitting health endpoints."""
    wait_time = between(10, 30)
    weight = 1

    @task
    @tag("health")
    def check_health(self):
        self.client.get("/api/v1/dashboard/health")

    @task
    @tag("health")
    def check_root(self):
        self.client.get("/")
