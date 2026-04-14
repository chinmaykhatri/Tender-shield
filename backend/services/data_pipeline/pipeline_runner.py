"""
TenderShield — Main Data Pipeline Runner

Orchestrates: Scrape → Normalize → Label → Store → Retrain

Runs daily at 2 AM IST via the `schedule` library.
Deploy as a Render background worker for continuous data collection.

After 2 weeks: ~1,400 real tenders analyzed.
After 1 month: ~3,000 real tenders with fraud labels.
That dataset doesn't exist anywhere else.
"""

import logging
import os
import sys
import time
from datetime import datetime, timezone

import schedule

# Add parent directories to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gem_scraper import GeMScraper
from cppp_scraper import CPPPScraper
from fraud_labeler import RealDataFraudLabeler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger('pipeline')

# Supabase client (lazy init to handle missing env vars gracefully)
_supabase = None


def get_supabase():
    """Get or create Supabase client."""
    global _supabase
    if _supabase is None:
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        if not url or not key:
            logger.error(
                'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. '
                'Pipeline will run in dry-run mode (no storage).'
            )
            return None
        try:
            from supabase import create_client
            _supabase = create_client(url, key)
        except ImportError:
            logger.error('supabase-py not installed. Run: pip install supabase')
            return None
    return _supabase


def run_gem_pipeline(days_back: int = 7, max_tenders: int = 200) -> dict:
    """
    Run the GeM data pipeline.

    Returns:
        Summary dict with counts of new records, fraud detections, etc.
    """
    logger.info('═' * 50)
    logger.info(f'GeM Pipeline run: {datetime.now().strftime("%d %b %Y %H:%M IST")}')
    logger.info('═' * 50)

    gem = GeMScraper()
    labeler = RealDataFraudLabeler()
    supabase = get_supabase()

    stats = {
        'tenders_scraped': 0,
        'tenders_new': 0,
        'tenders_skipped': 0,
        'fraud_detected': 0,
        'errors': 0,
        'total_in_db': 0,
    }

    for tender in gem.fetch_tenders(days_back=days_back, max_tenders=max_tenders):
        stats['tenders_scraped'] += 1

        try:
            # Check if already processed (deduplication)
            if supabase:
                existing = supabase.table('gem_tenders').select('gem_tender_id').eq(
                    'gem_tender_id', tender['gem_tender_id']
                ).execute()

                if existing.data:
                    stats['tenders_skipped'] += 1
                    continue

            # Fetch bids for this tender (if available)
            bids = gem.fetch_bids_for_tender(tender['gem_tender_id'])

            # Run fraud detection
            labeled = labeler.label_tender(tender, bids)

            # Store in Supabase
            if supabase:
                try:
                    supabase.table('gem_tenders').insert(labeled).execute()
                except Exception as e:
                    logger.error(f'Supabase insert failed: {e}')
                    stats['errors'] += 1
                    continue

            stats['tenders_new'] += 1

            if labeled['is_fraud']:
                stats['fraud_detected'] += 1
                logger.info(
                    f'🚨 FRAUD DETECTED: {tender["title"][:50]}... '
                    f'Score: {labeled["fraud_score"]}/100 '
                    f'Flags: {labeled["fraud_flags"]}'
                )

            # Rate limiting between tenders
            time.sleep(0.5)

        except Exception as e:
            logger.error(f'Error processing tender {tender.get("gem_tender_id")}: {e}')
            stats['errors'] += 1

    # Get total count in DB
    if supabase:
        try:
            count_resp = supabase.table('gem_tenders').select(
                '*', count='exact', head=True
            ).execute()
            stats['total_in_db'] = count_resp.count or 0
        except Exception:
            pass

    return stats


def run_cppp_pipeline(max_pages: int = 5) -> dict:
    """Run the CPPP data pipeline."""
    logger.info('─' * 50)
    logger.info('CPPP Pipeline starting...')
    logger.info('─' * 50)

    cppp = CPPPScraper()
    supabase = get_supabase()

    stats = {
        'notices_scraped': 0,
        'notices_new': 0,
        'errors': 0,
    }

    try:
        notices = cppp.fetch_notices(max_pages=max_pages)
        stats['notices_scraped'] = len(notices)

        if supabase:
            for notice in notices:
                try:
                    # Check dedup by hash
                    existing = supabase.table('cppp_notices').select('raw_hash').eq(
                        'raw_hash', notice['raw_hash']
                    ).execute()

                    if not existing.data:
                        supabase.table('cppp_notices').insert(notice).execute()
                        stats['notices_new'] += 1
                except Exception as e:
                    logger.error(f'CPPP insert error: {e}')
                    stats['errors'] += 1

    except Exception as e:
        logger.error(f'CPPP pipeline failed: {e}')
        stats['errors'] += 1

    return stats


def run_daily_pipeline():
    """Main daily pipeline run — combines GeM + CPPP."""
    logger.info('')
    logger.info('╔' + '═' * 48 + '╗')
    logger.info('║  TenderShield Daily Data Pipeline              ║')
    logger.info('║  Building the data moat, one tender at a time  ║')
    logger.info('╚' + '═' * 48 + '╝')
    logger.info('')

    start = time.time()

    # Run GeM pipeline
    gem_stats = run_gem_pipeline(days_back=7, max_tenders=200)

    # Run CPPP pipeline
    cppp_stats = run_cppp_pipeline(max_pages=5)

    elapsed = time.time() - start

    # Summary
    logger.info('')
    logger.info('═' * 50)
    logger.info('PIPELINE SUMMARY')
    logger.info('═' * 50)
    logger.info(f'  GeM tenders scraped:    {gem_stats["tenders_scraped"]}')
    logger.info(f'  GeM tenders new:        {gem_stats["tenders_new"]}')
    logger.info(f'  GeM tenders skipped:    {gem_stats["tenders_skipped"]}')
    logger.info(f'  GeM fraud detected:     {gem_stats["fraud_detected"]}')
    logger.info(f'  CPPP notices scraped:   {cppp_stats["notices_scraped"]}')
    logger.info(f'  CPPP notices new:       {cppp_stats["notices_new"]}')
    logger.info(f'  Total in DB:            {gem_stats["total_in_db"]}')
    logger.info(f'  Errors:                 {gem_stats["errors"] + cppp_stats["errors"]}')
    logger.info(f'  Duration:               {elapsed:.1f}s')
    logger.info('═' * 50)

    # Trigger model retrain if enough new data
    if gem_stats['tenders_new'] >= 50:
        logger.info('📊 Triggering model retrain with new real data...')
        trigger_model_retrain()

    return {**gem_stats, **cppp_stats, 'elapsed_seconds': elapsed}


def trigger_model_retrain():
    """Trigger ML model retraining with accumulated real data."""
    try:
        import subprocess
        subprocess.Popen(
            [
                sys.executable, '-m',
                'ai_engine.models.train_fraud_detector',
                '--use-real-data',
                '--data-source', 'gem_tenders',
            ],
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(
                os.path.abspath(__file__)
            ))),
        )
        logger.info('Retrain process started in background')
    except Exception as e:
        logger.error(f'Failed to start retrain: {e}')


def main():
    """Entry point: run immediately, then schedule daily."""
    logger.info('TenderShield Data Pipeline starting...')
    logger.info(f'Python: {sys.version}')
    logger.info(f'Supabase configured: {bool(os.getenv("SUPABASE_URL"))}')
    logger.info('')

    # Run immediately on startup
    run_daily_pipeline()

    # Schedule daily at 2 AM IST (20:30 UTC)
    schedule.every().day.at('20:30').do(run_daily_pipeline)
    logger.info('Scheduled daily run at 20:30 UTC (02:00 IST)')

    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == '__main__':
    main()
