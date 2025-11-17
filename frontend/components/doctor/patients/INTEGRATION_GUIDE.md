# 患者档案功能集成指南

## 📦 新增的组件文件

1. `CreateTimelineDialog.tsx` - Timeline创建对话框
2. `EditTimelineDetailDialog.tsx` - Timeline详情编辑对话框
3. `CreateTodoDialog.tsx` - Todo创建/编辑对话框

---

## 🔧 PatientTimeline.tsx 修改指南

### 1. 导入新组件

在文件顶部添加导入：

```typescript
import { CreateTimelineDialog } from "./CreateTimelineDialog";
import { EditTimelineDetailDialog } from "./EditTimelineDetailDialog";
```

### 2. 添加状态管理

在组件内添加对话框状态：

```typescript
const [createDialogOpen, setCreateDialogOpen] = useState(false);
const [editDetailDialogOpen, setEditDetailDialogOpen] = useState(false);
const [currentEditingTimelineId, setCurrentEditingTimelineId] = useState<number | null>(null);
```

### 3. 修改第113-116行的"筛选时间"按钮区域

替换为创建和编辑按钮：

```typescript
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    size="sm"
    className="text-[#D94527] border-[#D94527] hover:bg-[#D94527] hover:text-white"
    onClick={() => setCreateDialogOpen(true)}
  >
    <Plus className="h-4 w-4 mr-2" />
    创建节点
  </Button>
  {selectedTimeline && (
    <Button
      variant="outline"
      size="sm"
      className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
      onClick={() => {
        setCurrentEditingTimelineId(selectedTimeline.timeline_id);
        setEditDetailDialogOpen(true);
      }}
    >
      <Edit className="h-4 w-4 mr-2" />
      编辑详情
    </Button>
  )}
</div>
```

### 4. 在组件末尾（第408行之前）添加对话框组件

```typescript
      {/* Create Timeline Dialog */}
      <CreateTimelineDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        patientId={parseInt(patientId)}
        onSuccess={loadPatientAndTimeline}
      />

      {/* Edit Timeline Detail Dialog */}
      {currentEditingTimelineId && (
        <EditTimelineDetailDialog
          open={editDetailDialogOpen}
          onClose={() => {
            setEditDetailDialogOpen(false);
            setCurrentEditingTimelineId(null);
          }}
          timelineId={currentEditingTimelineId}
          onSuccess={() => {
            loadTimelineDetail(currentEditingTimelineId);
          }}
        />
      )}
    </div>
  );
}
```

### 5. 导入Plus和Edit图标

在顶部图标导入处添加：

```typescript
import { Plus, Edit } from "lucide-react";
```

---

## 🔧 PatientTodos.tsx 修改指南

### 1. 导入新组件和删除确认

在文件顶部添加导入：

```typescript
import { CreateTodoDialog } from "./CreateTodoDialog";
import { Modal } from "antd";
import { Plus } from "lucide-react";
```

### 2. 添加状态管理

在组件内添加对话框状态：

```typescript
const [todoDialogOpen, setTodoDialogOpen] = useState(false);
const [editingTodo, setEditingTodo] = useState<PatientTodo | null>(null);
```

### 3. 添加删除功能

在 `toggleTodo` 函数后添加：

```typescript
const handleDelete = (todo: PatientTodo) => {
  Modal.confirm({
    title: "确认删除",
    content: `确定要删除待办"${todo.todo_title}"吗？`,
    okText: "确认",
    cancelText: "取消",
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        // Note: You need to add deleteTodo API endpoint
        message.warning("删除功能需要后端支持deleteTodo接口");
        // await patientService.deleteTodo(todo.todo_id);
        // loadTodos();
        // message.success("删除成功");
      } catch (error) {
        message.error("删除失败");
        console.error("Failed to delete todo:", error);
      }
    },
  });
};

const handleEdit = (todo: PatientTodo) => {
  setEditingTodo(todo);
  setTodoDialogOpen(true);
};
```

### 4. 修改第118行的"一键添加到待办"按钮

替换为真实的创建按钮：

```typescript
<Button
  size="sm"
  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
  onClick={() => setTodoDialogOpen(true)}
>
  <Plus className="h-4 w-4 mr-2" />
  创建待办
</Button>
```

### 5. 修改第186-192行的编辑和删除按钮

替换为实际功能：

```typescript
<div className="flex gap-2">
  <Button
    size="sm"
    variant="ghost"
    className="h-8 w-8 p-0"
    onClick={() => handleEdit(todo)}
  >
    <Edit className="h-4 w-4" />
  </Button>
  <Button
    size="sm"
    variant="ghost"
    className="h-8 w-8 p-0 text-red-600"
    onClick={() => handleDelete(todo)}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

### 6. 同样修改其他优先级待办的按钮（第226-232、265-271行）

复制上面相同的编辑/删除按钮代码。

### 7. 在组件末尾（第324行之前）添加对话框组件

```typescript
      {/* Create/Edit Todo Dialog */}
      <CreateTodoDialog
        open={todoDialogOpen}
        onClose={() => {
          setTodoDialogOpen(false);
          setEditingTodo(null);
        }}
        patientId={parseInt(patientId)}
        editingTodo={editingTodo}
        onSuccess={loadTodos}
      />
    </div>
  );
}
```

---

## 📝 后端API需要补充的接口

目前前端已实现的功能完全基于现有API，但以下功能需要后端支持：

### Todo相关（可选，增强功能）

1. **更新Todo** - `PUT /patient/todo/{todo_id}/update`
   ```typescript
   interface UpdateTodoRequest {
     todo_title?: string;
     todo_description?: string;
     todo_type?: string;
     due_date?: string;
     priority?: string;
     status?: string;
   }
   ```

2. **删除Todo** - `DELETE /patient/todo/{todo_id}/delete`

### 注意事项

- 目前编辑和删除功能会提示需要后端接口
- 如果不实现这些接口，用户可以通过重新创建Todo来达到类似效果
- 所有创建功能都已完全实现并可用

---

## ✅ 测试检查清单

### Timeline功能
- [ ] 点击"创建节点"按钮打开对话框
- [ ] 填写表单并提交，检查是否创建成功
- [ ] 选中某个时间线节点后，点击"编辑详情"按钮
- [ ] 添加医生记录、病理发现、用药方案
- [ ] 添加医学影像（需要有效的图片URL）
- [ ] 添加检查指标并保存
- [ ] 刷新页面查看数据是否持久化

### Todo功能
- [ ] 点击AI建议框中的"创建待办"按钮打开对话框
- [ ] 填写表单并提交，检查是否创建成功
- [ ] 点击待办卡片上的编辑按钮（会提示需要后端接口）
- [ ] 点击删除按钮（会提示需要后端接口）
- [ ] 新创建的Todo出现在正确的优先级分组中
- [ ] 切换状态功能正常工作

---

## 🎨 UI改进建议

### Timeline页面
- 创建节点后自动选中新节点
- 添加节点删除功能（可选）
- 图片上传支持本地选择（需要对接OSS）

### Todo页面
- 添加批量操作功能
- 添加日期筛选器
- 支持拖拽排序

---

## 🚀 快速上手

1. 将三个新组件文件放到 `frontend/components/doctor/patients/` 目录
2. 按照上述指南修改 `PatientTimeline.tsx`
3. 按照上述指南修改 `PatientTodos.tsx`
4. 测试创建功能
5. 如需编辑/删除功能，请后端同事补充对应API接口

完成后，患者档案模块将具备完整的人工数据录入能力！🎉
