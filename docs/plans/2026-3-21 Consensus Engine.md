# 多智能体辩论会诊 — 底层算法创新

## Context

当前多智能体辩论会诊系统的共识评估（`_assess_consensus`）是简单的布尔判断（full/partial/divergent），辩论调度是固定模板+人工控制。缺乏底层算法创新，无法支撑论文级别的学术贡献。

本方案为系统引入两个论文级算法模块：**共识收敛算法 (CWEC)** 和 **自适应辩论调度 (ADS)**，使其从"工程集成"提升为"有算法深度的研究贡献"。

------

## Phase 1: 共识收敛算法引擎 (后端核心)

### 1.1 新建 `/opt/backend/services/consensus_engine.py`

**`ConsensusEngine` 类**，实现四个量化指标：

**指标 1: Agreement Graph Score (AGS)** — 基于签名加权图的一致性度量

构建签名加权图 `G^t = (V, E, w)`，顶点为Agent，边权为：

```
w(i,j) = A^t[i][j] * sqrt(c_i^t * c_j^t)
```

- `A^t[i][j]` ∈ {-1, 0, 1}（disagree/neutral/agree），从 agrees_with/disagrees_with 构建
- `c_i^t` 为 Agent i 在 round t 的置信度（归一化到 [0,1]）

```
AGS^t = Σ_{i<j} w(i,j) / (N*(N-1)/2)    ∈ [-1, 1]
```

**指标 2: Confidence-Weighted Entropy (CWE)** — 意见多样性的信息论度量

通过 agreement matrix 做图聚类（union-find on signed graph），将 Agent 划分为 K 个意见簇：

```
p_k = Σ_{i∈cluster_k} c_i^t / Σ_i c_i^t
CWE^t = -Σ_k p_k * log2(p_k)
CWE_norm^t = CWE^t / log2(N)    ∈ [0, 1]
```

- 0 = 完全共识（一个簇），1 = 完全分裂

**指标 3: Convergence Velocity (CV)** — 收敛速度

```
CV^t = CWE_norm^{t-1} - CWE_norm^t    (t ≥ 2)
```

- 正值 = 收敛中，负值 = 发散中，~0 = 停滞

**指标 4: Composite Consensus Score (CCS)** — 综合共识分数

```
CCS^t = α*(1 - CWE_norm^t) + β*normalize(AGS^t) + γ*mean_confidence^t
```

- α=0.4, β=0.35, γ=0.25
- CCS ≥ 0.85 → "full"，0.55~0.85 → "partial"，< 0.55 → "divergent"

**聚类方法**：基于 agreement matrix 的 union-find（无需 LLM embedding，O(N²)）：

- 互相 agree 的 Agent 合并到同一连通分量
- 互相 disagree 的 Agent 强制分离
- 无明确信号的 Agent 按多数连接归类

核心方法：

- `compute_agreement_matrix(opinions) → np.ndarray`
- `cluster_opinions(matrix, names) → List[List[str]]`
- `compute_cwe(clusters, confidences) → float`
- `compute_ags(matrix, confidences) → float`
- `compute_consensus_score(round_result, prev_round) → ConsensusMetrics`

### 1.2 扩展数据结构

**文件**: `/opt/backend/services/consultation_service.py`

`AgentOpinion` 新增字段：

- `key_claims: List[str]` — 核心诊断要点（3-5个）
- `disagreement_reasons: Dict[str, str]` — 质疑原因（agent_name → reason）

`RoundResult` 新增字段：

- `consensus_score: float` — CCS 值
- `agreement_graph_score: float` — AGS 值
- `entropy: float` — CWE_norm 值
- `convergence_velocity: float` — CV 值
- `opinion_clusters: List[List[str]]` — 意见簇

### 1.3 集成到编排器

**文件**: `/opt/backend/services/consultation_orchestrator.py`

- `__init__` 中实例化 `ConsensusEngine`
- `_run_specialist_round` 中替换 `_assess_consensus` 调用为 `consensus_engine.compute_consensus_score`
- `CONSULTATION_ROUND_COMPLETE` SSE 消息中附带新指标
- `_build_round_prompt` 中追加输出格式：`【关键诊断要点】`、`【质疑原因】`
- `_parse_opinion` 中提取新字段

### 1.4 数据库扩展

**新建迁移**: `/opt/backend/database/migrations/add_consensus_metrics.sql`

```sql
ALTER TABLE nexent.consultation_record_t
  ADD COLUMN IF NOT EXISTS consensus_metrics JSONB DEFAULT '[]'::jsonb;
```

**修改持久化代码**（orchestrator 中 `create_consultation_record` 调用）：将每轮的 ConsensusMetrics 序列化存入 `consensus_metrics` 列。

------

## Phase 2: 自适应辩论调度器 (后端)

### 2.1 新建 `/opt/backend/services/debate_scheduler.py`

**`DebateScheduler` 类**，基于收敛检测和信息价值分析：

**机制 1: CUSUM 停滞检测**

```
S^t = max(0, S^{t-1} + CV^t - δ)    (S^1 = 0, δ=0.02)
```

连续两轮 S^t = 0 → 停滞

**机制 2: Expected Value of Next Round (EVNR)**

```
EVNR^t = (1 - CCS^t) * P(improvement) * magnitude_estimate
P(improvement) = sigmoid(3 * mean(CV^{t-1}, CV^t))
```

EVNR < 0.03 → 建议终止

**机制 3: Disagreement Focus Score (DFS)** — 识别关键分歧点

```
DFS(i,j) = |c_i - c_j| * (c_i + c_j) / 2    (仅对 A[i][j]=-1 的对)
```

高 DFS = 高置信度但意见相反 → 最值得聚焦辩论的点

**四种辩论策略**：

| 条件                        | 策略           | 行为                         |
| :-------------------------- | :------------- | :--------------------------- |
| CCS ≥ 0.85                  | CONVERGED      | 自动建议结束                 |
| CV > 0.05                   | PROGRESSING    | 标准轮次，无调整             |
| CV ≤ 0.05 且 max(DFS) > 0.3 | FOCUSED_DEBATE | Prompt 聚焦到 top-DFS 分歧对 |
| CV ≤ 0.05 且 max(DFS) ≤ 0.3 | STAGNATED      | 建议结束或请求医生介入       |

**专家动态权重**：

```
w_i = base_weight * (rounds_in_majority / total_rounds)^0.5
```

反馈到 CWE 计算中，用 `c_i * w_i` 替代 `c_i`。

核心方法：

- `compute_evnr(all_rounds) → float`
- `compute_dfs_matrix(round_result) → Dict[Tuple, float]`
- `select_strategy(all_rounds) → SchedulingDecision`
- `build_focused_prompt_modifier(focus_pairs, round_result) → str`
- `compute_expert_weights(all_rounds) → Dict[str, float]`

### 2.2 集成到编排器

**两个集成点**：

**A. 轮次完成后**（`run_consultation` 主循环中）：

- 调用 `debate_scheduler.select_strategy(all_round_results)`
- 将 scheduling 数据附加到 `CONSULTATION_ROUND_COMPLETE` SSE 消息
- 若 `should_auto_terminate` 且 CCS ≥ 0.9，跳过医生等待直接结束
- 否则将 `recommendation_for_doctor` 传给前端，辅助医生决策

**B. 构建下轮 Prompt 时**（`_build_round_prompt`）：

- FOCUSED_DEBATE 策略时，注入 `prompt_modifier`，引导 Agent 聚焦特定分歧

------

## Phase 3: 前端展示

### 3.1 类型扩展

**文件**: `/opt/frontend/types/consultation.ts`

`ConsultationRoundCompleteData` 新增：

- `consensus_score?: number`
- `entropy?: number`
- `convergence_velocity?: number`
- `opinion_clusters?: string[][]`
- `scheduling?: { strategy, evnr, should_auto_terminate, recommendation, focus_pairs }`

`ConsultationState` 新增：

- `consensusHistory: { round, score, entropy, velocity }[]`

### 3.2 流式处理

**文件**: `/opt/frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`

`CONSULTATION_ROUND_COMPLETE` handler 中解析新字段，推入 `consensusHistory`。

### 3.3 ConsultationCard 增强

**文件**: `/opt/frontend/app/[locale]/chat/streaming/ConsultationCard.tsx`

1. **共识分数仪表盘** — 替换 `ConsensusLevelBadge`，圆形仪表显示 CCS 值 (0-100%)
2. **收敛趋势迷你图** — 右侧共识汇总面板中，SVG polyline 展示 CCS 跨轮次变化（无外部图表库）
3. **调度建议横幅** — 轮次汇总底部，按策略颜色显示建议（绿=converged, 橙=focused, 红=stagnated）
4. **意见簇分组徽章** — 按 cluster 用颜色标签分组展示 Agent 名称
5. **焦点分歧高亮** — FOCUSED_DEBATE 时给相关 Agent 面板加橙色边框

### 3.4 ConsultationReportCard 增强

**文件**: `/opt/frontend/app/[locale]/chat/streaming/ConsultationReportCard.tsx`

1. 新增"收敛过程"折叠区：CCS 折线图 + 最终指标摘要
2. 显示总熵减少量、已解决分歧数

------

## 关键文件清单

| 文件                                                         | 操作     | 说明                                 |
| :----------------------------------------------------------- | :------- | :----------------------------------- |
| `backend/services/consensus_engine.py`                       | **新建** | 共识收敛算法核心                     |
| `backend/services/debate_scheduler.py`                       | **新建** | 自适应辩论调度器                     |
| `backend/services/consultation_service.py`                   | 修改     | 扩展 AgentOpinion/RoundResult 字段   |
| `backend/services/consultation_orchestrator.py`              | 修改     | 集成两个算法模块，扩展 prompt 和解析 |
| `backend/database/migrations/add_consensus_metrics.sql`      | **新建** | 数据库 schema 扩展                   |
| `backend/database/consultation_db.py`                        | 修改     | 持久化 consensus_metrics             |
| `backend/database/db_models.py`                              | 修改     | 新增 consensus_metrics 列            |
| `frontend/types/consultation.ts`                             | 修改     | 扩展类型定义                         |
| `frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx` | 修改     | 解析新字段                           |
| `frontend/app/[locale]/chat/streaming/ConsultationCard.tsx`  | 修改     | 新增可视化组件                       |
| `frontend/app/[locale]/chat/streaming/ConsultationReportCard.tsx` | 修改     | 新增收敛历史展示                     |

## 复用的现有实现

- `ConsultationManager` 的 `threading.Event` 阻塞模式 — 医生介入机制不变
- `MessageObserver.add_message()` — 新指标通过现有 SSE 通道传输
- `ConfidenceBar` 组件 — 复用于共识分数展示
- `ConsensusLevelBadge` — 保留但增强为仪表盘
- `ExpandableText` 组件 — 复用于调度建议文本

## 验证方案

1. **单元测试**：固定 AgentOpinion 集合，手算验证 CCS/AGS/CWE 值
2. **聚类测试**：全同意/全反对/子群体等边界情况
3. **调度测试**：构造收敛/停滞/分歧场景，验证策略选择
4. **集成测试**：3-Agent 模拟会诊，验证 SSE 消息包含新指标、数据库正确持久化
5. **前端手动测试**：观察仪表盘、迷你图、调度建议的实时渲染
6. **场景验证**：
   - 全同意场景 → CCS > 0.85, 单簇, "full"
   - 持续分歧 → CCS 低, CV~0, 第3轮 scheduler 建议 "stagnated"
   - 渐进收敛 → CCS 单调上升, CV 正值
   - 聚焦辩论 → scheduler 识别 DFS 对, prompt 聚焦后分歧解决