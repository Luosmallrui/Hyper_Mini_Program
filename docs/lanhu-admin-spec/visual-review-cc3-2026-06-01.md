# CC3 后台管理视觉评审

生成时间：2026-06-01  
评审范围：Claude Code 最新一轮后台管理修改后的运行态截图、蓝湖多模态设计图、当前代码入口关系。  
业务代码改动：无。本文件只记录视觉 review 和修改建议。

## 使用材料

蓝湖设计图：

- `assets/lanhu-designs/009-account-home.png`
- `assets/lanhu-designs/038-activity-status-list.png`
- `assets/lanhu-designs/005-verifier-list.png`
- `assets/lanhu-designs/019-verify-ticket-base.png`
- `assets/lanhu-designs/011-verify-success.png`
- `assets/lanhu-designs/015-verify-failed.png`

当前运行态截图：

- `assets/runtime-review/cc3-account.png`
- `assets/runtime-review/cc3-activity-mine.png`
- `assets/runtime-review/cc3-verifiers-tab.png`
- `assets/runtime-review/cc3-verify-base.png`
- `assets/runtime-review/cc3-verify-recognized.png`
- `assets/runtime-review/cc3-verify-failed.png`

并排对比图：

- `assets/runtime-review/cc3-compare-account.jpg`
- `assets/runtime-review/cc3-compare-activity-mine.jpg`
- `assets/runtime-review/cc3-compare-verifiers-tab.jpg`
- `assets/runtime-review/cc3-compare-verify-base.jpg`
- `assets/runtime-review/cc3-compare-verify-recognized.jpg`
- `assets/runtime-review/cc3-compare-verify-failed.jpg`

运行态入口：

- `/pages/user-sub/organizer/index?view=home`
- `/pages/user-sub/organizer/index?view=activities&tab=mine`
- `/pages/user-sub/organizer/index?view=activities&tab=verifiers`
- `/pages/user-sub/organizer/index?view=account`
- `/pages/user-sub/organizer/index?view=verify`
- `/pages/user-sub/organizer/index?view=verify&verifyModal=recognized`
- `/pages/user-sub/organizer/index?view=verify&verifyModal=failed`

## 总结结论

这一轮比上一轮明显进步，账户页主体结构已经从“错误页面”修回了蓝湖账户主页的方向，订单核销基础页也已经接近蓝湖。但是还不能算像素级通过，主要问题集中在：

1. `订单核销` 没有清晰的用户可见入口。
2. 账户页和底部 tab 的图标体系仍然不是蓝湖图标。
3. 订单核销弹窗的垂直位置、遮罩后背景露出关系和弹窗内容密度仍有偏差。
4. 活动中心列表和核销员列表主体接近，但 mock 图片、底部 tab 图标、部分卡片密度仍未完全对齐。

## 订单核销入口结论

当前普通用户路径不清晰，甚至可以认为“没有显式入口”。

代码里存在：

- `OrganizerVerifyView`，内部 view 名是 `verify`。
- `openVerifyView()`，会把 `dashboardView` 切到 `verify`。
- URL 调试入口可用：`/pages/user-sub/organizer/index?view=verify`。

但运行态和代码显示：

- 底部 `活动` tab 内的 `核销管理` 是核销员列表，不是订单核销页。
- 首页 `快速配置` 当前可见卡片是 `发布活动`、`添加核销员`、`票务配置`、`分销管理`，没有 `订单核销` 或 `扫码核销`。
- `home/index.tsx` 的 `QUICK_ACTIONS` 没有 verify action；`onOpenVerify` 虽然作为 prop 存在，但当前被 `onOpenAddVerifier` 抢先用于 `添加核销员`，不会进入订单核销。
- 活动中心列表卡片的 chevron 也只是视觉入口，目前没有看到进入 `verify` 的绑定。

建议给 Claude Code 的明确修改方向：

1. 如果产品允许新增入口：在首页 `快速配置` 中新增或替换一个 `订单核销 / 扫码核销` 卡片，点击调用 `openVerifyView()`。
2. 如果不允许改首页卡片：在 `活动中心 > 核销管理` 顶部增加 `订单核销` CTA，同时保留核销员列表。
3. 不要把 `核销管理` tab 等同于订单核销页；它目前视觉和蓝湖 `005-verifier-list.png` 对应的是核销员管理。
4. 最终入口需要产品确认；如果没有确认，Claude Code 至少应保留调试参数入口并在 UI 上标记 TODO，不要声称订单核销闭环完成。

## Findings

### P0-001：订单核销缺少可见入口

证据：

- `cc3-home.png` 首页快速配置没有 `订单核销`。
- `cc3-verifiers-tab.png` 活动 tab 的 `核销管理` 展示的是核销员列表。
- `src/pages/user-sub/organizer/home/index.tsx` 的 `QUICK_ACTIONS` 没有 verify action。
- `src/pages/user-sub/organizer/index.tsx` 中 `openVerifyView()` 存在，但当前只能通过调试参数或未暴露入口到达。

影响：

- 用户不知道从哪里进入 `订单核销`。
- 后续 Claude Code 如果只说 `view=verify` 可打开，不等于真实产品流程完成。

建议：

- 首选：在首页快速配置增加 `订单核销`，点击 `openVerifyView()`。
- 备选：在 `核销管理` tab 增加顶部主按钮 `订单核销`，点击进入 `verify`。
- 文案建议用 `订单核销`，不要再叫 `核销管理`，避免和核销员管理混淆。

### P1-001：账户页主体结构修回来了，但图标不符合蓝湖

证据：

- 对比图：`assets/runtime-review/cc3-compare-account.jpg`
- 当前账户页已删除 `付款信息 / 付费记录 / 安全性`，这是正确的。
- 但当前 row icon 是编辑笔、定位、对勾、卡片、锁、外跳；蓝湖是群组、地球、人员列表、银行卡、笔、开关样式图标。

影响：

- 结构通过，但多模态模型会明显看到“不是同一套图标”。

建议：

- 对账户页 6 个 row icon 做专项替换或用 CSS/现有图标库近似到蓝湖形态。
- 底部 tab 的 `活动` icon 也应从当前 pin 图标改为蓝湖票券/地图折页样式。

### P1-002：订单核销弹窗仍未像素级对齐

证据：

- 对比图：`assets/runtime-review/cc3-compare-verify-recognized.jpg`
- 对比图：`assets/runtime-review/cc3-compare-verify-failed.jpg`

偏差：

- 当前弹窗整体位置偏低，顶部留白关系和蓝湖不一致。
- 当前弹窗内容区更紧，图片、文字和按钮之间的垂直节奏与蓝湖仍有差异。
- 当前 `recognized` 态弹窗的背景卡片露出位置与蓝湖不同，导致遮罩后的层级观感偏差。

建议：

- 不要只用 flex center；按蓝湖图固定弹窗顶部/中心偏移。
- 分别对 `recognized/success/failed/invalidCode/reverify` 定义弹窗高度和内容间距，不要所有状态复用同一套间距。
- 继续保留 mock-first，不接真实接口。

### P1-003：活动中心列表接近，但仍不是像素级

证据：

- 对比图：`assets/runtime-review/cc3-compare-activity-mine.jpg`

偏差：

- 当前第 2、3、4 条活动图片与蓝湖 mock 图不一致；如果做视觉验收，mock 图也应与蓝湖一致。
- 当前底部 tab `活动` icon 是 pin，蓝湖是票券/折页样式。
- 当前 FAB 覆盖第 5 条卡片内容的程度偏重，仍需要检查卡片右侧 `编辑` 胶囊和原因文本是否被遮挡。

建议：

- 视觉验收阶段先使用蓝湖同款 mock 封面，避免图片差异干扰布局判断。
- FAB 下方列表应保留足够 safe area，避免遮挡拒绝原因和编辑入口。

### P1-004：核销员列表接近，但当前顶部区域与蓝湖仍有差异

证据：

- 对比图：`assets/runtime-review/cc3-compare-verifiers-tab.jpg`

偏差：

- 主体卡片和文本布局接近。
- 当前底部 tab 活动 icon 不符合蓝湖。
- 当前截图顶部没有微信状态栏和胶囊；该点可能是 MCP 截图裁剪导致，仍需用完整模拟器截图二次确认。

建议：

- 核销员卡片可以暂时视为 P1 通过，优先修入口和订单核销弹窗。
- 完整模拟器截图里需要确认状态栏、胶囊、导航栏高度是否与蓝湖一致。

## 可暂时通过的部分

- 账户页主结构：基本通过，剩余是图标和细节。
- 订单核销基础页：接近蓝湖 `019-verify-ticket-base.png`，基础列表、扫码按钮、标题区域基本可继续细调。
- 核销员列表：接近蓝湖 `005-verifier-list.png`，不是当前最大问题。

## 下一轮给 Claude Code 的修改顺序

1. 先修 `订单核销` 可见入口，不解决入口就不要声称核销闭环完成。
2. 再修订单核销弹窗位置和间距，对齐 `011/015/016/013` 四类状态。
3. 再修账户页 row icon 和底部 tab icon。
4. 再统一活动中心 mock 图片和 FAB 遮挡。
5. 最后用微信开发者工具重新保存截图，更新 `assets/runtime-review/cc3-*` 或新增 `cc4-*` 截图。

## 给 Claude Code 的短 Prompt

你上一轮修复后，账户页主体和订单核销基础页已经接近蓝湖，但还不能通过像素级验收。请先阅读：

1. `docs/lanhu-admin-spec/visual-review-cc3-2026-06-01.md`
2. `docs/lanhu-admin-spec/assets/runtime-review/cc3-compare-account.jpg`
3. `docs/lanhu-admin-spec/assets/runtime-review/cc3-compare-verify-base.jpg`
4. `docs/lanhu-admin-spec/assets/runtime-review/cc3-compare-verify-recognized.jpg`
5. `docs/lanhu-admin-spec/assets/runtime-review/cc3-compare-verify-failed.jpg`
6. `docs/lanhu-admin-spec/assets/runtime-review/cc3-compare-verifiers-tab.jpg`
7. `docs/lanhu-admin-spec/lanhu-design-image-manifest.md`

本轮不要接真实后端，不要改全局 request。优先修：

1. 增加或明确 `订单核销` 可见入口，点击进入 `openVerifyView()`。
2. 不要把 `核销管理` tab 当成订单核销入口；它当前是核销员列表。
3. 对齐订单核销弹窗位置、尺寸、内容间距。
4. 替换账户页 row icons 和底部 tab 的活动 icon，使其接近蓝湖。
5. 每修完一个页面必须用微信开发者工具截图，和对应蓝湖图并排对比。

完成后输出：修改文件、入口路径、截图路径、仍未对齐项、`npx tsc --noEmit` 结果。

