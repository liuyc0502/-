"""
LLM prompts for the Knowledge Graph system (PKG-TP).
Contains structured prompts for entity-relation extraction, trajectory mapping,
predictive path scoring, and anomaly assessment.
"""

# Entity and relationship types for schema enforcement
ENTITY_TYPES = [
    "Disease", "PathologicalFeature", "Biomarker",
    "Treatment", "TestMethod", "Organ", "ClinicalStage"
]

RELATION_TYPES = [
    "indicates", "causes", "differentiates_from",
    "progresses_to", "treats", "detected_by", "associated_with"
]

# ──────────────────────────────────────────────
# 1. Entity-Relation Extraction Prompt
# ──────────────────────────────────────────────
ENTITY_RELATION_EXTRACTION_PROMPT = """你是一个医学知识图谱构建专家。根据以下检索到的医学文档，提取与用户查询相关的实体和关系。

## 用户查询
{query}

## 检索到的文档
{documents}

## 任务要求
从上述文档中提取与查询相关的医学实体和它们之间的关系。

### 实体类型（仅使用以下类型）
- Disease: 疾病名称（如：乳腺导管原位癌、肺腺癌）
- PathologicalFeature: 病理特征（如：细胞异型性、核分裂象增多）
- Biomarker: 生物标志物（如：HER2、Ki-67、ER、PR）
- Treatment: 治疗方案（如：手术切除、化疗、靶向治疗）
- TestMethod: 检测方法（如：免疫组化、FISH检测、PCR）
- Organ: 器官/组织（如：乳腺、肺、肝脏）
- ClinicalStage: 临床分期（如：T1N0M0、III期）

### 关系类型（仅使用以下类型）
- indicates: A提示/指示B（如：HER2阳性 indicates 靶向治疗）
- causes: A导致B
- differentiates_from: A与B鉴别诊断
- progresses_to: A可能进展为B
- treats: A治疗B
- detected_by: A通过B检测
- associated_with: A与B相关联

## 输出格式
严格输出以下JSON格式，不要输出其他内容：
```json
{{
  "nodes": [
    {{"id": "n1", "label": "实体名称", "type": "实体类型", "properties": {{"description": "简要描述"}}}},
    ...
  ],
  "edges": [
    {{"id": "e1", "source": "n1", "target": "n2", "type": "关系类型", "weight": 0.85}},
    ...
  ]
}}
```

## 注意事项
- 提取不超过30个节点，保持图谱简洁且信息量充足
- weight 范围 0-1，表示关系的置信度
- 确保所有 source/target 引用的 id 都存在于 nodes 中
- 优先提取与用户查询直接相关的实体和关系
"""

# ──────────────────────────────────────────────
# 2. Trajectory Mapping Prompt
# ──────────────────────────────────────────────
TRAJECTORY_MAPPING_PROMPT = """你是一个临床数据分析专家。将患者的诊疗时间轴事件映射到知识图谱的节点上。

## 知识图谱节点
{graph_nodes}

## 患者时间轴事件
{timeline_events}

## 任务要求
对于每个时间轴事件，识别与之关联的知识图谱节点ID。

## 输出格式
严格输出以下JSON格式：
```json
{{
  "trajectory": [
    {{
      "date": "2026-01-15",
      "event_summary": "事件描述",
      "activated_node_ids": ["n1", "n3", "n7"]
    }},
    ...
  ],
  "current_nodes": ["n1", "n5"]
}}
```

## 注意事项
- activated_node_ids 必须是知识图谱中存在的节点ID
- current_nodes 是患者最近一次事件激活的节点
- 按时间顺序排列
"""

# ──────────────────────────────────────────────
# 3. Predictive Path Scoring Prompt
# ──────────────────────────────────────────────
PREDICTIVE_PATH_SCORING_PROMPT = """你是一个病理学预后预测专家。基于患者在知识图谱上的当前位置和图谱结构，预测可能的演变路径。

## 知识图谱结构
{graph_structure}

## 患者当前位置（激活的节点）
{current_position}

## 患者诊疗历史轨迹
{patient_trajectory}

## 任务要求
分析患者当前位置在图谱上可能的下一步演变方向。考虑：
1. 当前激活节点的出边指向哪些目标节点
2. 患者的历史轨迹趋势
3. 医学知识中该类疾病的常见进展模式

## 输出格式
严格输出以下JSON格式：
```json
{{
  "predictions": [
    {{
      "target_node": {{"id": "n8", "label": "节点名称", "type": "节点类型"}},
      "probability": 0.72,
      "reasoning": "基于XX指标和XX特征，该患者有较高概率...",
      "timeframe": "6-12个月"
    }},
    ...
  ]
}}
```

## 注意事项
- 按概率从高到低排序
- probability 范围 0-1
- reasoning 需要有医学依据，简洁明了
- timeframe 给出大致时间范围
- 最多返回5条预测路径
"""

# ──────────────────────────────────────────────
# 4. Anomaly Assessment Prompt
# ──────────────────────────────────────────────
ANOMALY_ASSESSMENT_PROMPT = """你是一个临床异常检测专家。分析患者的实际诊疗轨迹是否偏离了该疾病的典型路径。

## 知识图谱结构
{graph_structure}

## 患者实际轨迹
{patient_trajectory}

## 疾病的典型路径（基于图谱上的常见路径）
{typical_paths}

## 任务要求
比较患者的实际轨迹与典型路径，识别异常偏离并评估其临床意义。

## 输出格式
严格输出以下JSON格式：
```json
{{
  "anomalies": [
    {{
      "node_id": "n5",
      "expected_path": "根据典型路径，应该经过XX检查后确认...",
      "actual_path": "但该患者直接跳过了XX步骤...",
      "anomaly_score": 0.78,
      "clinical_significance": "中度风险 - 建议补充XX检查以排除误诊可能"
    }},
    ...
  ]
}}
```

## 注意事项
- anomaly_score 范围 0-1，越高表示偏离越严重
- clinical_significance 需要给出具体的临床建议
- 仅报告有临床意义的异常，忽略细微的正常变异
- 如果没有异常，返回空数组 {"anomalies": []}
"""

# ──────────────────────────────────────────────
# 5. Patient-Friendly Explanation Prompt
# ──────────────────────────────────────────────
PATIENT_FRIENDLY_EXPLANATION_PROMPT = """你是一个善于用通俗语言解释医学概念的健康顾问。将以下知识图谱节点翻译为患者能理解的语言。

## 知识图谱节点
{nodes}

## 患者当前位置
{current_position}

## 任务要求
为每个节点生成患者友好的描述，不使用专业术语。

## 输出格式
```json
{{
  "friendly_nodes": [
    {{
      "id": "n1",
      "friendly_label": "通俗名称",
      "explanation": "用简单的话解释这是什么...",
      "relevance": "这和您的情况有什么关系..."
    }},
    ...
  ]
}}
```
"""
