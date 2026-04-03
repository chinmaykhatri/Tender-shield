"""
============================================================================
TenderShield — Redis Event Bus (Pub/Sub)
============================================================================
Replaces the mock Kafka service with Redis Pub/Sub for real-time
event-driven architecture.

TOPICS (Redis Channels):
  ts:tender-events  — Tender lifecycle events
  ts:bid-events     — Bid lifecycle events
  ts:ai-alerts      — AI fraud detection alerts
  ts:audit-events   — Audit trail events

ARCHITECTURE:
  Producer → Redis Pub/Sub → Consumer(s)
  
  Producers: tender_router, bid_router, fabric_service
  Consumers: AI engine (risk scoring), audit trail, notification service

FALLBACK:
  If Redis is not available, falls back to in-memory event buffer
  (same behavior as the old Kafka mock, but with honest labeling).

CONFIG:
  Set REDIS_HOST and REDIS_PORT in .env.
  Default: localhost:6379 (no auth for dev).
============================================================================
"""

import os
import json
import uuid
import asyncio
import logging
from typing import Optional, Dict, Any, Callable, List, Awaitable
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("tendershield.events")
IST = timezone(timedelta(hours=5, minutes=30))


# ============================================================================
# Event Bus Interface
# ============================================================================

class EventBus:
    """
    Redis Pub/Sub event bus with in-memory fallback.

    Usage:
        bus = EventBus()
        await bus.connect()
        await bus.publish("ts:tender-events", {"type": "TENDER_CREATED", ...})
        bus.subscribe("ts:ai-alerts", my_callback)
    """

    # Channel constants
    TENDER_EVENTS = "ts:tender-events"
    BID_EVENTS = "ts:bid-events"
    AI_ALERTS = "ts:ai-alerts"
    AUDIT_EVENTS = "ts:audit-events"

    def __init__(self):
        self._redis = None
        self._pubsub = None
        self._connected = False
        self._mode = "MEMORY"  # "REDIS" or "MEMORY"

        # In-memory fallback
        self._event_buffer: List[Dict[str, Any]] = []
        self._max_buffer_size = 10000
        self._subscribers: Dict[str, List[Callable]] = {}
        self._listener_task: Optional[asyncio.Task] = None

    async def connect(self):
        """Try to connect to Redis. Falls back to in-memory on failure."""
        host = os.getenv("REDIS_HOST", "localhost")
        port = int(os.getenv("REDIS_PORT", "6379"))
        password = os.getenv("REDIS_PASSWORD", "")

        try:
            import redis.asyncio as aioredis
            self._redis = aioredis.Redis(
                host=host,
                port=port,
                password=password or None,
                decode_responses=True,
                socket_connect_timeout=3,
            )
            # Test connection
            await self._redis.ping()
            self._connected = True
            self._mode = "REDIS"
            self._pubsub = self._redis.pubsub()
            logger.info(f"[EventBus] ✅ Connected to Redis at {host}:{port}")
        except Exception as e:
            logger.warning(f"[EventBus] Redis not available ({e}). Using in-memory event buffer.")
            self._redis = None
            self._connected = False
            self._mode = "MEMORY"

    async def publish(self, channel: str, event: Dict[str, Any]) -> str:
        """
        Publish an event to a channel.
        Returns the event ID.
        """
        event_id = event.get("event_id", str(uuid.uuid4()))
        enriched = {
            **event,
            "event_id": event_id,
            "channel": channel,
            "timestamp_ist": datetime.now(IST).strftime("%Y-%m-%dT%H:%M:%S+05:30"),
            "source": "tendershield-backend",
            "bus_mode": self._mode,
        }

        if self._mode == "REDIS" and self._redis:
            try:
                await self._redis.publish(channel, json.dumps(enriched))
                # Also store in a Redis list for history
                await self._redis.lpush(f"{channel}:history", json.dumps(enriched))
                await self._redis.ltrim(f"{channel}:history", 0, 999)  # Keep last 1000
            except Exception as e:
                logger.error(f"[EventBus] Redis publish failed: {e}")
                # Fallback to memory
                self._buffer_event(enriched)
        else:
            self._buffer_event(enriched)

        # Notify local subscribers
        await self._notify_subscribers(channel, enriched)

        logger.debug(f"[EventBus] Published to {channel}: {event.get('event_type', 'unknown')}")
        return event_id

    def _buffer_event(self, event: Dict[str, Any]):
        """Store event in memory buffer."""
        self._event_buffer.append(event)
        if len(self._event_buffer) > self._max_buffer_size:
            self._event_buffer = self._event_buffer[-self._max_buffer_size:]

    async def _notify_subscribers(self, channel: str, event: Dict[str, Any]):
        """Notify local subscribers of an event."""
        for callback in self._subscribers.get(channel, []):
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                logger.error(f"[EventBus] Subscriber error on {channel}: {e}")

    def subscribe(self, channel: str, callback: Callable):
        """Register a local callback for events on a channel."""
        self._subscribers.setdefault(channel, []).append(callback)
        logger.info(f"[EventBus] Subscriber registered for: {channel}")

    async def subscribe_redis(self, channels: List[str]):
        """Subscribe to Redis channels and start listener."""
        if self._mode != "REDIS" or not self._pubsub:
            return

        await self._pubsub.subscribe(*channels)
        self._listener_task = asyncio.create_task(self._listen())

    async def _listen(self):
        """Background listener for Redis Pub/Sub messages."""
        if not self._pubsub:
            return
        try:
            async for message in self._pubsub.listen():
                if message["type"] == "message":
                    try:
                        data = json.loads(message["data"])
                        channel = message["channel"]
                        await self._notify_subscribers(channel, data)
                    except json.JSONDecodeError:
                        pass
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"[EventBus] Listener error: {e}")

    # ---- Convenience publishers ----

    async def publish_tender_event(self, tender_id: str, event_type: str, data: dict) -> str:
        """Publish a tender lifecycle event."""
        return await self.publish(self.TENDER_EVENTS, {
            "event_type": event_type,
            "tender_id": tender_id,
            "data": data,
        })

    async def publish_bid_event(self, tender_id: str, bid_id: str, event_type: str, data: dict) -> str:
        """Publish a bid lifecycle event."""
        return await self.publish(self.BID_EVENTS, {
            "event_type": event_type,
            "tender_id": tender_id,
            "bid_id": bid_id,
            "data": data,
        })

    async def publish_ai_alert(self, alert: dict) -> str:
        """Publish an AI fraud detection alert."""
        return await self.publish(self.AI_ALERTS, alert)

    async def publish_audit_event(self, audit: dict) -> str:
        """Publish an audit trail event."""
        return await self.publish(self.AUDIT_EVENTS, audit)

    # ---- Query ----

    async def get_recent_events(self, channel: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent events from buffer or Redis."""
        if self._mode == "REDIS" and self._redis and channel:
            try:
                raw = await self._redis.lrange(f"{channel}:history", 0, limit - 1)
                return [json.loads(r) for r in raw]
            except Exception:
                pass

        # Fallback to memory
        events = self._event_buffer
        if channel:
            events = [e for e in events if e.get("channel") == channel]
        return events[-limit:]

    async def health_check(self) -> Dict[str, Any]:
        """Return event bus health info."""
        info = {
            "mode": self._mode,
            "connected": self._connected,
            "buffer_size": len(self._event_buffer),
            "subscriber_count": sum(len(v) for v in self._subscribers.values()),
            "channels": list(self._subscribers.keys()),
        }
        if self._mode == "REDIS" and self._redis:
            try:
                info["redis_ping"] = await self._redis.ping()
            except Exception:
                info["redis_ping"] = False
        return info

    async def disconnect(self):
        """Clean up connections."""
        if self._listener_task:
            self._listener_task.cancel()
        if self._pubsub:
            await self._pubsub.unsubscribe()
        if self._redis:
            await self._redis.close()
        logger.info("[EventBus] 🛑 Disconnected")


# Singleton event bus
event_bus = EventBus()
