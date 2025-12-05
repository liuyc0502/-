# 患者端 MCP 工具调用示例

所有示例均可直接运行。`patient_id` 会由系统自动注入，无需患者提供。

---

## 📋 Patient Info Tools (我的信息)

### 获取我的基本信息

```<RUN>
info = patient_info_get_patient_basic_info(patient_id=patient_id)
print(info)
```<END_CODE>

### 获取我的诊断信息

```<RUN>
diagnosis = patient_info_get_patient_diagnosis(patient_id=patient_id)
print(diagnosis)
```<END_CODE>

### 获取我的过敏信息

```<RUN>
allergies = patient_info_get_patient_allergies(patient_id=patient_id)
print(allergies)
```<END_CODE>

### 获取我的既往病史

```<RUN>
history = patient_info_get_patient_medical_history(patient_id=patient_id)
print(history)
```<END_CODE>

### 获取我的家族史

```<RUN>
family_history = patient_info_get_patient_family_history(patient_id=patient_id)
print(family_history)
```<END_CODE>

---

## 📅 Patient Timeline Tools (我的就诊记录)

### 查看我的所有就诊记录

```<RUN>
timeline = patient_timeline_list_patient_timeline_events(patient_id=str(patient_id), limit=20)
print(timeline)
```<END_CODE>

### 查看特定类型的记录（如病理报告）

```<RUN>
reports = patient_timeline_list_patient_timeline_events(
    patient_id=str(patient_id),
    event_type="病理报告",
    limit=5
)
print(reports)
```<END_CODE>

### 查看特定日期范围的记录

```<RUN>
recent = patient_timeline_list_patient_timeline_events(
    patient_id=str(patient_id),
    start_date="2024-01-01",
    end_date="2024-12-31",
    limit=10
)
print(recent)
```<END_CODE>

### 查看某次就诊的详细信息

```<RUN>
# 先获取时间线列表
timeline = patient_timeline_list_patient_timeline_events(patient_id=str(patient_id), limit=5)
print(f"最近的就诊记录: {timeline}")

# 获取第一条记录的详情
if timeline.get('events'):
    first_event = timeline['events'][0]
    timeline_id = first_event['timeline_id']
    detail = patient_timeline_get_timeline_event_detail(timeline_id=str(timeline_id))
    print(f"详细信息: {detail}")
```<END_CODE>

### 查看某次检查的检验指标

```<RUN>
# 先获取血常规类型的时间线
lab_events = patient_timeline_list_patient_timeline_events(
    patient_id=str(patient_id),
    event_type="血常规",
    limit=3
)

# 获取最近一次的指标详情
if lab_events.get('events'):
    timeline_id = lab_events['events'][0]['timeline_id']
    metrics = patient_timeline_get_timeline_event_metrics(timeline_id=str(timeline_id))
    print(f"检验指标: {metrics}")
```<END_CODE>

---

## 💊 Care Plan Tools (我的护理计划)

### 查看我的护理计划

```<RUN>
plans = care_plans_list_patient_care_plans(patient_id=str(patient_id), status="active")
print(plans)
```<END_CODE>

### 查看用药清单

```<RUN>
# 先获取护理计划
plans = care_plans_list_patient_care_plans(patient_id=str(patient_id), status="active")

# 获取第一个计划的用药信息
if plans.get('plans'):
    plan_id = plans['plans'][0]['plan_id']
    medications = care_plans_get_care_plan_medications(plan_id=str(plan_id))
    print(f"用药清单: {medications}")
```<END_CODE>

### 查看康复任务

```<RUN>
# 先获取护理计划
plans = care_plans_list_patient_care_plans(patient_id=str(patient_id), status="active")

# 获取康复任务
if plans.get('plans'):
    plan_id = plans['plans'][0]['plan_id']
    tasks = care_plans_get_care_plan_tasks(plan_id=str(plan_id))
    print(f"康复任务: {tasks}")
```<END_CODE>

### 查看注意事项

```<RUN>
# 先获取护理计划
plans = care_plans_list_patient_care_plans(patient_id=str(patient_id), status="active")

# 获取注意事项
if plans.get('plans'):
    plan_id = plans['plans'][0]['plan_id']
    precautions = care_plans_get_care_plan_precautions(plan_id=str(plan_id))
    print(f"注意事项: {precautions}")
```<END_CODE>

### 记录服药

```<RUN>
# 患者说"我吃了药"时使用
# 需要先获取用药信息，然后记录

plans = care_plans_list_patient_care_plans(patient_id=str(patient_id), status="active")

if plans.get('plans'):
    plan_id = plans['plans'][0]['plan_id']
    medications = care_plans_get_care_plan_medications(plan_id=str(plan_id))
    
    if medications.get('medications'):
        med = medications['medications'][0]  # 根据患者描述选择对应药物
        result = care_plans_record_medication_taken(
            plan_id=str(plan_id),
            patient_id=str(patient_id),
            medication_id=str(med['medication_id']),
            record_date="2025-01-15",  # 使用当天日期
            notes="患者自述按时服用"
        )
        print(result)
```<END_CODE>

### 记录完成康复任务

```<RUN>
# 患者说"我做完锻炼了"时使用

plans = care_plans_list_patient_care_plans(patient_id=str(patient_id), status="active")

if plans.get('plans'):
    plan_id = plans['plans'][0]['plan_id']
    tasks = care_plans_get_care_plan_tasks(plan_id=str(plan_id))
    
    if tasks.get('tasks'):
        task = tasks['tasks'][0]  # 根据患者描述选择对应任务
        result = care_plans_record_task_completed(
            plan_id=str(plan_id),
            patient_id=str(patient_id),
            task_id=str(task['task_id']),
            record_date="2025-01-15",  # 使用当天日期
            notes="完成20分钟散步"
        )
        print(result)
```<END_CODE>

---

## 🔎 Exa Search Tool (网络搜索)

### 搜索疾病相关知识

```<RUN>
# 患者询问疾病相关问题时使用
result = exa_search(query="肺癌术后注意事项")
print(result)
```<END_CODE>

### 搜索药物信息

```<RUN>
# 患者询问药物副作用或用法时使用
result = exa_search(query="靶向药副作用如何缓解")
print(result)
```<END_CODE>

### 搜索康复指南

```<RUN>
result = exa_search(query="肿瘤患者术后康复锻炼方法")
print(result)
```<END_CODE>

---

## 📚 Knowledge Base Search Tool (知识库检索)

### 检索疾病知识

```<RUN>
result = knowledge_base_search(
    query="肺癌患者饮食注意事项",
    search_mode="hybrid"
)
print(result)
```<END_CODE>

### 检索用药指南

```<RUN>
result = knowledge_base_search(
    query="化疗期间护理要点",
    search_mode="hybrid"
)
print(result)
```<END_CODE>

---

## 🎯 患者端完整工作流示例

### 工作流1: 查看我的完整健康档案

```<RUN>
# 获取基本信息
basic_info = patient_info_get_patient_basic_info(patient_id=patient_id)
print(f"姓名: {basic_info.get('name')}, 年龄: {basic_info.get('age')}")

# 获取诊断
diagnosis = patient_info_get_patient_diagnosis(patient_id=patient_id)
print(f"当前诊断: {diagnosis.get('diagnosis')}")

# 获取过敏信息
allergies = patient_info_get_patient_allergies(patient_id=patient_id)
if allergies.get('has_allergies'):
    print(f"过敏信息: {allergies.get('allergies')}")
else:
    print("无已知过敏史")
```<END_CODE>

### 工作流2: 查看今日用药和任务

```<RUN>
# 获取活动中的护理计划
plans = care_plans_list_patient_care_plans(patient_id=str(patient_id), status="active")

if plans.get('plans'):
    plan = plans['plans'][0]
    plan_id = str(plan['plan_id'])
    print(f"护理计划: {plan.get('plan_name')}")
    
    # 获取用药清单
    meds = care_plans_get_care_plan_medications(plan_id=plan_id)
    print(f"\n今日用药:")
    for med in meds.get('medications', []):
        print(f"  - {med['medication_name']}: {med['dosage']}, {med['frequency']}")
    
    # 获取康复任务
    tasks = care_plans_get_care_plan_tasks(plan_id=plan_id)
    print(f"\n今日任务:")
    for task in tasks.get('tasks', []):
        print(f"  - {task['task_title']}: {task['frequency']}")
else:
    print("暂无活动中的护理计划")
```<END_CODE>

### 工作流3: 查看我的检查报告

```<RUN>
# 获取最近的时间线事件
timeline = patient_timeline_list_patient_timeline_events(
    patient_id=str(patient_id),
    limit=10
)

print(f"共有 {timeline.get('total_events', 0)} 条就诊记录\n")

for event in timeline.get('events', []):
    print(f"📅 {event.get('stage_date')} - {event.get('stage_type')}")
    print(f"   {event.get('stage_title')}")
    print()
```<END_CODE>

### 工作流4: 理解我的检验结果

```<RUN>
# 第一步：获取最近的血常规检查
lab_events = patient_timeline_list_patient_timeline_events(
    patient_id=str(patient_id),
    event_type="血常规",
    limit=1
)

if lab_events.get('events'):
    timeline_id = str(lab_events['events'][0]['timeline_id'])
    
    # 第二步：获取检验指标
    metrics = patient_timeline_get_timeline_event_metrics(timeline_id=timeline_id)
    
    print("检验结果:")
    for m in metrics.get('metrics', []):
        status_icon = "✅" if m.get('metric_status') == 'normal' else "⚠️"
        print(f"{status_icon} {m.get('metric_full_name')}: {m.get('metric_value')} {m.get('metric_unit')}")
        print(f"   正常范围: {m.get('normal_range_min')} - {m.get('normal_range_max')}")
else:
    print("未找到血常规检查记录")
```<END_CODE>

### 工作流5: 获取健康建议（结合知识库）

```<RUN>
# 第一步：获取患者诊断
diagnosis_info = patient_info_get_patient_diagnosis(patient_id=patient_id)
diagnosis = diagnosis_info.get('diagnosis', '')

if diagnosis:
    # 第二步：根据诊断搜索相关知识
    kb_result = knowledge_base_search(
        query=f"{diagnosis} 患者日常护理注意事项",
        search_mode="hybrid"
    )
    print(f"根据您的诊断({diagnosis})，以下是相关健康建议:")
    print(kb_result)
else:
    print("暂无诊断记录，无法提供个性化建议")
```<END_CODE>

---

## 🔑 患者端工具前缀速查表

| 前缀 | 用途 |
|------|------|
| `patient_info_` | 我的个人信息查询 |
| `patient_timeline_` | 我的就诊记录查询 |
| `care_plans_` | 我的护理计划管理 |
| `exa_search` | 网络搜索（无前缀） |
| `knowledge_base_search` | 知识库检索（无前缀） |

---

## ⚠️ 患者端重要提醒

1. **patient_id 自动注入**: 患者端的 `patient_id` 由系统自动提供，无需患者手动输入。

2. **只读为主**: 患者端大部分操作是查询，只有记录服药和完成任务是写操作。

3. **隐私保护**: 患者只能查看自己的信息，不能查看其他患者的数据。

4. **避免重复记录**: 记录服药/任务完成成功后，不要重复记录同一天的同一项目。

5. **理解检验结果**: 当患者询问检验结果的含义时，应结合知识库检索提供专业解读。

