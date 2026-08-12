# Spec Consistency Check

检查时间：2026-05-27

## 检查结论

- 后台管理精细规格数量一致：共 21 个后台管理页面。
- `admin-pages/` 目录完整：21 个 JSON + 21 个 Markdown，所有 P0 页面均有对应 JSON 和 Markdown。
- 优先级一致：P0 12 个、P1 7 个、P2 2 个。
- 推荐路由一致：所有后台管理规格均指向 `pages/user-sub/organizer/index`，差异由 `internalView` 或表格备注表达。
- 当前路由一致：所有页面当前实现均映射到 `pages/user-sub/organizer/index` 内部视图。
- JSON 必备字段完整：所有页面均包含视觉规格、动态功能规格、接口提示、事件、状态、表单校验、权限提示和验收标准字段。
- 后台真实接口未发现；所有后台专用接口均应按 `proposed` 处理，不得当作 existing 接口。
- 2026-06-01 追加：用户主页前置入口不计入 21 个后台管理设计页数量，但已纳入 P0 修复范围，包含左上角 `扫一扫` + `客服` 图标组、`我要入驻` / `主办中心` 状态切换和个人资料编辑。

## 页面数量与优先级

| 优先级 | 数量 | 页面 |
|---|---:|---|
| P0 | 12 | 后台首页、已上架首页、活动中心空态、搜索输入、搜索回显、筛选、筛选选中、时间筛选、发布基础信息、场地设定、上传海报、票券配置 |
| P1 | 7 | 添加核销员、核销、核销成功、核销失败、无效码、提现信息、修改提现信息 |
| P2 | 2 | 审核中、审核未通过 |

## 一致性检查项

| 检查项 | 结果 | 说明 |
|---|---|---|
| 后台管理页面数量 | 通过 | `scope.md`、`page-map.md`、`functional-feature-map.md`、`admin-pages/*.json` 均围绕 21 个后台页面。 |
| P0/P1/P2 优先级 | 通过 | P0 12、P1 7、P2 2；与当前分批计划一致。 |
| 页面名称 | 通过 | JSON 的 `pageName` 与页面映射表中的蓝湖页面名称一致。 |
| 推荐路由 | 通过 | 均为 `pages/user-sub/organizer/index`；内部视图由括号备注或 JSON `internalView` 表达。 |
| 当前路由 | 通过 | 均为 `pages/user-sub/organizer/index`；符合当前 Taro 分包注册结构。 |
| P0 JSON/Markdown | 通过 | 12 个 P0 页面均有 `.json` 和 `.md`。 |
| P0 视觉规格 | 通过但需人工验收 | JSON 中有 `canvas/layout/nodeTree/wxssHints`；部分节点级尺寸来自 Lanhu HTML/CSS 和页面级推断。 |
| P0 动态规格 | 通过 | JSON 中有 `dynamicBehaviorSpec/eventHandlers/states/dataBindingHints/apiHints`；全局文档有 interaction/state/form/checklist。 |
| P0 验收标准 | 通过 | JSON 中有 `acceptanceCriteria`；全局验收见 `dynamic-acceptance-checklist.md`。 |
| proposed 接口标记 | 通过 | `api-data-contract.md` 明确将后台 organizer 接口列为 Proposed；admin JSON 中使用 `proposedApis`。 |
| unknown 汇总 | 通过但非逐字段枚举 | `needs-human-confirm.md` 已按类别汇总；每个 JSON 的重复 unknown 未逐条复制，避免上下文膨胀。 |
| 资源引用 | 部分通过 | 已下载资源在 `asset-manifest.md` 中有记录；多数页面 JSON 的 `assets.path=unknown` 仅表示预览/切图未提取，不可当作可引用路径。 |
| 用户主页前置入口 | 通过但需单独验收 | `page-map.md`、`functional-feature-map.md`、`interaction-flow.md`、`dynamic-acceptance-checklist.md` 已补充左上角 `扫一扫` + `客服`、入驻和核销记录入口；这些不是 21 个后台页面 JSON，不要求 `admin-pages/*.json`。 |

## 发现的不一致问题

1. `page-map.md` 的推荐路径包含内部状态备注，例如 `pages/user-sub/organizer/index (activities:filter)`；JSON 的 `recommendedRoute/currentRoute` 只保留注册路由 `pages/user-sub/organizer/index`，内部状态放在 `internalView`。
   - 处理：这不是业务冲突。交给 Claude Code 时应以“注册路由 + internalView”理解，不要新增路由。

2. 多数 `admin-pages/*.json` 的 `assets` 中存在 `path: unknown` 或 `status: 待人工确认`。
   - 处理：这些不是下载失败的必需资源，而是蓝湖节点级切图未完整提取。Claude Code 不得直接引用 unknown 路径，应先看 `asset-manifest.md` 和 `resource-readiness-check.md`。

3. `admin-pages/*.json` 的 `existingApis` 包含 `servicesGetHome`、登录接口等现有通用接口，但 relation 明确说明“与后台管理无直接绑定”。
   - 处理：后台管理专用接口仍全部按 proposed/mock 处理，不得误判为已有真实后台接口。

## 已修正的问题

- 新增本文件，将 route/internalView、unknown assets、existing/proposed API 的使用边界写清楚。
- 新增 `resource-readiness-check.md`，避免 Claude Code 误用 `docs/` 目录资源。
- 新增 `claude-code-batches.md` 和 `mvp-scope.md`，避免一次性实现 21 个页面导致上下文过大。
- 新增 `mock-and-adapter-strategy.md`，明确 proposed 接口只能 mock/TODO。
- 更新 `claude-code-prompt.md`，要求 Claude Code 优先按 Batch 和 MVP 执行。

## 无法修正但已记录的问题

- 蓝湖 MCP 未返回明确 `upload_time`，只能使用 `update_time` 判断 4/5 月页面。
- P1/P2 页面未全部取得节点级 HTML/CSS，视觉还原需要人工验收。
- 后台真实接口、权限体系、复杂表单规则未在当前代码中找到。
- 客服入口最终承接方式未确认；第一轮可使用微信原生客服能力、项目已有客服承接或 Toast/TODO。
- 微信开发者工具 MCP 本轮元素快照 `elementCount=0`，无法自动验证按钮和弹窗交互。

## 交给 Claude Code 前仍需注意

- 第一轮不要全量实现 21 个页面，优先执行 `claude-code-batches.md` 的 Batch 0 + Batch 1。
- 不要修改 `app.config.ts` 或新增后台独立路由，除非产品确认。
- 不要把 `docs/lanhu-admin-spec/assets/` 当作小程序正式资源目录；使用前先按 `resource-readiness-check.md` 迁移或改用 WXSS/组件。
- 不要把 `/api/biz/organizer/*` 当作真实接口；它们是 proposed contract。
- 每完成一个 Batch 后，按 `dynamic-acceptance-checklist.md` 做交互、状态、mock、编译检查。
- 修用户主页时必须额外截图验证左上角顶部操作区：active 核销员有 `扫一扫` + `客服`，普通用户不展示订单核销扫码入口。
