# MCP工具调用示例大全

所有示例均可直接运行。记得将 `patient_id`, `timeline_id`, `case_id` 等替换为实际值。

---

## 🔍 Patient Lookup Tools (患者查找)

### 通过病历号查找患者

```<RUN>
patient = patient_lookup_find_patient_by_medical_record_no(medical_record_no="MRN001")
print(patient)
```<END_CODE>

### 通过邮箱查找患者

```<RUN>
patient = patient_lookup_find_patient_by_email(email="patient@example.com")
print(patient)
```<END_CODE>

---

## 📋 Patient Info Tools (患者信息)

### 获取患者基本信息

```<RUN>
info = patient_info_get_patient_basic_info(patient_id=39)
print(info)
```<END_CODE>

### 获取患者诊断信息

```<RUN>
diagnosis = patient_info_get_patient_diagnosis(patient_id=39)
print(diagnosis)
```<END_CODE>

### 获取患者过敏信息

```<RUN>
allergies = patient_info_get_patient_allergies(patient_id=39)
print(allergies)
```<END_CODE>

### 获取患者既往病史

```<RUN>
history = patient_info_get_patient_medical_history(patient_id=39)
print(history)
```<END_CODE>

### 获取患者家族史

```<RUN>
family_history = patient_info_get_patient_family_history(patient_id=39)
print(family_history)
```<END_CODE>

---

## 📅 Patient Timeline Tools (患者时间线)

### 列出患者所有时间线事件

```<RUN>
timeline_events = patient_timeline_list_patient_timeline_events(patient_id="39", limit=20)
print(timeline_events)
```<END_CODE>

### 列出特定类型的事件（病理报告）

```<RUN>
pathology_reports = patient_timeline_list_patient_timeline_events(patient_id="39", event_type="病理报告", limit=3)
print(pathology_reports)
```<END_CODE>

### 列出特定日期范围的事件

```<RUN>
recent_events = patient_timeline_list_patient_timeline_events(
    patient_id="39",
    start_date="2024-01-01",
    end_date="2024-12-31",
    limit=10
)
print(recent_events)
```<END_CODE>

### 获取时间线事件详情

```<RUN>
detail = patient_timeline_get_timeline_event_detail(timeline_id="9")
print(detail)
```<END_CODE>

### 获取时间线事件的检验指标

```<RUN>
metrics = patient_timeline_get_timeline_event_metrics(timeline_id="9")
print(metrics)
```<END_CODE>

---

## 📚 Medical Case Tools (病例库)

### 搜索病例（自由文本）

```<RUN>
cases = medical_cases_search_medical_cases(search_query="肺癌", is_classic=True, limit=5)
print(cases)
```<END_CODE>

### 搜索病例（按疾病类型）

```<RUN>
cases = medical_cases_search_medical_cases(disease_type="肿瘤", limit=10)
print(cases)
```<END_CODE>

### 按症状搜索病例

```<RUN>
cases_by_symptoms = medical_cases_search_cases_by_symptoms(symptoms=["咳嗽", "胸痛"], limit=5)
print(cases_by_symptoms)
```<END_CODE>

### 获取病例基本信息

```<RUN>
case_info = medical_cases_get_case_basic_info(case_id="1")
print(case_info)
```<END_CODE>

### 获取病例症状列表

```<RUN>
symptoms = medical_cases_get_case_symptoms(case_id="1")
print(symptoms)
```<END_CODE>

### 获取病例完整详情

```<RUN>
full_detail = medical_cases_get_case_full_detail(case_id="1")
print(full_detail)
```<END_CODE>

---

## 💊 Care Plan Tools (护理计划)

### 列出患者的护理计划

```<RUN>
plans = care_plans_list_patient_care_plans(patient_id="39", status="active")
print(plans)
```<END_CODE>

### 获取护理计划的用药清单

```<RUN>
medications = care_plans_get_care_plan_medications(plan_id="1")
print(medications)
```<END_CODE>

### 获取护理计划的任务清单

```<RUN>
tasks = care_plans_get_care_plan_tasks(plan_id="1")
print(tasks)
```<END_CODE>

### 获取护理计划的注意事项

```<RUN>
precautions = care_plans_get_care_plan_precautions(plan_id="1")
print(precautions)
```<END_CODE>

### 记录服药

```<RUN>
result = care_plans_record_medication_taken(
    plan_id="1",
    patient_id="39",
    medication_id="101",
    record_date="2025-01-15",
    notes="随餐服用"
)
print(result)
```<END_CODE>

### 记录任务完成

```<RUN>
result = care_plans_record_task_completed(
    plan_id="1",
    patient_id="39",
    task_id="201",
    record_date="2025-01-15",
    notes="完成20分钟步行"
)
print(result)
```<END_CODE>

---

## 👥 Doctor Patient Management Tools (患者管理)

### 创建新患者

```<RUN>
result = doctor_patient_management_create_new_patient(
    name="张三",
    gender="male",
    age=45,
    medical_record_no="MRN20250115001",
    diagnosis="肺腺癌",
    email="zhangsan@example.com",
    phone="13800138000",
    allergies=["青霉素"],
    past_medical_history=["高血压", "糖尿病"]
)
print(result)
```<END_CODE>

### 更新患者信息

```<RUN>
result = doctor_patient_management_update_patient_info(
    patient_id="39",
    diagnosis="肺腺癌 IIB期",
    allergies=["青霉素", "磺胺类药物"]
)
print(result)
```<END_CODE>

### 搜索患者（按姓名）

```<RUN>
patients = doctor_patient_management_search_patients(search_query="张三", limit=10)
print(patients)
```<END_CODE>

### 搜索所有患者

```<RUN>
all_patients = doctor_patient_management_search_patients(limit=50)
print(all_patients)
```<END_CODE>

### 检查重复患者

```<RUN>
duplicates = doctor_patient_management_check_duplicate_patients(name="张三", exact_match=False)
print(duplicates)
```<END_CODE>

### 删除患者记录（慎用）

```<RUN>
result = doctor_patient_management_delete_patient_record(patient_id="999")
print(result)
```<END_CODE>

---

## 📅 Doctor Timeline Management Tools (时间线管理)

### 创建时间线事件

```<RUN>
result = doctor_timeline_management_create_timeline_event(
    patient_id="39",
    stage_type="手术记录",
    stage_date="2025-01-15",
    stage_title="左肺上叶切除术",
    diagnosis="肺腺癌",
    status="completed"
)
print(result)
```<END_CODE>

### 保存时间线详情

```<RUN>
result = doctor_timeline_management_save_timeline_detail(
    timeline_id="9",
    doctor_notes="手术顺利，术中出血约200ml",
    pathology_findings="左肺上叶腺癌，浸润性，大小3.5×2.8cm，未见淋巴结转移",
    patient_summary="手术成功完成，病理确认为早期肺癌，预后良好",
    patient_suggestions=["按时服药", "定期复查", "戒烟", "适量运动"]
)
print(result)
```<END_CODE>

### 保存时间线检验指标（批量）

```<RUN>
result = doctor_timeline_management_save_timeline_metrics(
    timeline_id="9",
    metrics=[
        {
            "metric_name": "WBC",
            "metric_full_name": "白细胞计数",
            "metric_value": "6.2",
            "metric_unit": "×10⁹/L",
            "normal_range_min": "4.0",
            "normal_range_max": "10.0",
            "metric_status": "normal"
        },
        {
            "metric_name": "HGB",
            "metric_full_name": "血红蛋白",
            "metric_value": "135",
            "metric_unit": "g/L",
            "normal_range_min": "120",
            "normal_range_max": "160",
            "metric_status": "normal"
        },
        {
            "metric_name": "PLT",
            "metric_full_name": "血小板",
            "metric_value": "180",
            "metric_unit": "×10⁹/L",
            "normal_range_min": "100",
            "normal_range_max": "300",
            "metric_status": "normal"
        }
    ]
)
print(result)
```<END_CODE>

### 上传时间线医学图像

```<RUN>
result = doctor_timeline_management_upload_timeline_image(
    timeline_id="9",
    image_url="https://storage.example.com/images/ct_scan_001.jpg",
    image_type="CT",
    image_label="胸部CT扫描",
    thumbnail_url="https://storage.example.com/thumbs/ct_scan_001_thumb.jpg",
    display_order=1
)
print(result)
```<END_CODE>

### 上传时间线附件

```<RUN>
result = doctor_timeline_management_upload_timeline_attachment(
    timeline_id="9",
    file_url="https://storage.example.com/files/lab_report.pdf",
    file_name="血常规报告.pdf",
    file_type="application/pdf",
    file_size=2048576
)
print(result)
```<END_CODE>

### 删除时间线事件（慎用）

```<RUN>
result = doctor_timeline_management_delete_timeline_event(timeline_id="999")
print(result)
```<END_CODE>

### 删除时间线所有图像

```<RUN>
result = doctor_timeline_management_delete_timeline_images_all(timeline_id="9")
print(result)
```<END_CODE>

### 删除时间线所有指标

```<RUN>
result = doctor_timeline_management_delete_timeline_metrics_all(timeline_id="9")
print(result)
```<END_CODE>

### 删除时间线所有附件

```<RUN>
result = doctor_timeline_management_delete_timeline_attachments_all(timeline_id="9")
print(result)
```<END_CODE>

---

## 🔬 Doctor Report Management Tools (报告管理)

### 保存检验报告（血常规）

```<RUN>
result = doctor_report_management_save_lab_report(
    patient_id="39",
    timeline_id="9",
    report_type="血常规",
    report_date="2025-01-15",
    report_institution="XX医院检验科",
    report_number="LAB20250115001",
    items=[
        {
            "test_item_name": "白细胞",
            "test_result": "6.5",
            "test_unit": "10^9/L",
            "reference_range": "4-10",
            "abnormal_flag": "正常"
        },
        {
            "test_item_name": "红细胞",
            "test_result": "4.2",
            "test_unit": "10^12/L",
            "reference_range": "3.5-5.5",
            "abnormal_flag": "正常"
        },
        {
            "test_item_name": "血红蛋白",
            "test_result": "135",
            "test_unit": "g/L",
            "reference_range": "120-160",
            "abnormal_flag": "正常"
        }
    ],
    ai_summary="各项血常规指标均在正常范围内"
)
print(result)
```<END_CODE>

### 保存影像报告（CT）

```<RUN>
result = doctor_report_management_save_imaging_report(
    patient_id="39",
    timeline_id="9",
    imaging_type="CT",
    imaging_date="2025-01-15",
    imaging_institution="XX医院影像科",
    report_number="CT20250115001",
    examination_site="胸部",
    imaging_findings="双肺纹理清晰，未见明显实质性病变。气管、支气管通畅。纵隔居中，未见肿大淋巴结。心影大小形态正常。",
    diagnostic_impression="胸部CT未见明显异常",
    recommendations="建议定期复查",
    report_image_url="https://storage.example.com/reports/ct_20250115.jpg"
)
print(result)
```<END_CODE>

### 获取检验报告详情

```<RUN>
report = doctor_report_management_get_lab_report(report_id="1")
print(report)
```<END_CODE>

### 获取影像报告详情

```<RUN>
report = doctor_report_management_get_imaging_report(report_id="1")
print(report)
```<END_CODE>

### 列出患者所有检验报告

```<RUN>
reports = doctor_report_management_list_patient_lab_reports(patient_id="39", limit=10)
print(reports)
```<END_CODE>

### 列出患者所有影像报告

```<RUN>
reports = doctor_report_management_list_patient_imaging_reports(patient_id="39", limit=10)
print(reports)
```<END_CODE>

### 删除检验报告（慎用）

```<RUN>
result = doctor_report_management_delete_lab_report_record(report_id="999")
print(result)
```<END_CODE>

### 删除影像报告（慎用）

```<RUN>
result = doctor_report_management_delete_imaging_report_record(report_id="999")
print(result)
```<END_CODE>

---

## 📚 Doctor Case Management Tools (病例管理)

### 创建医学病例

```<RUN>
result = doctor_case_management_create_medical_case(
    case_title="45岁男性肺腺癌典型病例",
    diagnosis="肺腺癌",
    disease_type="肿瘤",
    chief_complaint="咳嗽2月，痰中带血1周",
    age=45,
    gender="male",
    case_no="CASE20250115001",
    category="呼吸系统",
    tags=["肺癌", "腺癌", "早期", "典型"],
    is_classic=True
)
print(result)
```<END_CODE>

### 更新病例信息

```<RUN>
result = doctor_case_management_update_medical_case_info(
    case_id="1",
    case_title="45岁男性早期肺腺癌典型病例",
    is_classic=True,
    tags=["肺癌", "腺癌", "早期", "典型", "手术治疗"]
)
print(result)
```<END_CODE>

### 保存病例详情

```<RUN>
result = doctor_case_management_save_case_detail(
    case_id="1",
    present_illness_history="患者2个月前无明显诱因出现咳嗽，干咳为主，无发热，1周前出现痰中带血",
    past_medical_history="高血压病史5年，规律服药控制良好",
    family_history="父亲有肺癌病史",
    diagnosis_basis="1. 影像学检查：胸部CT示左肺上叶2.5cm占位性病变 2. 病理学检查：穿刺活检确诊为腺癌",
    treatment_plan="1. 手术治疗：左肺上叶切除术 2. 术后辅助化疗：顺铂+培美曲塞方案，共4个周期",
    medications=["顺铂", "培美曲塞", "止吐药", "护肝药"],
    prognosis="早期肺腺癌，手术切除彻底，预后良好，5年生存率约70-80%",
    clinical_notes="患者术后恢复顺利，定期随访复查"
)
print(result)
```<END_CODE>

### 保存病例症状

```<RUN>
result = doctor_case_management_save_case_symptoms(
    case_id="1",
    symptoms=[
        {"symptom_name": "咳嗽", "symptom_description": "干咳为主，持续2个月", "is_key_symptom": True},
        {"symptom_name": "痰中带血", "symptom_description": "1周前出现", "is_key_symptom": True},
        {"symptom_name": "胸痛", "symptom_description": "轻度胸痛，偶发", "is_key_symptom": False},
        {"symptom_name": "乏力", "symptom_description": "轻度乏力", "is_key_symptom": False}
    ]
)
print(result)
```<END_CODE>

### 保存病例检验结果

```<RUN>
result = doctor_case_management_save_case_lab_results(
    case_id="1",
    lab_results=[
        {
            "test_name": "CEA",
            "test_full_name": "癌胚抗原",
            "test_value": "12.5",
            "test_unit": "ng/mL",
            "normal_range": "<5.0",
            "is_abnormal": True,
            "abnormal_indicator": "high"
        },
        {
            "test_name": "NSE",
            "test_full_name": "神经元特异性烯醇化酶",
            "test_value": "15.2",
            "test_unit": "ng/mL",
            "normal_range": "<16.3",
            "is_abnormal": False
        }
    ]
)
print(result)
```<END_CODE>

### 上传病例图像

```<RUN>
result = doctor_case_management_upload_case_images(
    case_id="1",
    images=[
        {
            "image_url": "https://storage.example.com/cases/ct_001.jpg",
            "image_type": "CT",
            "image_description": "胸部CT显示左肺上叶占位性病变",
            "display_order": 1
        },
        {
            "image_url": "https://storage.example.com/cases/pathology_001.jpg",
            "image_type": "病理切片",
            "image_description": "HE染色显示腺癌特征",
            "display_order": 2
        }
    ]
)
print(result)
```<END_CODE>

### 收藏病例

```<RUN>
result = doctor_case_management_add_case_to_favorites(
    case_id="1",
    user_id="doctor123"
)
print(result)
```<END_CODE>

### 取消收藏病例

```<RUN>
result = doctor_case_management_remove_case_from_favorites(
    case_id="1",
    user_id="doctor123"
)
print(result)
```<END_CODE>

### 记录病例查看历史

```<RUN>
result = doctor_case_management_record_case_view(
    case_id="1",
    user_id="doctor123"
)
print(result)
```<END_CODE>

### 删除病例（慎用）

```<RUN>
result = doctor_case_management_delete_medical_case_record(case_id="999")
print(result)
```<END_CODE>

---

## ✅ Doctor TODO Tools (待办管理)

### 创建患者待办事项（基础用法）

**注意**: 创建待办时，`todo_title` 和 `todo_description` 应该根据患者的实际病情动态生成，不要使用固定值！

```<RUN>
# 示例：根据患者病情创建待办
# todo_title 和 todo_description 应该根据患者实际诊断来动态填写
result = doctor_todos_create_patient_todo(
    patient_id="39",
    todo_title="根据病情填写标题",  # 如: "肺癌术后复查" / "糖尿病血糖监测"
    todo_description="根据病情填写详细内容",  # 如: "术后3个月复查CT" / "每周监测空腹血糖"
    todo_type="follow_up",  # follow_up/lab_test/medication_review/consultation
    due_date="2025-04-15",
    priority="high",  # low/medium/high/urgent
    status="pending"
)
print(result)
```<END_CODE>

### 更新待办状态

```<RUN>
result = doctor_todos_update_patient_todo_status(
    todo_id="1",
    status="completed"
)
print(result)
```<END_CODE>

### 删除待办事项（慎用）

```<RUN>
result = doctor_todos_delete_patient_todo(todo_id="999")
print(result)
```<END_CODE>

---

## 🔎 Exa Search Tool (网络搜索)

### 搜索互联网信息

```<RUN>
# 搜索最新的医学研究或新闻
result = exa_search(query="肺腺癌最新治疗进展 2024")
print(result)
```<END_CODE>

```<RUN>
# 搜索药物信息
result = exa_search(query="奥希替尼副作用与用药注意事项")
print(result)
```<END_CODE>

---

## 📚 Knowledge Base Search Tool (知识库检索)

### 混合搜索（推荐）

```<RUN>
# 混合模式：结合精确匹配和语义搜索
result = knowledge_base_search(
    query="肺癌靶向治疗方案",
    search_mode="hybrid"
)
print(result)
```<END_CODE>

### 语义搜索

```<RUN>
# 语义搜索：基于向量相似度
result = knowledge_base_search(
    query="EGFR突变阳性患者的一线治疗",
    search_mode="semantic"
)
print(result)
```<END_CODE>

### 精确搜索

```<RUN>
# 精确搜索：基于关键词匹配
result = knowledge_base_search(
    query="奥希替尼",
    search_mode="accurate"
)
print(result)
```<END_CODE>

### 指定知识库搜索

```<RUN>
# 在指定的知识库中搜索
result = knowledge_base_search(
    query="化疗方案",
    search_mode="hybrid",
    index_names=["oncology_guidelines", "drug_interactions"]
)
print(result)
```<END_CODE>

---

## 📖 PubMed Tools (医学文献搜索)

### 搜索 PubMed 文献

```<RUN>
# 基础搜索
result = pubmearch_search_pubmed(
    advanced_search="lung cancer AND immunotherapy",
    max_results=100
)
print(result)
```<END_CODE>

### 带日期范围搜索

```<RUN>
# 搜索特定时间范围的文献
result = pubmearch_search_pubmed(
    advanced_search="EGFR mutation AND targeted therapy",
    start_date="2023/01/01",
    end_date="2024/12/31",
    max_results=200,
    output_filename="egfr_research"
)
print(result)
```<END_CODE>

### 列出已有结果文件

```<RUN>
files = pubmearch_list_result_files()
print(files)
```<END_CODE>

### 分析研究热点关键词

```<RUN>
# 分析文献中的研究热点
result = pubmearch_analyze_research_keywords(
    filename="pubmed_results_20250115.json",
    top_n=20,
    include_trends=True
)
print(result)
```<END_CODE>

### 分析发表趋势

```<RUN>
# 分析发表数量随时间的变化
result = pubmearch_analyze_publication_count(
    filename="pubmed_results_20250115.json",
    months_per_period=3
)
print(result)
```<END_CODE>

### 生成综合分析报告

```<RUN>
# 生成包含关键词和发表趋势的综合分析
result = pubmearch_generate_comprehensive_analysis(
    filename="pubmed_results_20250115.json",
    top_keywords=20,
    months_per_period=3
)
print(result)
```<END_CODE>

---

## 🎯 完整工作流示例

### 工作流1: 报告录入完整流程

```<RUN>
# 步骤1: 查找患者
patient = patient_lookup_find_patient_by_medical_record_no(medical_record_no="MRN001")
patient_id = patient['patient_id']

# 步骤2: 创建时间线事件
timeline_result = doctor_timeline_management_create_timeline_event(
    patient_id=str(patient_id),
    stage_type="CT",
    stage_date="2025-01-15",
    stage_title="胸部CT检查"
)
timeline_id = timeline_result['timeline_id']

# 步骤3: 保存影像报告
report_result = doctor_report_management_save_imaging_report(
    patient_id=str(patient_id),
    timeline_id=str(timeline_id),
    imaging_type="CT",
    imaging_date="2025-01-15",
    examination_site="胸部",
    imaging_findings="双肺纹理清晰，未见明显异常",
    diagnostic_impression="胸部CT未见明显异常"
)

print(f"✅ 报告录入成功! 报告ID: {report_result['report_id']}")
```<END_CODE>

### 工作流2: 查看患者完整信息

```<RUN>
# 查找患者
patient = patient_lookup_find_patient_by_email(email="patient@example.com")
patient_id = patient['patient_id']

# 获取基本信息
basic_info = patient_info_get_patient_basic_info(patient_id=patient_id)
print(f"患者: {basic_info['name']}, 年龄: {basic_info['age']}")

# 获取诊断
diagnosis = patient_info_get_patient_diagnosis(patient_id=patient_id)
print(f"诊断: {diagnosis['diagnosis']}")

# 获取时间线
timeline = patient_timeline_list_patient_timeline_events(patient_id=str(patient_id), limit=5)
print(f"时间线事件数: {timeline['total_events']}")

# 获取护理计划
care_plans = care_plans_list_patient_care_plans(patient_id=str(patient_id), status="active")
print(f"活动护理计划数: {care_plans['total_plans']}")
```<END_CODE>

### 工作流3: 搜索相似病例

```<RUN>
# 搜索特定疾病的病例
cases = medical_cases_search_medical_cases(
    search_query="肺癌",
    is_classic=True,
    limit=3
)

print(f"找到 {cases['total_cases']} 个病例")

# 获取第一个病例的详细信息
if cases['cases']:
    case_id = cases['cases'][0]['case_id']

    # 获取病例详情
    detail = medical_cases_get_case_full_detail(case_id=str(case_id))
    print(f"病例标题: {detail['case_title']}")
    print(f"症状: {detail['symptoms']}")

    # 获取症状列表
    symptoms = medical_cases_get_case_symptoms(case_id=str(case_id))
    print(f"症状数: {symptoms['total_symptoms']}")
```<END_CODE>

### 工作流4: 根据病情生成待办（正确方法）

**重要**: 创建待办时必须先获取患者病情，然后根据病情动态生成待办内容！

**第一步**: 获取患者病情信息（诊断+时间线）

```<RUN>
# 获取患者基本信息和诊断
patient_id = 39
basic_info = patient_info_get_patient_basic_info(patient_id=patient_id)
diagnosis_info = patient_info_get_patient_diagnosis(patient_id=patient_id)

print(f"患者: {basic_info.get('name')}")
print(f"诊断: {diagnosis_info.get('diagnosis')}")

# 如果诊断为空，从时间线获取病情
timeline = patient_timeline_list_patient_timeline_events(patient_id=str(patient_id), limit=5)
print(f"时间线事件: {timeline}")
```<END_CODE>

**第二步**: 根据获取到的病情生成待办

```<RUN>
# 假设从上一步获取到：诊断为"肺腺癌"，刚做完手术
# 根据病情动态生成待办内容

diagnosis = "肺腺癌"  # 从上一步获取的诊断
patient_id = "39"

# 根据诊断生成相应的待办
if "肺癌" in diagnosis or "肺腺癌" in diagnosis:
    todo_title = f"{diagnosis}术后随访"
    todo_description = "术后3个月复查胸部CT，评估肿瘤复发情况和肺功能恢复"
    todo_type = "follow_up"
elif "糖尿病" in diagnosis:
    todo_title = "糖尿病血糖监测"
    todo_description = "每周监测空腹血糖和餐后2小时血糖，控制在目标范围内"
    todo_type = "lab_test"
else:
    todo_title = f"{diagnosis}定期复查"
    todo_description = "定期复查，监测病情变化"
    todo_type = "follow_up"

result = doctor_todos_create_patient_todo(
    patient_id=patient_id,
    todo_title=todo_title,
    todo_description=todo_description,
    todo_type=todo_type,
    priority="high",
    status="pending"
)
print(result)
```<END_CODE>

### 工作流5: 结合知识库生成诊疗建议

```<RUN>
# 第一步：获取患者诊断
patient_id = 39
diagnosis_info = patient_info_get_patient_diagnosis(patient_id=patient_id)
diagnosis = diagnosis_info.get('diagnosis', '')
print(f"患者诊断: {diagnosis}")

# 第二步：搜索知识库获取诊疗指南
if diagnosis:
    kb_result = knowledge_base_search(
        query=f"{diagnosis} 诊疗指南 治疗方案",
        search_mode="hybrid"
    )
    print(f"知识库检索结果: {kb_result}")
```<END_CODE>

### 工作流6: 文献检索与分析

```<RUN>
# 第一步：搜索 PubMed 文献
search_result = pubmearch_search_pubmed(
    advanced_search="EGFR mutation lung cancer treatment",
    start_date="2023/01/01",
    end_date="2024/12/31",
    max_results=100
)
print(f"搜索完成: {search_result}")

# 第二步：分析搜索结果（需要先完成搜索）
if search_result.get('success') and search_result.get('json_file'):
    analysis = pubmearch_generate_comprehensive_analysis(
        filename=search_result['json_file'],
        top_keywords=15
    )
    print(f"分析结果: {analysis}")
```<END_CODE>

---

## 📝 注意事项

1. **所有工具名必须带文件前缀**，例如 `patient_timeline_list_patient_timeline_events` 而不是 `list_patient_timeline_events`

2. **ID参数类型**：
   - 大部分工具接受字符串类型的ID
   - `patient_info_` 系列工具接受整数类型的 `patient_id`

3. **删除操作**：所有 `delete_` 开头的函数都是硬删除，使用时要格外小心

4. **批量操作**：
   - `save_timeline_metrics` - 批量保存检验指标
   - `save_case_symptoms` - 批量保存症状
   - `save_case_lab_results` - 批量保存检验结果
   - `upload_case_images` - 批量上传图像

5. **工作流顺序**：
   - 创建患者 → 创建时间线事件 → 保存详情/指标/图像
   - 创建病例 → 保存详情 → 保存症状/检验结果 → 上传图像

---

## 🔑 工具前缀速查表

| 前缀 | 用途 |
|------|------|
| `patient_lookup_` | 患者查找 |
| `patient_info_` | 患者信息查询 |
| `patient_timeline_` | 患者时间线查询 |
| `medical_cases_` | 病例库搜索 |
| `care_plans_` | 护理计划管理 |
| `doctor_patient_management_` | 患者档案管理 |
| `doctor_timeline_management_` | 时间线事件管理 |
| `doctor_report_management_` | 报告录入管理 |
| `doctor_case_management_` | 病例库编辑 |
| `doctor_todos_` | 待办事项管理 |
| `exa_search` | 网络搜索（无前缀） |
| `knowledge_base_search` | 知识库检索（无前缀） |
| `pubmearch_` | PubMed文献搜索与分析 |

---

## ⚠️ 重要提醒

1. **动态生成内容**: 创建待办、报告等内容时，必须先获取患者实际病情，根据病情动态生成内容，**不要使用硬编码的固定值**！

2. **避免重复执行**: 工具调用成功后（返回 `success: true`），不要重复执行相同的操作。

3. **分步执行**: 复杂任务应该分步执行，每一步检查结果后再进行下一步。
