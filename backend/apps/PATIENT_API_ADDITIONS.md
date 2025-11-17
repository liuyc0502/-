# 患者管理API补充接口

这些接口是为了支持前端的编辑和删除功能，目前系统中缺失。

---

## 📌 需要在 `patient_app.py` 中添加的接口

### 1. 更新Todo接口

在 `patient_app.py` 第607行后添加：

```python
@router.put("/patient/todo/{todo_id}/update")
async def update_patient_todo(
    todo_id: int,
    request: CreateTodoRequest,  # Reuse CreateTodoRequest for update
    authorization: Optional[str] = Header(None)
):
    """
    Update patient todo item
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await patient_service.update_patient_todo_service(
            todo_id,
            request.dict(exclude_unset=True),
            tenant_id,
            user_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Update todo failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to update todo: {str(e)}"
        )


@router.delete("/patient/todo/{todo_id}/delete")
async def delete_patient_todo(
    todo_id: int,
    authorization: Optional[str] = Header(None)
):
    """
    Delete patient todo item (soft delete)
    """
    try:
        user_id, tenant_id = get_current_user_id(authorization)
        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=HTTPStatus.UNAUTHORIZED,
                detail="Unauthorized"
            )

        result = await patient_service.delete_patient_todo_service(
            todo_id,
            tenant_id,
            user_id
        )

        return JSONResponse(
            status_code=HTTPStatus.OK,
            content=result
        )
    except AgentRunException as e:
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Delete todo failed: {str(e)}")
        raise HTTPException(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete todo: {str(e)}"
        )
```

---

## 📌 需要在 `patient_service.py` 中添加的服务函数

### Service层实现

```python
async def update_patient_todo_service(
    todo_id: int,
    update_data: dict,
    tenant_id: str,
    user_id: str
) -> dict:
    """
    Update patient todo item
    """
    try:
        from database import patient_db

        # Update todo
        success = await patient_db.update_patient_todo(
            todo_id=todo_id,
            update_data=update_data,
            tenant_id=tenant_id,
            updated_by=user_id
        )

        if not success:
            raise AgentRunException("Failed to update todo")

        return {
            "success": True,
            "message": "Todo updated successfully",
            "todo_id": todo_id
        }
    except Exception as e:
        logger.error(f"Update patient todo service failed: {str(e)}")
        raise AgentRunException(f"Failed to update todo: {str(e)}")


async def delete_patient_todo_service(
    todo_id: int,
    tenant_id: str,
    user_id: str
) -> dict:
    """
    Delete patient todo item (soft delete)
    """
    try:
        from database import patient_db

        # Soft delete todo
        success = await patient_db.delete_patient_todo(
            todo_id=todo_id,
            tenant_id=tenant_id,
            deleted_by=user_id
        )

        if not success:
            raise AgentRunException("Failed to delete todo")

        return {
            "success": True,
            "message": "Todo deleted successfully"
        }
    except Exception as e:
        logger.error(f"Delete patient todo service failed: {str(e)}")
        raise AgentRunException(f"Failed to delete todo: {str(e)}")
```

---

## 📌 需要在 `patient_db.py` 中添加的数据库函数

### Database层实现

```python
async def update_patient_todo(
    todo_id: int,
    update_data: dict,
    tenant_id: str,
    updated_by: str
) -> bool:
    """
    Update patient todo item
    """
    from database.db_models import PatientTodo
    from database.client import get_supabase_client
    from datetime import datetime

    try:
        supabase = get_supabase_client()

        # Prepare update data
        update_payload = {
            **update_data,
            "update_time": datetime.utcnow().isoformat(),
            "updated_by": updated_by
        }

        # Update in database
        response = supabase.table("patient_todo_t").update(
            update_payload
        ).eq(
            "todo_id", todo_id
        ).eq(
            "tenant_id", tenant_id
        ).eq(
            "delete_flag", "N"
        ).execute()

        return len(response.data) > 0

    except Exception as e:
        logger.error(f"Update patient todo failed: {str(e)}")
        raise


async def delete_patient_todo(
    todo_id: int,
    tenant_id: str,
    deleted_by: str
) -> bool:
    """
    Delete patient todo item (soft delete)
    """
    from database.db_models import PatientTodo
    from database.client import get_supabase_client
    from datetime import datetime

    try:
        supabase = get_supabase_client()

        # Soft delete
        response = supabase.table("patient_todo_t").update({
            "delete_flag": "Y",
            "update_time": datetime.utcnow().isoformat(),
            "updated_by": deleted_by
        }).eq(
            "todo_id", todo_id
        ).eq(
            "tenant_id", tenant_id
        ).execute()

        return len(response.data) > 0

    except Exception as e:
        logger.error(f"Delete patient todo failed: {str(e)}")
        raise
```

---

## 📌 前端API服务补充

需要在 `frontend/services/patientService.ts` 中添加：

```typescript
/**
 * Update patient todo
 */
export async function updatePatientTodo(
  todoId: number,
  todoData: Partial<CreateTodoRequest>
): Promise<ApiSuccessResponse> {
  try {
    return await jsonRequest<ApiSuccessResponse>(
      API_ENDPOINTS.patient.todo.update(todoId),
      {
        method: "PUT",
        headers: getJsonAuthHeaders(),
        body: JSON.stringify(todoData),
      },
      "Failed to update todo"
    );
  } catch (error) {
    log.error(`Failed to update todo ${todoId}:`, error);
    throw error;
  }
}

/**
 * Delete patient todo
 */
export async function deletePatientTodo(todoId: number): Promise<ApiSuccessResponse> {
  try {
    return await jsonRequest<ApiSuccessResponse>(
      API_ENDPOINTS.patient.todo.delete(todoId),
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      },
      "Failed to delete todo"
    );
  } catch (error) {
    log.error(`Failed to delete todo ${todoId}:`, error);
    throw error;
  }
}
```

然后在 patientService 导出对象中添加这两个函数：

```typescript
const patientService = {
  // ... existing exports

  // Todos
  createPatientTodo,
  getPatientTodos,
  updateTodoStatus,
  updatePatientTodo,      // 新增
  deletePatientTodo,      // 新增
};
```

---

## 📌 API端点配置补充

需要在 `frontend/services/api.ts` 的 `API_ENDPOINTS` 中添加：

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints

  patient: {
    // ... existing patient endpoints

    todo: {
      create: `${API_BASE_URL}/patient/todo/create`,
      list: (patientId: number) => `${API_BASE_URL}/patient/${patientId}/todos`,
      updateStatus: (todoId: number) => `${API_BASE_URL}/patient/todo/${todoId}/status`,
      update: (todoId: number) => `${API_BASE_URL}/patient/todo/${todoId}/update`,  // 新增
      delete: (todoId: number) => `${API_BASE_URL}/patient/todo/${todoId}/delete`,  // 新增
    },
  },
};
```

---

## ✅ 实施步骤

### 后端实施

1. 在 `backend/services/patient_service.py` 中添加两个服务函数
2. 在 `backend/database/patient_db.py` 中添加两个数据库函数
3. 在 `backend/apps/patient_app.py` 中添加两个API端点
4. 测试接口是否正常工作

### 前端实施

1. 在 `frontend/services/api.ts` 中添加API端点配置
2. 在 `frontend/services/patientService.ts` 中添加两个服务函数
3. 在 `frontend/components/doctor/patients/CreateTodoDialog.tsx` 中启用编辑功能（第75行取消注释）
4. 在 `frontend/components/doctor/patients/PatientTodos.tsx` 中启用删除功能（handleDelete函数中取消注释）

### 测试验证

1. 创建一个Todo
2. 点击编辑按钮，修改Todo内容并保存
3. 验证修改是否成功
4. 点击删除按钮，确认删除
5. 验证Todo是否被软删除（delete_flag='Y'）

---

## 📝 注意事项

1. 所有删除操作都是软删除（delete_flag='Y'），不会真正删除数据
2. 更新操作会自动记录 update_time 和 updated_by
3. 需要验证 tenant_id 确保数据隔离
4. 错误处理已包含在代码中
5. 日志记录已添加便于调试

---

## 🚀 可选增强功能

### 1. 批量删除Todo
```python
@router.post("/patient/todo/batch_delete")
async def batch_delete_todos(
    todo_ids: List[int],
    authorization: Optional[str] = Header(None)
):
    # Implementation...
```

### 2. Todo完成度统计
```python
@router.get("/patient/{patient_id}/todo/statistics")
async def get_todo_statistics(
    patient_id: int,
    authorization: Optional[str] = Header(None)
):
    # Return completion rate, overdue count, etc.
```

### 3. 自动逾期标记
在获取Todo列表时自动标记逾期的Todo为 `status='overdue'`

完成这些补充后，患者档案的Todo功能将完全可用！🎉
