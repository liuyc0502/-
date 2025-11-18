from sqlalchemy import Boolean, Column, Integer, JSON, Numeric, Sequence, String, Text, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func

SCHEMA = "nexent"


class TableBase(DeclarativeBase):
    create_time = Column(TIMESTAMP(timezone=False),
                         server_default=func.now(), doc="Creation time")
    update_time = Column(TIMESTAMP(timezone=False), server_default=func.now(
    ), onupdate=func.now(), doc="Update time")
    created_by = Column(String(100), doc="Creator")
    updated_by = Column(String(100), doc="Updater")
    delete_flag = Column(String(1), default="N",
                         doc="Whether it is deleted. Optional values: Y/N")
    pass


class ConversationRecord(TableBase):
    """
    Overall information table for Q&A conversations
    """
    __tablename__ = "conversation_record_t"
    __table_args__ = {"schema": SCHEMA}

    conversation_id = Column(Integer, Sequence(
        "conversation_record_t_conversation_id_seq", schema=SCHEMA), primary_key=True, nullable=False)
    conversation_title = Column(String(100), doc="Conversation title")
    portal_type = Column(String(50), doc="Portal type: 'doctor', 'student', 'patient', 'admin', or 'general'", default='general')


class ConversationMessage(TableBase):
    """
    Holds the specific response message content in the conversation
    """
    __tablename__ = "conversation_message_t"
    __table_args__ = {"schema": SCHEMA}

    message_id = Column(Integer, Sequence(
        "conversation_message_t_message_id_seq", schema=SCHEMA), primary_key=True, nullable=False)
    conversation_id = Column(
        Integer, doc="Formal foreign key used to associate with the conversation")
    message_index = Column(
        Integer, doc="Sequence number for frontend display sorting")
    message_role = Column(
        String(30), doc="The role sending the message, such as system, assistant, user")
    message_content = Column(String, doc="The complete content of the message")
    minio_files = Column(
        String, doc="Images or documents uploaded by the user on the chat page, stored as a list")
    opinion_flag = Column(String(
        1), doc="User evaluation of the conversation. Enumeration value \"Y\" represents a positive review, \"N\" represents a negative review")


class ConversationMessageUnit(TableBase):
    """
    Holds the agent's output content in each message
    """
    __tablename__ = "conversation_message_unit_t"
    __table_args__ = {"schema": SCHEMA}

    unit_id = Column(Integer, Sequence("conversation_message_unit_t_unit_id_seq",
                     schema=SCHEMA), primary_key=True, nullable=False)
    message_id = Column(
        Integer, doc="Formal foreign key used to associate with the message")
    conversation_id = Column(
        Integer, doc="Formal foreign key used to associate with the conversation")
    unit_index = Column(
        Integer, doc="Sequence number for frontend display sorting")
    unit_type = Column(String(100), doc="Type of the smallest answer unit")
    unit_content = Column(
        String, doc="Complete content of the smallest reply unit")


class ConversationSourceImage(TableBase):
    """
    Holds the search image source information of conversation messages
    """
    __tablename__ = "conversation_source_image_t"
    __table_args__ = {"schema": SCHEMA}

    image_id = Column(Integer, Sequence(
        "conversation_source_image_t_image_id_seq", schema=SCHEMA), primary_key=True, nullable=False)
    conversation_id = Column(
        Integer, doc="Formal foreign key used to associate with the conversation to which the search source belongs")
    message_id = Column(
        Integer, doc="Formal foreign key used to associate with the conversation message to which the search source belongs")
    unit_id = Column(
        Integer, doc="Formal foreign key used to associate with the smallest message unit (if any) to which the search source belongs")
    image_url = Column(String, doc="URL address of the image")
    cite_index = Column(
        Integer, doc="[Reserved] Citation serial number for precise traceability")
    search_type = Column(String(
        100), doc="[Reserved] Search source type, used to distinguish the retrieval tool from which the record originates. Optional values: web/local")


class ConversationSourceSearch(TableBase):
    """
    Holds the search text source information referenced by the response messages in the conversation
    """
    __tablename__ = "conversation_source_search_t"
    __table_args__ = {"schema": SCHEMA}

    search_id = Column(Integer, Sequence(
        "conversation_source_search_t_search_id_seq", schema=SCHEMA), primary_key=True, nullable=False)
    unit_id = Column(
        Integer, doc="Formal foreign key used to associate with the smallest message unit (if any) to which the search source belongs")
    message_id = Column(
        Integer, doc="Formal foreign key used to associate with the conversation message to which the search source belongs")
    conversation_id = Column(
        Integer, doc="Formal foreign key used to associate with the conversation to which the search source belongs")
    source_type = Column(String(
        100), doc="Source type, used to distinguish whether source_location is a URL or a path. Optional values: url/text")
    source_title = Column(
        String(400), doc="Title or file name of the search source")
    source_location = Column(
        String(400), doc="URL link or file path of the search source")
    source_content = Column(String, doc="Original text of the search source")
    score_overall = Column(Numeric(
        7, 6), doc="Overall similarity score between the source and the user query, calculated by weighted average of details")
    score_accuracy = Column(Numeric(7, 6), doc="Accuracy score")
    score_semantic = Column(Numeric(7, 6), doc="Semantic similarity score")
    published_date = Column(TIMESTAMP(
        timezone=False), doc="Upload date of local files or network search date")
    cite_index = Column(
        Integer, doc="Citation serial number for precise traceability")
    search_type = Column(String(
        100), doc="Search source type, specifically describing the retrieval tool used for this search record. Optional values: web_search/knowledge_base_search")
    tool_sign = Column(String(
        30), doc="Simple tool identifier used to distinguish the index source in the summary text output by the large model")


class ModelRecord(TableBase):
    """
    Model list defined by the user on the configuration page
    """
    __tablename__ = "model_record_t"
    __table_args__ = {"schema": SCHEMA}

    model_id = Column(Integer, Sequence("model_record_t_model_id_seq", schema=SCHEMA),
                      primary_key=True, nullable=False, doc="Model ID, unique primary key")
    model_repo = Column(String(100), doc="Model path address")
    model_name = Column(String(100), nullable=False, doc="Model name")
    model_factory = Column(String(
        100), doc="Model vendor, determining the API key and the specific format of the model response. Currently defaults to OpenAI-API-Compatible.")
    model_type = Column(
        String(100), doc="Model type, such as chat, embedding, rerank, tts, asr")
    api_key = Column(
        String(500), doc="Model API key, used for authentication for some models")
    base_url = Column(
        String(500), doc="Base URL address for requesting remote model services")
    max_tokens = Column(Integer, doc="Maximum available tokens of the model")
    used_token = Column(
        Integer, doc="Number of tokens already used by the model in Q&A")
    display_name = Column(String(
        100), doc="Model name directly displayed on the frontend, customized by the user")
    connect_status = Column(String(
        100), doc="Model connectivity status of the latest detection. Optional values: Detecting, Available, Unavailable")
    tenant_id = Column(String(100), doc="Tenant ID for filtering")


class ToolInfo(TableBase):
    """
    Information table for prompt tools
    """
    __tablename__ = "ag_tool_info_t"
    __table_args__ = {"schema": SCHEMA}

    tool_id = Column(Integer, primary_key=True, nullable=False, doc="ID")
    name = Column(String(100), doc="Unique key name")
    origin_name = Column(String(100), doc="Original name")
    class_name = Column(
        String(100), doc="Tool class name, used when the tool is instantiated")
    description = Column(String(2048), doc="Prompt tool description")
    source = Column(String(100), doc="Source")
    author = Column(String(100), doc="Tool author")
    usage = Column(String(100), doc="Usage")
    params = Column(JSON, doc="Tool parameter information (json)")
    inputs = Column(String(2048), doc="Prompt tool inputs description")
    output_type = Column(String(100), doc="Prompt tool output description")
    category = Column(String(100), doc="Tool category description")
    is_available = Column(
        Boolean, doc="Whether the tool can be used under the current main service")


class AgentInfo(TableBase):
    """
    Information table for agents
    """
    __tablename__ = "ag_tenant_agent_t"
    __table_args__ = {"schema": SCHEMA}

    agent_id = Column(Integer, primary_key=True, nullable=False, doc="ID")
    name = Column(String(100), doc="Agent name")
    display_name = Column(String(100), doc="Agent display name")
    description = Column(Text, doc="Description")
    model_name = Column(String(100), doc="[DEPRECATED] Name of the model used, use model_id instead")
    model_id = Column(Integer, doc="Model ID, foreign key reference to model_record_t.model_id")
    max_steps = Column(Integer, doc="Maximum number of steps")
    duty_prompt = Column(Text, doc="Duty prompt content")
    constraint_prompt = Column(Text, doc="Constraint prompt content")
    few_shots_prompt = Column(Text, doc="Few shots prompt content")
    parent_agent_id = Column(Integer, doc="Parent Agent ID")
    tenant_id = Column(String(100), doc="Belonging tenant")
    enabled = Column(Boolean, doc="Enabled")
    provide_run_summary = Column(
        Boolean, doc="Whether to provide the running summary to the manager agent")
    business_description = Column(
        Text, doc="Manually entered by the user to describe the entire business process")
    business_logic_model_name = Column(String(100), doc="Model name used for business logic prompt generation")
    business_logic_model_id = Column(Integer, doc="Model ID used for business logic prompt generation, foreign key reference to model_record_t.model_id")
    category = Column(String(50), doc="Agent category/type (e.g., diagnosis, analysis, teaching, consultation)")
    agent_role_category = Column(String(50), doc="Agent role category: 'portal_main' for portal main agents, 'tool' for tool agents", default='tool')
    portal_type = Column(String(50), doc="Portal type for main agents: 'doctor', 'student', 'patient', or null for tool agents")


class ToolInstance(TableBase):
    """
    Information table for tenant tool configuration.
    """
    __tablename__ = "ag_tool_instance_t"
    __table_args__ = {"schema": SCHEMA}

    tool_instance_id = Column(
        Integer, primary_key=True, nullable=False, doc="ID")
    tool_id = Column(Integer, doc="Tenant tool ID")
    agent_id = Column(Integer, doc="Agent ID")
    params = Column(JSON, doc="Parameter configuration")
    user_id = Column(String(100), doc="User ID")
    tenant_id = Column(String(100), doc="Tenant ID")
    enabled = Column(Boolean, doc="Enabled")


class KnowledgeRecord(TableBase):
    """
    Records the description and status information of knowledge bases
    """
    __tablename__ = "knowledge_record_t"
    __table_args__ = {"schema": "nexent"}

    knowledge_id = Column(Integer, Sequence("knowledge_record_t_knowledge_id_seq", schema="nexent"),
                          primary_key=True, nullable=False, doc="Knowledge base ID, unique primary key")
    index_name = Column(String(100), doc="Knowledge base name")
    knowledge_describe = Column(String(3000), doc="Knowledge base description")
    knowledge_sources = Column(String(300), doc="Knowledge base sources")
    embedding_model_name = Column(String(200), doc="Embedding model name, used to record the embedding model used by the knowledge base")
    tenant_id = Column(String(100), doc="Tenant ID")


class KnowledgeFileCard(TableBase):
    """
    Knowledge file card information for display in doctor portal
    """
    __tablename__ = "knowledge_file_card_t"
    __table_args__ = {"schema": "nexent"}

    card_id = Column(Integer, Sequence("knowledge_file_card_t_card_id_seq", schema="nexent"),
                     primary_key=True, nullable=False, doc="Card ID, unique primary key")
    file_path = Column(String(500), nullable=False, doc="File path in MinIO storage")
    knowledge_id = Column(Integer, nullable=False, doc="Knowledge base ID")
    card_title = Column(String(200), doc="Card display title")
    card_summary = Column(String(1000), doc="Card summary/description")
    category = Column(String(100), doc="Category tag (e.g., 诊断标准, 药物信息)")
    tags = Column(String(500), doc="JSON array of tags")
    view_count = Column(Integer, default=0, doc="View count")
    tenant_id = Column(String(100), doc="Tenant ID")


class TenantConfig(TableBase):
    """
    Tenant configuration information table
    """
    __tablename__ = "tenant_config_t"
    __table_args__ = {"schema": SCHEMA}

    tenant_config_id = Column(Integer, Sequence(
        "tenant_config_t_tenant_config_id_seq", schema=SCHEMA), primary_key=True, nullable=False, doc="ID")
    tenant_id = Column(String(100), doc="Tenant ID")
    user_id = Column(String(100), doc="User ID")
    value_type = Column(String(
        100), doc=" the data type of config_value, optional values: single/multi", default="single")
    config_key = Column(String(100), doc="the key of the config")
    config_value = Column(Text, doc="the value of the config")


class MemoryUserConfig(TableBase):
    """
    Tenant configuration information table
    """
    __tablename__ = "memory_user_config_t"
    __table_args__ = {"schema": SCHEMA}

    config_id = Column(Integer, Sequence("memory_user_config_t_config_id_seq",
                       schema=SCHEMA), primary_key=True, nullable=False, doc="ID")
    tenant_id = Column(String(100), doc="Tenant ID")
    user_id = Column(String(100), doc="User ID")
    value_type = Column(String(
        100), doc=" the data type of config_value, optional values: single/multi", default="single")
    config_key = Column(String(100), doc="the key of the config")
    config_value = Column(String(10000), doc="the value of the config")


class McpRecord(TableBase):
    """
    MCP (Model Context Protocol) records table
    """
    __tablename__ = "mcp_record_t"
    __table_args__ = {"schema": SCHEMA}

    mcp_id = Column(Integer, Sequence("mcp_record_t_mcp_id_seq", schema=SCHEMA),
                    primary_key=True, nullable=False, doc="MCP record ID, unique primary key")
    tenant_id = Column(String(100), doc="Tenant ID")
    user_id = Column(String(100), doc="User ID")
    mcp_name = Column(String(100), doc="MCP name")
    mcp_server = Column(String(500), doc="MCP server address")
    status = Column(Boolean, default=None,
                    doc="MCP server connection status, True=connected, False=disconnected, None=unknown")


class UserTenant(TableBase):
    """
    User and tenant relationship table
    """
    __tablename__ = "user_tenant_t"
    __table_args__ = {"schema": SCHEMA}

    user_tenant_id = Column(Integer, Sequence("user_tenant_t_user_tenant_id_seq", schema=SCHEMA),
                            primary_key=True, nullable=False, doc="User tenant relationship ID, unique primary key")
    user_id = Column(String(100), nullable=False, doc="User ID")
    tenant_id = Column(String(100), nullable=False, doc="Tenant ID")


class AgentRelation(TableBase):
    """
    Agent parent-child relationship table
    """
    __tablename__ = "ag_agent_relation_t"
    __table_args__ = {"schema": SCHEMA}

    relation_id = Column(Integer, primary_key=True,
                         nullable=False, doc="Relationship ID, primary key")
    selected_agent_id = Column(Integer, doc="Selected agent ID")
    parent_agent_id = Column(Integer, doc="Parent agent ID")
    tenant_id = Column(String(100), doc="Tenant ID")


class PortalAgentAssignment(TableBase):
    """
    Portal agent assignment table - maps agents to portals (doctor, student, patient)
    """
    __tablename__ = "ag_portal_agent_assignment_t"
    __table_args__ = {"schema": SCHEMA}

    assignment_id = Column(Integer, primary_key=True,
                          nullable=False, doc="Assignment ID, primary key")
    portal_type = Column(String(50), doc="Portal type (doctor, student, patient)")
    agent_id = Column(Integer, doc="Agent ID")
    tenant_id = Column(String(100), doc="Tenant ID")


class PartnerMappingId(TableBase):
    """
    External-Internal ID mapping table for partners
    """
    __tablename__ = "partner_mapping_id_t"
    __table_args__ = {"schema": SCHEMA}

    mapping_id = Column(Integer, Sequence("partner_mapping_id_t_mapping_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="ID")
    external_id = Column(
        String(100), doc="The external id given by the outer partner")
    internal_id = Column(
        Integer, doc="The internal id of the other database table")
    mapping_type = Column(String(
        30), doc="Type of the external - internal mapping, value set: CONVERSATION")
    tenant_id = Column(String(100), doc="Tenant ID")
    user_id = Column(String(100), doc="User ID")


 
class PatientInfo(TableBase):
    """
    Patient basic information table
    """
    __tablename__ = "patient_info_t"
    __table_args__ = {"schema": SCHEMA}
 
    patient_id = Column(Integer, Sequence("patient_info_t_patient_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Patient ID, primary key")
    name = Column(String(100), doc="Patient name")
    gender = Column(String(10), doc="Gender: 男/女")
    age = Column(Integer, doc="Age")
    date_of_birth = Column(String(20), doc="Date of birth (YYYY-MM-DD)")
    medical_record_no = Column(String(50), doc="Medical record number")
    email = Column(String(200), doc="Email address for patient portal login", unique=True, index=True)
    phone = Column(String(20), doc="Phone number")
    address = Column(String(500), doc="Address")
    allergies = Column(JSON, doc="Allergies (JSON array)")
    family_history = Column(Text, doc="Family medical history")
    past_medical_history = Column(JSON, doc="Past medical history (JSON array)")
    diagnosis = Column(String(500), doc="Current primary diagnosis")
    tenant_id = Column(String(100), doc="Tenant ID")
 
 
class PatientTimeline(TableBase):
    """
    Patient treatment timeline main table
    """
    __tablename__ = "patient_timeline_t"
    __table_args__ = {"schema": SCHEMA}
 
    timeline_id = Column(Integer, Sequence("patient_timeline_t_timeline_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Timeline ID, primary key")
    patient_id = Column(Integer, doc="Patient ID, foreign key")
    stage_type = Column(String(50), doc="Stage type: 初诊/检查/确诊/治疗/随访")
    stage_date = Column(String(20), doc="Stage date (YYYY-MM-DD)")
    stage_title = Column(String(200), doc="Stage title")
    diagnosis = Column(String(500), doc="Diagnosis")
    status = Column(String(20), doc="Status: completed/current/pending")
    display_order = Column(Integer, doc="Display order")
    tenant_id = Column(String(100), doc="Tenant ID")
 

class PatientTimelineDetail(TableBase):
    """
    Patient timeline detail table
    """
    __tablename__ = "patient_timeline_detail_t"
    __table_args__ = {"schema": SCHEMA}
 
    detail_id = Column(Integer, Sequence("patient_timeline_detail_t_detail_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Detail ID, primary key")
    timeline_id = Column(Integer, doc="Timeline ID, foreign key")
    doctor_notes = Column(Text, doc="Doctor observation notes")
    pathology_findings = Column(Text, doc="Pathology findings")
    medications = Column(JSON, doc="Medication regimen (JSON array)")
    tenant_id = Column(String(100), doc="Tenant ID")
 
 
class PatientMedicalImage(TableBase):
    """
    Patient medical image table
    """
    __tablename__ = "patient_medical_image_t"
    __table_args__ = {"schema": SCHEMA}
 
    image_id = Column(Integer, Sequence("patient_medical_image_t_image_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Image ID, primary key")
    timeline_id = Column(Integer, doc="Timeline ID, foreign key")
    image_type = Column(String(50), doc="Image type: 病理切片/X光/CT/MRI/临床照片/超声")
    image_label = Column(String(200), doc="Image label/description")
    image_url = Column(String(500), doc="Image storage path (MinIO)")
    thumbnail_url = Column(String(500), doc="Thumbnail URL")
    display_order = Column(Integer, doc="Display order")
    tenant_id = Column(String(100), doc="Tenant ID")
 
 
class PatientMetrics(TableBase):
    """
    Patient examination metrics table
    """
    __tablename__ = "patient_metrics_t"
    __table_args__ = {"schema": SCHEMA}
 
    metric_id = Column(Integer, Sequence("patient_metrics_t_metric_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Metric ID, primary key")
    timeline_id = Column(Integer, doc="Timeline ID, foreign key")
    metric_name = Column(String(50), doc="Metric name: ESR/CRP/RF etc.")
    metric_full_name = Column(String(200), doc="Metric full name")
    metric_value = Column(String(50), doc="Metric value")
    metric_unit = Column(String(20), doc="Unit")
    metric_trend = Column(String(20), doc="Trend: up/down/stable/abnormal/normal")
    metric_status = Column(String(20), doc="Status: normal/warning/error/improving")
    normal_range_min = Column(Numeric(10, 2), doc="Normal range minimum")
    normal_range_max = Column(Numeric(10, 2), doc="Normal range maximum")
    percentage = Column(Integer, doc="Progress bar percentage (0-100)")
    tenant_id = Column(String(100), doc="Tenant ID")

 
class PatientAttachment(TableBase):
    """
    Patient attachment table
    """
    __tablename__ = "patient_attachment_t"
    __table_args__ = {"schema": SCHEMA}
 
    attachment_id = Column(Integer, Sequence("patient_attachment_t_attachment_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Attachment ID, primary key")
    timeline_id = Column(Integer, doc="Timeline ID, foreign key")
    file_name = Column(String(200), doc="File name")
    file_type = Column(String(50), doc="File type: pdf/excel/dicom/zip")
    file_url = Column(String(500), doc="File path (MinIO)")
    file_size = Column(Integer, doc="File size (bytes)")
    tenant_id = Column(String(100), doc="Tenant ID")
 

class PatientTodo(TableBase):
    """
    Patient todo/task table
    """
    __tablename__ = "patient_todo_t"
    __table_args__ = {"schema": SCHEMA}
 
    todo_id = Column(Integer, Sequence("patient_todo_t_todo_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Todo ID, primary key")
    patient_id = Column(Integer, doc="Patient ID, foreign key")
    todo_title = Column(String(200), doc="Todo title")
    todo_description = Column(Text, doc="Todo description")
    todo_type = Column(String(50), doc="Type: 复查/用药/检查/随访")
    due_date = Column(String(20), doc="Due date (YYYY-MM-DD)")
    priority = Column(String(20), doc="Priority: high/medium/low")
    status = Column(String(20), doc="Status: pending/completed/overdue")
    assigned_doctor = Column(String(100), doc="Assigned doctor user ID")
    tenant_id = Column(String(100), doc="Tenant ID")


class MedicalCase(TableBase):
    """
    Medical case basic information table
    """
    __tablename__ = "medical_case_t"
    __table_args__ = {"schema": SCHEMA}

    case_id = Column(Integer, Sequence("medical_case_t_case_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Case ID, primary key")
    case_no = Column(String(50), nullable=False, doc="Case number (e.g., #0234)")
    case_title = Column(String(200), doc="Case title")
    diagnosis = Column(String(500), doc="Primary diagnosis")
    disease_type = Column(String(100), doc="Disease type/category (e.g., 类风湿, 红斑狼疮)")
    age = Column(Integer, doc="Patient age")
    gender = Column(String(10), doc="Patient gender: 男/女")
    chief_complaint = Column(String(500), doc="Chief complaint")
    category = Column(String(100), doc="Case category (e.g., classic, rare)")
    tags = Column(JSON, doc="Case tags (JSON array)")
    view_count = Column(Integer, default=0, doc="View count")
    is_classic = Column(Boolean, default=False, doc="Whether this is a classic case")
    tenant_id = Column(String(100), doc="Tenant ID")

 

 

class MedicalCaseDetail(TableBase):
    """
    Medical case detailed information table
    """
    __tablename__ = "medical_case_detail_t"
    __table_args__ = {"schema": SCHEMA}

    detail_id = Column(Integer, Sequence("medical_case_detail_t_detail_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Detail ID, primary key")
    case_id = Column(Integer, nullable=False, doc="Case ID, foreign key")
    present_illness_history = Column(Text, doc="Present illness history")
    past_medical_history = Column(Text, doc="Past medical history")
    family_history = Column(Text, doc="Family history")
    physical_examination = Column(JSON, doc="Physical examination results (JSON)")
    imaging_results = Column(JSON, doc="Imaging examination results (JSON)")
    diagnosis_basis = Column(Text, doc="Diagnosis basis")
    treatment_plan = Column(Text, doc="Treatment plan")
    medications = Column(JSON, doc="Medication regimen (JSON array)")
    prognosis = Column(Text, doc="Prognosis and follow-up")
    clinical_notes = Column(Text, doc="Additional clinical notes")
    tenant_id = Column(String(100), doc="Tenant ID")


class MedicalCaseSymptom(TableBase):
    """
    Medical case symptom table (many-to-many relationship)
    """
    __tablename__ = "medical_case_symptom_t"
    __table_args__ = {"schema": SCHEMA}

    symptom_id = Column(Integer, Sequence("medical_case_symptom_t_symptom_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Symptom ID, primary key")
    case_id = Column(Integer, nullable=False, doc="Case ID, foreign key")
    symptom_name = Column(String(200), doc="Symptom name")
    symptom_description = Column(String(500), doc="Symptom description")
    is_key_symptom = Column(Boolean, default=False, doc="Whether this is a key symptom for diagnosis")
    tenant_id = Column(String(100), doc="Tenant ID")
 


class MedicalCaseLabResult(TableBase):
    """
    Medical case laboratory test results table
    """
    __tablename__ = "medical_case_lab_result_t"
    __table_args__ = {"schema": SCHEMA}
 
    lab_result_id = Column(Integer, Sequence("medical_case_lab_result_t_lab_result_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Lab result ID, primary key")
    case_id = Column(Integer, nullable=False, doc="Case ID, foreign key")
    test_name = Column(String(200), doc="Test name (e.g., RF, CRP, ESR)")
    test_full_name = Column(String(500), doc="Test full name")
    test_value = Column(String(100), doc="Test result value")
    test_unit = Column(String(50), doc="Unit")
    normal_range = Column(String(100), doc="Normal range")
    is_abnormal = Column(Boolean, default=False, doc="Whether result is abnormal")
    abnormal_indicator = Column(String(10), doc="Abnormal indicator: ↑/↓")
    tenant_id = Column(String(100), doc="Tenant ID")

 

class MedicalCaseImage(TableBase):
    """
    Medical case image/imaging table
    """
    __tablename__ = "medical_case_image_t"
    __table_args__ = {"schema": SCHEMA}
 
    image_id = Column(Integer, Sequence("medical_case_image_t_image_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Image ID, primary key")
    case_id = Column(Integer, nullable=False, doc="Case ID, foreign key")
    image_type = Column(String(50), doc="Image type: X光/CT/MRI/病理切片")
    image_description = Column(String(500), doc="Image description/findings")
    image_url = Column(String(500), doc="Image storage path (MinIO)")
    thumbnail_url = Column(String(500), doc="Thumbnail URL")
    display_order = Column(Integer, doc="Display order")
    tenant_id = Column(String(100), doc="Tenant ID")
 
 
class MedicalCaseFavorite(TableBase):
    """
    Medical case favorite table
    """
    __tablename__ = "medical_case_favorite_t"
    __table_args__ = {"schema": SCHEMA}
 
    favorite_id = Column(Integer, Sequence("medical_case_favorite_t_favorite_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Favorite ID, primary key")
    case_id = Column(Integer, nullable=False, doc="Case ID, foreign key")
    user_id = Column(String(100), nullable=False, doc="User ID")
    tenant_id = Column(String(100), doc="Tenant ID")

 

class MedicalCaseViewHistory(TableBase):
    """
    Medical case view history table
    """
    __tablename__ = "medical_case_view_history_t"
    __table_args__ = {"schema": SCHEMA}

    history_id = Column(Integer, Sequence("medical_case_view_history_t_history_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="History ID, primary key")
    case_id = Column(Integer, nullable=False, doc="Case ID, foreign key")
    user_id = Column(String(100), nullable=False, doc="User ID")
    view_time = Column(TIMESTAMP(timezone=False), server_default=func.now(), doc="View timestamp")
    tenant_id = Column(String(100), doc="Tenant ID")


class DoctorLearningRecord(TableBase):
    """
    Doctor learning record table for knowledge base tracking
    """
    __tablename__ = "doctor_learning_record_t"
    __table_args__ = {"schema": SCHEMA}

    record_id = Column(Integer, Sequence("doctor_learning_record_t_record_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Record ID, primary key")
    user_id = Column(String(100), nullable=False, doc="User ID")
    tenant_id = Column(String(100), nullable=False, doc="Tenant ID")
    file_path = Column(String(500), nullable=False, doc="Knowledge file path")
    file_name = Column(String(200), nullable=False, doc="Knowledge file name")
    category = Column(String(100), doc="Knowledge category")
    view_count = Column(Integer, default=0, doc="View count")
    total_time_spent = Column(Integer, default=0, doc="Total time spent in seconds")
    last_viewed_at = Column(TIMESTAMP(timezone=False), server_default=func.now(), doc="Last viewed timestamp")
    first_viewed_at = Column(TIMESTAMP(timezone=False), server_default=func.now(), doc="First viewed timestamp")


class CarePlan(TableBase):
    """
    Care plan main table for patient rehabilitation planning
    """
    __tablename__ = "care_plan_t"
    __table_args__ = {"schema": SCHEMA}

    plan_id = Column(Integer, Sequence("care_plan_t_plan_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Care plan ID, primary key")
    patient_id = Column(Integer, nullable=False, doc="Patient ID, foreign key")
    plan_name = Column(String(200), doc="Care plan name/title")
    plan_description = Column(Text, doc="Care plan description")
    start_date = Column(String(20), doc="Plan start date (YYYY-MM-DD)")
    end_date = Column(String(20), doc="Plan end date (YYYY-MM-DD)")
    status = Column(String(20), default='active', doc="Status: active/completed/paused")
    doctor_id = Column(String(100), doc="Doctor user ID who created this plan")
    tenant_id = Column(String(100), doc="Tenant ID")


class CarePlanMedication(TableBase):
    """
    Medication schedule table for care plans
    """
    __tablename__ = "care_plan_medication_t"
    __table_args__ = {"schema": SCHEMA}

    medication_id = Column(Integer, Sequence("care_plan_medication_t_medication_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Medication ID, primary key")
    plan_id = Column(Integer, nullable=False, doc="Care plan ID, foreign key")
    medication_name = Column(String(200), nullable=False, doc="Medication name")
    dosage = Column(String(100), doc="Dosage (e.g., 20mg, 1 tablet)")
    frequency = Column(String(100), doc="Frequency (e.g., daily, twice daily)")
    time_slots = Column(JSON, doc="Time slots for taking medication (JSON array, e.g., ['08:00', '20:00'])")
    notes = Column(Text, doc="Administration notes and precautions")
    tenant_id = Column(String(100), doc="Tenant ID")


class CarePlanTask(TableBase):
    """
    Rehabilitation task table for care plans
    """
    __tablename__ = "care_plan_task_t"
    __table_args__ = {"schema": SCHEMA}

    task_id = Column(Integer, Sequence("care_plan_task_t_task_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Task ID, primary key")
    plan_id = Column(Integer, nullable=False, doc="Care plan ID, foreign key")
    task_title = Column(String(200), nullable=False, doc="Task title")
    task_description = Column(Text, doc="Task description and instructions")
    task_category = Column(String(50), doc="Task category: 运动/护理/监测/饮食")
    frequency = Column(String(100), doc="Frequency (e.g., daily, 3 times per week)")
    duration = Column(String(50), doc="Duration (e.g., 30 minutes)")
    tenant_id = Column(String(100), doc="Tenant ID")


class CarePlanPrecaution(TableBase):
    """
    Precautions and medical advice table for care plans
    """
    __tablename__ = "care_plan_precaution_t"
    __table_args__ = {"schema": SCHEMA}

    precaution_id = Column(Integer, Sequence("care_plan_precaution_t_precaution_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Precaution ID, primary key")
    plan_id = Column(Integer, nullable=False, doc="Care plan ID, foreign key")
    precaution_content = Column(Text, nullable=False, doc="Precaution content")
    priority = Column(String(20), doc="Priority: high/medium/low")
    tenant_id = Column(String(100), doc="Tenant ID")


class CarePlanCompletion(TableBase):
    """
    Care plan completion record table - tracks patient's daily completion status
    """
    __tablename__ = "care_plan_completion_t"
    __table_args__ = {"schema": SCHEMA}

    completion_id = Column(Integer, Sequence("care_plan_completion_t_completion_id_seq",
                        schema=SCHEMA), primary_key=True, nullable=False, doc="Completion ID, primary key")
    plan_id = Column(Integer, nullable=False, doc="Care plan ID, foreign key")
    patient_id = Column(Integer, nullable=False, doc="Patient ID, foreign key")
    record_date = Column(String(20), nullable=False, doc="Record date (YYYY-MM-DD)")
    item_type = Column(String(20), nullable=False, doc="Item type: medication/task")
    item_id = Column(Integer, nullable=False, doc="Medication ID or Task ID")
    completed = Column(Boolean, default=False, doc="Whether the item was completed")
    completion_time = Column(TIMESTAMP(timezone=False), doc="Actual completion timestamp")
    notes = Column(Text, doc="Patient notes or observations")
    tenant_id = Column(String(100), doc="Tenant ID")