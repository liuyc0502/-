# 多智能体辩论会诊 — 底层算法创新 (CWEC + ADS)

> 日期: 2026-03-21

## Context

原有多智能体辩论会诊系统的共识评估（`_assess_consensus`）是简单的布尔判断（full/partial/divergent），辩论调度是固定模板+人工控制，缺乏底层算法创新。

本方案引入两个算法模块：**共识收敛算法 (CWEC)** 和 **自适应辩论调度 (ADS)**，替换原有布尔判断，使系统具备可量化、可形式化的算法深度。

---

## 实现状态

### Phase 1: 共识收敛算法引擎 (后端核心) ✅ 已完成

#### Step 1.1: ConsensusEngine 类 ✅

**文件**: `backend/services/consensus_engine.py`

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

- `compute_agreement_matrix(agent_names, opinions) → List[List[int]]` — 构建 N×N 签名一致矩阵，disagree 优先对称化
- `cluster_opinions(agreement_matrix, agent_names) → List[List[str]]` — union-find + 约束感知图着色聚类
- `compute_cwe(clusters, confidences, agent_weights) → float` — 加权信息熵，支持动态专家权重
- `compute_ags(agreement_matrix, confidences, agent_names) → float` — 签名加权图分数
- `compute_consensus_score(round_result, prev_round, agent_weights) → ConsensusMetrics` — 主入口，计算全部指标

辅助类：

- `ConsensusMetrics` — 数据类，包含 consensus_score / agreement_graph_score / entropy / convergence_velocity / opinion_clusters / consensus_level
- `_constraint_cluster()` — 处理 agree+disagree 冲突时的贪心图着色
- `_assess_level()` — CCS → categorical level 映射

#### Step 1.2: 扩展数据结构 ✅

**文件**: `backend/services/consultation_service.py`

`AgentOpinion` 新增字段：

- `key_claims: List[str]` — 核心诊断要点（3-5个），通过 `【关键诊断要点】` prompt 格式提取
- `disagreement_reasons: Dict[str, str]` — 质疑原因（agent_name → reason），通过 `【质疑原因】` prompt 格式提取

`RoundResult` 新增字段：

- `consensus_score: float` — CCS 值 ∈ [0, 1]
- `agreement_graph_score: float` — AGS 值 ∈ [-1, 1]
- `entropy: float` — CWE_norm 值 ∈ [0, 1]
- `convergence_velocity: float` — CV 值（正值=收敛）
- `opinion_clusters: List[List[str]]` — 意见簇分组

#### Step 1.3: 集成到编排器 ✅

**文件**: `backend/services/consultation_orchestrator.py`

- `__init__` 中实例化 `ConsensusEngine` 和 `DebateScheduler`
- `_run_specialist_round` 中删除旧 `_assess_consensus` 静态方法，替换为 `consensus_engine.compute_consensus_score`（支持动态专家权重 `agent_weights`）
- `CONSULTATION_ROUND_COMPLETE` SSE 消息中附带 `consensus_score` / `entropy` / `convergence_velocity` / `opinion_clusters` / `scheduling`
- `_build_round_prompt` Round 1 追加 `【关键诊断要点】`；Round 2+ 追加 `【关键诊断要点】` `【质疑原因】`
- `_parse_opinion` 中用正则提取 `key_claims`（逗号/顿号分隔）和 `disagreement_reasons`（冒号分隔的 name:reason 行）
- 持久化时将 `consensus_metrics` 和 `key_claims` / `disagreement_reasons` 一并写入数据库
- 最终报告中注入 `consensus_history` 数组供前端 ConsultationReportCard 展示收敛折线图

#### Step 1.4: 数据库扩展 ✅

**新建迁移**: `backend/database/migrations/add_consensus_metrics.sql`

```sql
ALTER TABLE nexent.consultation_record_t
  ADD COLUMN IF NOT EXISTS consensus_metrics JSONB DEFAULT '[]'::jsonb;
```

- `backend/database/db_models.py` — `ConsultationRecord` 新增 `consensus_metrics` JSON 列
- `backend/database/consultation_db.py` — `create_consultation_record` 中读取 `data["consensus_metrics"]` 并持久化

---

### Phase 2: 自适应辩论调度器 (后端) ✅ 已完成

#### Step 2.1: DebateScheduler 类 ✅

**文件**: `backend/services/debate_scheduler.py`

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

- `compute_evnr(all_rounds) → float` — 基于 `room_for_improvement * P(improvement) * magnitude`，其中 P 用 sigmoid 估算
- `compute_dfs_matrix(round_result) → Dict[Tuple, float]` — 对所有 disagree 对计算 `|c_i - c_j| * (c_i + c_j) / 2`
- `select_strategy(all_rounds) → SchedulingDecision` — 主入口，按决策树选择策略
- `_build_focused_prompt_modifier(focus_pairs, focus_topics, round_result) → str` — 生成聚焦分歧的 prompt 文本
- `compute_expert_weights(all_rounds) → Dict[str, float]` — 基于多数簇一致性的动态权重
- `update_cusum(cv) → float` — CUSUM 统计量更新

辅助类：

- `DebateStrategy` — 枚举：CONVERGED / PROGRESSING / FOCUSED_DEBATE / STAGNATED
- `SchedulingDecision` — 数据类，包含 strategy / should_auto_terminate / evnr / focus_pairs / focus_topics / prompt_modifier / recommendation_for_doctor

#### Step 2.2: 集成到编排器 ✅

**文件**: `backend/services/consultation_orchestrator.py`

**集成点 A: 轮次完成后**（`run_consultation` 主循环）：

- 每轮完成后调用 `debate_scheduler.select_strategy(all_round_results)`
- 将 `scheduling` 数据（strategy / evnr / should_auto_terminate / recommendation / focus_pairs）附加到 `CONSULTATION_ROUND_COMPLETE` SSE 消息
- 若 `should_auto_terminate` 且 CCS ≥ 0.9，跳过医生等待直接结束，log 记录自动终止原因
- 否则正常进入医生等待流程，前端展示 `recommendation_for_doctor`

**集成点 B: 构建下轮 Prompt 时**：

- 医生选择"继续辩论"后，检查当前策略是否为 `FOCUSED_DEBATE`
- 若是，将 `scheduling.prompt_modifier` 追加到 `doctor_instructions`（若医生也有指导则拼接）
- prompt_modifier 包含具体分歧对的观点对比 + 质疑理由 + 要求引用医学证据

**集成点 C: 共识计算中的专家权重**：

- `_run_specialist_round` 中调用 `debate_scheduler.compute_expert_weights(previous_rounds)` 获取动态权重
- 将权重传入 `consensus_engine.compute_consensus_score(..., agent_weights)` 影响 CWE 计算

---

### Phase 3: 前端展示 ✅ 已完成

#### Step 3.1: 类型扩展 ✅

**文件**: `frontend/types/consultation.ts`

新增 `ConsultationSchedulingData` 接口：

```typescript
interface ConsultationSchedulingData {
  strategy: "converged" | "progressing" | "focused_debate" | "stagnated";
  evnr: number;
  should_auto_terminate: boolean;
  recommendation: string;
  focus_pairs: [string, string][];
}
```

`ConsultationRoundCompleteData` 新增：

- `consensus_score?: number` / `entropy?: number` / `convergence_velocity?: number` / `opinion_clusters?: string[][]`
- `scheduling?: ConsultationSchedulingData`

`ConsultationState.roundSummaries` 值类型扩展为包含上述所有字段。

`ConsultationState` 新增：

- `consensusHistory: { round, score, entropy, velocity }[]`

`ConsultationReportData` 新增：

- `consensus_history?: { round, consensus_score, entropy, convergence_velocity }[]`

#### Step 3.2: 流式处理 ✅

**文件**: `frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx`

- `CONSULTATION_START` handler 中初始化 `consensusHistory: []`
- `CONSULTATION_ROUND_COMPLETE` handler 中解析新字段存入 `roundSummaries`，同时 push 到 `consensusHistory` 数组

#### Step 3.3: ConsultationCard 增强 ✅

**文件**: `frontend/app/[locale]/chat/streaming/ConsultationCard.tsx`

新增 4 个可视化组件：

1. **`ConsensusGauge`** — SVG 圆形仪表盘，显示 CCS 值 (0-100%)，三色分级（≥85% 绿 / ≥55% 黄 / <55% 红）
2. **`ConvergenceSparkline`** — SVG polyline 迷你折线图，展示 CCS 跨轮次趋势，含 85% 阈值虚线
3. **`SchedulingBanner`** — 调度建议横幅，按策略分色（converged 绿 / progressing 蓝 / focused_debate 橙 / stagnated 红）+ 图标 + 建议文本
4. **`ClusterBadges`** — 意见簇分组徽章，按 cluster 分色标签展示 Agent 名称，簇间用 "vs" 分隔

右侧共识汇总面板增强：

- 顶部新增 ConsensusGauge + ConvergenceSparkline 组合区域
- 每轮汇总卡片中显示 CCS 百分比 + ConsensusLevelBadge
- 多簇时显示 ClusterBadges
- 有调度建议时显示 SchedulingBanner

#### Step 3.4: ConsultationReportCard 增强 ✅

**文件**: `frontend/app/[locale]/chat/streaming/ConsultationReportCard.tsx`

新增 `ConvergenceChart` 组件：

- SVG 折线图（280×60），双线展示：CCS 实线 + 意见统一度(1-entropy)虚线
- 85% 阈值虚线参考
- X 轴标注轮次（R1, R2, ...），Y 轴 0-100%
- 图例标注"共识分数"和"意见统一度"
- 底部显示最终共识分数 + 熵减少量

作为可折叠的"收敛过程"区域，位于共识/分歧点与专家意见之间。

---

## 关键文件清单

| 文件 | 操作 | 说明 |
| :--- | :--- | :--- |
| `backend/services/consensus_engine.py` | **新建** | CWEC 共识收敛算法引擎（ConsensusEngine 类 + ConsensusMetrics 数据类） |
| `backend/services/debate_scheduler.py` | **新建** | ADS 自适应辩论调度器（DebateScheduler 类 + DebateStrategy 枚举 + SchedulingDecision 数据类） |
| `backend/services/consultation_service.py` | 修改 | AgentOpinion 新增 key_claims / disagreement_reasons；RoundResult 新增 5 个指标字段 |
| `backend/services/consultation_orchestrator.py` | 修改 | 删除旧 `_assess_consensus`，集成 ConsensusEngine + DebateScheduler，扩展 prompt 格式和解析，注入 consensus_history 到最终报告 |
| `backend/database/migrations/add_consensus_metrics.sql` | **新建** | ALTER TABLE 新增 consensus_metrics JSONB 列 |
| `backend/database/consultation_db.py` | 修改 | create_consultation_record 中持久化 consensus_metrics |
| `backend/database/db_models.py` | 修改 | ConsultationRecord 新增 consensus_metrics 列定义 |
| `frontend/types/consultation.ts` | 修改 | 新增 ConsultationSchedulingData 接口，扩展 RoundCompleteData / State / ReportData |
| `frontend/app/[locale]/chat/streaming/chatStreamHandler.tsx` | 修改 | 解析新指标字段，维护 consensusHistory 数组 |
| `frontend/app/[locale]/chat/streaming/ConsultationCard.tsx` | 修改 | 新增 ConsensusGauge / ConvergenceSparkline / SchedulingBanner / ClusterBadges 组件 |
| `frontend/app/[locale]/chat/streaming/ConsultationReportCard.tsx` | 修改 | 新增 ConvergenceChart 组件 + 可折叠收敛过程区域 |

## 复用的现有实现

| 已有组件 | 复用方式 |
| :--- | :--- |
| `ConsultationManager` (threading.Event 模式) | 医生介入阻塞机制不变，调度器只提供建议不强制覆盖 |
| `MessageObserver.add_message()` | 新指标通过现有 SSE 通道传输，不新增 ProcessType |
| `ConfidenceBar` 组件 | 复用于专家个人置信度展示 |
| `ConsensusLevelBadge` 组件 | 保留用于轮次汇总卡片中的分类标签 |
| `ExpandableText` 组件 | 复用于调度建议和轮次摘要文本 |

---

## SSE 消息协议变更

`consultation_round_complete` 消息扩展：

```json
{
  "consultation_id": "...",
  "round": 2,
  "summary": "...",
  "consensus_level": "partial",
  "consensus_score": 0.6234,
  "entropy": 0.4521,
  "convergence_velocity": 0.1203,
  "opinion_clusters": [["Agent_A", "Agent_B"], ["Agent_C"]],
  "scheduling": {
    "strategy": "focused_debate",
    "evnr": 0.0812,
    "should_auto_terminate": false,
    "recommendation": "辩论停滞但存在可解决的关键分歧...",
    "focus_pairs": [["Agent_A", "Agent_C"]]
  }
}
```

`consultation_report`（via REPORT_CARD）新增 `consensus_history` 数组：

```json
{
  "card_type": "consultation_report",
  "consensus_history": [
    {"round": 1, "consensus_score": 0.42, "entropy": 0.83, "convergence_velocity": 0},
    {"round": 2, "consensus_score": 0.62, "entropy": 0.45, "convergence_velocity": 0.38}
  ],
  ...
}
```

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