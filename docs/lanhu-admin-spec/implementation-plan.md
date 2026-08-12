# Implementation Plan for Claude Code

## 顺序
0. 后端接口尚未完成，先建立 mock-first 边界：页面通过 organizer 模块 adapter 或局部 helper 访问 mock 数据，不接真实后端。
1. P0 用户中心入口前置闭环：左上角 `扫一扫` + `客服` 图标组、`我要入驻` / `主办中心` 状态切换、入驻申请表单、核销员订单核销入口。
2. P0 活动后台主流程：home -> activities list/search/filter/calendar -> createWizard step1/2/3/4。
3. P1 核销、核销记录、添加核销员、提现信息。
4. P2 审核状态和其他疑似状态页。

## 后端未完成时的实现原则
- 第一轮目标是前端交互闭环，不是接口接入。
- 所有 `/api/biz/organizer/*` 都是 proposed contract，不能当真实接口调用。
- 不要修改全局 request 封装。
- 不要凭空编造真实后端接口路径。
- 不要把 mock 逻辑散落到大量页面里。
- 推荐采用“organizer adapter + mock 数据”的方式；未来后端完成后只替换 adapter。

## P0 修改建议
- 使用 `user-entry-and-settlement-spec.md` 和 `visual-review-cc4-user-profile-2026-06-01.md`。
- 先修用户主页左上角顶部操作区：active 核销员显示 `扫一扫` + `客服`，普通用户不显示订单核销扫码入口；客服入口按产品规则展示。
- 左上角 `nav-side` 不能继续为空；`扫一扫` 和 `客服` 必须是图标按钮，不要放进功能区卡片。
- 再修用户主页功能区入口：普通用户显示 `我要入驻`，主办方显示 `主办中心`。
- `我要入驻` 进入入驻申请表单，字段走 mock 配置并标记黄总确认。
- `订单核销` 入口是左上角 `扫一扫`，只对 active 核销员展示/可用，普通用户没有。
- `客服` 入口优先使用微信客服能力或项目已有客服承接；未配置时 Toast/TODO，不能无响应。
- 使用 `admin-pages/admin-home-empty.json`、`admin-pages/activity-center-*.json`、`admin-pages/activity-create-*.json`。
- 修改 `src/pages/user-sub/organizer/index.tsx`、`activities/index.tsx`、`home/index.tsx`、`index.scss`、`mock.ts`、`types.ts`。
- 优先完成 mock 数据列表、搜索、筛选、日期筛选、loading/empty/error、基础表单校验。
- 先补动态功能和校验，再微调视觉。

## P1 修改建议
- 使用 `verify-*.json`、`add-verifier.json`、`account-withdrawal-*.json`。
- 修改 `verify/index.tsx`、`account/index.tsx` 和相关样式。
- 增加 `核销记录` 功能区入口，只对核销员展示；点击进入记录列表，不触发扫码。
- 记录列表数据走 mock adapter，真实接口字段和分页规则保留 TODO。

## 组件抽象
- 只有当重复明显时再抽象，不要为了规格包新增大量组件。
- 可优先抽象或局部函数化：AdminSearchBar、AdminFilterPanel、WizardStepHeader、TicketSpecEditor、VerifyResultDialog、WithdrawalDialog。

## 不要做
- 不要改 app.config.ts。
- 不要重构非后台页面。
- 不要删除现有 mock。
- 不要把 proposed API 当真实接口。
- 不要第一轮接真实后端。
- 不要改全局 request 封装。
- 不要把 mock 分散写在大量页面组件里。
- 不要漏掉用户主页左上角客服入口。
- 不要把客服入口误接到核销、入驻或设置。

## 人工确认
详见 `needs-human-confirm.md`。
