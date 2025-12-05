import threading
import logging
from urllib.parse import urljoin
from datetime import datetime

from jinja2 import Template, StrictUndefined
from smolagents.utils import BASE_BUILTIN_MODULES
from nexent.core.utils.observer import MessageObserver
from nexent.core.agents.agent_model import AgentRunInfo, ModelConfig, AgentConfig, ToolConfig
from nexent.memory.memory_service import search_memory_in_levels

from services.elasticsearch_service import ElasticSearchService, elastic_core, get_embedding_model
from services.tenant_config_service import get_selected_knowledge_list
from services.remote_mcp_service import get_remote_mcp_server_list
from services.memory_config_service import build_memory_context
from database.agent_db import search_agent_info_by_agent_id, query_sub_agents_id_list
from database.tool_db import search_tools_for_sub_agent
from database.model_management_db import get_model_records, get_model_by_model_id
from utils.model_name_utils import add_repo_to_name
from utils.prompt_template_utils import get_agent_prompt_template
from utils.config_utils import tenant_config_manager, get_model_name_from_config
from utils.patient_auth_utils import get_patient_id_from_user_id, get_patient_medical_record_no_from_user_id
from database.patient_db import get_patient_by_id, get_patient_by_email
from consts.const import LOCAL_MCP_SERVER, MODEL_CONFIG_MAPPING, LANGUAGE

logger = logging.getLogger("create_agent_info")
logger.setLevel(logging.DEBUG)


async def create_model_config_list(tenant_id):
    records = get_model_records({"model_type": "llm"}, tenant_id)
    model_list = []
    for record in records:
        model_list.append(
            ModelConfig(cite_name=record["display_name"],
                        api_key=record.get("api_key", ""),
                        model_name=add_repo_to_name(
                                model_repo=record["model_repo"],
                                model_name=record["model_name"],
                            ),
                        url=record["base_url"]))
    # fit for old version, main_model and sub_model use default model
    main_model_config = tenant_config_manager.get_model_config(
        key=MODEL_CONFIG_MAPPING["llm"], tenant_id=tenant_id)
    model_list.append(
        ModelConfig(cite_name="main_model",
                    api_key=main_model_config.get("api_key", ""),
                    model_name=get_model_name_from_config(main_model_config) if main_model_config.get(
                        "model_name") else "",
                    url=main_model_config.get("base_url", "")))
    model_list.append(
        ModelConfig(cite_name="sub_model",
                    api_key=main_model_config.get("api_key", ""),
                    model_name=get_model_name_from_config(main_model_config) if main_model_config.get(
                        "model_name") else "",
                    url=main_model_config.get("base_url", "")))

    return model_list


async def create_agent_config(
    agent_id,
    tenant_id,
    user_id,
    language: str = LANGUAGE["ZH"],
    last_user_query: str = None,
    allow_memory_search: bool = True,
    portal_type: str = None,
    user_email: str = None,
):
    agent_info = search_agent_info_by_agent_id(
        agent_id=agent_id, tenant_id=tenant_id)

    # create sub agent
    sub_agent_id_list = query_sub_agents_id_list(
        main_agent_id=agent_id, tenant_id=tenant_id)
    managed_agents = []
    for sub_agent_id in sub_agent_id_list:
        sub_agent_config = await create_agent_config(
            agent_id=sub_agent_id,
            tenant_id=tenant_id,
            user_id=user_id,
            language=language,
            last_user_query=last_user_query,
            allow_memory_search=allow_memory_search,
            portal_type=portal_type,
            user_email=user_email,
        )
        managed_agents.append(sub_agent_config)

    tool_list = await create_tool_config_list(agent_id, tenant_id, user_id)

    # Build system prompt: prioritize segmented fields, fallback to original prompt field if not available
    duty_prompt = agent_info.get("duty_prompt", "")
    constraint_prompt = agent_info.get("constraint_prompt", "")
    few_shots_prompt = agent_info.get("few_shots_prompt", "")

    # Get template content
    prompt_template = get_agent_prompt_template(
        is_manager=len(managed_agents) > 0, language=language)

    # Get app information
    default_app_description = 'Nexent 是一个开源智能体SDK和平台' if language == 'zh' else 'Nexent is an open-source agent SDK and platform'
    app_name = tenant_config_manager.get_app_config(
        'APP_NAME', tenant_id=tenant_id) or "Nexent"
    app_description = tenant_config_manager.get_app_config(
        'APP_DESCRIPTION', tenant_id=tenant_id) or default_app_description

    # Get memory list
    memory_context = build_memory_context(user_id, tenant_id, agent_id)
    memory_list = []
    if allow_memory_search and memory_context.user_config.memory_switch:
        logger.debug("Retrieving memory list...")
        memory_levels = ["tenant", "agent", "user", "user_agent"]
        if memory_context.user_config.agent_share_option == "never":
            memory_levels.remove("agent")
        if memory_context.agent_id in memory_context.user_config.disable_agent_ids:
            memory_levels.remove("agent")
        if memory_context.agent_id in memory_context.user_config.disable_user_agent_ids:
            memory_levels.remove("user_agent")

        try:
            search_res = await search_memory_in_levels(
                query_text=last_user_query,
                memory_config=memory_context.memory_config,
                tenant_id=memory_context.tenant_id,
                user_id=memory_context.user_id,
                agent_id=memory_context.agent_id,
                memory_levels=memory_levels,
            )
            memory_list = search_res.get("results", [])
            logger.debug(f"Retrieved memory list: {memory_list}")
        except Exception as e:
            # Bubble up to streaming layer so it can emit <MEM_FAILED> and fall back
            raise Exception(f"Failed to retrieve memory list: {e}")

    # Build knowledge base summary
    knowledge_base_summary = ""
    try:
        for tool in tool_list:
            if "KnowledgeBaseSearchTool" == tool.class_name:
                knowledge_info_list = get_selected_knowledge_list(
                    tenant_id=tenant_id, user_id=user_id)
                if knowledge_info_list:
                    for knowledge_info in knowledge_info_list:
                        knowledge_name = knowledge_info.get("index_name")
                        try:
                            message = ElasticSearchService().get_summary(index_name=knowledge_name)
                            summary = message.get("summary", "")
                            knowledge_base_summary += f"**{knowledge_name}**: {summary}\n\n"
                        except Exception as e:
                            logger.warning(
                                f"Failed to get summary for knowledge base {knowledge_name}: {e}")
                else:
                    # TODO: Prompt should be refactored to yaml file
                    knowledge_base_summary = "当前没有可用的知识库索引。\n" if language == 'zh' else "No knowledge base indexes are currently available.\n"
                break  # Only process the first KnowledgeBaseSearchTool found
    except Exception as e:
        logger.error(f"Failed to build knowledge base summary: {e}")

    # Patient identity injection for patient portal
    patient_context = {}
    if portal_type == "patient":
        try:
            logger.info(f"Patient portal detected - injecting patient identity for user {user_id}")
            # Priority: 1. Use user_email directly (most reliable, no external API call)
            #           2. Fallback to user_id mapping (requires Supabase or TEST_PATIENT_EMAIL)
            patient_id = None
            if user_email:
                patient = get_patient_by_email(user_email, tenant_id)
                if patient:
                    patient_id = str(patient.get("patient_id"))
                    logger.info(f"Found patient_id={patient_id} via user_email={user_email}")
            if not patient_id:
                patient_id = get_patient_id_from_user_id(user_id, tenant_id)
            if patient_id:
                patient_data = get_patient_by_id(patient_id, tenant_id)
                if patient_data:
                    patient_context = {
                        "patient_id": patient_id,
                        "patient_name": patient_data.get("name"),
                        "patient_medical_record_no": patient_data.get("medical_record_no"),
                        "patient_email": patient_data.get("email"),
                        "patient_age": patient_data.get("age"),
                        "patient_gender": patient_data.get("gender"),
                    }
                    logger.info(f"Patient identity injected: {patient_context.get('patient_name')} (ID: {patient_id}, MRN: {patient_context.get('patient_medical_record_no')})")
                else:
                    logger.warning(f"Patient data not found for patient_id {patient_id}")
            else:
                logger.warning(f"Could not map user_id {user_id} to patient_id")
        except Exception as e:
            logger.error(f"Failed to inject patient identity: {e}")

    # Assemble system_prompt
    if duty_prompt or constraint_prompt or few_shots_prompt:
        template_vars = {
            "duty": duty_prompt,
            "constraint": constraint_prompt,
            "few_shots": few_shots_prompt,
            "tools": {tool.name: tool for tool in tool_list},
            "managed_agents": {agent.name: agent for agent in managed_agents},
            "authorized_imports": str(BASE_BUILTIN_MODULES),
            "APP_NAME": app_name,
            "APP_DESCRIPTION": app_description,
            "memory_list": memory_list,
            "knowledge_base_summary": knowledge_base_summary,
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            **patient_context  # Inject patient context variables
        }
        system_prompt = Template(prompt_template["system_prompt"], undefined=StrictUndefined).render(template_vars)
    else:
        system_prompt = agent_info.get("prompt", "")

    if agent_info.get("model_id") is not None:
        model_info = get_model_by_model_id(agent_info.get("model_id"))
        model_name = model_info["display_name"] if model_info is not None else "main_model"
    else:
        model_name = "main_model"
    agent_config = AgentConfig(
        name="undefined" if agent_info["name"] is None else agent_info["name"],
        description="undefined" if agent_info["description"] is None else agent_info["description"],
        prompt_templates=await prepare_prompt_templates(
            is_manager=len(managed_agents) > 0,
            system_prompt=system_prompt,
            language=language
        ),
        tools=tool_list,
        max_steps=agent_info.get("max_steps", 10),
        model_name=model_name,
        provide_run_summary=agent_info.get("provide_run_summary", False),
        managed_agents=managed_agents
    )
    return agent_config


async def create_tool_config_list(agent_id, tenant_id, user_id):
    # create tool
    tool_config_list = []
    langchain_tools = await discover_langchain_tools()

    # now only admin can modify the agent, user_id is not used
    tools_list = search_tools_for_sub_agent(agent_id, tenant_id)
    for tool in tools_list:
        param_dict = {}
        for param in tool.get("params", []):
            param_dict[param["name"]] = param.get("default")
        tool_config = ToolConfig(
            class_name=tool.get("class_name"),
            name=tool.get("name"),
            description=tool.get("description"),
            inputs=tool.get("inputs"),
            output_type=tool.get("output_type"),
            params=param_dict,
            source=tool.get("source"),
            usage=tool.get("usage")
        )

        if tool.get("source") == "langchain":
            tool_class_name = tool.get("class_name")
            for langchain_tool in langchain_tools:
                if langchain_tool.name == tool_class_name:
                    tool_config.metadata = langchain_tool
                    break

        # special logic for knowledge base search tool
        if tool_config.class_name == "KnowledgeBaseSearchTool":
            knowledge_info_list = get_selected_knowledge_list(
                tenant_id=tenant_id, user_id=user_id)
            index_names = [knowledge_info.get(
                "index_name") for knowledge_info in knowledge_info_list]
            tool_config.metadata = {"index_names": index_names,
                                    "es_core": elastic_core,
                                    "embedding_model": get_embedding_model(tenant_id=tenant_id)}
        tool_config_list.append(tool_config)

    return tool_config_list


async def discover_langchain_tools():
    """
    Discover LangChain tools implemented with the `@tool` decorator.

    Returns:
        list: List of discovered LangChain tool instances
    """
    from utils.langchain_utils import discover_langchain_modules

    langchain_tools = []

    # ----------------------------------------------
    # Discover LangChain tools implemented with the
    # `@tool` decorator and convert them to ToolConfig
    # ----------------------------------------------
    try:
        # Use the utility function to discover all BaseTool objects
        discovered_tools = discover_langchain_modules()

        for obj, filename in discovered_tools:
            try:
                # Log successful tool discovery
                logger.info(
                    f"Loaded LangChain tool '{obj.name}' from {filename}")
                langchain_tools.append(obj)
            except Exception as e:
                logger.error(
                    f"Error processing LangChain tool from {filename}: {e}")

    except Exception as e:
        logger.error(
            f"Unexpected error scanning LangChain tools directory: {e}")

    return langchain_tools


async def prepare_prompt_templates(is_manager: bool, system_prompt: str, language: str = 'zh'):
    """
    Prepare prompt templates, support multiple languages

    Args:
        is_manager: Whether it is a manager mode
        system_prompt: System prompt content
        language: Language code ('zh' or 'en')

    Returns:
        dict: Prompt template configuration
    """
    prompt_templates = get_agent_prompt_template(is_manager, language)
    prompt_templates["system_prompt"] = system_prompt
    return prompt_templates


async def join_minio_file_description_to_query(minio_files, query, patient_id=None, timeline_id=None):
    """
    Join minio file information and context to query for agent processing.
    Includes file URL for image files so OCR tool can be called with the URL.
    Also includes patient/timeline context for doctor portal.
    """
    from consts.const import MAIN_SERVICE_URL
    
    context_parts = []
    
    # Add patient/timeline context if provided (for doctor portal)
    if patient_id is not None or timeline_id is not None:
        context_parts.append("[Current Context]")
        if patient_id is not None:
            context_parts.append(f"  - Linked Patient ID: {patient_id}")
        if timeline_id is not None:
            context_parts.append(f"  - Linked Timeline ID: {timeline_id}")
        context_parts.append("  - IMPORTANT: When saving reports or data, use these IDs directly without asking the user.")
        context_parts.append("")
    
    # Process file attachments
    if minio_files and isinstance(minio_files, list):
        file_info_list = []
        # Get backend API base URL for internal API calls
        backend_api_base = MAIN_SERVICE_URL.rstrip("/")
        
        for file in minio_files:
            if isinstance(file, dict):
                file_info = ""
                file_name = file.get("name", "unknown")
                file_type = file.get("type", "unknown")
                object_name = file.get("object_name", "")
                description = file.get("description", "")
                
                # Build full URL through backend API (accessible from OCR service)
                full_url = ""
                if object_name:
                    # Use download endpoint (URL ends with file extension for OCR compatibility)
                    # This avoids query params that confuse OCR tools checking file extensions
                    full_url = f"{backend_api_base}/file/download/{object_name}"
                
                # Build file information string
                if file_type == "image" and full_url:
                    # For images, include URL so OCR tool can process them
                    file_info = f"[Image File: {file_name}]\n"
                    file_info += f"  - Access URL: {full_url}\n"
                    if description:
                        file_info += f"  - Description: {description}\n"
                    file_info += "  - IMPORTANT: If you need to extract text from this image, call the OCR tool with the Access URL above.\n"
                elif description:
                    file_info = f"[File: {file_name}]\n  - {description}\n"
                
                if file_info:
                    file_info_list.append(file_info)

        if file_info_list:
            context_parts.append("User provided the following files:")
            context_parts.extend(file_info_list)
    
    # Build final query
    if context_parts:
        final_query = "\n".join(context_parts) + "\n"
        final_query += f"User query: {query}"
    else:
        final_query = query
        
    return final_query


def filter_mcp_servers_and_tools(input_agent_config: AgentConfig, mcp_info_dict) -> list:
    """
    Filter mcp servers and tools, only keep the actual used mcp servers
    Support multi-level agent, recursively check all sub-agent tools
    """
    used_mcp_urls = set()

    # Recursively check all agent tools
    def check_agent_tools(agent_config: AgentConfig):
        # Check current agent tools
        for tool in agent_config.tools:
            if tool.source == "mcp" and tool.usage in mcp_info_dict:
                used_mcp_urls.add(
                    mcp_info_dict[tool.usage]["remote_mcp_server"])

        # Recursively check sub-agent
        for sub_agent_config in agent_config.managed_agents:
            check_agent_tools(sub_agent_config)

    # Check all agent tools
    check_agent_tools(input_agent_config)

    return list(used_mcp_urls)


async def create_agent_run_info(
    agent_id,
    minio_files,
    query,
    history,
    tenant_id: str,
    user_id: str,
    language: str = "zh",
    allow_memory_search: bool = True,
    patient_id: int = None,
    timeline_id: int = None,
    portal_type: str = None,
    user_email: str = None,
):
    final_query = await join_minio_file_description_to_query(
        minio_files=minio_files, 
        query=query,
        patient_id=patient_id,
        timeline_id=timeline_id
    )
    model_list = await create_model_config_list(tenant_id)
    agent_config = await create_agent_config(
        agent_id=agent_id,
        tenant_id=tenant_id,
        user_id=user_id,
        language=language,
        last_user_query=final_query,
        allow_memory_search=allow_memory_search,
        portal_type=portal_type,
        user_email=user_email,
    )

    remote_mcp_list = await get_remote_mcp_server_list(tenant_id=tenant_id)
    default_mcp_url = urljoin(LOCAL_MCP_SERVER, "sse")
    remote_mcp_list.append({
        "remote_mcp_server_name": "nexent",
        "remote_mcp_server": default_mcp_url,
        "status": True
    })
    remote_mcp_dict = {record["remote_mcp_server_name"]: record for record in remote_mcp_list if record["status"]}

    # Filter MCP servers and tools
    mcp_host = filter_mcp_servers_and_tools(agent_config, remote_mcp_dict)

    # Build additional_args for code execution context
    additional_args = {}
    logger.info(f"[DEBUG] create_agent_run_info: portal_type={portal_type}, user_id={user_id}, patient_id={patient_id}, user_email={user_email}")
    if portal_type == "patient":
        # Get patient_id - priority: direct patient_id > lookup by email > lookup by user_id
        effective_patient_id = patient_id
        if effective_patient_id is None and user_email:
            # Try to find patient by email first (most reliable method)
            patient = get_patient_by_email(user_email, tenant_id)
            if patient:
                effective_patient_id = patient.get("patient_id")
                logger.info(f"[DEBUG] Found patient_id={effective_patient_id} via user_email={user_email}")
        
        if effective_patient_id is None:
            try:
                effective_patient_id = get_patient_id_from_user_id(user_id, tenant_id)
                logger.info(f"[DEBUG] Got patient_id from user_id: {effective_patient_id}")
            except Exception as e:
                logger.warning(f"Failed to get patient_id from user_id for execution context: {e}")
        
        if effective_patient_id is not None:
            # Inject patient_id into execution context so agent can use it as a variable
            additional_args["patient_id"] = str(effective_patient_id)
            logger.info(f"[DEBUG] Injected patient_id into additional_args: {additional_args}")

    agent_run_info = AgentRunInfo(
        query=final_query,
        model_config_list=model_list,
        observer=MessageObserver(lang=language),
        agent_config=agent_config,
        mcp_host=mcp_host,
        history=history,
        stop_event=threading.Event(),
        additional_args=additional_args if additional_args else None
    )
    return agent_run_info
