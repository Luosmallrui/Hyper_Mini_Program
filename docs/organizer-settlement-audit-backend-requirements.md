# 主办方入驻申请审核状态后端需求

本文整理微信小程序用户中心“我要入驻 / 主办方入驻申请”流程需要后端提供或确认的接口契约。

客户端相关页面与代码：

- `src/pages/user/index.tsx`
- `src/pages/user-sub/organizer/adapter.ts`

默认请求头：

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 1. 问题背景

当前小程序端提交入驻申请后，再次进入“我要入驻”仍然展示申请表单。预期行为：

- 已提交且审核中的用户，再次点击“我要入驻”或“管理后台”时，应看到“审核中”提示。
- 审核中状态下不允许重复提交入驻申请。
- 跨设备、重启小程序、清缓存后仍能通过后端状态恢复正确 UI。

前端已经依赖 `GET /api/v1/organizer/audit-status` 判断申请状态。只有该接口稳定返回 `status = 1`，前端才能阻止重复提交并展示“审核中”。

## 2. 查询入驻审核状态

接口：

```http
GET /api/v1/organizer/audit-status
```

期望响应：

```json
{
  "code": 200,
  "data": {
    "type": "venue",
    "status": 1,
    "reject_reason": "",
    "submitted_at": "2026-06-20T13:21:00+08:00",
    "reviewed_at": ""
  }
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| type | string | 否 | 入驻类型，`venue` / `merchant` |
| status | number | 是 | 入驻审核状态 |
| reject_reason | string | 否 | 驳回原因，仅驳回时返回 |
| submitted_at | string | 否 | 提交时间 |
| reviewed_at | string | 否 | 审核时间 |

### 状态枚举

| status | 含义 | 前端行为 |
| --- | --- | --- |
| 0 | 未提交 | 展示入驻申请表单 |
| 1 | 审核中 | 展示审核中提示，不允许重复提交 |
| 2 | 已通过 | 展示/进入管理后台 |
| 3 | 已驳回 | 可展示驳回原因，并允许用户重新提交 |

## 3. 提交入驻申请

接口：

```http
POST /api/v1/organizer/apply
```

当前客户端请求体：

```json
{
  "type": "venue",
  "name": "主办方名称",
  "logo": "https://cdn.hypercn.cn/...",
  "province": "广东省",
  "city": "广州市",
  "district": "越秀区"
}
```

### 提交成功响应

提交成功后，后端应立即将该用户的审核状态置为 `status = 1`。

建议响应：

```json
{
  "code": 200,
  "msg": "ok",
  "data": {
    "application_id": 123,
    "status": 1,
    "submitted_at": "2026-06-20T13:21:00+08:00"
  }
}
```

提交成功后，下一次调用：

```http
GET /api/v1/organizer/audit-status
```

必须返回：

```json
{
  "code": 200,
  "data": {
    "status": 1
  }
}
```

## 4. 防重复提交

如果用户已经存在审核中的入驻申请，后端应拒绝重复提交。

建议响应：

```json
{
  "code": 409,
  "msg": "入驻申请正在审核中，请勿重复提交",
  "data": {
    "status": 1
  }
}
```

要求：

- `status = 1` 审核中时，不允许创建新的申请记录。
- `status = 2` 已通过时，不允许再次提交入驻申请。
- `status = 3` 已驳回时，可以允许重新提交；重新提交成功后状态变为 `1`。
- 后端应以当前登录用户为维度判断申请状态，不能只依赖前端传参。

## 5. 前端当前行为

当前小程序端逻辑：

- 页面显示时会调用 `fetchOrganizerAuditStatus()`。
- 该函数请求 `GET /api/v1/organizer/audit-status`。
- 如果返回 `status === 1`：
  - 点击“我要入驻”会弹出“审核中”提示。
  - 点击“管理后台”会弹出“审核中”提示。
  - 不进入表单，不允许重复提交。
- 如果返回 `status === 2` 或用户信息中已标记为商家：
  - 可进入管理后台。
- 如果返回 `status === 0` 或接口失败：
  - 当前会回退为可填写申请表单。

因此，后端必须保证审核状态接口可用且状态准确。

## 6. 验收清单

- 未提交用户点击“我要入驻”时展示表单。
- 用户提交入驻申请成功后，立刻进入审核中状态。
- 提交成功后再次点击“我要入驻”不再展示表单，只展示“审核中”提示。
- 提交成功后再次点击“管理后台”不进入后台，只展示“审核中”提示。
- 小程序重启、换设备、清缓存后仍能通过 `audit-status` 恢复审核中状态。
- 审核中用户重复调用 `POST /api/v1/organizer/apply` 时，后端返回明确错误，不创建新申请。
- 审核通过后 `audit-status` 返回 `status = 2`，前端可进入管理后台。
- 审核驳回后 `audit-status` 返回 `status = 3` 和 `reject_reason`，前端可提示原因并允许重新提交。
