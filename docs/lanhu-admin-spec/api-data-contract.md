# API Data Contract

## 当前后端状态

后台管理真实接口目前尚未完成。本文件中的 `/api/biz/organizer/*` 仅是 proposed contract，用于未来和后端对齐字段，不代表当前可调用接口。

第一轮实现规则：

- 不接真实后端。
- 不调用 proposed URL。
- 不修改全局 request 封装。
- 不凭空编造真实后端接口路径。
- 页面通过 organizer 模块 adapter 或局部 helper 读取 mock 数据。
- 后续后端完成后，只替换 adapter 内部实现。

## 已有接口
| 封装函数 | 文件 | 方法 | 路径 | 与后台管理关系 |
|---|---|---|---|---|
| servicesGetHome | src/services/index.ts | GET | /api/home | 首页数据，非后台管理专用 |
| servicesAuthWx | src/services/index.ts | POST | /api/biz/auth/wx | 登录 |
| servicesAuthWxPhone | src/services/index.ts | POST | /api/biz/auth/wx/phone | 绑定手机号 |

## Proposed 接口契约
| 页面 | 功能动作 | proposed 接口 | 方法 | 请求参数 | 响应结构 | 第一轮策略 | mock 建议 | unknown / 后端确认 |
|---|---|---|---|---|---|---|---|---|
| 后台首页 | 加载 dashboard | /api/biz/organizer/dashboard | GET | organizerId? | {publishedActivities, stats, permissions} | mock-first adapter，不调用 URL | organizerStats + organizerActivities | stats 字段命名、权限字段 |
| 活动中心 | 查询活动列表 | /api/biz/organizer/activities | GET | keyword,auditStatus[],lifeStatus[],startAt,endAt,page,pageSize | {list,pagination} | mock-first adapter，本地 filter/date/page | organizerActivities | 分页字段、状态枚举 |
| 活动发布 | 新增/保存草稿/提交审核 | /api/biz/organizer/activities | POST/PUT | CreateActivityDraft | {activityId,auditStatus} | mock-first adapter，返回 mock activityId | createActivityFromDraft | 草稿和提交是否同接口 |
| 上传海报 | 上传图片 | /api/biz/organizer/assets/upload | POST | slotKey,file,crop? | {fileId,url,width,height} | mock-first adapter，返回本地/占位 URL | posterSlots fileName/filePath | 文件大小、比例、OSS 签名 |
| 票券配置 | 保存票券 | /api/biz/organizer/activities/{id}/tickets | POST/PUT | TicketSpec[] | {ticketSpecs} | mock-first adapter，回写 draft | organizerTicketSpecs | 价格单位分/元、库存规则 |
| 核销 | 核销券码 | /api/biz/organizer/tickets/verify | POST | code,activityId? | {status,ticket,reasonCode} | mock-first adapter，映射 success/failed/invalidCode | getMockVerifiedTickets | 错误码、可核销时间规则 |
| 核销记录 | 查询核销记录 | /api/biz/organizer/tickets/verify-records | GET | verifierId?,page,pageSize,status? | {list,pagination} | mock-first adapter，不调用 URL | VerifyRecordItem[] | 核销员身份字段、分页字段、是否主办方也可见 |
| 核销员 | 添加/删除核销员 | /api/biz/organizer/verifiers | GET/POST/DELETE | name,phone,permissionScope,channel | {verifier} | mock-first adapter，更新 mock list | organizerVerifiers | 权限范围、邀请二维码 |
| 提现信息 | 查看/编辑提现 | /api/biz/organizer/withdrawal | GET/PUT | payeeName,accountNumber,bankName | {withdrawalInfo} | mock-first adapter，更新 mock withdrawal | mockWithdrawal | 账号格式、实名校验 |
| 我要入驻 | 提交入驻申请 | /api/biz/organizer/settlement/apply | POST | SettlementApplyDraft | {applicationId,status} | mock-first adapter，不调用 URL | settlementApplyDraft + mock status | 字段需黄总确认，真实状态枚举需后端确认 |

已有接口和 proposed 接口必须严格区分。Claude Code 不应把 proposed 当作真实可用接口；若需要编码，先 mock 或 TODO。

## 后端确认后才能接入

- 请求路径和方法。
- 请求鉴权和用户/商户身份字段。
- 响应 code/msg/data 结构。
- 分页字段和排序规则。
- 状态枚举和审核错误码。
- 上传签名、文件限制和 CDN 返回字段。
- 提现实名校验和脱敏规则。
- 入驻申请表单最终字段。
- 用户主办方状态字段。
- 用户核销员身份字段和核销记录可见范围。
