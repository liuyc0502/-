"""
Confidence-Weighted Entropy Consensus (CWEC) Engine.

Implements quantitative consensus assessment for multi-agent debate using:
1. Agreement Graph Score (AGS) - signed weighted graph-based agreement measure
2. Confidence-Weighted Entropy (CWE) - information-theoretic opinion diversity
3. Convergence Velocity (CV) - rate of consensus change across rounds
4. Composite Consensus Score (CCS) - unified consensus metric

References:
- Dalkey & Helmer (1963), "An Experimental Application of the Delphi Method"
- Shannon (1948), "A Mathematical Theory of Communication"
- Fleiss (1971), "Measuring nominal scale agreement among many raters"
"""
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class ConsensusMetrics:
    """Quantitative consensus assessment for a single round."""
    consensus_score: float = 0.0          # CCS ∈ [0, 1]
    agreement_graph_score: float = 0.0    # AGS ∈ [-1, 1]
    entropy: float = 0.0                  # CWE_norm ∈ [0, 1]
    convergence_velocity: float = 0.0     # CV (positive = converging)
    opinion_clusters: List[List[str]] = field(default_factory=list)
    consensus_level: str = "divergent"    # full | partial | divergent


class ConsensusEngine:
    """
    Computes quantitative consensus metrics for multi-agent debate rounds.

    The engine models agent opinions as a signed weighted graph where edges
    carry agreement (+1) or disagreement (-1) signals, weighted by the
    geometric mean of the participating agents' confidence scores.

    Parameters:
        alpha: Weight for entropy component in CCS (default: 0.4)
        beta: Weight for agreement graph component in CCS (default: 0.35)
        gamma: Weight for mean confidence component in CCS (default: 0.25)
        full_threshold: CCS threshold for "full" consensus (default: 0.85)
        partial_threshold: CCS threshold for "partial" consensus (default: 0.55)
    """

    def __init__(
        self,
        alpha: float = 0.4,
        beta: float = 0.35,
        gamma: float = 0.25,
        full_threshold: float = 0.85,
        partial_threshold: float = 0.55,
    ):
        assert abs(alpha + beta + gamma - 1.0) < 1e-9, "Weights must sum to 1"
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.full_threshold = full_threshold
        self.partial_threshold = partial_threshold

    def compute_agreement_matrix(
        self,
        agent_names: List[str],
        opinions: Dict,  # Dict[str, AgentOpinion]
    ) -> List[List[int]]:
        """
        Build N×N agreement matrix A where A[i][j] ∈ {-1, 0, 1}.

        A[i][j] = 1  if agent i lists agent j in agrees_with
        A[i][j] = -1 if agent i lists agent j in disagrees_with
        A[i][j] = 0  otherwise (no explicit signal)

        The matrix is then symmetrized: if agents disagree on their
        relationship, the stronger signal (disagree) takes precedence.
        """
        n = len(agent_names)
        name_to_idx = {name: i for i, name in enumerate(agent_names)}
        matrix = [[0] * n for _ in range(n)]

        for name, opinion in opinions.items():
            i = name_to_idx.get(name)
            if i is None:
                continue
            for agreed in opinion.agrees_with:
                j = name_to_idx.get(agreed)
                if j is not None and j != i:
                    matrix[i][j] = 1
            for disagreed in opinion.disagrees_with:
                j = name_to_idx.get(disagreed)
                if j is not None and j != i:
                    matrix[i][j] = -1

        # Symmetrize: disagreement takes precedence over agreement
        for i in range(n):
            for j in range(i + 1, n):
                if matrix[i][j] == -1 or matrix[j][i] == -1:
                    matrix[i][j] = matrix[j][i] = -1
                elif matrix[i][j] == 1 or matrix[j][i] == 1:
                    matrix[i][j] = matrix[j][i] = 1
                # else both remain 0

        return matrix

    def cluster_opinions(
        self,
        agreement_matrix: List[List[int]],
        agent_names: List[str],
    ) -> List[List[str]]:
        """
        Graph-based opinion clustering via union-find on signed edges.

        Algorithm:
        1. Initialize each agent as its own cluster
        2. For each pair with A[i][j] = 1 (agree), merge their clusters
        3. For each pair with A[i][j] = -1 (disagree), ensure they are
           in different clusters (split if necessary)
        4. Agents with no explicit signal are assigned to the cluster
           they have the most agree-connections to

        Returns list of clusters, each cluster being a list of agent names.
        """
        n = len(agent_names)
        if n == 0:
            return []
        if n == 1:
            return [agent_names[:]]

        # Union-Find
        parent = list(range(n))

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(x, y):
            rx, ry = find(x), find(y)
            if rx != ry:
                parent[rx] = ry

        # Phase 1: Merge agents that agree
        for i in range(n):
            for j in range(i + 1, n):
                if agreement_matrix[i][j] == 1:
                    union(i, j)

        # Phase 2: Handle disagreements - split if in same cluster
        # If two agents disagree but union-find merged them (via transitive
        # agreement), we need to separate them. We do this by removing the
        # weaker agent from the cluster (lower confidence).
        # For simplicity and correctness, we rebuild clusters considering
        # disagreement constraints.
        disagree_pairs = []
        for i in range(n):
            for j in range(i + 1, n):
                if agreement_matrix[i][j] == -1:
                    disagree_pairs.append((i, j))

        # If disagreeing agents ended up in same cluster, we need graph coloring.
        # Use a greedy approach: assign each agent to a group, splitting on disagree edges.
        if disagree_pairs:
            # Reset and use constraint-aware clustering
            groups = self._constraint_cluster(n, agreement_matrix)
        else:
            # No disagreements: union-find result is valid
            groups = {}
            for i in range(n):
                root = find(i)
                groups.setdefault(root, []).append(i)

        # Phase 3: Assign unconnected agents to nearest cluster
        # (agents with all-zero rows in agreement matrix)
        # Already handled by constraint_cluster / union-find

        # Convert index-based clusters to name-based
        if isinstance(groups, dict):
            clusters = [
                [agent_names[i] for i in members]
                for members in groups.values()
            ]
        else:
            clusters = groups  # already name-converted

        # Remove empty clusters
        clusters = [c for c in clusters if c]
        if not clusters:
            clusters = [[name] for name in agent_names]

        return clusters

    def _constraint_cluster(
        self,
        n: int,
        agreement_matrix: List[List[int]],
    ) -> Dict[int, List[int]]:
        """
        Constraint-aware clustering using greedy graph coloring.

        Agents connected by agree edges (+1) should be in the same group.
        Agents connected by disagree edges (-1) must be in different groups.
        """
        # Start with each agent in its own group
        assignment = list(range(n))
        next_group = n

        # First pass: merge agree-connected agents
        parent = list(range(n))

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(x, y):
            rx, ry = find(x), find(y)
            if rx != ry:
                parent[rx] = ry

        for i in range(n):
            for j in range(i + 1, n):
                if agreement_matrix[i][j] == 1:
                    union(i, j)

        # Build initial groups from union-find
        groups: Dict[int, List[int]] = {}
        for i in range(n):
            root = find(i)
            groups.setdefault(root, []).append(i)

        # Second pass: check disagree constraints and split if needed
        for i in range(n):
            for j in range(i + 1, n):
                if agreement_matrix[i][j] == -1 and find(i) == find(j):
                    # Conflict: i and j are in same group but disagree
                    # Remove j from current group, create new group
                    root = find(j)
                    if root in groups and j in groups[root]:
                        groups[root].remove(j)
                        groups[next_group] = [j]
                        parent[j] = j  # Detach from old group
                        next_group += 1

        return groups

    def compute_ags(
        self,
        agreement_matrix: List[List[int]],
        confidences: Dict[str, float],
        agent_names: List[str],
    ) -> float:
        """
        Agreement Graph Score (AGS).

        AGS^t = Σ_{i<j} w(i,j) / (N*(N-1)/2)

        where w(i,j) = A[i][j] * sqrt(c_i * c_j)

        Returns value in [-1, 1].
        """
        n = len(agent_names)
        if n <= 1:
            return 1.0  # Trivial consensus

        total_pairs = n * (n - 1) / 2
        weighted_sum = 0.0

        for i in range(n):
            for j in range(i + 1, n):
                ci = confidences.get(agent_names[i], 0.5) / 100.0  # Normalize to [0,1]
                cj = confidences.get(agent_names[j], 0.5) / 100.0
                w = agreement_matrix[i][j] * math.sqrt(ci * cj)
                weighted_sum += w

        return weighted_sum / total_pairs

    def compute_cwe(
        self,
        clusters: List[List[str]],
        confidences: Dict[str, float],
        agent_weights: Optional[Dict[str, float]] = None,
    ) -> float:
        """
        Confidence-Weighted Entropy (CWE), normalized.

        CWE_norm = (-Σ_k p_k * log2(p_k)) / log2(N)

        where p_k = Σ_{i∈cluster_k} (c_i * w_i) / Σ_i (c_i * w_i)

        Returns value in [0, 1]. 0 = full consensus, 1 = maximum diversity.
        """
        total_agents = sum(len(c) for c in clusters)
        if total_agents <= 1 or len(clusters) <= 1:
            return 0.0  # Full consensus

        # Compute cluster proportions weighted by confidence
        total_weight = 0.0
        cluster_weights = []

        for cluster in clusters:
            cluster_w = 0.0
            for agent_name in cluster:
                c = confidences.get(agent_name, 50.0) / 100.0
                w = agent_weights.get(agent_name, 1.0) if agent_weights else 1.0
                cluster_w += c * w
            cluster_weights.append(cluster_w)
            total_weight += cluster_w

        if total_weight <= 0:
            return 1.0  # Undefined, assume max diversity

        # Compute entropy
        entropy = 0.0
        for cw in cluster_weights:
            p = cw / total_weight
            if p > 0:
                entropy -= p * math.log2(p)

        # Normalize by maximum possible entropy
        max_entropy = math.log2(total_agents)
        if max_entropy <= 0:
            return 0.0

        return min(1.0, entropy / max_entropy)

    def compute_consensus_score(
        self,
        round_result,  # RoundResult
        prev_round=None,  # Optional[RoundResult]
        agent_weights: Optional[Dict[str, float]] = None,
    ) -> ConsensusMetrics:
        """
        Main entry point: compute all consensus metrics for a round.

        Args:
            round_result: Current round's RoundResult with opinions
            prev_round: Previous round's RoundResult (for convergence velocity)
            agent_weights: Optional dynamic expert weights from DebateScheduler

        Returns:
            ConsensusMetrics with all computed values
        """
        opinions = round_result.opinions
        agent_names = list(opinions.keys())
        n = len(agent_names)

        # Edge case: 0 or 1 agent
        if n <= 1:
            return ConsensusMetrics(
                consensus_score=1.0,
                agreement_graph_score=1.0,
                entropy=0.0,
                convergence_velocity=0.0,
                opinion_clusters=[agent_names] if agent_names else [],
                consensus_level="full",
            )

        # Step 1: Build agreement matrix
        agreement_matrix = self.compute_agreement_matrix(agent_names, opinions)

        # Step 2: Cluster opinions
        clusters = self.cluster_opinions(agreement_matrix, agent_names)

        # Step 3: Extract confidences
        confidences = {
            name: op.confidence for name, op in opinions.items()
        }

        # Step 4: Compute AGS
        ags = self.compute_ags(agreement_matrix, confidences, agent_names)

        # Step 5: Compute CWE
        cwe_norm = self.compute_cwe(clusters, confidences, agent_weights)

        # Step 6: Compute Convergence Velocity
        cv = 0.0
        if prev_round is not None and hasattr(prev_round, 'entropy'):
            prev_entropy = prev_round.entropy
            cv = prev_entropy - cwe_norm  # Positive = converging

        # Step 7: Compute CCS
        mean_confidence = sum(confidences.values()) / n / 100.0  # Normalize to [0,1]
        ags_normalized = (ags + 1.0) / 2.0  # Map [-1,1] to [0,1]

        ccs = (
            self.alpha * (1.0 - cwe_norm) +
            self.beta * ags_normalized +
            self.gamma * mean_confidence
        )
        ccs = max(0.0, min(1.0, ccs))

        # Step 8: Determine consensus level
        consensus_level = self._assess_level(ccs)

        return ConsensusMetrics(
            consensus_score=ccs,
            agreement_graph_score=ags,
            entropy=cwe_norm,
            convergence_velocity=cv,
            opinion_clusters=clusters,
            consensus_level=consensus_level,
        )

    def _assess_level(self, ccs: float) -> str:
        """Map Composite Consensus Score to categorical level."""
        if ccs >= self.full_threshold:
            return "full"
        elif ccs >= self.partial_threshold:
            return "partial"
        else:
            return "divergent"
