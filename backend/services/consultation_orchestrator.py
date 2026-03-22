"""
Consultation Orchestrator - Runs the multi-agent debate flow.
Manages parallel specialist agent execution, round-by-round debate,
and doctor intervention gates.
"""
import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Event
from typing import Any, Dict, List, Optional

from nexent.core.agents.agent_model import AgentConfig, AgentHistory, ModelConfig
from nexent.core.agents.nexent_agent import NexentAgent
from nexent.core.utils.observer import MessageObserver, ProcessType

from services.consultation_service import (
    AgentOpinion,
    ConsultationManager,
    RoundResult,
)
from services.consensus_engine import ConsensusEngine
from services.debate_scheduler import DebateScheduler, DebateStrategy
from database.consultation_db import create_consultation_record, update_consultation_record

logger = logging.getLogger(__name__)


class ConsultationOrchestrator:
    """Orchestrates multi-agent debate consultation sessions."""

    def __init__(
        self,
        observer: MessageObserver,
        consultation_manager: ConsultationManager,
        model_config_list: List[ModelConfig],
        stop_event: Event,
        confirmation_manager=None,
        tenant_id: str = "",
        user_id: str = "",
    ):
        self.observer = observer
        self.consultation_manager = consultation_manager
        self.model_config_list = model_config_list
        self.stop_event = stop_event
        self.confirmation_manager = confirmation_manager
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.consensus_engine = ConsensusEngine()
        self.debate_scheduler = DebateScheduler()

    def run_consultation(
        self,
        consultation_id: str,
        question: str,
        specialist_configs: List[Dict[str, Any]],
        coordinator_config: Optional[Dict[str, Any]],
        max_rounds: int = 5,
        additional_args: Optional[Dict[str, Any]] = None,
        mcp_host: Optional[List[str]] = None,
        conversation_id: Optional[int] = None,
        patient_id: Optional[int] = None,
    ):
        """
        Main orchestration loop for multi-agent debate.

        specialist_configs: list of dicts with keys:
            - agent_config: AgentConfig
            - name: str
            - specialty: str
        coordinator_config: dict with:
            - agent_config: AgentConfig
        """
        session = self.consultation_manager.get_session(consultation_id)
        if session is None:
            self.observer.add_message(
                "", ProcessType.ERROR, "Consultation session not found")
            return

        try:
            # Emit consultation start
            specialists_info = [
                {"name": sc["name"], "specialty": sc["specialty"]}
                for sc in specialist_configs
            ]
            self.observer.add_message(
                "", ProcessType.CONSULTATION_START,
                json.dumps({
                    "consultation_id": consultation_id,
                    "question": question,
                    "specialists": specialists_info,
                    "max_rounds": max_rounds,
                }, ensure_ascii=False)
            )

            all_round_results: List[RoundResult] = []
            doctor_instructions = ""

            for round_num in range(1, max_rounds + 1):
                if self.stop_event.is_set():
                    break

                session.current_round = round_num

                # Run all specialists in parallel
                round_result = self._run_specialist_round(
                    consultation_id=consultation_id,
                    round_num=round_num,
                    specialist_configs=specialist_configs,
                    question=question,
                    previous_rounds=all_round_results,
                    doctor_instructions=doctor_instructions,
                    additional_args=additional_args,
                    mcp_host=mcp_host,
                )
                all_round_results.append(round_result)
                self.consultation_manager.add_round_result(consultation_id, round_result)

                # Run adaptive debate scheduling
                scheduling = self.debate_scheduler.select_strategy(all_round_results)

                # Emit round complete with consensus metrics + scheduling
                self.observer.add_message(
                    "", ProcessType.CONSULTATION_ROUND_COMPLETE,
                    json.dumps({
                        "consultation_id": consultation_id,
                        "round": round_num,
                        "summary": round_result.summary,
                        "consensus_level": round_result.consensus_level,
                        "consensus_score": round(round_result.consensus_score, 4),
                        "entropy": round(round_result.entropy, 4),
                        "convergence_velocity": round(round_result.convergence_velocity, 4),
                        "opinion_clusters": round_result.opinion_clusters,
                        "scheduling": {
                            "strategy": scheduling.strategy.value,
                            "evnr": round(scheduling.evnr, 4),
                            "should_auto_terminate": scheduling.should_auto_terminate,
                            "recommendation": scheduling.recommendation_for_doctor,
                            "focus_pairs": [list(p) for p in scheduling.focus_pairs],
                        },
                    }, ensure_ascii=False)
                )

                # Auto-terminate if consensus is very high
                if scheduling.should_auto_terminate and round_result.consensus_score >= 0.9:
                    logger.info(f"Consultation {consultation_id} auto-terminated: "
                                f"CCS={round_result.consensus_score:.3f}, "
                                f"strategy={scheduling.strategy.value}")
                    break

                # Emit waiting for doctor
                self.observer.add_message(
                    "", ProcessType.CONSULTATION_WAITING_DOCTOR,
                    json.dumps({
                        "consultation_id": consultation_id,
                        "round": round_num,
                    }, ensure_ascii=False)
                )

                # Block until doctor decides
                decision = self.consultation_manager.wait_for_doctor_decision(
                    consultation_id, timeout=3600)

                if decision.get("action") == "conclude" or decision.get("action") == "error":
                    break

                # Doctor chose to continue, possibly with instructions
                doctor_instructions = decision.get("instructions", "")

                # If focused debate strategy, inject prompt modifier
                if scheduling.strategy == DebateStrategy.FOCUSED_DEBATE:
                    if doctor_instructions:
                        doctor_instructions += "\n\n" + scheduling.prompt_modifier
                    else:
                        doctor_instructions = scheduling.prompt_modifier

            # Run coordinator to form final consensus
            final_report = self._run_coordinator(
                consultation_id=consultation_id,
                question=question,
                all_round_results=all_round_results,
                specialist_configs=specialist_configs,
                coordinator_config=coordinator_config,
                additional_args=additional_args,
                mcp_host=mcp_host,
            )

            # Attach consensus metrics history to final report
            final_report["consensus_history"] = [
                {
                    "round": rr.round_num,
                    "consensus_score": round(rr.consensus_score, 4),
                    "entropy": round(rr.entropy, 4),
                    "convergence_velocity": round(rr.convergence_velocity, 4),
                }
                for rr in all_round_results
            ]

            # Emit consultation report via REPORT_CARD
            final_report["card_type"] = "consultation_report"
            self.observer.add_message(
                "", ProcessType.REPORT_CARD,
                json.dumps(final_report, ensure_ascii=False)
            )

            # Emit final answer
            self.observer.add_message(
                "", ProcessType.FINAL_ANSWER,
                final_report.get("final_recommendation", "会诊已完成。")
            )

            self.consultation_manager.complete_session(consultation_id)

            # Persist to database
            try:
                specialists_info = [
                    {"name": sc["name"], "specialty": sc["specialty"],
                     "agent_id": sc.get("agent_id")}
                    for sc in specialist_configs
                ]
                round_results_json = []
                consensus_metrics_json = []
                for rr in all_round_results:
                    round_data = {
                        "round": rr.round_num,
                        "consensus_level": rr.consensus_level,
                        "summary": rr.summary,
                        "opinions": {
                            name: {
                                "conclusion": op.conclusion,
                                "confidence": op.confidence,
                                "agrees_with": op.agrees_with,
                                "disagrees_with": op.disagrees_with,
                                "key_claims": op.key_claims,
                                "disagreement_reasons": op.disagreement_reasons,
                            }
                            for name, op in rr.opinions.items()
                        },
                    }
                    round_results_json.append(round_data)
                    consensus_metrics_json.append({
                        "round": rr.round_num,
                        "consensus_score": round(rr.consensus_score, 4),
                        "agreement_graph_score": round(rr.agreement_graph_score, 4),
                        "entropy": round(rr.entropy, 4),
                        "convergence_velocity": round(rr.convergence_velocity, 4),
                        "opinion_clusters": rr.opinion_clusters,
                        "consensus_level": rr.consensus_level,
                    })

                create_consultation_record(
                    data={
                        "consultation_uuid": consultation_id,
                        "question": question,
                        "status": "completed",
                        "total_rounds": len(all_round_results),
                        "max_rounds": max_rounds,
                        "specialist_agents": specialists_info,
                        "round_results": round_results_json,
                        "consensus_metrics": consensus_metrics_json,
                        "final_recommendation": final_report.get("final_recommendation"),
                        "agreements": final_report.get("agreements", []),
                        "disagreements": final_report.get("disagreements", []),
                        "confidence": final_report.get("confidence", 0),
                        "conversation_id": conversation_id,
                        "patient_id": patient_id,
                    },
                    tenant_id=self.tenant_id,
                    user_id=self.user_id,
                )
                logger.info(f"Persisted consultation {consultation_id} to database")
            except Exception as db_err:
                logger.error(f"Failed to persist consultation {consultation_id}: {db_err}")

        except Exception as e:
            logger.error(f"Consultation {consultation_id} error: {e}", exc_info=True)
            self.observer.add_message(
                "", ProcessType.ERROR,
                f"会诊过程出错: {str(e)}"
            )
            self.observer.add_message(
                "", ProcessType.FINAL_ANSWER,
                f"会诊过程中遇到错误: {str(e)}"
            )

    def _run_specialist_round(
        self,
        consultation_id: str,
        round_num: int,
        specialist_configs: List[Dict[str, Any]],
        question: str,
        previous_rounds: List[RoundResult],
        doctor_instructions: str = "",
        additional_args: Optional[Dict[str, Any]] = None,
        mcp_host: Optional[List[str]] = None,
    ) -> RoundResult:
        """Run all specialists in parallel for one round."""
        round_result = RoundResult(round_num=round_num)

        with ThreadPoolExecutor(max_workers=len(specialist_configs)) as executor:
            futures = {}
            for spec_config in specialist_configs:
                prompt = self._build_round_prompt(
                    specialist_name=spec_config["name"],
                    specialty=spec_config["specialty"],
                    question=question,
                    round_num=round_num,
                    previous_rounds=previous_rounds,
                    doctor_instructions=doctor_instructions,
                )
                future = executor.submit(
                    self._run_single_specialist,
                    consultation_id=consultation_id,
                    round_num=round_num,
                    spec_config=spec_config,
                    prompt=prompt,
                    additional_args=additional_args,
                    mcp_host=mcp_host,
                )
                futures[future] = spec_config["name"]

            for future in as_completed(futures):
                agent_name = futures[future]
                try:
                    opinion = future.result(timeout=180)
                    round_result.opinions[agent_name] = opinion
                except Exception as e:
                    logger.error(f"Specialist {agent_name} round {round_num} error: {e}")
                    round_result.opinions[agent_name] = AgentOpinion(
                        agent_name=agent_name,
                        specialty=next(
                            (sc["specialty"] for sc in specialist_configs if sc["name"] == agent_name),
                            "unknown"
                        ),
                        conclusion=f"分析出错: {str(e)}",
                    )

        # Build round summary
        round_result.summary = self._build_round_summary(round_result)

        # Compute quantitative consensus metrics (CWEC algorithm)
        prev_round = previous_rounds[-1] if previous_rounds else None
        agent_weights = self.debate_scheduler.compute_expert_weights(previous_rounds)
        metrics = self.consensus_engine.compute_consensus_score(
            round_result, prev_round, agent_weights or None)
        round_result.consensus_score = metrics.consensus_score
        round_result.agreement_graph_score = metrics.agreement_graph_score
        round_result.entropy = metrics.entropy
        round_result.convergence_velocity = metrics.convergence_velocity
        round_result.opinion_clusters = metrics.opinion_clusters
        round_result.consensus_level = metrics.consensus_level

        return round_result

    def _run_single_specialist(
        self,
        consultation_id: str,
        round_num: int,
        spec_config: Dict[str, Any],
        prompt: str,
        additional_args: Optional[Dict[str, Any]] = None,
        mcp_host: Optional[List[str]] = None,
    ) -> AgentOpinion:
        """Run a single specialist agent and return its opinion."""
        agent_name = spec_config["name"]
        specialty = spec_config["specialty"]
        agent_config: AgentConfig = spec_config["agent_config"]

        # Emit step: agent starting
        self.observer.add_message(
            agent_name, ProcessType.CONSULTATION_AGENT_STEP,
            json.dumps({
                "consultation_id": consultation_id,
                "agent_name": agent_name,
                "round": round_num,
                "step": f"{agent_name} 开始分析...",
                "type": "thinking",
            }, ensure_ascii=False)
        )

        try:
            # Create agent
            if mcp_host and len(mcp_host) > 0:
                from smolagents import ToolCollection
                mcp_client_list = [{"url": mcp_url} for mcp_url in mcp_host]
                with ToolCollection.from_mcp(mcp_client_list, trust_remote_code=True) as tool_collection:
                    nexent = NexentAgent(
                        observer=self.observer,
                        model_config_list=self.model_config_list,
                        stop_event=self.stop_event,
                        mcp_tool_collection=tool_collection,
                        confirmation_manager=self.confirmation_manager,
                    )
                    agent = nexent.create_single_agent(agent_config)
                    nexent.set_agent(agent)
                    final_answer = self._execute_agent(nexent, prompt, agent_name,
                                                       consultation_id, round_num, additional_args)
            else:
                nexent = NexentAgent(
                    observer=self.observer,
                    model_config_list=self.model_config_list,
                    stop_event=self.stop_event,
                    confirmation_manager=self.confirmation_manager,
                )
                agent = nexent.create_single_agent(agent_config)
                nexent.set_agent(agent)
                final_answer = self._execute_agent(nexent, prompt, agent_name,
                                                   consultation_id, round_num, additional_args)

            # Parse opinion from final answer
            opinion = self._parse_opinion(final_answer, agent_name, specialty)

            # Emit agent opinion
            self.observer.add_message(
                agent_name, ProcessType.CONSULTATION_AGENT_OPINION,
                json.dumps({
                    "consultation_id": consultation_id,
                    "agent_name": agent_name,
                    "round": round_num,
                    "conclusion": opinion.conclusion,
                    "confidence": opinion.confidence,
                    "agrees_with": opinion.agrees_with,
                    "disagrees_with": opinion.disagrees_with,
                }, ensure_ascii=False)
            )

            return opinion

        except Exception as e:
            logger.error(f"Specialist {agent_name} execution error: {e}", exc_info=True)
            self.observer.add_message(
                agent_name, ProcessType.CONSULTATION_AGENT_STEP,
                json.dumps({
                    "consultation_id": consultation_id,
                    "agent_name": agent_name,
                    "round": round_num,
                    "step": f"分析出错: {str(e)}",
                    "type": "conclusion",
                }, ensure_ascii=False)
            )
            raise

    def _execute_agent(self, nexent: NexentAgent, prompt: str, agent_name: str,
                       consultation_id: str, round_num: int,
                       additional_args: Optional[Dict[str, Any]] = None) -> str:
        """Execute an agent and stream intermediate steps via observer."""
        from smolagents import ActionStep, AgentText
        from nexent.core.agents.core_agent import convert_code_format
        from nexent.core.utils.constants import THINK_TAG_PATTERN

        final_answer_str = ""
        all_steps = []
        for step_log in nexent.agent.run(prompt, stream=True, reset=True, additional_args=additional_args):
            if not isinstance(step_log, ActionStep):
                continue
            all_steps.append(step_log)

        # Emit intermediate steps (exclude the last step which contains final_answer
        # to avoid duplicating content that will appear in the opinion)
        for step in all_steps[:-1] if len(all_steps) > 1 else []:
            if hasattr(step, "model_output") and step.model_output:
                clean_output = re.sub(THINK_TAG_PATTERN, "", str(step.model_output),
                                      flags=re.DOTALL | re.IGNORECASE)
                if clean_output.strip():
                    self.observer.add_message(
                        agent_name, ProcessType.CONSULTATION_AGENT_STEP,
                        json.dumps({
                            "consultation_id": consultation_id,
                            "agent_name": agent_name,
                            "round": round_num,
                            "step": clean_output[:500],
                            "type": "thinking",
                        }, ensure_ascii=False)
                    )

        # Get final answer from last step (not all steps have final_answer attr)
        final_answer = getattr(all_steps[-1], "final_answer", None) if all_steps else None
        if not final_answer and all_steps:
            # Fallback: use last step's model_output if no final_answer
            final_answer = getattr(all_steps[-1], "model_output", None) or ""
        if isinstance(final_answer, AgentText):
            final_answer_str = convert_code_format(final_answer.to_string())
        else:
            final_answer_str = convert_code_format(str(final_answer or ""))

        final_answer_str = re.sub(THINK_TAG_PATTERN, "", final_answer_str,
                                  flags=re.DOTALL | re.IGNORECASE)
        return final_answer_str

    def _build_round_prompt(
        self,
        specialist_name: str,
        specialty: str,
        question: str,
        round_num: int,
        previous_rounds: List[RoundResult],
        doctor_instructions: str = "",
    ) -> str:
        """Build the prompt for a specialist in a given round."""
        if round_num == 1:
            return (
                f"你是{specialty}专家（{specialist_name}），正在参与一场多学科会诊。\n\n"
                f"## 会诊问题\n{question}\n\n"
                f"## 要求\n"
                f"请从你的专业角度独立分析这个问题，给出你的诊断意见和建议。\n"
                f"在回答的最后，请用以下格式总结你的结论：\n"
                f"【结论】你的核心结论\n"
                f"【置信度】0-100之间的数字\n"
                f"【关键诊断要点】3-5个核心诊断要点，用逗号分隔\n"
            )

        # Round 2+: include previous opinions
        prev_opinions = []
        for prev_round in previous_rounds:
            for name, opinion in prev_round.opinions.items():
                if name != specialist_name:
                    prev_opinions.append(
                        f"- {name}（{opinion.specialty}）: {opinion.conclusion} "
                        f"(置信度: {opinion.confidence}%)"
                    )

        prev_text = "\n".join(prev_opinions) if prev_opinions else "暂无其他专家意见"

        doctor_text = ""
        if doctor_instructions:
            doctor_text = f"\n## 医生指导意见\n{doctor_instructions}\n"

        return (
            f"你是{specialty}专家（{specialist_name}），正在参与多学科会诊的第{round_num}轮讨论。\n\n"
            f"## 会诊问题\n{question}\n\n"
            f"## 其他专家的意见\n{prev_text}\n"
            f"{doctor_text}\n"
            f"## 要求\n"
            f"请审视其他专家的意见，从你的专业角度：\n"
            f"1. 指出你同意的观点并说明原因\n"
            f"2. 指出你不同意的观点并给出你的理由\n"
            f"3. 补充你认为其他专家遗漏的重要信息\n"
            f"4. 给出你更新后的诊断意见\n\n"
            f"在回答的最后，请用以下格式总结：\n"
            f"【结论】你的核心结论\n"
            f"【置信度】0-100之间的数字\n"
            f"【关键诊断要点】3-5个核心诊断要点，用逗号分隔\n"
            f"【同意】列出你同意的专家名字，用逗号分隔（如没有则写\"无\"）\n"
            f"【质疑】列出你质疑的专家名字，用逗号分隔（如没有则写\"无\"）\n"
            f"【质疑原因】被质疑专家名: 原因（每行一个，如没有则写\"无\"）\n"
        )

    def _parse_opinion(self, final_answer: str, agent_name: str, specialty: str) -> AgentOpinion:
        """Parse structured opinion from agent's final answer."""
        conclusion = final_answer
        confidence = 50.0
        agrees_with = []
        disagrees_with = []

        # Try to extract structured fields
        conclusion_match = re.search(r"【结论】(.+?)(?=\n【|$)", final_answer, re.DOTALL)
        if conclusion_match:
            conclusion = conclusion_match.group(1).strip()

        confidence_match = re.search(r"【置信度】\s*(\d+)", final_answer)
        if confidence_match:
            confidence = min(100.0, max(0.0, float(confidence_match.group(1))))

        agrees_match = re.search(r"【同意】(.+?)(?=\n【|$)", final_answer)
        if agrees_match:
            text = agrees_match.group(1).strip()
            if text != "无":
                agrees_with = [x.strip() for x in text.split("，") if x.strip()]
                if not agrees_with:
                    agrees_with = [x.strip() for x in text.split(",") if x.strip()]

        disagrees_match = re.search(r"【质疑】(.+?)(?=\n【|$)", final_answer)
        if disagrees_match:
            text = disagrees_match.group(1).strip()
            if text != "无":
                disagrees_with = [x.strip() for x in text.split("，") if x.strip()]
                if not disagrees_with:
                    disagrees_with = [x.strip() for x in text.split(",") if x.strip()]

        # Extract key diagnostic claims
        key_claims = []
        claims_match = re.search(r"【关键诊断要点】(.+?)(?=\n【|$)", final_answer, re.DOTALL)
        if claims_match:
            text = claims_match.group(1).strip()
            key_claims = [x.strip() for x in re.split(r"[，,、]", text) if x.strip()]

        # Extract disagreement reasons
        disagreement_reasons = {}
        reasons_match = re.search(r"【质疑原因】(.+?)(?=\n【|$)", final_answer, re.DOTALL)
        if reasons_match:
            text = reasons_match.group(1).strip()
            if text != "无":
                for line in text.split("\n"):
                    line = line.strip()
                    if ":" in line or "：" in line:
                        sep = "：" if "：" in line else ":"
                        parts = line.split(sep, 1)
                        if len(parts) == 2:
                            disagreement_reasons[parts[0].strip()] = parts[1].strip()

        return AgentOpinion(
            agent_name=agent_name,
            specialty=specialty,
            conclusion=conclusion,
            confidence=confidence,
            agrees_with=agrees_with,
            disagrees_with=disagrees_with,
            key_claims=key_claims,
            disagreement_reasons=disagreement_reasons,
        )

    def _run_coordinator(
        self,
        consultation_id: str,
        question: str,
        all_round_results: List[RoundResult],
        specialist_configs: List[Dict[str, Any]],
        coordinator_config: Optional[Dict[str, Any]] = None,
        additional_args: Optional[Dict[str, Any]] = None,
        mcp_host: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Run coordinator agent to synthesize all opinions into a final report."""
        # Build synthesis prompt
        all_opinions_text = []
        for round_result in all_round_results:
            all_opinions_text.append(f"\n### 第{round_result.round_num}轮")
            for name, opinion in round_result.opinions.items():
                all_opinions_text.append(
                    f"**{name}（{opinion.specialty}）**:\n"
                    f"结论: {opinion.conclusion}\n"
                    f"置信度: {opinion.confidence}%\n"
                    f"同意: {', '.join(opinion.agrees_with) if opinion.agrees_with else '无'}\n"
                    f"质疑: {', '.join(opinion.disagrees_with) if opinion.disagrees_with else '无'}\n"
                )

        opinions_text = "\n".join(all_opinions_text)

        synthesis_prompt = (
            f"你是多学科会诊的主持人，负责综合所有专家意见形成最终会诊结论。\n\n"
            f"## 会诊问题\n{question}\n\n"
            f"## 各轮讨论记录\n{opinions_text}\n\n"
            f"## 要求\n"
            f"请综合分析所有专家的意见，输出以下内容：\n"
            f"1. 各专家的共识点（所有人一致同意的观点）\n"
            f"2. 分歧点（存在不同意见的地方及各方理由）\n"
            f"3. 最终推荐方案（你综合考虑后的建议）\n"
            f"4. 整体置信度评估\n\n"
            f"请严格按以下JSON格式输出（不要输出其他内容）：\n"
            f'{{"consultation_id": "{consultation_id}", '
            f'"question": "{question}", '
            f'"total_rounds": {len(all_round_results)}, '
            f'"specialists": [按每位专家一个对象，含name, specialty, final_opinion字段], '
            f'"agreements": [共识点列表，每项为字符串], '
            f'"disagreements": [分歧点列表，每项为字符串], '
            f'"final_recommendation": "最终推荐方案的详细文字", '
            f'"confidence": 0到100之间的数字}}'
        )

        # Use coordinator config if provided, otherwise use the first specialist's config as fallback
        if coordinator_config and "agent_config" in coordinator_config:
            coord_agent_config = coordinator_config["agent_config"]
        else:
            # Create a minimal coordinator config from first specialist
            coord_agent_config = specialist_configs[0]["agent_config"].model_copy()
            coord_agent_config.name = "consultation_coordinator"
            coord_agent_config.description = "会诊主持人，负责综合各方意见形成最终结论"

        # Coordinator needs more steps to synthesize all opinions
        coord_agent_config.max_steps = max(coord_agent_config.max_steps, 10)

        try:
            nexent = NexentAgent(
                observer=self.observer,
                model_config_list=self.model_config_list,
                stop_event=self.stop_event,
            )
            agent = nexent.create_single_agent(coord_agent_config)
            nexent.set_agent(agent)

            final_answer = self._execute_agent(
                nexent, synthesis_prompt, "coordinator",
                consultation_id, 0, additional_args
            )

            # Try to parse JSON from coordinator's answer.
            # The model may wrap JSON in ```json ... ``` blocks or add trailing text,
            # so we strip markdown fences first, then try parsing from each '{'.
            try:
                # Strip markdown code fences
                cleaned = re.sub(r'```(?:json)?\s*', '', final_answer)
                cleaned = re.sub(r'```', '', cleaned)

                for i, ch in enumerate(cleaned):
                    if ch == '{':
                        # Try to find the matching closing brace
                        depth = 0
                        for j in range(i, len(cleaned)):
                            if cleaned[j] == '{':
                                depth += 1
                            elif cleaned[j] == '}':
                                depth -= 1
                                if depth == 0:
                                    try:
                                        report = json.loads(cleaned[i:j+1])
                                        if isinstance(report, dict) and "consultation_id" in report:
                                            return report
                                    except json.JSONDecodeError:
                                        break
                        break  # Only try the first '{' after cleaning
            except Exception:
                pass

            # Fallback: construct report from text
            return {
                "consultation_id": consultation_id,
                "question": question,
                "total_rounds": len(all_round_results),
                "specialists": [
                    {
                        "name": sc["name"],
                        "specialty": sc["specialty"],
                        "final_opinion": all_round_results[-1].opinions.get(
                            sc["name"], AgentOpinion(agent_name=sc["name"], specialty=sc["specialty"], conclusion="未参与")
                        ).conclusion if all_round_results else "未参与",
                    }
                    for sc in specialist_configs
                ],
                "agreements": [],
                "disagreements": [],
                "final_recommendation": final_answer,
                "confidence": 50,
            }

        except Exception as e:
            logger.error(f"Coordinator execution error: {e}", exc_info=True)
            return {
                "consultation_id": consultation_id,
                "question": question,
                "total_rounds": len(all_round_results),
                "specialists": [
                    {
                        "name": sc["name"],
                        "specialty": sc["specialty"],
                        "final_opinion": all_round_results[-1].opinions.get(
                            sc["name"], AgentOpinion(agent_name=sc["name"], specialty=sc["specialty"], conclusion="未参与")
                        ).conclusion if all_round_results else "未参与",
                    }
                    for sc in specialist_configs
                ],
                "agreements": [],
                "disagreements": [],
                "final_recommendation": f"会诊综合分析出错: {str(e)}",
                "confidence": 0,
            }

    @staticmethod
    def _build_round_summary(round_result: RoundResult) -> str:
        """Build a text summary for a completed round."""
        parts = []
        for name, opinion in round_result.opinions.items():
            parts.append(f"{name}: {opinion.conclusion[:100]}")
        return " | ".join(parts) if parts else "无意见"

