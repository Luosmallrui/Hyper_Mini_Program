# Mock And Adapter Strategy

## 结论

当前项目没有找到后台管理真实接口封装。`src/services/index.ts` 只发现首页和登录相关接口：

- `servicesGetHome`：`GET /api/home`
- `servicesAuthWx`：`POST /api/biz/auth/wx`
- `servicesAuthWxPhone`：`POST /api/biz/auth/wx/phone`

因此 `api-data-contract.md` 中的后台管理接口都属于 proposed contract。Claude Code 不得把 proposed 接口伪装成真实接口。

后端尚未完成时，第一轮实现必须采用 mock-first 策略：页面通过 organizer 模块内 adapter 获取数据，adapter 内部使用 mock 数据。后续后端完成后，只替换 adapter 内部实现，不大改页面逻辑。

## 可以先用 mock 的 proposed 接口

| 功能 | proposed 接口 | 第一轮策略 |
|---|---|---|
| 后台首页 dashboard | `GET /api/biz/organizer/dashboard` | 使用 organizer mock stats 和 activities |
| 活动列表 | `GET /api/biz/organizer/activities` | 使用本地 mock + keyword/filter/date 过滤 |
| 活动草稿/提交 | `POST/PUT /api/biz/organizer/activities` | 使用页面 state 或 mock adapter，保留 TODO |
| 上传图片 | `POST /api/biz/organizer/assets/upload` | 使用本地选择结果/占位 URL mock，保留 TODO |
| 票券保存 | `POST/PUT /api/biz/organizer/activities/{id}/tickets` | 使用本地 draft.ticketSpecs，保留 TODO |
| 核销券码 | `POST /api/biz/organizer/tickets/verify` | 使用 mock code 映射 success/failed/invalidCode |
| 核销员 | `GET/POST/DELETE /api/biz/organizer/verifiers` | 使用 mock verifier list |
| 提现信息 | `GET/PUT /api/biz/organizer/withdrawal` | 使用 mock withdrawal info |

## mock 数据放置建议

- 当前已有后台相关 mock 文件：`src/pages/user-sub/organizer/mock.ts`。
- 第一优先级：复用并扩展该文件，保持后台 mock 与 organizer 页面同域。
- 不允许把 mock 逻辑散落到大量页面里。页面组件只负责状态和渲染，数据获取/提交统一走 organizer adapter 或局部 helper。
- 如只服务单个页面且不值得抽象，可使用页面内最小 mock，但必须加 TODO，并且不得扩散到多个页面。
- 不建议新建全局 `mock/` 目录，除非项目已有约定或多个模块复用。

## adapter 建议

若 Claude Code 需要统一隔离 proposed API，可在后台模块内新增轻量 adapter，但需保持局部：

- 推荐位置：`src/pages/user-sub/organizer/mock.ts` 或邻近的 organizer 局部 helper。
- 可选位置：`src/pages/user-sub/organizer/services.ts`，但仅在不影响全局请求封装时使用。
- 不建议直接修改 `src/utils/request.ts` 或全局 service 结构。

adapter 第一轮职责：

- 封装 dashboard/list/filter/date/search 的 mock 查询。
- 封装 draft 保存、图片上传、票券保存的 mock 提交。
- 封装核销、核销员、提现信息的 mock 操作。
- 统一返回 Promise，让页面按真实异步流程处理 loading、empty、error、submitting。
- 在 adapter 内部标记 TODO：未来替换为真实接口。

页面调用规则：

- 页面调用 adapter 函数，不直接调用 proposed URL。
- 页面不 import 全局 request 调 `/api/biz/organizer/*`。
- 页面不写死未来接口路径。
- 页面保留 loading/empty/error/Toast/Dialog 状态。

## 禁止事项

1. 不允许改动全局请求封装来适配 proposed 接口。
2. 不允许把 proposed 接口写成已上线真实接口。
3. 不允许第一轮接真实后端。
4. 不允许凭空编造真实后端接口路径。
5. 不允许把 mock 逻辑散落到大量页面里。
6. 不允许删除现有 mock。
7. 不允许为了后台管理改动登录、首页、订单等非后台接口。
8. 不允许凭空增加复杂权限、结算、退款、审核业务规则。

## 未来接入真实接口时替换位置

| 当前 mock 能力 | 未来替换位置 |
|---|---|
| dashboard stats | organizer dashboard adapter |
| activities list/filter | organizer activities adapter |
| create draft | organizer activity create/update adapter |
| poster upload | organizer upload adapter |
| ticket specs | organizer ticket adapter |
| verifier list/save | organizer verifier adapter |
| verify ticket code | organizer ticket verify adapter |
| withdrawal info | organizer withdrawal adapter |

真实接口接入前，需要后端确认：

- 请求路径和方法。
- 响应 code/msg/data 结构。
- 分页字段。
- 状态枚举。
- 权限字段。
- 错误码和错误提示。
- 上传签名、文件限制和 CDN 返回字段。
