# Care Plan Management Tables Migration

## 概述

此迁移脚本用于创建康复计划管理系统所需的5个数据库表。

## 创建的表

### 1. care_plan_t - 康复计划主表
- **主键**: plan_id
- **外键**: patient_id (关联 patient_info_t)
- **字段**:
  - plan_name: 计划名称
  - plan_description: 计划描述
  - start_date, end_date: 开始/结束日期
  - status: 状态 (active/completed/paused)
  - doctor_id: 创建计划的医生ID
- **索引**: patient_id, status, tenant_id

### 2. care_plan_medication_t - 用药安排表
- **主键**: medication_id
- **外键**: plan_id (关联 care_plan_t)
- **字段**:
  - medication_name: 药品名称
  - dosage: 剂量
  - frequency: 频率
  - time_slots: 服药时间点 (JSON数组)
  - notes: 用药注意事项
- **索引**: plan_id

### 3. care_plan_task_t - 康复任务表
- **主键**: task_id
- **外键**: plan_id (关联 care_plan_t)
- **字段**:
  - task_title: 任务标题
  - task_description: 任务描述
  - task_category: 任务类别 (运动/护理/监测/饮食)
  - frequency: 频率
  - duration: 持续时间
- **索引**: plan_id, task_category

### 4. care_plan_precaution_t - 注意事项表
- **主键**: precaution_id
- **外键**: plan_id (关联 care_plan_t)
- **字段**:
  - precaution_content: 注意事项内容
  - priority: 优先级 (high/medium/low)
- **索引**: plan_id

### 5. care_plan_completion_t - 完成记录表
- **主键**: completion_id
- **外键**:
  - plan_id (关联 care_plan_t)
  - patient_id (关联 patient_info_t)
  - item_id (medication_id 或 task_id)
- **字段**:
  - record_date: 记录日期
  - item_type: 项目类型 (medication/task)
  - completed: 是否完成
  - completion_time: 完成时间
  - notes: 患者备注
- **索引**:
  - plan_id
  - patient_id + record_date (复合索引)
  - item_type + item_id (复合索引)

## 运行迁移

### 方式1: 使用Python脚本（推荐）

```bash
cd backend/database/migrations
python3 run_care_plan_migration.py
```

### 方式2: 直接使用SQL

```bash
cd backend/database/migrations
psql -h <host> -U <user> -d <database> -f create_care_plan_tables.sql
```

## 迁移特性

- ✅ **幂等性**: 可以多次运行，不会重复创建
- ✅ **事务安全**: 使用DO块确保原子性
- ✅ **自动验证**: 迁移完成后自动显示表结构验证
- ✅ **索引优化**: 自动创建性能优化索引
- ✅ **标准字段**: 所有表包含 TableBase 标准字段
  - create_time, update_time
  - created_by, updated_by
  - delete_flag (软删除)

## 环境要求

- Python 3.11+
- psycopg2
- PostgreSQL 数据库
- 环境变量配置:
  - POSTGRES_DB
  - POSTGRES_USER
  - NEXENT_POSTGRES_PASSWORD
  - POSTGRES_HOST
  - POSTGRES_PORT

## 验证

迁移成功后，脚本会显示：

```
📊 Migration verification:
Table Name                       | Column Count
------------------------------------------------------------
care_plan_completion_t           | 14
care_plan_medication_t           | 13
care_plan_precaution_t           | 11
care_plan_t                      | 14
care_plan_task_t                 | 13
```

## 回滚

如需回滚迁移：

```sql
-- Drop tables (cascading will remove dependent data)
DROP TABLE IF EXISTS nexent.care_plan_completion_t CASCADE;
DROP TABLE IF EXISTS nexent.care_plan_precaution_t CASCADE;
DROP TABLE IF EXISTS nexent.care_plan_task_t CASCADE;
DROP TABLE IF EXISTS nexent.care_plan_medication_t CASCADE;
DROP TABLE IF EXISTS nexent.care_plan_t CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS nexent.care_plan_completion_t_completion_id_seq;
DROP SEQUENCE IF EXISTS nexent.care_plan_precaution_t_precaution_id_seq;
DROP SEQUENCE IF EXISTS nexent.care_plan_task_t_task_id_seq;
DROP SEQUENCE IF EXISTS nexent.care_plan_medication_t_medication_id_seq;
DROP SEQUENCE IF EXISTS nexent.care_plan_t_plan_id_seq;
```

## 数据关系图

```
patient_info_t
    ↓ (1:N)
care_plan_t ────────────────┐
    ↓ (1:N)                 │
    ├──→ care_plan_medication_t
    ├──→ care_plan_task_t
    ├──→ care_plan_precaution_t
    └──→ care_plan_completion_t ←── (N:1) patient_info_t
             ↑
             └── (references medication_id or task_id via item_id)
```

## 注意事项

1. **首次运行**: 确保 `nexent` schema 已存在
2. **数据依赖**: 需要先存在 `patient_info_t` 表
3. **权限**: 确保数据库用户有创建表和索引的权限
4. **备份**: 生产环境运行前建议先备份数据库

## 相关文件

- `create_care_plan_tables.sql` - SQL迁移脚本
- `run_care_plan_migration.py` - Python执行脚本
- `backend/database/db_models.py` - ORM模型定义
- `backend/database/care_plan_db.py` - 数据库操作层
- `backend/services/care_plan_service.py` - 业务逻辑层
- `backend/apps/care_plan_app.py` - API接口层

## 创建日期

2025-01-18

## 版本

v1.0
