"""
TenderShield GeM Data Pipeline

Scrapes real tender data from Government e-Marketplace (gem.gov.in).
Runs continuously — new data feeds fraud detection and ML retraining.

Legal notice: All data is public government information published
under India's Right to Information framework.

Rate limiting: max 1 request/second (respectful scraping)
User-agent: Identifies as academic research tool
"""

import requests
import time
import json
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Iterator, Optional

logger = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'TenderShield-Research/1.0 (Academic fraud detection research; contact@tendershield.in)',
    'Accept': 'application/json',
    'Accept-Language': 'en-IN,en;q=0.9',
}


class GeMScraper:
    """
    Scrape real tender data from GeM public API.

    GeM (Government e-Marketplace) publishes tender data through
    multiple endpoints. We try the v2 API first, then fall back
    to Open Data (data.gov.in) if the primary API is unavailable.

    Rate limit: 1 req/second to be respectful of government servers.
    """

    # Primary: GeM marketplace API
    BASE_URL = 'https://mkp.gem.gov.in/api/v2'
    # Fallback: data.gov.in open data portal
    OPEN_DATA_URL = 'https://api.data.gov.in/resource'
    # GeM dataset ID on data.gov.in (procurement statistics)
    GEM_DATASET_ID = '9ef84268-d588-465a-a308-a864a43d0070'

    def fetch_tenders(
        self,
        days_back: int = 7,
        max_tenders: int = 500
    ) -> Iterator[dict]:
        """
        Fetch tenders published in last N days.
        Yields normalized tender records.

        Tries primary GeM API first, falls back to data.gov.in.
        """
        # Try primary GeM API
        primary_count = 0
        try:
            for tender in self._fetch_from_gem_api(days_back, max_tenders):
                yield tender
                primary_count += 1
        except Exception as e:
            logger.warning(f'Primary GeM API unavailable: {e}')

        if primary_count == 0:
            logger.info('Falling back to data.gov.in open data...')
            try:
                for tender in self._fetch_from_open_data(days_back, max_tenders):
                    yield tender
            except Exception as e:
                logger.error(f'Open data fallback also failed: {e}')

    def _fetch_from_gem_api(
        self,
        days_back: int,
        max_tenders: int
    ) -> Iterator[dict]:
        """Fetch from primary GeM marketplace API."""
        page = 1
        fetched = 0
        since = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')

        while fetched < max_tenders:
            params = {
                'page': page,
                'pageSize': 50,
                'publishedFrom': since,
                'status': 'published,under_evaluation,awarded',
                'sortBy': 'createdAt',
                'sortOrder': 'desc',
            }

            resp = requests.get(
                f'{self.BASE_URL}/search/tender',
                params=params,
                headers=HEADERS,
                timeout=15
            )

            if resp.status_code == 429:
                logger.warning('Rate limited by GeM — waiting 60s')
                time.sleep(60)
                continue

            if resp.status_code == 403:
                raise ConnectionError('GeM API returned 403 Forbidden')

            if resp.status_code != 200:
                logger.error(f'GeM API error: {resp.status_code}')
                break

            data = resp.json()
            tenders = data.get('tenders', data.get('data', data.get('results', [])))

            if not tenders:
                logger.info(f'No more tenders at page {page}')
                break

            for raw in tenders:
                normalized = self._normalize_gem_tender(raw)
                if normalized:
                    yield normalized
                    fetched += 1

            logger.info(f'Fetched {fetched} tenders from GeM API (page {page})')
            page += 1
            time.sleep(1)  # Respectful rate limiting

    def _fetch_from_open_data(
        self,
        days_back: int,
        max_tenders: int
    ) -> Iterator[dict]:
        """Fetch from data.gov.in open data portal (fallback)."""
        api_key = self._get_data_gov_key()
        if not api_key:
            logger.warning('No data.gov.in API key configured (DATAGOV_API_KEY)')
            return

        offset = 0
        fetched = 0

        while fetched < max_tenders:
            params = {
                'api-key': api_key,
                'format': 'json',
                'offset': offset,
                'limit': 100,
            }

            resp = requests.get(
                f'{self.OPEN_DATA_URL}/{self.GEM_DATASET_ID}',
                params=params,
                headers=HEADERS,
                timeout=20
            )

            if resp.status_code != 200:
                logger.error(f'data.gov.in error: {resp.status_code}')
                break

            data = resp.json()
            records = data.get('records', [])

            if not records:
                break

            for raw in records:
                normalized = self._normalize_open_data_tender(raw)
                if normalized:
                    yield normalized
                    fetched += 1

            logger.info(f'Fetched {fetched} tenders from data.gov.in (offset {offset})')
            offset += 100
            time.sleep(1)

    def fetch_bids_for_tender(self, gem_tender_id: str) -> list[dict]:
        """Fetch bids for a specific tender from GeM API."""
        try:
            resp = requests.get(
                f'{self.BASE_URL}/tender/{gem_tender_id}/bids',
                headers=HEADERS,
                timeout=10
            )
            if resp.status_code == 200:
                bids = resp.json().get('bids', [])
                return [self._normalize_bid(b, gem_tender_id) for b in bids if b]
        except Exception as e:
            logger.error(f'Bid fetch failed for {gem_tender_id}: {e}')
        return []

    def _normalize_gem_tender(self, raw: dict) -> Optional[dict]:
        """Normalize GeM API response to TenderShield schema."""
        try:
            gem_id = str(raw.get('id', raw.get('tenderId', '')))
            title = raw.get('title', raw.get('tenderTitle', ''))
            ministry = ''
            if isinstance(raw.get('ministry'), dict):
                ministry = raw['ministry'].get('name', '')
            elif isinstance(raw.get('ministry'), str):
                ministry = raw['ministry']

            category = ''
            if isinstance(raw.get('category'), dict):
                category = raw['category'].get('name', 'Unknown')
            elif isinstance(raw.get('category'), str):
                category = raw['category']

            state = raw.get('deliveryState', raw.get('state', 'National'))
            value_raw = raw.get('estimatedValue', raw.get('estimatedAmount', 0))
            value_lakh = float(value_raw or 0) / 100000

            published_at = raw.get('publishedAt', raw.get('startDate', ''))
            bid_end = raw.get('bidEndDate', raw.get('endDate', ''))
            deadline_days = self._calc_deadline_days(published_at, bid_end)
            bid_count = int(raw.get('bidCount', raw.get('totalBids', 0)))
            status = str(raw.get('status', 'unknown')).lower()

            if not gem_id or not title or value_lakh <= 0:
                return None

            return {
                'gem_tender_id': gem_id,
                'title': title[:200],
                'ministry': ministry[:100],
                'category': (category or 'Unknown')[:100],
                'state': (state or 'National')[:50],
                'estimated_value_lakh': round(value_lakh, 2),
                'estimated_value_crore': round(value_lakh / 100, 4),
                'bid_count': bid_count,
                'deadline_days': deadline_days,
                'status': status,
                'published_at': published_at,
                'bid_end_date': bid_end,
                'awarded_to': (raw.get('awardedTo') or {}).get('name') if isinstance(raw.get('awardedTo'), dict) else raw.get('awardedTo'),
                'awarded_amount': raw.get('awardedAmount'),
                'source': 'GEM_API',
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'raw_hash': hashlib.sha256(
                    json.dumps(raw, sort_keys=True, default=str).encode()
                ).hexdigest(),
            }
        except Exception as e:
            logger.error(f'Normalize failed: {e}')
            return None

    def _normalize_open_data_tender(self, raw: dict) -> Optional[dict]:
        """Normalize data.gov.in record to TenderShield schema."""
        try:
            tender_id = str(raw.get('tender_id', raw.get('id', '')))
            title = raw.get('tender_title', raw.get('title', ''))
            if not tender_id or not title:
                return None

            value_str = str(raw.get('tender_value', raw.get('estimated_value', '0')))
            value_str = value_str.replace(',', '').replace('₹', '').strip()
            try:
                value_lakh = float(value_str) / 100000
            except ValueError:
                value_lakh = 0

            if value_lakh <= 0:
                return None

            return {
                'gem_tender_id': f'DATAGOV-{tender_id}',
                'title': title[:200],
                'ministry': str(raw.get('ministry', raw.get('department', '')))[:100],
                'category': str(raw.get('category', 'Unknown'))[:100],
                'state': str(raw.get('state', 'National'))[:50],
                'estimated_value_lakh': round(value_lakh, 2),
                'estimated_value_crore': round(value_lakh / 100, 4),
                'bid_count': int(raw.get('bid_count', raw.get('total_bids', 0))),
                'deadline_days': 30,
                'status': str(raw.get('status', 'unknown')).lower(),
                'published_at': raw.get('published_date', ''),
                'bid_end_date': raw.get('closing_date', ''),
                'awarded_to': raw.get('awarded_to'),
                'awarded_amount': raw.get('awarded_amount'),
                'source': 'DATAGOV_IN',
                'scraped_at': datetime.now(timezone.utc).isoformat(),
                'raw_hash': hashlib.sha256(
                    json.dumps(raw, sort_keys=True, default=str).encode()
                ).hexdigest(),
            }
        except Exception as e:
            logger.error(f'Open data normalize failed: {e}')
            return None

    def _normalize_bid(self, raw: dict, tender_id: str) -> dict:
        """Normalize a bid record."""
        return {
            'gem_tender_id': tender_id,
            'bidder_name': raw.get('bidderName', ''),
            'gstin': raw.get('gstin', ''),
            'bid_amount_lakh': float(raw.get('bidAmount', 0)) / 100000,
            'submitted_at': raw.get('submittedAt', ''),
            'is_l1': raw.get('isL1', False),
            'company_age_months': raw.get('companyAgeMonths'),
        }

    def _calc_deadline_days(self, start: str, end: str) -> int:
        """Calculate days between publish and bid deadline."""
        try:
            s = datetime.fromisoformat(start.replace('Z', '+00:00'))
            e = datetime.fromisoformat(end.replace('Z', '+00:00'))
            return max(0, (e - s).days)
        except Exception:
            return 30  # Default assumption

    @staticmethod
    def _get_data_gov_key() -> Optional[str]:
        """Get data.gov.in API key from environment."""
        import os
        return os.getenv('DATAGOV_API_KEY')
