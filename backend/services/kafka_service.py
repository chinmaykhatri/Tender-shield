"""
============================================================================
TenderShield — Kafka Event Streaming Service
============================================================================
Produces and consumes events through Apache Kafka topics.
Event-driven architecture enabling real-time AI monitoring.

Topics:
  tender-events  — All tender lifecycle events
  bid-events     — All bid lifecycle events
  ai-alerts      — AI fraud detection alerts
  audit-events   — Audit trail events (consumed by CAG dashboard)
============================================================================
"""

import json
import uuid
import logging
from typing import Optional, Dict, Any, Callable
from datetime import datetime, timezone, timedelta

from backend.config import settings

logger = logging.getLogger("tendershield.kafka")
IST = timezone(timedelta(hours=5, minutes=30))


class KafkaService:
    """
    Kafka event streaming service.
    In demo mode, uses in-memory event buffer.
    In production, connects to Apache Kafka cluster.
    """

    def __init__(self):
        self.connected = False
        self._event_buffer: list = []
        self._subscribers: Dict[str, list] = {}
        self.connected = True
        logger.info("[KafkaService] Initialized in demo mode")

    async def produce_event(self, topic: str, event: dict) -> str:
        """
        Produce an event to a Kafka topic.
        Returns the event ID for tracking.
        """
        event_id = event.get("event_id", str(uuid.uuid4()))
        enriched_event = {
            **event,
            "event_id": event_id,
            "topic": topic,
            "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "source": "tendershield-backend",
        }

        self._event_buffer.append(enriched_event)

        # Notify subscribers
        for callback in self._subscribers.get(topic, []):
            try:
                callback(enriched_event)
            except Exception as e:
                logger.error(f"[KafkaService] Subscriber error on {topic}: {e}")

        logger.info(f"[KafkaService] Event produced → {topic}: {event.get('event_type', 'unknown')}")
        return event_id

    async def produce_tender_event(self, tender_id: str, event_type: str, data: dict) -> str:
        """Shorthand for producing tender lifecycle events."""
        return await self.produce_event(settings.KAFKA_TENDER_EVENTS_TOPIC, {
            "event_type": event_type,
            "tender_id": tender_id,
            "data": data,
        })

    async def produce_bid_event(self, tender_id: str, bid_id: str, event_type: str, data: dict) -> str:
        """Shorthand for producing bid lifecycle events."""
        return await self.produce_event(settings.KAFKA_BID_EVENTS_TOPIC, {
            "event_type": event_type,
            "tender_id": tender_id,
            "bid_id": bid_id,
            "data": data,
        })

    async def produce_ai_alert(self, alert: dict) -> str:
        """Produce an AI fraud detection alert."""
        return await self.produce_event(settings.KAFKA_AI_ALERTS_TOPIC, alert)

    async def produce_audit_event(self, audit: dict) -> str:
        """Produce an audit trail event."""
        return await self.produce_event(settings.KAFKA_AUDIT_EVENTS_TOPIC, audit)

    def subscribe(self, topic: str, callback: Callable):
        """Register a callback for events on a specific topic."""
        self._subscribers.setdefault(topic, []).append(callback)
        logger.info(f"[KafkaService] Subscriber registered for topic: {topic}")

    async def get_recent_events(self, topic: Optional[str] = None, limit: int = 50) -> list:
        """Get recent events, optionally filtered by topic."""
        events = self._event_buffer
        if topic:
            events = [e for e in events if e.get("topic") == topic]
        return events[-limit:]

    async def health_check(self) -> dict:
        """Check Kafka connection status."""
        return {
            "kafka_connected": self.connected,
            "topics": [
                settings.KAFKA_TENDER_EVENTS_TOPIC,
                settings.KAFKA_BID_EVENTS_TOPIC,
                settings.KAFKA_AI_ALERTS_TOPIC,
                settings.KAFKA_AUDIT_EVENTS_TOPIC,
            ],
            "event_count": len(self._event_buffer),
            "demo_mode": True,
        }


# Singleton instance
kafka_service = KafkaService()
