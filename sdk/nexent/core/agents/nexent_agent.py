import re
from threading import Event
from typing import List

from smolagents import ActionStep, AgentText, TaskStep
from smolagents.tools import Tool

from ..models.openai_llm import OpenAIModel
from ..tools import *  # Used for tool creation, do not delete!!!
from ..utils.constants import THINK_TAG_PATTERN
from ..utils.observer import MessageObserver, ProcessType
from .agent_model import AgentConfig, AgentHistory, ModelConfig, ToolConfig
from .core_agent import CoreAgent, convert_code_format


class NexentAgent:
    def __init__(self, observer: MessageObserver,
                 model_config_list: List[ModelConfig],
                 stop_event: Event,
                 mcp_tool_collection=None,
                 confirmation_manager=None):
        """
        init the agent create factory

        Args:
            mcp_tool_collection:
            observer:
            model_config_list:
            confirmation_manager: Optional confirmation manager for interactive tool confirmation
        """
        if not isinstance(observer, MessageObserver):
            raise TypeError("Create Observer Object with MessageObserver")

        self.observer = observer
        self.model_config_list = model_config_list
        self.stop_event = stop_event
        self.mcp_tool_collection = mcp_tool_collection
        self.confirmation_manager = confirmation_manager

        self.agent = None

    def create_model(self, model_cite_name: str):
        """create a model instance"""
        # Filter out None values and find matching model config
        model_config = next(
            (model_config for model_config in self.model_config_list
             if model_config is not None and model_config.cite_name == model_cite_name),
            None
        )
        if model_config is None:
            raise ValueError(f"Model {model_cite_name} not found")
        model = OpenAIModel(
            observer=self.observer,
            model_id=model_config.model_name,
            api_key=model_config.api_key,
            api_base=model_config.url,
            temperature=model_config.temperature,
            top_p=model_config.top_p
        )
        model.stop_event = self.stop_event
        return model


    def create_local_tool(self, tool_config: ToolConfig):
        class_name = tool_config.class_name
        params = tool_config.params
        tool_class = globals().get(class_name)
        if tool_class is None:
            raise ValueError(f"{class_name} not found in local")
        else:
            if class_name == "KnowledgeBaseSearchTool":
                tools_obj = tool_class(index_names=tool_config.metadata.get("index_names", []),
                                       observer=self.observer,
                                       es_core=tool_config.metadata.get("es_core", []),
                                       embedding_model=tool_config.metadata.get("embedding_model", []),
                                       **params)
            else:
                tools_obj = tool_class(**params)
                if hasattr(tools_obj, 'observer'):
                    tools_obj.observer = self.observer
            return tools_obj

    def create_langchain_tool(self, tool_config: ToolConfig):
        tool_obj = tool_config.metadata
        return Tool.from_langchain(tool_obj)

    def create_mcp_tool(self, class_name):
        if self.mcp_tool_collection is None:
            raise ValueError("MCP tool collection is not initialized")
        tool_obj = next(
            (tool for tool in self.mcp_tool_collection.tools if tool.name == class_name),
            None
        )
        if tool_obj is None:
            raise ValueError(f"{class_name} not found in MCP server")
        return tool_obj

    def create_tool(self, tool_config: ToolConfig):
        """create a tool instance according to the tool config"""
        if not isinstance(tool_config, ToolConfig):
            raise TypeError("tool_config must be a ToolConfig object")
        try:
            class_name = tool_config.class_name
            source = tool_config.source

            if source == "local":
                tool_obj = self.create_local_tool(tool_config)
            elif source == "mcp":
                tool_obj = self.create_mcp_tool(class_name)
            elif source == "langchain":
                tool_obj = self.create_langchain_tool(tool_config)
            else:
                raise ValueError(f"unsupported tool source: {source}")

            # Apply confirmation wrapper for write-operation tools
            if self.confirmation_manager is not None:
                try:
                    from tool_collection.mcp.confirmable_wrapper import apply_confirmation_wrapper
                    tool_obj = apply_confirmation_wrapper(tool_obj, self.observer, self.confirmation_manager)
                except ImportError:
                    pass

            return tool_obj
        except Exception as e:
            raise ValueError(f"Error in creating tool: {e}")

    def create_single_agent(self, agent_config: AgentConfig):
        if not isinstance(agent_config, AgentConfig):
            raise TypeError("agent_config must be a AgentConfig object")

        try:
            model = self.create_model(agent_config.model_name)
            prompt_templates = agent_config.prompt_templates

            try:
                tool_list = [self.create_tool(tool_config) for tool_config in agent_config.tools]
            except Exception as e:
                raise ValueError(f"Error in creating tool: {e}")

            try:
                managed_agents_list = [self.create_single_agent(sub_agent_config) for sub_agent_config in agent_config.managed_agents]
            except Exception as e:
                raise ValueError(f"Error in creating managed agent: {e}")

            # create the agent
            agent = CoreAgent(
                observer=self.observer,
                tools=tool_list,
                model=model,
                name=agent_config.name,
                description=agent_config.description,
                max_steps=agent_config.max_steps,
                prompt_templates=prompt_templates,
                provide_run_summary=agent_config.provide_run_summary,
                managed_agents=managed_agents_list
            )
            agent.stop_event = self.stop_event

            return agent
        except Exception as e:
            raise ValueError(f"Error in creating agent, agent name: {agent_config.name}, Error: {e}")

    def add_history_to_agent(self, history: List[AgentHistory]):
        """
        Add conversation history to agent's memory

        Args:
            history: List of conversation messages with role and content
        """
        if history is None:
            return

        if not isinstance(self.agent, CoreAgent):
            raise TypeError(f"agent must be a CoreAgent object, not {type(self.agent)}")

        if not all(isinstance(msg, AgentHistory) for msg in history):
            raise TypeError("history must be a list of AgentHistory objects")

        self.agent.memory.reset()
        # Add conversation history to memory sequentially
        for msg in history:
            if msg.role == 'user':
                # Create task step for user message
                self.agent.memory.steps.append(TaskStep(task=msg.content))
            elif msg.role == 'assistant':
                self.agent.memory.steps.append(ActionStep(action_output=msg.content, model_output=msg.content))

    def agent_run_with_observer(self, query: str, reset=True, additional_args=None):
        if not isinstance(self.agent, CoreAgent):
            raise TypeError(f"agent must be a CoreAgent object, not {type(self.agent)}")

        observer = self.agent.observer
        try:
            for step_log in self.agent.run(query, stream=True, reset=reset, additional_args=additional_args):
                # Add content to observer
                if not isinstance(step_log, ActionStep):
                    continue
                # Keep duration
                if hasattr(step_log, "duration"):
                    observer.add_message("", ProcessType.TOKEN_COUNT, str(round(float(step_log.duration), 2)))

                if hasattr(step_log, "error") and step_log.error is not None:
                    observer.add_message("", ProcessType.ERROR, str(step_log.error))

            final_answer = step_log.final_answer  # Last log is the run's final_answer

            if isinstance(final_answer, AgentText):
                final_answer_str = convert_code_format(final_answer.to_string())
            else:
                # prepare for multi-modal final_answer
                final_answer_str = convert_code_format(str(final_answer))
            final_answer_str = re.sub(THINK_TAG_PATTERN, "", final_answer_str, flags=re.DOTALL | re.IGNORECASE)

            # Extract and emit report cards (<<<REPORT_CARD>>>...<<<END_REPORT_CARD>>> markers)
            final_answer_str = self._extract_and_emit_report_cards(final_answer_str, observer)

            observer.add_message(self.agent.agent_name, ProcessType.FINAL_ANSWER, final_answer_str)

            # Check if we need to stop from external stop_event
            if self.agent.stop_event.is_set():
                observer.add_message(self.agent.agent_name, ProcessType.ERROR,
                                     "Agent execution interrupted by external stop signal")
        except Exception as e:
            observer.add_message(agent_name=self.agent.agent_name, process_type=ProcessType.ERROR,
                                 content=f"Error in interaction: {str(e)}")
            raise ValueError(f"Error in interaction: {str(e)}")

    @staticmethod
    def _extract_and_emit_report_cards(text: str, observer: MessageObserver) -> str:
        """Extract <<<REPORT_CARD>>>...<<<END_REPORT_CARD>>> blocks from text,
        emit them as REPORT_CARD SSE messages, and return cleaned text."""
        import json

        pattern = re.compile(
            r"<<<REPORT_CARD>>>\s*(.*?)\s*<<<END_REPORT_CARD>>>",
            re.DOTALL
        )

        matches = pattern.findall(text)
        for match in matches:
            try:
                sanitized = match.strip()
                brace_start = sanitized.find('{')
                brace_end = sanitized.rfind('}')
                if brace_start != -1 and brace_end > brace_start:
                    sanitized = sanitized[brace_start:brace_end + 1]

                # LLM 输出可能在 JSON 字符串值内包含未转义的换行符（例如句子中间自动换行），
                # 导致 json.loads 失败。先尝试直接解析，失败后将换行及周围空白合并为单个空格再重试。
                try:
                    card_data = json.loads(sanitized)
                except json.JSONDecodeError:
                    sanitized = re.sub(r'\s*\n\s*', ' ', sanitized)
                    card_data = json.loads(sanitized)

                # Emit interpretation card if present
                if "report_interpretation" in card_data:
                    interp = card_data["report_interpretation"]
                    interp["card_type"] = "report_interpretation"
                    observer.add_message(
                        "", ProcessType.REPORT_CARD,
                        json.dumps(interp, ensure_ascii=False)
                    )

                # Emit QC check card if present
                if "qc_check" in card_data:
                    qc = card_data["qc_check"]
                    qc["card_type"] = "qc_check"
                    observer.add_message(
                        "", ProcessType.REPORT_CARD,
                        json.dumps(qc, ensure_ascii=False)
                    )

                # Emit symptom summary card if present
                if "symptom_summary" in card_data:
                    ss = card_data["symptom_summary"]
                    ss["card_type"] = "symptom_summary"
                    observer.add_message(
                        "", ProcessType.REPORT_CARD,
                        json.dumps(ss, ensure_ascii=False)
                    )

                # Emit triage recommendation card if present
                if "triage_recommendation" in card_data:
                    tr = card_data["triage_recommendation"]
                    tr["card_type"] = "triage_recommendation"
                    observer.add_message(
                        "", ProcessType.REPORT_CARD,
                        json.dumps(tr, ensure_ascii=False)
                    )

                # Emit reasoning chain card if present
                if "reasoning_chain" in card_data:
                    rc = card_data["reasoning_chain"]
                    rc["card_type"] = "reasoning_chain"
                    observer.add_message(
                        "", ProcessType.REPORT_CARD,
                        json.dumps(rc, ensure_ascii=False)
                    )
            except (json.JSONDecodeError, KeyError) as e:
                # JSON 解析失败，记录日志以便排查
                import logging
                logging.getLogger(__name__).warning(
                    f"REPORT_CARD JSON 解析失败: {type(e).__name__}: {e}\n"
                    f"原始内容前200字符: {match[:200]}"
                )

        if matches:
            # LLM 的输出结构通常为：思考文本 → <<<REPORT_CARD>>>JSON<<<END_REPORT_CARD>>> → 总结文本
            # 卡片数据已通过 SSE 发送，final_answer 只需保留最后一个 <<<END_REPORT_CARD>>> 之后的总结文字。
            end_marker = "<<<END_REPORT_CARD>>>"
            last_end_pos = text.rfind(end_marker)
            if last_end_pos != -1:
                cleaned = text[last_end_pos + len(end_marker):].strip()
            else:
                cleaned = pattern.sub("", text).strip()
        else:
            cleaned = text.strip()
        return cleaned

    def set_agent(self, agent: CoreAgent):
        if not isinstance(agent, CoreAgent):
            raise TypeError(f"agent must be a CoreAgent object, not {type(agent)}")
        self.agent = agent
