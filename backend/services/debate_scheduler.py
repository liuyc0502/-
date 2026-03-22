"""
Adaptive Debate Scheduler (ADS).

Dynamically controls multi-agent debate flow using convergence detection,
expected value of information analysis, and disagreement focus scoring.

Implements four debate strategies:
1. CONVERGED - consensus reached, recommend termination
2. PROGRESSING - opinions converging, continue standard debate
3. FOCUSED_DEBATE - stagnated but resolvable disagreements exist, narrow debate scope
4. STAGNATED - no progress and no resolvable disagreements, recommend termination

References:
- Page (1954), "Continuous inspection schemes" (CUSUM)
- Howard (1966), "Information value theory"
- Dung (1995), "On the acceptability of arguments"
"""
import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple


class DebateStrategy(Enum):
    CONVERGED = "converged"
    PROGRESSING = "progressing"
    FOCUSED_DEBATE = "focused_debate"
    STAGNATED = "stagnated"


@dataclass
class SchedulingDecision:
    """Output of the debate scheduler for a given round."""
    strategy: DebateStrategy
    should_auto_terminate: bool
    evnr: float                                     # Expected Value of Next Round
    focus_pairs: List[Tuple[str, str]] = field(default_factory=list)
    focus_topics: List[str] = field(default_factory=list)
    prompt_modifier: str = ""                        # Additional text for focused debate
    recommendation_for_doctor: str = ""              # Human-readable suggestion


class DebateScheduler:
    """
    Adaptive debate scheduling using convergence detection and
    expected value of information analysis.

    Parameters:
        convergence_threshold: Minimum meaningful convergence delta (CUSUM drift)
        stop_threshold: EVNR below this triggers termination recommendation
        focus_dfs_threshold: DFS above this identifies resolvable disagreements
        convergence_ccs_threshold: CCS above this means consensus reached
        cv_progressing_threshold: CV above this means debate is progressing
    """

    def __init__(
        self,
        convergence_threshold: float = 0.02,
        stop_threshold: float = 0.03,
        focus_dfs_threshold: float = 0.3,
        convergence_ccs_threshold: float = 0.85,
        cv_progressing_threshold: float = 0.05,
    ):
        self.convergence_threshold = convergence_threshold
        self.stop_threshold = stop_threshold
        self.focus_dfs_threshold = focus_dfs_threshold
        self.convergence_ccs_threshold = convergence_ccs_threshold
        self.cv_progressing_threshold = cv_progressing_threshold
        self.cusum = 0.0
        self._stagnation_count = 0

    @staticmethod
    def _sigmoid(x: float) -> float:
        """Numerically stable sigmoid function."""
        if x >= 0:
            return 1.0 / (1.0 + math.exp(-x))
        else:
            exp_x = math.exp(x)
            return exp_x / (1.0 + exp_x)

    def compute_evnr(self, all_rounds) -> float:
        """
        Expected Value of Next Round (EVNR).

        EVNR^t = (1 - CCS^t) * P(improvement) * magnitude_estimate

        P(improvement) = sigmoid(3 * mean_recent_CV)
        magnitude_estimate = mean(|CV|) over available rounds

        Returns value in [0, 1]. Higher = more value in continuing.
        """
        if not all_rounds:
            return 1.0  # No data yet, assume high value

        current = all_rounds[-1]
        ccs = current.consensus_score
        room_for_improvement = 1.0 - ccs

        # Gather convergence velocities
        cvs = [r.convergence_velocity for r in all_rounds if hasattr(r, 'convergence_velocity')]

        if len(cvs) < 1:
            return room_for_improvement * 0.5  # Assume moderate probability

        # P(improvement) from recent CV trend
        recent_cvs = cvs[-2:] if len(cvs) >= 2 else cvs
        mean_recent_cv = sum(recent_cvs) / len(recent_cvs)
        p_improvement = self._sigmoid(3.0 * mean_recent_cv)

        # Magnitude estimate from all CVs
        magnitude = sum(abs(cv) for cv in cvs) / len(cvs) if cvs else 0.0
        # Scale magnitude to be more meaningful (typical CV is 0-0.5)
        magnitude = min(1.0, magnitude * 2.0)

        evnr = room_for_improvement * p_improvement * max(magnitude, 0.01)
        return max(0.0, min(1.0, evnr))

    def compute_dfs_matrix(
        self,
        round_result,  # RoundResult
    ) -> Dict[Tuple[str, str], float]:
        """
        Disagreement Focus Score (DFS) for all disagreeing pairs.

        DFS(i,j) = |c_i - c_j| * (c_i + c_j) / 2

        Only computed for pairs where at least one agent disagrees with the other.
        Higher DFS = high-confidence disagreement where one side is much more
        confident, making it a productive target for focused debate.

        Returns dict mapping (agent_i, agent_j) -> DFS score.
        """
        dfs_scores = {}
        opinions = round_result.opinions

        for name_i, op_i in opinions.items():
            for name_j, op_j in opinions.items():
                if name_i >= name_j:
                    continue  # Avoid duplicates

                # Check if there's a disagreement between this pair
                has_disagree = (
                    name_j in op_i.disagrees_with or
                    name_i in op_j.disagrees_with
                )
                if not has_disagree:
                    continue

                ci = op_i.confidence / 100.0
                cj = op_j.confidence / 100.0

                dfs = abs(ci - cj) * (ci + cj) / 2.0
                dfs_scores[(name_i, name_j)] = dfs

        return dfs_scores

    def update_cusum(self, cv: float) -> float:
        """
        Update CUSUM statistic for stagnation detection.

        S^t = max(0, S^{t-1} + CV^t - delta)

        When S stays at 0 for consecutive rounds, debate has stagnated.
        """
        self.cusum = max(0.0, self.cusum + cv - self.convergence_threshold)
        if self.cusum == 0.0:
            self._stagnation_count += 1
        else:
            self._stagnation_count = 0
        return self.cusum

    def compute_expert_weights(
        self,
        all_rounds,  # List[RoundResult]
    ) -> Dict[str, float]:
        """
        Dynamic expert weight based on alignment with emerging consensus.

        w_i = (rounds_in_majority / total_rounds) ^ 0.5

        An agent is "in majority" for a round if their opinion cluster
        is the largest cluster in that round.

        Returns dict mapping agent_name -> weight (default 1.0).
        """
        if not all_rounds:
            return {}

        # Count how often each agent was in the majority cluster
        agent_majority_count: Dict[str, int] = {}
        agent_total_count: Dict[str, int] = {}

        for rr in all_rounds:
            clusters = rr.opinion_clusters if hasattr(rr, 'opinion_clusters') else []
            if not clusters:
                continue

            # Find largest cluster
            largest_cluster = max(clusters, key=len)

            for name in rr.opinions:
                agent_total_count[name] = agent_total_count.get(name, 0) + 1
                if name in largest_cluster:
                    agent_majority_count[name] = agent_majority_count.get(name, 0) + 1

        # Compute weights
        weights = {}
        for name, total in agent_total_count.items():
            majority = agent_majority_count.get(name, 0)
            ratio = majority / total if total > 0 else 0.5
            weights[name] = math.sqrt(ratio)

        return weights

    def select_strategy(
        self,
        all_rounds,  # List[RoundResult]
    ) -> SchedulingDecision:
        """
        Main entry: analyze debate history and recommend next action.

        Decision tree:
        1. CCS >= threshold -> CONVERGED (auto-terminate)
        2. CV > threshold -> PROGRESSING (continue normally)
        3. CV <= threshold AND max(DFS) > threshold -> FOCUSED_DEBATE
        4. CV <= threshold AND max(DFS) <= threshold -> STAGNATED
        """
        if not all_rounds:
            return SchedulingDecision(
                strategy=DebateStrategy.PROGRESSING,
                should_auto_terminate=False,
                evnr=1.0,
                recommendation_for_doctor="会诊刚开始，等待第一轮结果。",
            )

        current = all_rounds[-1]
        ccs = current.consensus_score
        cv = current.convergence_velocity

        # Update CUSUM
        self.update_cusum(cv)

        # Compute EVNR
        evnr = self.compute_evnr(all_rounds)

        # Check strategy conditions
        # 1. CONVERGED
        if ccs >= self.convergence_ccs_threshold:
            return SchedulingDecision(
                strategy=DebateStrategy.CONVERGED,
                should_auto_terminate=True,
                evnr=evnr,
                recommendation_for_doctor=(
                    f"专家已达成高度共识（共识分数: {ccs:.0%}），建议形成结论。"
                ),
            )

        # 2. PROGRESSING
        if cv > self.cv_progressing_threshold:
            return SchedulingDecision(
                strategy=DebateStrategy.PROGRESSING,
                should_auto_terminate=False,
                evnr=evnr,
                recommendation_for_doctor=(
                    f"辩论正在收敛（收敛速度: {cv:.3f}），建议继续下一轮。"
                ),
            )

        # For non-progressing rounds, check DFS
        dfs_scores = self.compute_dfs_matrix(current)
        max_dfs = max(dfs_scores.values()) if dfs_scores else 0.0

        # 3. FOCUSED_DEBATE
        if max_dfs > self.focus_dfs_threshold:
            # Sort pairs by DFS descending, take top disagreements
            sorted_pairs = sorted(dfs_scores.items(), key=lambda x: x[1], reverse=True)
            focus_pairs = [pair for pair, _ in sorted_pairs[:3]]

            # Build focus topics from disagreement reasons
            focus_topics = []
            for (name_i, name_j) in focus_pairs:
                op_i = current.opinions.get(name_i)
                op_j = current.opinions.get(name_j)
                if op_i and name_j in op_i.disagreement_reasons:
                    focus_topics.append(f"{name_i}质疑{name_j}: {op_i.disagreement_reasons[name_j]}")
                if op_j and name_i in op_j.disagreement_reasons:
                    focus_topics.append(f"{name_j}质疑{name_i}: {op_j.disagreement_reasons[name_i]}")

            prompt_modifier = self._build_focused_prompt_modifier(focus_pairs, focus_topics, current)

            pair_names = [f"{a} vs {b}" for a, b in focus_pairs]
            return SchedulingDecision(
                strategy=DebateStrategy.FOCUSED_DEBATE,
                should_auto_terminate=False,
                evnr=evnr,
                focus_pairs=focus_pairs,
                focus_topics=focus_topics,
                prompt_modifier=prompt_modifier,
                recommendation_for_doctor=(
                    f"辩论停滞但存在可解决的关键分歧（{', '.join(pair_names)}），"
                    f"建议聚焦辩论。继续下一轮将自动聚焦到这些分歧点。"
                ),
            )

        # 4. STAGNATED
        should_stop = evnr < self.stop_threshold or self._stagnation_count >= 2
        return SchedulingDecision(
            strategy=DebateStrategy.STAGNATED,
            should_auto_terminate=should_stop,
            evnr=evnr,
            recommendation_for_doctor=(
                f"辩论已停滞（收敛速度: {cv:.3f}，继续价值: {evnr:.3f}），"
                f"继续辩论不太可能改变结果。建议形成结论或提供指导意见。"
            ),
        )

    def _build_focused_prompt_modifier(
        self,
        focus_pairs: List[Tuple[str, str]],
        focus_topics: List[str],
        round_result,  # RoundResult
    ) -> str:
        """Generate prompt text that narrows debate to key disagreements."""
        lines = ["本轮辩论请重点关注以下核心分歧：\n"]

        for idx, (name_i, name_j) in enumerate(focus_pairs, 1):
            op_i = round_result.opinions.get(name_i)
            op_j = round_result.opinions.get(name_j)

            lines.append(f"### 分歧 {idx}: {name_i} vs {name_j}")
            if op_i:
                lines.append(f"- {name_i}的观点: {op_i.conclusion[:200]}")
            if op_j:
                lines.append(f"- {name_j}的观点: {op_j.conclusion[:200]}")

        if focus_topics:
            lines.append("\n### 质疑理由")
            for topic in focus_topics[:5]:
                lines.append(f"- {topic}")

        lines.append(
            "\n请针对上述分歧点提供你的专业判断，给出明确的支持或反对理由，"
            "引用具体的医学证据或临床经验。"
        )

        return "\n".join(lines)
