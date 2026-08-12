# 蓝湖全量视觉复核 Review

生成时间：2026-05-29  
评审对象：Claude Code 最新一轮编码后的管理后台运行态页面  
评审范围：`docs/lanhu-admin-spec/admin-pages/` 下 21 个后台管理规格页  
评审方式：蓝湖 MCP 重新读取重点后台设计稿 + 微信开发者工具 MCP 运行态截图/快照 + 当前 `src/pages/user-sub/organizer/` 代码只读审阅  
业务代码改动：无

> 本文件取代 `visual-review-after-cc-update.md` 和 `visual-review-all-admin-pages.md` 中对当前运行态的视觉结论。旧文件中的部分判断已经过期，后续 Claude Code 应优先阅读本文件。

## 本轮证据

### 蓝湖 MCP 复核页面

本轮重新读取了以下设计图，并以蓝湖返回的 HTML/CSS 数值作为视觉规格依据：

| 蓝湖索引 | 蓝湖页面名 | 本轮用途 |
| --- | --- | --- |
| 30 | 管理后台（派对/活动） | 实际视觉内容是活动发布 Step 1，不应按后台首页理解 |
| 35 | 活动发布场地设定 | Step 2 场地设定视觉规格 |
| 36 | 一屏幕显 | 实际视觉内容是后台首页一屏态，不应按活动发布 Step 1 理解 |
| 38 | 活动中心（活动状态） | 活动中心列表状态 |
| 39 | 存在上架活动状态 | 后台首页有活动状态 |
| 46 | 活动中心（筛选） | 筛选面板 |
| 47 | 活动中心（空态） | 活动中心空态 |
| 19 | 管理后台-核销 | 订单核销基础态 |
| 10 | 管理后台-核销成功 | 核销成功弹窗态 |

重要发现：`page-map.md` 和部分 `admin-pages/*.json` 里存在设计稿语义映射风险。蓝湖索引 30 的页面名虽然是“管理后台（派对/活动）”，但实际画面是活动发布 Step 1；蓝湖索引 36“一屏幕显”实际画面是后台首页一屏态。这个映射错误会直接误导后续实现。

### 微信开发者工具 MCP 运行态证据

本轮保存或复用以下运行态截图/快照：

| 文件 | 覆盖页面 / 状态 |
| --- | --- |
| `assets/runtime-review/lanhu-full-current-home.png` | 后台首页 |
| `assets/runtime-review/lanhu-full-current-activity.png` | 活动中心列表 |
| `assets/runtime-review/lanhu-full-current-create1.png` | 活动发布 Step 1 |
| `assets/runtime-review/lanhu-full-current-verify.png` | 订单核销 |
| `assets/runtime-review/lanhu-full-continue-current.png` | 当前继续复核时的订单核销页 |
| `assets/runtime-review/lanhu-full-current-activity-snapshot.txt` | 活动中心元素坐标快照 |
| `assets/runtime-review/lanhu-full-current-create1-snapshot.txt` | 活动发布 Step 1 元素坐标快照 |
| `assets/runtime-review/lanhu-full-current-verify-snapshot.txt` | 订单核销元素坐标快照 |
| `assets/runtime-review/lanhu-full-continue-current-snapshot.txt` | 当前订单核销元素坐标快照 |

## 总结论

当前实现不能按蓝湖视觉验收通过。主要问题不是细节字号，而是 P0 级结构偏差：

1. 活动中心卡片被 FAB 主动缩窄，列表宽度明显不符合蓝湖。
2. 活动中心多出了蓝湖没有的视图切换按钮，挤压搜索区域。
3. 活动发布 Step 1 进入时会沿用滚动位置，步骤条和顶部表单可被滚出视口。
4. 活动发布 Step 1 富文本区域和底部操作存在遮挡风险。
5. 订单核销基础态与蓝湖结构不一致：当前是 3 条列表 + 3 个全宽按钮，蓝湖是 `已核销（23）` + 多张卡片 + 居中扫码胶囊入口。
6. 规格包里的蓝湖页面映射存在反向风险，必须先修正再让 Claude Code 继续按规格实现。

## P0 阻塞问题

### LFC-P0-001 活动中心卡片宽度被 FAB 缩窄

影响页面：

- `activity-center-search-input`
- `activity-center-search-result`
- `activity-center-filter-selected`
- `audit-pending`
- `audit-rejected`

蓝湖期望：

- 设计稿画布宽度为 750。
- 活动卡片主体横向为 `x=30, width=690`。
- 折算到当前 430 宽运行视口，卡片应约为 `x=17, width=396`。

当前运行态：

- `lanhu-full-current-activity-snapshot.txt` 显示活动卡片为 `pos=[17,220] size=[298x130]`。
- 卡片内容区只有 `width=159`，导致标题、时间和原因都被压缩，用户截图中的“活动项宽度异常”属实。
- FAB 自身为 `pos=[309,720] size=[87x87]`，它不是只覆盖在列表上方，而是通过样式让卡片主动让出右侧空间。

代码定位：

- `src/pages/user-sub/organizer/activities/index.tsx:71` 给卡片加了 `fab-visible`。
- `src/pages/user-sub/organizer/activities/index.tsx:221` 控制 `showFAB`。
- `src/pages/user-sub/organizer/index.scss:491` 至 `:493`：`.activity-item-card.fab-visible { margin-right: 172rpx; }`。

修改建议：

1. 删除或禁用 `.activity-item-card.fab-visible { margin-right: 172rpx; }`，卡片必须恢复到 690rpx 设计宽度。
2. FAB 不能通过缩窄卡片来避让，应通过底部安全区、层级或显示条件处理。
3. 卡片右侧箭头、状态、拒绝原因必须在完整卡片宽度内布局。

验收标准：

- 活动卡片在 430 宽运行视口下接近 `x=17, width=396`。
- 活动标题、状态、时间、拒绝原因不被压缩到 159px 宽。
- 审核未通过卡片的原因文本和右侧箭头完整可见。

### LFC-P0-002 活动中心工具条与蓝湖不一致

影响页面：

- `activity-center-empty`
- `activity-center-search-input`
- `activity-center-search-result`
- `activity-center-filter-panel`

蓝湖期望：

- 顶部 tab 下是筛选入口 + 搜索框。
- 蓝湖活动中心列表态没有右侧“网格/列表”视图切换组。
- FAB 是设计稿中的新增入口，但不应挤压搜索框和列表卡片。

当前运行态：

- `lanhu-full-current-activity-snapshot.txt` 显示：
  - 筛选按钮 `x=17 width=40`。
  - 搜索框 `x=68 width=248`。
  - 额外视图切换组 `x=327 width=86`。
- 额外视图切换组占用了蓝湖中应属于搜索区域或留白的空间。

代码定位：

- `src/pages/user-sub/organizer/activities/index.tsx:256` 至 `:269` 渲染 `view-toggle-group`。

修改建议：

1. 第一轮按蓝湖还原时移除或隐藏 `view-toggle-group`。
2. 如果产品坚持保留视图切换，需要在规格包里单独标记为产品新增功能，不应混入蓝湖还原验收。
3. 搜索框宽度按蓝湖恢复，不允许被额外控件挤压。

验收标准：

- 活动中心“我的活动”工具条只保留蓝湖中存在的筛选入口和搜索框。
- 搜索框宽度与蓝湖比例一致，不出现右侧额外切换控件。

### LFC-P0-003 活动发布向导进入/切换步骤未回到顶部

影响页面：

- `activity-create-info`
- `activity-create-venue-setting`
- `activity-create-upload-poster`
- `activity-create-ticket-config`

蓝湖期望：

- 进入任意发布步骤时，首屏顶部必须看到导航栏、5 步步骤条和当前步骤顶部字段。
- Step 1 蓝湖中步骤条位于导航下方，表单从“活动名称”开始。

当前运行态：

- `lanhu-full-current-create1-snapshot.txt` 显示步骤条为 `pos=[17,-294] size=[396x73]`。
- “活动名称”“分享标题”等字段也处在负坐标区域，说明页面进入发布向导时沿用了旧滚动位置。
- 用户截图中 Step 1 顶部正常但底部被遮挡，说明该问题在不同进入路径下表现不稳定：有时顶部被裁，有时底部区域被遮挡。

代码定位：

- `src/pages/user-sub/organizer/index.tsx:1408` 至 `:1439`：`renderCreateWizard` 使用同一个 `ScrollView`。
- 当前 `key={`wizard-step-${wizardStep}`}` 不足以保证微信端滚动位置重置。

修改建议：

1. 对 wizard `ScrollView` 使用受控 `scrollTop`，进入向导和切换 `wizardStep` 时强制回到 0。
2. 或使用 `scrollIntoView` 指向步骤条顶部锚点。
3. `下一步`、`上一步`、从首页/活动中心进入发布流程时都必须走同一套滚动重置逻辑。

验收标准：

- 从活动中心点击新增活动进入 Step 1，首屏必须看到步骤条和“活动名称”。
- 从 Step 1 到 Step 2/3/4，首屏必须看到步骤条和当前步骤第一组字段。
- 快照中步骤条 top 不得为负值。

### LFC-P0-004 活动发布 Step 1 富文本与底部操作存在遮挡

影响页面：

- `activity-create-info`

蓝湖期望：

- Step 1 表单中“活动概要”富文本编辑器完整展示。
- `下一步` 在内容流下方，不遮挡富文本编辑器。
- 底部 safe area 只用于避开系统底栏，不应形成覆盖层。

当前运行态：

- 用户截图显示富文本编辑器底部被遮挡，并用红框标注“有遮挡”。
- `lanhu-full-current-create1-snapshot.txt` 中 `button "下一步"` 为 `pos=[37,654] size=[356x59]`，后方还有 `pos=[17,713] size=[396x206]` 的安全区或底部区域；不同滚动位置下容易让底部区域覆盖或挤压编辑器。

代码定位：

- `src/pages/user-sub/organizer/index.tsx:1417` 至 `:1438`：wizard footer 和 safe bottom 都在同一 ScrollView 内。
- `src/pages/user-sub/organizer/index.scss:884` 至 `:886`：wizard scroll padding。
- `src/pages/user-sub/organizer/index.scss:1384` 至 `:1432`：wizard footer/preview 样式。

修改建议：

1. `下一步`应保持在内容流中，不能悬浮覆盖富文本。
2. 富文本编辑器底部需要明确最小高度和下边距，避免被 footer 或系统底栏遮住。
3. Step 2/3/4 中如果存在“预览”按钮，也不能复用活动中心 FAB 的浮层形态压住表单、地图、上传区域或下一步按钮。

验收标准：

- Step 1 滚动到底部时，富文本最后一行、工具栏、`下一步`都完整可见。
- 任何红色预览/FAB/安全区都不覆盖编辑器和按钮。

### LFC-P0-005 订单核销基础态与蓝湖不一致

影响页面：

- `verify-ticket`
- `verify-success`
- `verify-failed`
- `verify-invalid-code`

蓝湖期望：

- 页面标题：`订单核销`。
- 列表标题：`已核销（23）`，右侧 `查看更多`。
- 卡片宽度：画布 `x=30, width=690`，折算当前 430 视口约为 `x=17, width=396`。
- 基础态展示多张核销卡片。
- 扫码入口是居中的红色胶囊/扫码区域，蓝湖基础态中没有 3 个全宽文字按钮。
- 核销成功态是居中弹窗，包含 `核销成功`、票券卡、白色 `继续核销` 和 `取消`。

当前运行态：

- `lanhu-full-continue-current-snapshot.txt` 显示：
  - `已核销（3）`，不是蓝湖基础态的 `已核销（23）`。
  - 只渲染 3 张卡片。
  - 底部存在 3 个全宽按钮：`扫码核销`、`手动输入验证券码`、`添加核销员`。
- 用户截图中“订单核销页面与蓝湖设计稿不一致”属实。当前实现更像功能入口页，不是蓝湖基础视觉。

代码定位：

- `src/pages/user-sub/organizer/verify/index.scss:201` 至 `:220`：扫码区域。
- `src/pages/user-sub/organizer/verify/index.scss:232` 至 `:250`：手动按钮样式。
- 需要继续在 `src/pages/user-sub/organizer/verify/index.tsx` 中定位三个全宽按钮的渲染位置。

修改建议：

1. 基础态应先按蓝湖恢复为卡片列表 + 居中扫码胶囊入口。
2. `手动输入验证券码` 和 `添加核销员` 如果保留，应作为次级入口或弹窗状态，不应在基础态以三个全宽按钮堆叠展示。
3. mock-first 阶段可保留点击行为，但视觉层级必须按蓝湖。
4. mock 数据数量可以不真实等于 23，但视觉计数和列表密度需要与蓝湖验收口径一致；如果产品不接受固定视觉计数，应在规格中明确“计数来自 mock 数据”。

验收标准：

- 基础态不再显示三个全宽堆叠按钮。
- 扫码入口尺寸和位置接近蓝湖：画布宽 `483`、居中，折算 430 视口约为 `277px` 宽。
- 核销成功弹窗与蓝湖 index 10 的层级和按钮形态一致。

### LFC-P0-006 规格包页面映射错误会继续误导实现

影响文件：

- `docs/lanhu-admin-spec/page-map.md`
- `docs/lanhu-admin-spec/admin-pages/admin-home-empty.json`
- `docs/lanhu-admin-spec/admin-pages/activity-create-info.json`
- `docs/lanhu-admin-spec/admin-pages/admin-home-empty.md`
- `docs/lanhu-admin-spec/admin-pages/activity-create-info.md`

蓝湖复核结论：

- 蓝湖索引 30，页面名“管理后台（派对/活动）”，实际画面是活动发布 Step 1。
- 蓝湖索引 36，页面名“一屏幕显”，实际画面是后台首页一屏态。

当前规格风险：

- `page-map.md` 将“管理后台（派对/活动）”推荐为 home。
- `page-map.md` 将“一屏幕显”推荐为 `createWizard:step1`。
- 这个映射与本轮蓝湖视觉复核相反。

修改建议：

1. 先修正规格包映射，再交给 Claude Code 做下一轮编码。
2. 文件名可以继续用现有语义名，但必须在 JSON/MD 内标注原始蓝湖名、蓝湖索引、实际视觉内容。
3. 后续实现时以“实际视觉内容”优先，不要只看蓝湖页面标题。

验收标准：

- `admin-home-empty/listed` 指向真正的后台首页设计。
- `activity-create-info` 指向真正的 Step 1 设计。
- Claude Code 不再把 Step 1 当后台首页或把首页当 Step 1。

## 全量页面复核结果

| 规格页 | 当前结论 | 优先级 | 修改意见 |
| --- | --- | --- | --- |
| `admin-home-empty` | 部分通过 | P1 | 先修正蓝湖映射。空态首页的活动卡、统计、快速配置结构接近蓝湖，但数据 `0.00/0/1` 与设计值需按 mock 口径确认。 |
| `admin-home-listed` | 部分通过 | P1 | 列表宽度和统计区域接近蓝湖，需继续确认首页快捷入口数量和底栏图标。 |
| `activity-center-empty` | 有结构偏差 | P0 | 工具条多余视图切换；空态新增按钮需确认位置；FAB 不应影响布局。 |
| `activity-center-search-input` | 有结构偏差 | P0 | 搜索框被右侧 view toggle 挤压，需按蓝湖恢复。 |
| `activity-center-search-result` | 有严重宽度偏差 | P0 | 卡片被压缩到 298px，必须恢复到约 396px。 |
| `activity-center-filter-panel` | 可继续优化 | P1 | 面板结构接近蓝湖，但“重制/重置”与蓝湖文案存在冲突，需产品确认最终文案。 |
| `activity-center-filter-selected` | 受卡片宽度问题影响 | P0 | 筛选回显后的列表仍必须先修复卡片宽度。 |
| `activity-center-date-filter` | 需复核 | P1 | 日期弹层和筛选面板层级需按蓝湖重新截图比对，当前主要风险是工具条和列表底层偏差。 |
| `activity-create-info` | 有遮挡和滚动风险 | P0 | 必须修复滚动复位、富文本底部遮挡、底部按钮布局。 |
| `activity-create-venue-setting` | 需跟随向导修复 | P1 | Step 2 蓝湖无红色浮动预览按钮；地图和底部按钮需在滚动复位后复查。 |
| `activity-create-upload-poster` | 需跟随向导修复 | P1 | 上传态、删除/替换、底部按钮是否被遮挡需重新截图。 |
| `activity-create-ticket-config` | 需跟随向导修复 | P1 | 票券表单、启用状态、下一步/上一步/预览组合需按蓝湖复查。 |
| `add-verifier` | 未发现用户截图中的 P0 问题 | P2 | 本轮没有重新精查，需后续按蓝湖 index 8 单独截图对比。 |
| `verify-ticket` | 与蓝湖基础态不一致 | P0 | 恢复卡片列表 + 居中扫码胶囊入口；移除基础态三个全宽按钮。 |
| `verify-success` | 弹窗接近但基础层不对 | P1 | 弹窗可参考蓝湖 index 10，但底层基础态必须先修复。 |
| `verify-failed` | 需单独复核 | P1 | 失败弹窗状态应与 success 共用弹窗规格，错误文案和按钮需对齐蓝湖。 |
| `verify-invalid-code` | 需单独复核 | P1 | 无效码弹窗文案和按钮需按蓝湖失败态确认。 |
| `account-withdrawal-info` | 本轮未发现 P0 | P2 | 后台账户/提现不是用户截图问题，本轮只列为后续轻量检查。 |
| `account-withdrawal-edit` | 本轮未发现 P0 | P2 | 表单字段和弹窗层级仍需按蓝湖单独验收。 |
| `audit-pending` | 受活动卡片宽度影响 | P0 | 卡片宽度修复后再验收状态色和文案。 |
| `audit-rejected` | 受活动卡片宽度和 FAB 影响 | P0 | 拒绝原因、编辑入口、箭头不能被压缩或遮挡。 |

## 建议修复顺序

1. 先修正规格包映射：`page-map.md` 和相关 `admin-pages` 的实际视觉内容说明。
2. 修复活动中心卡片宽度：移除 `fab-visible` 缩窄逻辑，恢复 690rpx 卡片。
3. 移除或隐藏活动中心右侧视图切换组，恢复蓝湖工具条。
4. 调整 FAB：尺寸、位置、显示条件按蓝湖，不允许挤压卡片。
5. 修复发布向导滚动复位和富文本/底部按钮遮挡。
6. 修复订单核销基础态：卡片列表 + 居中扫码胶囊，不展示三个全宽按钮。
7. 重新用微信开发者工具截图：活动中心列表、Step 1、Step 2、订单核销基础态、核销成功弹窗。

## 给 Claude Code 的执行提示

下一轮不要直接进入 Batch 2。必须先做一次视觉债修复：

1. 阅读本文件。
2. 修正 `page-map.md` 和受影响的 `admin-pages` 规格映射，或至少在编码前明确实际设计内容。
3. 优先修复 `LFC-P0-001` 至 `LFC-P0-005`。
4. 不接真实后端，继续 mock-first。
5. 不改全局 request，不扩展非后台页面。
6. 每修完一个 P0 问题都要用微信开发者工具截图和快照验证。

## 禁止事项

- 不要用“设备宽度不同”解释活动中心卡片异常；快照已证明是代码主动缩窄。
- 不要把蓝湖页面标题当作唯一依据；必须看实际视觉内容。
- 不要为了保留新增功能牺牲蓝湖验收结构，额外功能必须标记为产品新增。
- 不要把三个全宽核销按钮作为蓝湖基础态。
- 不要用增加底部空白代替修复内容遮挡。
