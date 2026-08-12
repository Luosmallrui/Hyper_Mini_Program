# Claude Code Prompt

你是 Claude Code，当前模型具备多模态能力。当前主体任务聚焦微信小程序后台管理页面查漏补缺，其他页面不是重点。

补充范围：用户主页里的后台入口、订单核销入口、核销记录入口、我要入驻申请表单和个人资料编辑弹窗已经被明确纳入本轮修复前置项。开始编码前必须阅读 `docs/lanhu-admin-spec/visual-review-cc4-user-profile-2026-06-01.md` 和 `docs/lanhu-admin-spec/user-entry-and-settlement-spec.md`。

最新追加：用户主页左上角蓝湖有两个顶部操作图标 `扫一扫` 和 `客服`，当前实现还没有添加。下一轮必须优先补齐这两个图标，不能只实现核销页。

## 多模态材料优先级

现在必须把蓝湖设计图图片作为一手材料使用，不再只依赖纯文本规格。

1. 先读 `docs/lanhu-admin-spec/multimodal-claude-code-guide.md`。
2. 再读 `docs/lanhu-admin-spec/lanhu-design-image-manifest.md`。
3. 每个页面实现前，必须打开对应 `docs/lanhu-admin-spec/assets/lanhu-designs/*.png` 蓝湖图。
4. 不得只看“重点图片”。必须按 `lanhu-design-image-manifest.md` 的“逐图用途说明”覆盖当前 Batch 相关的全部蓝湖图。
5. `admin-pages/*.json` 和 `admin-pages/*.md` 用于补充尺寸、交互、状态机和数据契约。
6. 当前运行态截图在 `docs/lanhu-admin-spec/assets/runtime-review/`，用于和蓝湖图做 before/after 对比。
7. 禁止只看 JSON 不看蓝湖图片，也禁止只看图片忽略动态规格。

用户中心补充蓝湖图：

1. `docs/lanhu-admin-spec/assets/lanhu-designs-user/004-user-profile-edit-signature.png`
2. `docs/lanhu-admin-spec/assets/lanhu-designs-user/029-user-center-organizer-entry.png`
3. `docs/lanhu-admin-spec/assets/lanhu-designs-user/056-user-center-variant.png`
4. `docs/lanhu-admin-spec/assets/lanhu-designs-user/057-user-center-variant.png`

## 最高优先级

1. 不要一次性全量重写 21 个后台页面。
2. 当前后台管理真实接口尚未完成；第一轮必须 mock-first，不接真实后端。
3. 先阅读 `docs/lanhu-admin-spec/backend-not-ready-strategy.md` 和 `docs/lanhu-admin-spec/claude-code-batches.md`，按 Batch 逐步实现。
4. 第一轮优先实现 `docs/lanhu-admin-spec/mvp-scope.md` 中的 MVP。
5. 如果上下文有限，只执行 Batch 0 + Batch 1。
6. 每完成一个 Batch 后，按 `docs/lanhu-admin-spec/dynamic-acceptance-checklist.md` 自检并输出结果。

## 必读顺序

先读交付加固文件：

1. `docs/lanhu-admin-spec/spec-consistency-check.md`
2. `docs/lanhu-admin-spec/resource-readiness-check.md`
3. `docs/lanhu-admin-spec/multimodal-claude-code-guide.md`
4. `docs/lanhu-admin-spec/lanhu-design-image-manifest.md`
5. `docs/lanhu-admin-spec/backend-not-ready-strategy.md`
6. `docs/lanhu-admin-spec/mock-and-adapter-strategy.md`
7. `docs/lanhu-admin-spec/claude-code-batches.md`
8. `docs/lanhu-admin-spec/mvp-scope.md`
9. `docs/lanhu-admin-spec/visual-review-cc4-user-profile-2026-06-01.md`
10. `docs/lanhu-admin-spec/user-entry-and-settlement-spec.md`

再读实现规格文件：

1. `docs/lanhu-admin-spec/page-map.md`
2. `docs/lanhu-admin-spec/code-gap-report.md`
3. `docs/lanhu-admin-spec/functional-feature-map.md`
4. `docs/lanhu-admin-spec/api-data-contract.md`
5. `docs/lanhu-admin-spec/interaction-flow.md`
6. `docs/lanhu-admin-spec/page-state-machine.md`
7. `docs/lanhu-admin-spec/form-validation-spec.md`
8. `docs/lanhu-admin-spec/dynamic-acceptance-checklist.md`
9. `docs/lanhu-admin-spec/design-tokens.json`
10. `docs/lanhu-admin-spec/components.json`
11. `docs/lanhu-admin-spec/asset-manifest.md`

最后按当前 Batch 读取对应页面：

- `docs/lanhu-admin-spec/admin-pages/*.json`：优先实现依据。
- `docs/lanhu-admin-spec/admin-pages/*.md`：理解页面语义。
- `docs/lanhu-admin-spec/assets/lanhu-designs/*.png`：视觉还原和多模态验收依据。

## 当前路由边界

- 当前后台管理只有一个注册路由：`pages/user-sub/organizer/index`。
- 多个后台页面是 organizer 内部视图或内部状态，不要擅自新增独立页面。
- 不要修改 `src/app.config.ts`，除非产品明确确认需要新增路由。
- 用户主页第 5 个入口必须按用户状态显示 `我要入驻` 或 `主办中心`。未入驻用户不能只 toast，必须进入入驻/激活/审核承接态。
- 个人资料编辑弹窗必须补齐 `个性签名` 编辑，详见 `visual-review-cc4-user-profile-2026-06-01.md`。
- 用户主页左上角必须按蓝湖补齐 `扫一扫` 和 `客服` 两个图标；当前 `src/pages/user/index.tsx` 的左侧 `nav-side` 为空。
- `订单核销` 入口是用户主页左上角 `扫一扫`，只对 active 核销员展示/可用，普通用户没有。
- `客服` 是用户主页左上角辅助入口，优先使用微信客服能力或项目已有客服承接；未配置时至少 Toast/TODO，不能无响应。
- `核销记录` 是查看记录入口，可加在用户主页功能区；它不触发扫码。
- 点击 `我要入驻` 后进入暗色申请表单页，字段需要黄总确认；第一轮用 mock 配置和 TODO，不要伪装成最终接口契约。
- 入口和申请表单细节以 `user-entry-and-settlement-spec.md` 为准。

## 本次任务不是只还原静态页面

必须同时实现后台管理页面的动态功能。

重点阅读：

1. `docs/lanhu-admin-spec/functional-feature-map.md`
2. `docs/lanhu-admin-spec/api-data-contract.md`
3. `docs/lanhu-admin-spec/interaction-flow.md`
4. `docs/lanhu-admin-spec/page-state-machine.md`
5. `docs/lanhu-admin-spec/form-validation-spec.md`
6. `docs/lanhu-admin-spec/dynamic-acceptance-checklist.md`

实现时必须同时满足：

1. 页面视觉结构符合 `admin-pages/*.json` 和 `design-tokens.json`。
2. 页面动态行为符合 `interaction-flow.md`。
3. 页面数据字段符合 `api-data-contract.md`。
4. 页面状态流转符合 `page-state-machine.md`。
5. 表单校验符合 `form-validation-spec.md`。
6. 最终验收符合 `dynamic-acceptance-checklist.md`。

## 推荐实现优先级

1. 先保证页面能打开、能编译。
2. 再保证已有接口、mock 和已有业务逻辑不被破坏。
3. 再补齐 MVP：后台首页、活动中心列表、搜索、筛选、日期范围、empty/loading/error。
4. 再补齐活动发布第 1/2 步基础表单和状态暂存。
5. 后续 Batch 再补上传、票券、核销、提现、审核状态。
6. 最后做视觉细节微调。

## 用户主页左上角 P0 修复

下一轮如果只做用户中心，请优先执行：

1. 在 `/pages/user/index` 顶部自定义导航左侧渲染图标按钮组。
2. active 核销员显示 `扫一扫` + `客服`。
3. 普通用户不显示订单核销扫码入口；客服入口按产品规则展示。
4. `扫一扫` 点击后调起扫码并进入 `pages/user-sub/organizer/index?view=verify&source=userScan`，结果走 mock adapter。
5. `客服` 点击后打开微信客服能力或项目已有客服承接；未配置时 Toast `客服功能待接入` 并保留 TODO。
6. 图标必须与 `assets/lanhu-designs-user/029-user-center-organizer-entry.png` 和 `057-user-center-variant.png` 左上角一致，不要使用文字按钮，不要放进功能区卡片。

## 接口处理规则

1. 当前后台管理真实接口尚未完成。
2. 第一轮实现必须采用 mock-first 策略，不接真实后端。
3. `api-data-contract.md` 中 `/api/biz/organizer/*` 都是 proposed 接口。
4. proposed 接口只能作为未来契约参考，第一轮只能 mock、局部 adapter 或 TODO，不能伪装成真实接口。
5. 不允许修改全局 request 封装。
6. 不允许凭空编造真实后端接口路径。
7. 不允许把 mock 逻辑散落到大量页面里。
8. 推荐采用“页面/模块 adapter + mock 数据”的方式；后端完成后只替换 adapter，不大改页面逻辑。
9. 优先复用 `src/pages/user-sub/organizer/mock.ts`。
10. 不要修改无关接口。
11. 所有 unknown 字段都要保留 TODO 或 need-human-confirm 标记。

## 第一轮前端闭环目标

- 页面能打开。
- 列表能展示 mock 数据。
- 搜索、筛选、日期筛选能基于 mock 数据工作。
- loading、empty、error 状态可切换。
- 表单可填写、校验、提交 mock。
- 弹窗、Toast/Dialog 反馈可用。
- 不接真实后端。

## 资源处理规则

1. 使用资源前先读 `docs/lanhu-admin-spec/resource-readiness-check.md`。
2. 不要直接在小程序代码里引用 `docs/lanhu-admin-spec/assets/`。
3. 预览图只用于人工对照，不作为业务资源。
4. 当前没有 P0 必须迁移的图片资源。
5. 导航栏、状态栏、胶囊、底部 tab 图标优先使用现有代码、原生能力或 WXSS。
6. 如必须使用图片，先迁移到项目正式资源目录，并保持 ASCII 文件名。

## Batch 指引

- 第一轮：执行 Batch 0 + Batch 1。
- Batch 0：只读项目结构、规格包、mock、资源目录，确认边界。
- Batch 1：后台首页与活动中心列表闭环。
- Batch 2：活动发布基础信息与场地设定。
- Batch 3：上传海报与票券配置。
- Batch 4：核销相关页面。
- Batch 5：提现与审核状态页。
- 用户中心入口补充：优先在下一轮修复 `我要入驻` 表单、核销员 `扫一扫` 入口、`核销记录` 入口和个人资料签名编辑；这些是进入后台/核销功能的前置闭环。

每个 Batch 的目标、涉及页面、建议修改文件、禁止修改文件、依赖资源、依赖 mock 和验收标准，以 `claude-code-batches.md` 为准。

## 后台管理功能必须重点检查

- 搜索
- 筛选
- 分页 / 加载更多
- 新增
- 编辑
- 删除
- 审核
- 启用 / 禁用
- 表单校验
- 弹窗打开和关闭
- loading 状态
- empty 状态
- error 状态
- Toast/Dialog 反馈
- 页面跳转
- 数据刷新

## 禁止事项

- 不要重构无关代码。
- 不要删除已有业务逻辑。
- 不要重复下载资源。
- 不要直接复制蓝湖 HTML/CSS。
- 不要修改非后台页面。
- 不要改 `app.config.ts`。
- 不要把 proposed API 当真实接口。
- 不要第一轮接真实后端。
- 不要把 mock 写散到大量页面里。
- 不要修改全局 request 封装。
- 不要凭空发明复杂后端逻辑、权限体系或业务规则。

## 每个 Batch 完成后输出

1. 修改文件清单。
2. 对应 Batch 的验收结果。
3. 编译或类型检查结果。
4. 使用了哪些 mock/TODO。
5. 剩余 unknown / need-human-confirm。
6. 是否影响非后台页面。
