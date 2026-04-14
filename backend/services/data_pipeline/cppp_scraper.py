"""
CPPP (Central Public Procurement Portal) Scraper.

Source: eprocure.gov.in — all central government tender notices.

Legal notice: Public procurement notices published by the
Government of India. All data is legally accessible.

Rate limiting: 2 second delay between requests.
"""

import requests
from bs4 import BeautifulSoup
import re
import time
import logging
from datetime import datetime, timezone
import hashlib
from typing import Optional

logger = logging.getLogger(__name__)


class CPPPScraper:
    """
    Scrape tender notices from Central Public Procurement Portal.

    CPPP publishes HTML pages with tender listings.
    We parse the search results table to extract structured data.
    """

    BASE_URL = 'https://eprocure.gov.in/eprocure/app'

    def fetch_notices(self, max_pages: int = 10) -> list[dict]:
        """
        Fetch active tender notices from CPPP search.

        Args:
            max_pages: Maximum number of result pages to scrape.

        Returns:
            List of normalized tender notice records.
        """
        notices = []

        for page_num in range(1, max_pages + 1):
            try:
                params = {
                    'service': 'page',
                    'page': 'FrontEndLatestActiveTenders',
                    'actionVal': 'showactivetenders',
                    'pageIndex': page_num,
                    'pageSize': 20,
                }

                resp = requests.get(
                    self.BASE_URL,
                    params=params,
                    headers={
                        'User-Agent': 'TenderShield-Research/1.0 (Academic procurement research)',
                        'Accept': 'text/html,application/xhtml+xml',
                    },
                    timeout=20
                )

                if resp.status_code != 200:
                    logger.warning(f'CPPP returned {resp.status_code} on page {page_num}')
                    break

                parsed = self._parse_tender_page(resp.text)
                if not parsed:
                    logger.info(f'No more notices at page {page_num}')
                    break

                notices.extend(parsed)
                logger.info(f'CPPP page {page_num}: {len(parsed)} notices (total: {len(notices)})')
                time.sleep(2)  # Respectful delay

            except requests.Timeout:
                logger.warning(f'CPPP timeout on page {page_num}')
                break
            except Exception as e:
                logger.error(f'CPPP scrape failed page {page_num}: {e}')
                break

        return notices

    def _parse_tender_page(self, html: str) -> list[dict]:
        """Parse CPPP HTML to extract tender notices from result table."""
        notices = []
        soup = BeautifulSoup(html, 'html.parser')

        # CPPP uses various table classes depending on the page version
        table = (
            soup.find('table', {'id': re.compile(r'tender', re.I)})
            or soup.find('table', {'class': re.compile(r'list|tender|table_list', re.I)})
            or soup.find('table', attrs={'border': '1'})
        )

        if not table:
            # Try finding any table with enough columns
            for t in soup.find_all('table'):
                rows = t.find_all('tr')
                if len(rows) > 2:
                    first_row = rows[0]
                    if len(first_row.find_all(['th', 'td'])) >= 4:
                        table = t
                        break

        if not table:
            return []

        rows = table.find_all('tr')
        # Skip header row(s)
        data_rows = rows[1:] if len(rows) > 1 else []

        for row in data_rows:
            cells = row.find_all('td')
            if len(cells) < 4:
                continue

            try:
                # Extract text, handling nested elements
                texts = [cell.get_text(strip=True) for cell in cells]

                notice = self._build_notice_from_cells(texts, cells)
                if notice:
                    notices.append(notice)
            except Exception as e:
                logger.debug(f'Failed to parse row: {e}')
                continue

        return notices

    def _build_notice_from_cells(
        self,
        texts: list[str],
        cells: list
    ) -> Optional[dict]:
        """Build a notice dict from table cell contents."""
        # CPPP table layouts vary; try common column arrangements
        cppp_id = ''
        title = ''
        org = ''
        end_date = ''
        value_text = ''

        if len(texts) >= 7:
            # Full layout: S.No, NIT/Ref, Title, Organisation, EndDate, Value, ...
            cppp_id = texts[1]
            title = texts[2]
            org = texts[3]
            end_date = texts[4]
            value_text = texts[5] if len(texts) > 5 else ''
        elif len(texts) >= 5:
            # Compact layout
            cppp_id = texts[0]
            title = texts[1]
            org = texts[2]
            end_date = texts[3]
            value_text = texts[4] if len(texts) > 4 else ''
        elif len(texts) >= 4:
            cppp_id = texts[0]
            title = texts[1]
            org = texts[2]
            end_date = texts[3]
        else:
            return None

        if not cppp_id or not title or len(title) < 5:
            return None

        # Try to extract download link for detailed info
        detail_link = None
        for cell in cells:
            link = cell.find('a', href=True)
            if link and 'tender' in link['href'].lower():
                detail_link = link['href']
                break

        return {
            'cppp_id': cppp_id[:100],
            'title': title[:200],
            'organisation': org[:100],
            'bid_end_date': end_date[:50],
            'tender_value_lakh': self._extract_value(value_text),
            'detail_url': detail_link,
            'source': 'CPPP',
            'scraped_at': datetime.now(timezone.utc).isoformat(),
            'raw_hash': hashlib.sha256(
                f'{cppp_id}|{title}|{org}'.encode()
            ).hexdigest(),
        }

    @staticmethod
    def _extract_value(text: str) -> float:
        """
        Extract numeric value from strings like:
        - '₹45.20 Lakh'
        - 'Rs. 2.5 Crore'
        - '45,20,000'
        - 'Refer Document'
        """
        if not text:
            return 0.0

        text = text.replace('₹', '').replace('Rs.', '').replace('Rs', '').replace(',', '').strip()

        # "Refer Document" or similar non-numeric
        if not any(c.isdigit() for c in text):
            return 0.0

        match = re.search(r'[\d.]+', text)
        if not match:
            return 0.0

        value = float(match.group())
        text_lower = text.lower()

        if 'cr' in text_lower or 'crore' in text_lower:
            return value * 100  # Convert crore to lakh
        elif 'lakh' in text_lower or 'lac' in text_lower:
            return value
        elif value > 100000:
            # Likely in rupees, convert to lakh
            return value / 100000
        else:
            return value  # Assume lakh by default
