# 医生端患者档案与患者端同步功能

## 功能概述

本功能实现了医生端创建的患者档案与患者端"我的档案"的自动同步。医生在创建患者档案时输入患者的邮箱地址,患者使用该邮箱登录患者端后,即可查看医生为其创建的档案信息。

## 使用流程

### 1. 医生端创建患者档案

1. 登录医生端 (`/doctor`)
2. 进入"患者档案"页面
3. 点击"新建患者"按钮
4. 在创建表单中填写患者信息:
   - **必填字段**:
     - 姓名
     - 性别
     - 年龄
     - 病历号
     - **患者邮箱** (用于患者端登录)
   - 可选字段:
     - 出生日期
     - 联系电话
     - 联系地址
     - 过敏史
     - 家族史
     - 既往病史
     - 诊断信息
5. 点击"创建"保存患者档案

### 2. 患者端查看档案

1. 患者使用医生提供的邮箱地址注册/登录系统
2. 登录后进入患者端 (`/patient`)
3. 点击"我的档案"
4. 查看医生为其创建的档案信息,包括:
   - **基本信息**: 姓名、性别、年龄、联系方式、过敏史等
   - **诊断记录**: 所有就诊阶段的诊断信息
   - **就诊时间线**: 按时间顺序显示的就诊历史
   - **检查报告**: (未来功能)

## 技术实现

### 数据库更改

在 `nexent.patient_info_t` 表中添加了两个新字段:

```sql
-- 患者邮箱,用于患者端登录
email VARCHAR(200) UNIQUE

-- 当前主要诊断
diagnosis VARCHAR(500)
```

### API 接口

#### 新增接口

**获取患者档案 (通过邮箱)**
```
GET /patient/profile/by_email?email={email}
```
- 用途: 患者端通过登录邮箱获取自己的档案
- 认证: 需要 Bearer Token
- 返回: 患者完整信息

#### 更新接口

**创建患者档案**
```
POST /patient/create
```
- 新增必填字段: `email`
- 新增可选字段: `diagnosis`

### 前端组件

#### 医生端

- `CreatePatientDialog.tsx`: 添加邮箱必填字段,并提示"用于患者端登录"

#### 患者端

更新了以下组件以显示真实数据:

1. **BasicInfoTab.tsx**
   - 从API获取患者档案
   - 显示基本信息、过敏史、病史等
   - 显示当前诊断信息

2. **DiagnosisHistoryTab.tsx**
   - 获取患者的就诊时间线数据
   - 按时间顺序显示诊断记录
   - 支持不同就诊类型的颜色标记

3. **TimelineTab.tsx**
   - 可视化时间线展示
   - 显示所有就诊阶段
   - 状态标记(已完成/进行中/待处理)

## 数据库迁移

运行迁移脚本添加新字段:

```bash
psql -h <host> -U <user> -d <database> -f backend/database/migrations/add_email_and_diagnosis_to_patient.sql
```

或者在 Python 中执行:

```python
from database.client import get_db_session

with get_db_session() as session:
    # 执行迁移 SQL
    with open('backend/database/migrations/add_email_and_diagnosis_to_patient.sql', 'r') as f:
        session.execute(f.read())
    session.commit()
```

## 注意事项

### 邮箱唯一性

- 每个邮箱只能对应一个患者档案
- 医生创建档案时,系统会检查邮箱是否已存在
- 建议使用患者的真实邮箱地址

### 数据隐私

- 患者只能查看自己的档案(通过邮箱匹配)
- 所有API请求都需要身份认证
- 遵循 HIPAA/个人隐私保护法规

### 错误处理

1. **患者未找到档案**
   - 显示提示: "未找到您的患者档案,请联系您的医生为您创建档案"

2. **邮箱已被使用**
   - 医生创建时会收到错误提示
   - 建议使用其他邮箱或更新现有档案

3. **未登录状态**
   - 患者端会提示先登录
   - 自动跳转到登录页面

## 后续优化方向

1. **邮件通知**
   - 医生创建档案后自动发送邮件通知患者
   - 包含登录链接和初始密码

2. **档案编辑权限**
   - 患者可以更新部分信息(如联系方式)
   - 医疗信息只能由医生编辑

3. **多医生协作**
   - 支持多个医生共同管理一个患者档案
   - 权限分级管理

4. **档案共享**
   - 患者可以授权其他医生查看档案
   - 支持临时访问权限

## 更新日志

### 2025-11-17
- ✅ 添加 email 字段到患者表
- ✅ 添加 diagnosis 字段到患者表
- ✅ 更新医生端创建患者对话框
- ✅ 实现通过邮箱获取患者档案的API
- ✅ 更新患者端基本信息页面
- ✅ 更新患者端诊断记录页面
- ✅ 更新患者端就诊时间线页面
- ✅ 创建数据库迁移文件

## 相关文件

### 后端
- `backend/database/db_models.py` - 数据模型
- `backend/database/patient_db.py` - 数据库操作
- `backend/services/patient_service.py` - 业务逻辑
- `backend/apps/patient_app.py` - API端点
- `backend/database/migrations/add_email_and_diagnosis_to_patient.sql` - 数据库迁移

### 前端
- `frontend/types/patient.ts` - TypeScript 类型定义
- `frontend/services/patientService.ts` - API 服务
- `frontend/components/doctor/patients/CreatePatientDialog.tsx` - 医生端创建对话框
- `frontend/components/patient/profile/BasicInfoTab.tsx` - 患者端基本信息
- `frontend/components/patient/profile/DiagnosisHistoryTab.tsx` - 患者端诊断记录
- `frontend/components/patient/profile/TimelineTab.tsx` - 患者端时间线
