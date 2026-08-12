# Claude Code Batches

本文件用于把后台管理页面拆成可控批次。Claude Code 不应一次性全量重写 21 个后台页面。

## Batch 0：项目理解与保护性检查

**目标**

- 只读理解当前 Taro + React + TypeScript 小程序结构。
- 阅读 `docs/lanhu-admin-spec/`，确认后台管理入口和现有内部视图。
- 确认编译命令、资源目录、mock 文件、现有组件和样式边界。

**涉及页面**

- 不实现页面，只确认 `pages/user-sub/organizer/index` 及其内部视图结构。

**必读规格文件**

- `README.md`
- `spec-consistency-check.md`
- `resource-readiness-check.md`
- `page-map.md`
- `code-gap-report.md`
- `mock-and-adapter-strategy.md`
- `claude-code-prompt.md`

**建议修改文件**

- 第一轮 Batch 0 原则上不修改业务代码。
- 如必须补注释或 TODO，应先确认不影响编译；优先不做。

**禁止修改文件**

- `src/app.config.ts`
- 非后台页面
- 全局请求封装
- 任何无关业务文件

**依赖资源**

- 无。

**依赖接口或 mock**

- 只读确认 `src/pages/user-sub/organizer/mock.ts`、`types.ts`、`constants.ts`。

**验收标准**

- 能说明后台管理只有一个注册路由：`pages/user-sub/organizer/index`。
- 能说明 P0/P1/P2 页面和 internalView 的关系。
- 能说明 proposed 接口不能当真实接口。

**完成后 Claude Code 应输出**

- 已阅读文件清单。
- 当前项目结构摘要。
- 后续将先做 Batch 1 的文件清单和风险点。

## Batch 1：P0 后台首页与活动中心列表闭环

**目标**

- 先完成可运行的后台首页 + 活动中心列表闭环。
- 搜索、筛选、日期筛选、列表、empty/loading/error 至少可交互。

**涉及页面**

- `admin-home-empty`
- `admin-home-listed`
- `activity-center-empty`
- `activity-center-search-input`
- `activity-center-search-result`
- `activity-center-filter-panel`
- `activity-center-filter-selected`
- `activity-center-date-filter`

**必读规格文件**

- `admin-pages/admin-home-empty.json`
- `admin-pages/admin-home-listed.json`
- `admin-pages/activity-center-*.json`
- `functional-feature-map.md`
- `interaction-flow.md`
- `page-state-machine.md`
- `dynamic-acceptance-checklist.md`
- `mock-and-adapter-strategy.md`

**建议修改文件**

- `src/pages/user-sub/organizer/index.tsx`
- `src/pages/user-sub/organizer/home/index.tsx`
- `src/pages/user-sub/organizer/activities/index.tsx`
- `src/pages/user-sub/organizer/index.scss`
- `src/pages/user-sub/organizer/mock.ts`
- `src/pages/user-sub/organizer/types.ts`

**禁止修改文件**

- `src/app.config.ts`
- 非后台页面
- 全局请求封装

**依赖资源**

- 预览图只做人工对照，不直接引用。
- 图标优先使用现有组件或 WXSS。

**依赖接口或 mock**

- 使用 `src/pages/user-sub/organizer/mock.ts` 的本地数据。
- `getOrganizerDashboard`、`getOrganizerActivities` 只能作为 proposed/TODO，不接真实请求。

**验收标准**

- 后台入口可打开且编译通过。
- 首页空态和有活动状态可展示。
- 活动中心搜索可输入、确认、清空。
- 筛选面板可打开、选择、重置、应用。
- 日期范围可选择、清空、应用。
- 列表、空态、loading、error 有明确状态路径。

**完成后 Claude Code 应输出**

- 修改文件清单。
- Batch 1 自检结果。
- 未解决 unknown 和 TODO。

## Batch 2：活动发布基础信息与场地设定

**目标**

- 补齐活动发布第 1 步和第 2 步的多步骤表单状态。
- 完成基础字段校验、上一步/下一步、草稿暂存。

**涉及页面**

- `activity-create-info`
- `activity-create-venue-setting`

**必读规格文件**

- `admin-pages/activity-create-info.json`
- `admin-pages/activity-create-venue-setting.json`
- `form-validation-spec.md`
- `interaction-flow.md`
- `page-state-machine.md`
- `resource-readiness-check.md`

**建议修改文件**

- `src/pages/user-sub/organizer/index.tsx`
- `src/pages/user-sub/organizer/index.scss`
- `src/pages/user-sub/organizer/types.ts`
- `src/pages/user-sub/organizer/mock.ts`

**禁止修改文件**

- `src/app.config.ts`
- 全局请求封装
- 非后台页面

**依赖资源**

- 地图优先使用现有 TaroMap。
- `map-preview@2x.png` 仅在需要静态占位时迁移，不是必需。

**依赖接口或 mock**

- 活动草稿使用本地 state/mock。
- 保存草稿接口为 proposed，必须 TODO 标记。

**验收标准**

- 第 1 步必填字段能校验并阻止下一步。
- 第 2 步地区、地址、坐标状态可回显。
- 上一步/下一步不丢失已填数据。
- 定位失败或地图不可用时有可见状态。

**完成后 Claude Code 应输出**

- 表单字段完成情况。
- 校验规则执行结果。
- 仍需产品/后端确认字段。

## Batch 3：上传海报与票券配置

**目标**

- 补齐图片上传/删除/替换的可交互 mock。
- 补齐票券配置、启用/禁用、数字校验和上一步/下一步。

**涉及页面**

- `activity-create-upload-poster`
- `activity-create-ticket-config`

**必读规格文件**

- `admin-pages/activity-create-upload-poster.json`
- `admin-pages/activity-create-ticket-config.json`
- `form-validation-spec.md`
- `api-data-contract.md`
- `mock-and-adapter-strategy.md`

**建议修改文件**

- `src/pages/user-sub/organizer/index.tsx`
- `src/pages/user-sub/organizer/index.scss`
- `src/pages/user-sub/organizer/types.ts`
- `src/pages/user-sub/organizer/mock.ts`

**禁止修改文件**

- 全局上传封装，除非项目已有局部 adapter 约定。
- 非后台页面。

**依赖资源**

- 上传位图和按钮图优先用 WXSS/现有组件。
- 预览图只作视觉对照。

**依赖接口或 mock**

- 图片上传接口 `/api/biz/organizer/assets/upload` 为 proposed。
- 票券保存接口为 proposed。
- 先用本地 mock + TODO。

**验收标准**

- 每个图片槽位支持选择、替换、删除、失败提示。
- 图片大小/比例规则按 minimal validation 执行，unknown 规则保留 TODO。
- 票券至少 1 项、最多 5 项，价格/库存/限购/人数基础数字校验可用。
- 上一步/下一步保持草稿状态。

**完成后 Claude Code 应输出**

- 图片槽位测试结果。
- 票券表单校验结果。
- proposed 接口 TODO 位置。

## Batch 4：核销相关页面

**目标**

- 补齐核销页、添加核销员、成功/失败/无效码弹窗的可交互闭环。
- 补齐用户主页左上角蓝湖图标组：`扫一扫` + `客服`。
- 订单核销真实入口是用户主页左上角 `扫一扫`，只对 active 核销员展示/可用，普通用户没有。
- 客服入口位于 `扫一扫` 右侧，使用微信客服能力或项目已有客服承接。
- 扫码和手输券码先用 mock，避免假接真实接口。
- 增加 `核销记录` 入口和记录列表查看闭环。

**涉及页面**

- `add-verifier`
- `verify-ticket`
- `verify-success`
- `verify-failed`
- `verify-invalid-code`
- 用户主页左上角 `扫一扫` + `客服` 入口
- 用户主页功能区 `核销记录` 入口

**必读规格文件**

- `admin-pages/add-verifier.json`
- `admin-pages/verify-*.json`
- `api-data-contract.md`
- `interaction-flow.md`
- `page-state-machine.md`
- `form-validation-spec.md`
- `user-entry-and-settlement-spec.md`

**建议修改文件**

- `src/pages/user-sub/organizer/verify/index.tsx`
- `src/pages/user-sub/organizer/verify/index.scss`
- `src/pages/user-sub/organizer/mock.ts`
- `src/pages/user-sub/organizer/types.ts`
- `src/pages/user/index.tsx`

**禁止修改文件**

- `src/app.config.ts`，除非产品确认核销独立路由。
- 全局请求封装。

**依赖资源**

- 无必需图片资源。

**依赖接口或 mock**

- `verifyTicketCode`、`get/add/deleteVerifier` 均为 proposed。
- `getVerifyRecords` / `verifyRecords` 为 proposed。
- 用户核销员身份字段后端未确认，第一轮用 mock `isVerifier` / `verifierStatus`。
- 先复用或扩展 organizer mock 数据。

**验收标准**

- 手输券码非空校验可触发。
- 普通用户看不到订单核销入口。
- active 核销员能看到用户主页左上角 `扫一扫` + `客服`，点击扫码后进入/承接 verify 核销页并有 mock 结果。
- 普通用户不展示订单核销扫码入口；客服入口按产品规则展示。
- 点击客服有有效反馈：打开客服会话、进入项目客服承接，或 Toast/TODO，不能无响应。
- 成功、失败、无效码弹窗可打开/关闭。
- 重复提交有防抖或 submitting 锁。
- 添加核销员姓名/手机号基础校验可用。
- active 核销员能看到 `核销记录`，点击后展示记录列表，不触发扫码。

**完成后 Claude Code 应输出**

- mock 场景列表。
- 弹窗状态验证结果。
- 真实错误码待确认列表。
- 普通用户/核销员两个入口状态截图，必须包含左上角顶部操作区。

## Batch 5：提现与审核状态页

**目标**

- 补齐提现信息查看/编辑和审核状态展示。
- 保持 P2 状态页轻量，不扩大到完整审核后台。

**涉及页面**

- `account-withdrawal-info`
- `account-withdrawal-edit`
- `audit-pending`
- `audit-rejected`

**必读规格文件**

- `admin-pages/account-withdrawal-*.json`
- `admin-pages/audit-*.json`
- `form-validation-spec.md`
- `api-data-contract.md`
- `needs-human-confirm.md`

**建议修改文件**

- `src/pages/user-sub/organizer/account/index.tsx`
- `src/pages/user-sub/organizer/account/index.scss`
- `src/pages/user-sub/organizer/activities/index.tsx`
- `src/pages/user-sub/organizer/mock.ts`
- `src/pages/user-sub/organizer/types.ts`

**禁止修改文件**

- 真实支付/提现全局服务。
- 非后台页面。

**依赖资源**

- 无必需图片资源。

**依赖接口或 mock**

- 提现查看/编辑接口为 proposed。
- 审核重新编辑/重新提交规则 unknown，先只展示状态和原因。

**验收标准**

- 提现信息可查看、编辑、取消、提交 mock。
- 收款人、账户、银行字段基础非空校验可用。
- 审核中和审核未通过状态可展示。
- 审核未通过可展示 rejectReason；重新提交动作保留 TODO。

**完成后 Claude Code 应输出**

- 提现字段校验结果。
- 状态页展示结果。
- 必须人工确认的提现和审核规则。
