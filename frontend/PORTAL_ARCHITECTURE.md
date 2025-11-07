# 多端架构文档

## 概述

本项目实现了多端架构，包含四个独立的用户界面：

1. **医生端** (`/doctor`) - 面向病理医生
2. **学生端** (`/student`) - 面向医学生
3. **患者端** (`/patient`) - 面向患者
4. **管理员端** (`/admin`) - 面向系统管理员

## 目录结构

```
frontend/
├── app/[locale]/
│   ├── doctor/          # 医生端路由
│   │   └── page.tsx
│   ├── student/         # 学生端路由
│   │   └── page.tsx
│   ├── patient/         # 患者端路由
│   │   └── page.tsx
│   ├── admin/           # 管理员端路由
│   │   └── page.tsx
│   └── page.tsx         # 首页（端口选择页）
│
├── components/
│   ├── common/          # 跨端共享组件
│   ├── doctor/          # 医生端专用组件
│   ├── student/         # 学生端专用组件
│   ├── patient/         # 患者端专用组件
│   └── admin/           # 管理员端专用组件
│
├── hooks/
│   ├── useAuth.ts       # 全局认证 Hook
│   └── usePortalAuth.ts # 端口专用认证和路由守卫
│
├── types/
│   └── portal.ts        # 端口类型定义
│
└── services/            # API 服务（共享或端口专用）
```

## 核心特性

### 1. 基于路由的端口分离
- 每个端口在 `/[locale]/` 下有自己的路由段
- 开箱即用支持国际化
- 简洁的 URL 结构：`/doctor`、`/student`、`/patient`、`/admin`

### 2. 认证与授权
- **`useAuth`**：全局认证状态管理
- **`usePortalAuth`**：端口专用路由守卫和访问控制
- 自动将未认证用户重定向到首页
- 支持基于角色的访问控制 (RBAC)

### 3. 组件组织
- **共享组件**：放在 `components/common/` 中供跨端使用
- **端口专用组件**：放在 `components/{portal}/` 中用于隔离的功能
- 防止代码重复，同时保持关注点分离

### 4. 类型安全
- TypeScript 类型定义在 `types/portal.ts`
- 类型安全的端口导航
- 强类型的用户角色和权限

## 使用示例

### 在页面中使用端口认证

```tsx
"use client";

import { usePortalAuth } from "@/hooks/usePortalAuth";

export default function DoctorDashboard() {
  const { isLoading, user, hasPortalAccess } = usePortalAuth("doctor");

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return <div>欢迎，{user?.email} 医生</div>;
}
```

### 在端口之间导航

```tsx
import { usePortalAuth } from "@/hooks/usePortalAuth";

function PortalSwitcher() {
  const { navigateToPortal, hasPortalAccess } = usePortalAuth();

  return (
    <button 
      onClick={() => navigateToPortal("student")}
      disabled={!hasPortalAccess("student")}
    >
      进入学生端
    </button>
  );
}
```

### 创建端口专用组件

```tsx
// 在 components/doctor/DiagnosisCard.tsx
export function DiagnosisCard({ data }) {
  // 医生端专用 UI 逻辑
  return <div>诊断卡片</div>;
}

// 在 components/common/Avatar.tsx
export function Avatar({ user }) {
  // 所有端口共享
  return <img src={user.avatar_url} />;
}
```

## 未来增强

### 1. 基于角色的访问控制 (RBAC)
在 `usePortalAuth` 中实现权限检查：

```typescript
const hasPortalAccess = (portalType: PortalType): boolean => {
  if (!user) return false;
  
  // 将用户角色映射到允许的端口
  const rolePermissions = {
    doctor: ["doctor", "admin"],
    student: ["student", "admin"],
    patient: ["patient"],
    admin: ["admin"],
  };
  
  return rolePermissions[user.role]?.includes(portalType) ?? false;
};
```

### 2. 端口专用布局
为每个端口创建自定义布局：

```
app/[locale]/
├── doctor/
│   ├── layout.tsx    # 医生端专用布局（含导航）
│   └── page.tsx
```

### 3. 共享服务组织

```
services/
├── common/
│   └── api.ts        # 共享的 API 工具
├── doctor/
│   └── diagnosisService.ts
├── student/
│   └── courseService.ts
└── patient/
    └── recordService.ts
```

## 最佳实践

1. **保持端口独立**：最小化跨端依赖
2. **共享通用逻辑**：使用 `components/common/` 和共享 hooks
3. **全部类型化**：充分利用 TypeScript 实现类型安全
4. **保护路由**：在端口页面中始终使用 `usePortalAuth`
5. **按功能组织**：在每个端口内按功能/领域组织

## 从单应用迁移

如果从单应用架构迁移：

1. 识别端口专用功能
2. 将端口专用组件移动到相应文件夹
3. 在端口页面中添加 `usePortalAuth`
4. 更新导航以使用 `navigateToPortal`
5. 测试每个端口的访问控制

## 测试

### 单元测试端口组件

```typescript
import { render } from '@testing-library/react';
import { DoctorDashboard } from './page';

jest.mock('@/hooks/usePortalAuth', () => ({
  usePortalAuth: () => ({
    isLoading: false,
    user: { email: 'doctor@test.com', role: 'doctor' },
  }),
}));

test('渲染医生端仪表盘', () => {
  const { getByText } = render(<DoctorDashboard />);
  expect(getByText(/欢迎/)).toBeInTheDocument();
});
```

### 集成测试端口路由

测试未认证用户是否被重定向：

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { usePortalAuth } from '@/hooks/usePortalAuth';

test('重定向未认证用户', () => {
  const { result } = renderHook(() => usePortalAuth('doctor'));
  expect(mockRouter.push).toHaveBeenCalledWith('/');
});
```

## 技术支持

如有问题或疑问：
- 查看代码库文档
- 审查现有的端口实现
- 参考团队的开发规范

