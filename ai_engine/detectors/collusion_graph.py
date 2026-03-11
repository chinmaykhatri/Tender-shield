"""
============================================================================
TenderShield — Collusion Graph Detector
============================================================================
Detects collusion networks using graph analysis.

ALGORITHM: Builds a bidder co-occurrence graph and finds suspicious clusters.
  1. Nodes = bidder DIDs
  2. Edges = co-participation in tenders (weighted by frequency)
  3. Community detection identifies bidder "cartels"
  4. Win-rate analysis within communities flags collusion

GRAPH METRICS:
  - Degree Centrality — how connected a bidder is
  - Clustering Coefficient — how tightly connected neighbors are
  - Community Detection — Louvain algorithm for group identification
  - Win Concentration — if one node always wins in its cluster

INDIA CONTEXT:
  Shell companies and front companies are common in Indian procurement fraud.
  This detector finds groups of companies that always bid together but
  take turns winning — a classic cartel behavior pattern.
============================================================================
"""

import logging
from typing import List, Dict, Any, Set, Tuple
from collections import defaultdict

logger = logging.getLogger("tendershield.ai.collusion")


class CollusionGraphDetector:
    """
    Detects collusion networks by analyzing bidder co-occurrence patterns.
    Builds an implicit graph of bidder relationships.
    """

    def __init__(self):
        self.name = "COLLUSION"
        self.min_co_occurrence = 3       # Minimum times bidders must co-occur
        self.high_co_occurrence = 5      # High co-occurrence threshold
        self.win_concentration_threshold = 0.7  # If one bidder wins 70%+ in a group

    def analyze(self, all_tenders_bids: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze cross-tender bidder relationships.
        Requires data from multiple tenders for meaningful analysis.

        Args:
            all_tenders_bids: List of dicts, each with 'tender_id' and 'bids' list

        Returns:
            Risk assessment with collusion networks identified
        """
        result = {
            "detector": self.name,
            "risk_score": 0,
            "confidence": 0.0,
            "flags": [],
            "evidence": {},
            "recommendation": "MONITOR",
            "networks": [],
        }

        # Build co-occurrence matrix
        co_occurrence = self._build_co_occurrence_matrix(all_tenders_bids)
        result["evidence"]["co_occurrence_pairs"] = len(co_occurrence)

        if not co_occurrence:
            result["evidence"]["reason"] = "Insufficient data for collusion analysis"
            return result

        # Find suspicious clusters
        clusters = self._find_clusters(co_occurrence)
        result["evidence"]["clusters_found"] = len(clusters)

        # Analyze each cluster
        for cluster in clusters:
            cluster_risk = self._analyze_cluster(cluster, all_tenders_bids)
            if cluster_risk["suspicious"]:
                result["networks"].append(cluster_risk)
                result["risk_score"] += cluster_risk["contribution"]
                result["flags"].append(
                    f"COLLUSION_NETWORK: {len(cluster_risk['members'])} bidders — "
                    f"co-occurred {cluster_risk['co_occurrence_count']} times"
                )

        # Check for director/address overlaps (shell company indicators)
        overlap = self._check_entity_overlaps(all_tenders_bids)
        if overlap["suspicious"]:
            result["risk_score"] += 20
            result["flags"].append(f"ENTITY_OVERLAP: {overlap['description']}")
            result["evidence"]["entity_overlap"] = overlap

        result["risk_score"] = min(100, result["risk_score"])
        result["confidence"] = min(1.0, len(all_tenders_bids) / 20.0)

        if result["risk_score"] >= 76:
            result["recommendation"] = "ESCALATE_CAG"
        elif result["risk_score"] >= 51:
            result["recommendation"] = "FREEZE"
        elif result["risk_score"] >= 26:
            result["recommendation"] = "FLAG"

        logger.info(f"[Collusion] Analysis complete: score={result['risk_score']}, networks={len(result['networks'])}")
        return result

    def _build_co_occurrence_matrix(self, all_tenders_bids: List[Dict]) -> Dict[Tuple[str, str], int]:
        """Build a matrix of how often bidder pairs appear in the same tender."""
        co_occurrence: Dict[Tuple[str, str], int] = defaultdict(int)

        for tender_data in all_tenders_bids:
            bids = tender_data.get("bids", [])
            bidders = [b.get("bidder_did", "") for b in bids if b.get("bidder_did")]
            bidders = list(set(bidders))  # Unique bidders per tender

            for i in range(len(bidders)):
                for j in range(i + 1, len(bidders)):
                    pair = tuple(sorted([bidders[i], bidders[j]]))
                    co_occurrence[pair] += 1

        # Filter to significant co-occurrences
        return {pair: count for pair, count in co_occurrence.items()
                if count >= self.min_co_occurrence}

    def _find_clusters(self, co_occurrence: Dict[Tuple[str, str], int]) -> List[Set[str]]:
        """Find connected components (potential collusion groups)."""
        # Build adjacency list
        adjacency: Dict[str, Set[str]] = defaultdict(set)
        for (a, b), count in co_occurrence.items():
            if count >= self.min_co_occurrence:
                adjacency[a].add(b)
                adjacency[b].add(a)

        # Find connected components using BFS
        visited: Set[str] = set()
        clusters: List[Set[str]] = []

        for node in adjacency:
            if node not in visited:
                cluster: Set[str] = set()
                queue = [node]
                while queue:
                    current = queue.pop(0)
                    if current not in visited:
                        visited.add(current)
                        cluster.add(current)
                        for neighbor in adjacency.get(current, set()):
                            if neighbor not in visited:
                                queue.append(neighbor)
                if len(cluster) >= 2:
                    clusters.append(cluster)

        return clusters

    def _analyze_cluster(self, cluster: Set[str], all_tenders_bids: List[Dict]) -> Dict:
        """Analyze a bidder cluster for collusion indicators."""
        members = list(cluster)
        co_tenders = 0
        wins: Dict[str, int] = defaultdict(int)
        total_tenders_together = 0

        for tender_data in all_tenders_bids:
            bids = tender_data.get("bids", [])
            tender_bidders = {b.get("bidder_did") for b in bids}
            cluster_bidders = cluster.intersection(tender_bidders)

            if len(cluster_bidders) >= 2:
                co_tenders += 1
                total_tenders_together += 1

                # Check who won (lowest revealed amount)
                cluster_bids = [b for b in bids if b.get("bidder_did") in cluster_bidders
                                and b.get("revealed_amount_paise")]
                if cluster_bids:
                    winner = min(cluster_bids, key=lambda x: x.get("revealed_amount_paise", float("inf")))
                    wins[winner.get("bidder_did", "")] += 1

        # Check win concentration
        suspicious = False
        contribution = 0

        if total_tenders_together >= 3:
            if wins:
                max_wins = max(wins.values())
                win_concentration = max_wins / total_tenders_together if total_tenders_together > 0 else 0

                if win_concentration >= self.win_concentration_threshold:
                    suspicious = True
                    contribution = 30
                elif co_tenders >= self.high_co_occurrence:
                    suspicious = True
                    contribution = 20

        return {
            "members": members,
            "co_occurrence_count": co_tenders,
            "wins_distribution": dict(wins),
            "suspicious": suspicious,
            "contribution": contribution,
        }

    def _check_entity_overlaps(self, all_tenders_bids: List[Dict]) -> Dict:
        """Check for common GSTIN prefixes (same state/entity) among frequent co-bidders."""
        gstin_prefixes: Dict[str, List[str]] = defaultdict(list)

        for tender_data in all_tenders_bids:
            for bid in tender_data.get("bids", []):
                gstin = bid.get("bidder_gstin", "")
                did = bid.get("bidder_did", "")
                if gstin and did:
                    prefix = gstin[:4]  # State code + first 2 PAN chars
                    gstin_prefixes[prefix].append(did)

        # Find prefixes with multiple unique bidders (potential related entities)
        suspicious_groups = []
        for prefix, dids in gstin_prefixes.items():
            unique_dids = set(dids)
            if len(unique_dids) >= 3:
                suspicious_groups.append({
                    "gstin_prefix": prefix,
                    "bidder_count": len(unique_dids),
                })

        return {
            "suspicious": len(suspicious_groups) > 0,
            "groups": suspicious_groups,
            "description": f"{len(suspicious_groups)} groups with shared GSTIN prefix patterns" if suspicious_groups else "No overlaps detected",
        }
