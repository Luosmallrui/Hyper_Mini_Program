# Backend Not Ready Strategy

## 结论

当前后台管理真实后端接口尚未完成。Claude Code 第一轮实现必须采用 mock-first 策略：不接真实后端，不调用 proposed 接口，不修改全局 request 封装，不凭空编造真实接口路径。

第一轮目标是完成前端交互闭环：

- 页面能打开。
- 列表能展示 mock 数据。
- 搜索、筛选、日期筛选能基于 mock 数据工作。
- loading、empty、error 状态可切换。
- 表单可填写、校验、提交 mock。
- 弹窗、Toast/Dialog 反馈可用。
- 不接真实后端。

## 后端未完成时如何实现

1. 页面只调用 organizer 模块内的 adapter 函数。
2. adapter 第一轮只读取或写入 mock 数据。
3. adapter 返回结构应尽量接近 `api-data-contract.md` 的 proposed response，但必须标记 TODO。
4. 页面不要直接写死未来接口路径。
5. 页面不要直接 import 全局 request 调 proposed 接口。
6. 页面状态、loading、empty、error、submitting、Toast/Dialog 都按真实异步流程设计，即使底层是 mock。

## mock 数据放在哪里

优先级：

1. 复用并扩展 `src/pages/user-sub/organizer/mock.ts`。
2. 如需要隔离 adapter，可在 organizer 模块内新增局部 adapter，例如 `src/pages/user-sub/organizer/adapter.ts` 或同等局部文件。
3. 不建议把 mock 散落到大量页面组件里。
4. 不建议新建全局 mock 目录，除非项目已有明确约定。

mock 数据应覆盖：

- dashboard stats。
- activity list。
- filter/date/search 组合后的列表。
- activity draft。
- poster upload result。
- ticket specs。
- verifier list。
- verify ticket result: success/failed/invalidCode。
- withdrawal info。

## adapter 层如何设计

建议 adapter 以页面动作命名，而不是以未完成接口路径命名：

| adapter 函数 | 第一轮行为 | 未来替换 |
|---|---|---|
| `getOrganizerDashboardMockFirst` | 返回 mock dashboard stats 和活动摘要 | 替换为真实 dashboard API |
| `listOrganizerActivitiesMockFirst` | 基于 mock 活动列表做 keyword/filter/date/page 过滤 | 替换为真实活动列表 API |
| `saveActivityDraftMockFirst` | 本地保存/返回 draft 和 mock activityId | 替换为真实草稿/提交 API |
| `uploadOrganizerAssetMockFirst` | 返回本地选择文件或占位 URL | 替换为真实上传 API |
| `saveTicketSpecsMockFirst` | 校验并回写 mock ticketSpecs | 替换为真实票券 API |
| `verifyTicketCodeMockFirst` | 按 mock code 映射成功/失败/无效码 | 替换为真实核销 API |
| `saveVerifierMockFirst` | 写入 mock verifier list | 替换为真实核销员 API |
| `getWithdrawalInfoMockFirst` / `updateWithdrawalInfoMockFirst` | 返回/更新 mock withdrawal | 替换为真实提现 API |

函数名不强制，但必须体现 mock-first 或 TODO，避免误以为已接真实接口。

## 页面如何调用 adapter

页面应调用语义化 adapter：

```ts
// 示例，仅表达调用方向，不要求照抄命名
const result = await organizerAdapter.listActivities(query)
```

页面不应直接调用：

```ts
// 禁止：后端未完成，不要直接请求 proposed path
request.get('/api/biz/organizer/activities')
```

页面需要处理 adapter 的异步状态：

- 请求前：`loading=true` 或 `submitting=true`。
- 成功：写入 data/list/draft，清理 error，展示 Toast/Dialog。
- 空数据：设置 empty 状态。
- 失败：设置 error 状态，展示 Toast/Dialog。
- 结束：关闭 loading/submitting。

## 未来接入真实后端时替换哪些地方

未来后端完成后，只替换 organizer adapter 内部实现：

- mock dashboard -> dashboard API。
- mock activity list/filter -> activity list API。
- mock draft save -> create/update/submit API。
- mock upload result -> upload/signature API。
- mock ticket save -> ticket API。
- mock verify code -> ticket verify API。
- mock verifier list/save -> verifier API。
- mock withdrawal -> withdrawal API。

页面组件、表单状态、loading/empty/error、Toast/Dialog、列表渲染不应大改。

## 需要后端确认的接口字段

- dashboard stats 字段：活动数、订单数、销售额、订阅量、权限字段。
- activity list 查询参数：keyword、auditStatus、lifeStatus、date range、page、pageSize。
- activity item 字段：id、title、cover、time、status、auditStatus、rejectReason、stats。
- draft 保存字段：步骤字段、草稿 ID、提交审核状态。
- upload 字段：fileId、url、width、height、size、mimeType、OSS/signature。
- ticket 字段：price 单位、stock、limit、attendees、enabled、refund/售卖规则。
- verify 字段：code、activityId、ticket、reasonCode、错误码枚举。
- verifier 字段：name、phone、permissionScope、channel、状态。
- withdrawal 字段：payeeName、accountNumber、bankName、实名校验、脱敏规则。

## 第一轮只能 mock 的功能

- dashboard 数据。
- 活动列表、搜索、筛选、日期筛选、分页。
- 活动草稿保存和提交反馈。
- 图片上传结果。
- 票券保存。
- 核销券码。
- 核销员新增/删除。
- 提现信息查看/编辑。
- 权限控制。

## 必须保留 TODO 的功能

- 所有 proposed 后端接口。
- 真实接口路径和方法。
- 后端响应 code/msg/data 结构。
- 权限字段和按钮可见性。
- 核销错误码映射。
- 上传签名和 CDN 返回。
- 提现实名校验。
- 票券业务规则。

## 禁止事项

1. 禁止修改全局 request 封装。
2. 禁止把 proposed 接口当真实接口调用。
3. 禁止凭空编造真实后端接口路径。
4. 禁止把 mock 逻辑散落到大量页面里。
5. 禁止为了 mock 改动非后台页面。
6. 禁止删除现有 mock。
7. 禁止新增复杂权限体系或后端业务规则。
8. 禁止第一轮接真实后端。
