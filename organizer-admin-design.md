# 管理后台视觉规格与实现交接文档

## 1. 文档目标

本文档用于交接给后续 Agent，实现 HYPER 小程序「管理后台（派对/活动）」页面。它不是产品需求摘要，而是面向实现的视觉规格、状态映射和验收依据。

设计图目录：

`/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/HYPER小程序`

当前代码目录：

`/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/src/pages/user-sub/organizer`

## 0. 2026-05-09 实机比对结论与修改计划

比对来源：

- 微信开发者工具：`pages/user-sub/organizer/index`，设备为 `iPhone 15 Pro Max 82%`。
- 蓝湖：`HYPER小程序` 项目下的 `管理后台（派对/活动）-存在上架活动状态 · 版本2`。
- 蓝湖代码页基准：微信小程序导出，页面为 `750rpx x 1624rpx`。

当前实际效果与设计稿最接近的是“存在上架活动状态”：首页展示 2 条已上架活动、活动数据和快速配置。主要偏差不在数据或结构，而在背景基准、纵向密度、卡片内容层级、底部导航高度和首屏裁切。

### 0.1 页面基准与背景

- 蓝湖页面背景是纯黑 `rgba(0,0,0,1)`，当前实现使用 `$organizer-bg: #0A0A0A`。
- 建议将管理后台页面主背景统一为 `#000000`，卡片仍使用深灰层级，例如 `#181818`、`#202322`。
- 修改位置：`src/pages/user-sub/organizer/index.scss` 中 `$organizer-bg`、`page`、`.organizer-page`。

### 0.2 首屏内容纵向位置

- 蓝湖代码页显示首屏内容容器 `.box_4` 约为 `padding: 141rpx 30rpx 1rpx 30rpx`，这是包含状态栏和原生导航区域后的整页坐标。
- 当前业务内容区已经由原生导航承接，不应直接照抄 `141rpx` 顶部 padding；应以业务内容在导航下的相对位置为准。
- 当前 `.organizer-scroll` 为 `padding: 40rpx 30rpx 190rpx`，实机首屏整体略偏下。
- 建议先将顶部 padding 从 `40rpx` 调整为 `30rpx`，保留 `30rpx` 左右边距。
- 修改位置：`src/pages/user-sub/organizer/index.scss` 的 `.organizer-scroll`。

### 0.3 已上架活动卡片

- 蓝湖活动卡片视觉规格：宽 `690rpx`，高约 `176rpx`，圆角 `12rpx`，封面 `136rpx x 136rpx`，左内边距约 `16rpx`。
- 当前 CSS 中 `.featured-activity-card`、`.featured-cover` 已基本对齐这些尺寸。
- 实机偏差是文本层级和密度：标题与时间文字偏松，封面存在加载时弱化或不明显的问题。
- 建议：
  - `.featured-title` 保持 `26rpx`，颜色使用弱白 `#A0A0A0`，字重 `500`。
  - `.featured-meta` 改为固定行高约 `36rpx`，避免 `line-height: 1.45` 在模拟器里撑高。
  - `.featured-content` gap 从 `8rpx` 视实际截图压到 `4rpx-6rpx`。
  - `.featured-cover` 保留 `aspectFill`，增加深色兜底背景，避免图片未加载时整块丢失视觉锚点。
- 修改位置：`src/pages/user-sub/organizer/index.scss` 与 `src/pages/user-sub/organizer/home/index.tsx`。

### 0.4 活动数据卡片

- 蓝湖活动数据卡片：宽 `690rpx`，高约 `210rpx`，数字约 `50rpx`，label 约 `26rpx`。
- 当前 `.stats-grid-card`、`.stats-number`、`.stats-label` 尺寸基本匹配。
- 实机偏差是数字与 label 的垂直位置略不稳定。
- 建议将 `.stats-cell` 从 flex 自适应改为固定定位：
  - 数字 top 约 `30rpx`。
  - label top 约 `116rpx`。
  - 保持三列等分，不新增分割线。
- 修改位置：`src/pages/user-sub/organizer/index.scss` 的 `.stats-grid-card`、`.stats-cell`、`.stats-number`、`.stats-label`。

### 0.5 快速配置区域

- 蓝湖“快速配置”在首屏下半部分，卡片宽 `690rpx`，单项高度约 `160rpx`，列表 gap 约 `20rpx`。
- 当前 `.quick-action-card` 为 `min-height: 162rpx`，高度接近；但实机中第三项更早被底栏遮挡。
- 建议：
  - `.quick-action-card` 保持 `162rpx` 左右，不优先压缩卡片高度。
  - `.quick-icon-box` 从 `105rpx x 105rpx` 调为 `96rpx x 96rpx`，更接近蓝湖视觉。
  - `.organizer-section` 默认 `margin-bottom: 40rpx` 可微调为 `36rpx`，重点先修底栏高度。
- 修改位置：`src/pages/user-sub/organizer/index.scss` 的 `.quick-action-card`、`.quick-icon-box`、`.organizer-section`。

### 0.6 底部导航

- 当前 `.dashboard-bottom-nav` 高度为 `calc(174rpx + env(safe-area-inset-bottom))`，实机偏高。
- 蓝湖底栏视觉高度约 `112rpx-120rpx` 加安全区；旧文档也记录为约 `87px`，即 `174rpx`，但微信开发者工具里的实际渲染显示该值会造成首屏遮挡感过强。
- 建议按实机优先修正：
  - `height` 调为 `calc(118rpx + env(safe-area-inset-bottom))`。
  - `padding` 调为 `10rpx 30rpx calc(env(safe-area-inset-bottom) + 18rpx)`。
  - `.organizer-scroll` 底部 padding 配套改为 `calc(150rpx + env(safe-area-inset-bottom))`。
- 修改位置：`src/pages/user-sub/organizer/index.scss` 的 `.dashboard-bottom-nav`、`.organizer-scroll`。

### 0.7 底栏图标

- 蓝湖底栏图标为线性自定义 icon，当前用 `taro-ui` 的 `AtIcon`：`home / map-pin / menu / user`。
- 形态差异属于像素级偏差，尤其“活动”“更多”与设计稿不一致。
- 若追求最终像素一致，应切换为项目 iconfont 码点或已有图标系统，而不是继续依赖 `AtIcon`。
- 修改位置：`src/pages/user-sub/organizer/constants.ts` 和 `src/pages/user-sub/organizer/index.tsx` 的底栏渲染。

### 0.8 首轮验收标准

在微信开发者工具 `iPhone 15 Pro Max 82%` 下，首页有上架活动状态应满足：

- 页面背景接近蓝湖纯黑，卡片深灰层级清晰。
- `已上架活动` 区完整显示 2 张活动卡，卡片宽度与左右边距稳定。
- `活动数据` 卡完整显示，三列数字和 label 垂直位置一致。
- `快速配置` 至少完整显示 `发布活动` 与 `添加核销员` 两项，第三项顶部可露出，但不能被过高底栏强遮挡。
- 底栏高度与蓝湖接近，图标和文案不挤压，安全区留白不过量。

## 0.9 2026-05-10 完整逐图像素级交付评审

本节覆盖蓝湖左侧搜索 `管理后台` 后出现的全部 22 张管理后台画板，并按当前实现路径核对：

- 首页与底部后台 tab：`src/pages/user-sub/organizer/home/index.tsx`、`src/pages/user-sub/organizer/index.tsx`、`src/pages/user-sub/organizer/index.scss`。
- 活动中心、搜索、筛选、时间筛选：`src/pages/user-sub/organizer/activities/index.tsx`、`src/pages/user-sub/organizer/index.tsx`、`src/pages/user-sub/organizer/index.scss`。
- 活动发布 1-5 步：`src/pages/user-sub/organizer/index.tsx` 中 `renderStepOne` 到 `renderStepFive`，以及 `index.scss` 的 Wizard、Form、Upload、Ticket、Calendar 样式。

### 0.9.1 全局阻断项

这些问题会影响多张图，必须先改，否则逐页微调没有意义：

1. `createWizard` 仍渲染后台底部 tab。
   - 当前：`src/pages/user-sub/organizer/index.tsx` 底部条件为 `dashboardView !== 'nonMerchant'`。
   - 设计：发布流程 1-5 步均没有 `首页/活动/更多/账户` 底栏。
   - 修改：改为 `dashboardView !== 'nonMerchant' && dashboardView !== 'createWizard'`。
   - 影响画板：`活动中心-搜索回显.png`、`活动发布场地设定.png`、`活动发布上传海报.png`、`活动发布票券配置.png`、`活动中心-搜索回显(1).png`。

2. 发布流程不能继续复用后台首页的 `.organizer-scroll` 密度。
   - 当前：`renderCreateWizard` 使用 `className="organizer-scroll wizard-scroll"`，继承首页 `padding: 30rpx 30rpx calc(150rpx + safe-area)`。
   - 设计：发布流程内容从导航栏后紧接 stepper，首段内容距顶部更小；底部操作随内容滚动，不为后台 tab 额外让位。
   - 修改：为 `.wizard-scroll` 覆盖 `padding: 28rpx 30rpx calc(env(safe-area-inset-bottom) + 60rpx)`，隐藏后台 tab 后再按实机微调。

3. 活动中心筛选和时间筛选的层级关系不对。
   - 当前：`calendar-overlay` 是全屏 overlay，日期面板浮在页面上；筛选面板本身仍是普通卡片。
   - 设计：时间筛选是筛选面板内的二级日期面板，后台底部 tab 在日期面板打开时不可见。
   - 修改：`calendarTarget === 'filter'` 时使用活动中心专属日期面板，不复用发布流程日期弹层。

4. 底部 icon 体系不一致。
   - 当前：后台 tab 和发布流程内多个地方使用 `AtIcon`。
   - 设计：蓝湖为项目线性 icon/自定义图标，`活动`、`更多`、`账户` 与 `AtIcon` 轮廓不同。
   - 修改：统一替换为项目 iconfont 码点或本地图标组件；仅保留尺寸与颜色由 CSS 控制。

### 0.9.2 首页组

#### A. `管理后台（派对／活动）.png`：首页空态长图

- 设计状态：无上架活动；空态卡、活动数据、完整快速配置列表。
- 当前实现：`OrganizerHomeView` 只有当 `publishedActivities.length === 0` 才进入空态，但 mock 默认有已上架活动，开发者工具不能直接切到空态。
- 差距：
  - 空态验收缺少稳定入口，应提供 debug mock 或状态切换，不能靠临时改数据。
  - `.featured-empty-card` 尺寸基本对，但 padding `68rpx 264rpx` 过硬，文字容器在不同机型上有挤压风险。
  - 快速配置第 4 项在长图中必须完整可滚动显示，目前底部 padding 与底栏高度曾叠加，需复测。
- 修改落点：
  - `mock.ts` 增加空态数据开关或 story fixture。
  - `.featured-empty-card` 使用固定 `height: 210rpx`、`padding: 0`、居中对齐。
  - 首页空态和有数据态都保留 `.organizer-scroll` 底部 `calc(150rpx + safe-area)`。
- 验收：iPhone 15 Pro Max 下空态卡高 `210rpx`，`暂无活动` 居中；滚动到底完整看到 `分销管理`。

#### B. `管理后台（派对／活动）-存在上架活动状态.png`：首页有上架活动

- 设计状态：2 张已上架活动卡 + 活动数据 + 快速配置。
- 当前实现：开发者工具当前可见此状态。
- 差距：
  - 活动卡图片和文本密度接近，但 `.featured-content` 仍偏松，meta 两行比蓝湖略低。
  - 卡片间距应稳定为 `20rpx`；旧文档写 `15px` 是设计稿 px 折算后的 CSS，代码中以 rpx 体现为 `20rpx`。
  - `快速配置` 第 3、4 项实际容易被底栏遮挡或显示不足，需要以滚动后的完整性验收。
- 修改落点：
  - `.featured-meta { line-height: 34rpx-36rpx; }`。
  - `.featured-content { gap: 4rpx-6rpx; }`。
  - `.quick-icon-box` 固定 `96rpx`，不要回到 `105rpx`。
- 验收：首屏完整显示 2 张活动卡和活动数据卡；快速配置至少完整显示前两项，向上滚动后 4 项完整。

#### C. `管理后台（派对／活动）-一屏幕显.png`：首页首屏适配

- 设计状态：专门验证标准屏高度下底栏与内容关系。
- 当前实现：底栏已从 `174rpx` 降到 `118rpx`，但发布流程仍错误显示底栏。
- 差距：
  - 首页底栏高度接近，但 icon 仍是 `AtIcon`，视觉不像设计稿。
  - active 文案和 icon 颜色关系需复核，设计里 active 文案偏灰、icon 白。
- 修改落点：
  - `.dashboard-bottom-item .at-icon` 替换为 iconfont 后统一 `46rpx` 视觉尺寸。
  - `.dashboard-bottom-item.active Text` 保持 `#8A8A8A`，active icon `#FFFFFF`。
- 验收：底栏高约 `118rpx + safe-area`；home indicator 上方留白不过量。

### 0.9.3 活动中心列表与搜索组

#### D. `管理后台（派对／活动）-活动中心（空态）.png`

- 设计状态：活动中心空列表，中央 `暂无活动` + 红色 `新增活动`。
- 当前实现：`renderActivityList` 有空态，但 mock 默认有数据，缺少稳定入口。
- 差距：
  - `.empty-activities { min-height: 800rpx; }` 粗略居中，未按剩余可视区精确居中。
  - 红色按钮 `160rpx x 64rpx` 符合设计，但按钮位置需避开底栏。
- 修改落点：
  - 给活动中心增加空态 fixture。
  - `.empty-activities` 改为 `height: calc(100vh - nav - topTabs - toolbar - bottomTab)` 的等效 flex 区域，或在 Taro 中用剩余 ScrollView 高度居中。
- 验收：按钮中心线在业务区中部，未被底栏压低。

#### E. `管理后台（派对／活动）-活动中心（活动状态）.png`

- 设计状态：多种审核/上下架状态列表。
- 当前实现：`getDisplayStatus` 和 mock 覆盖 published/pending/removed/rejected，但列表文案组合与设计仍不完全一致。
- 差距：
  - `DISPLAY_STATUS_MAP` 存在 `'rejected-*'` 但实际 key 为 `pending-up` 等，拒绝态依赖 `item.status === 'rejected'` 特判，可用但不清晰。
  - 活动卡中状态/时间行的优先级与设计稿不一致，设计强调状态列表，当前部分状态仍展示上架时间或空字符串。
  - 拒绝原因行可能导致卡片高度超过 `176rpx`，需要设计中对应卡片高度确认。
- 修改落点：
  - `activities/index.tsx` 将活动列表行拆成 `title / status / primaryTime / reason` 四个固定槽位。
  - `.activity-item-content` gap 调 `4rpx-6rpx`，卡片高度需要按最长拒绝态定稿。
- 验收：所有状态文案左边缘与标题对齐；拒绝原因不挤压箭头。

#### F. `管理后台（派对／活动）-活动中心（搜索输入状态）.png`

- 设计状态：搜索框 focus，键盘未弹。
- 当前实现：搜索框可输入，但未记录 focus 态 class。
- 差距：
  - 输入聚焦时搜索框不应改变尺寸；当前没有 focus 样式，视觉可接受但无法表达激活态。
  - 清空按钮缺失；蓝湖搜索输入状态里需要确认是否有清空按钮，当前只有 placeholder 和输入。
- 修改落点：
  - 给 `search-box` 增加 focus state，如 `search-focused`，只调整边框/光标，不改尺寸。
  - 如果蓝湖输入态有清除 icon，`activities/index.tsx` 在 `activityKeyword` 非空时渲染右侧清除按钮。
- 验收：focus 前后 `.toolbar-row` 高度不跳。

#### G. `管理后台（派对／活动）-活动中心（搜索键盘唤醒状态）.png`

- 设计状态：搜索输入 + 系统键盘。
- 当前实现：没有针对键盘高度处理；底部后台 tab fixed，键盘态可能仍在或与键盘冲突。
- 差距：
  - 蓝湖键盘态底部 tab 不可见；当前 fixed tab 可能继续显示在键盘上方或被遮挡。
  - ScrollView 未根据键盘收缩。
- 修改落点：
  - 搜索 input focus 时设置 `searchFocused`，隐藏 `.dashboard-bottom-nav` 或为活动中心传出键盘态。
  - 使用 Taro 键盘事件更新列表底部 padding。
- 验收：键盘打开时列表底部停在键盘上沿，不出现后台 tab。

#### H. `管理后台（派对／活动）-活动中心-搜索回显(2).png`

- 设计状态：搜索后只显示匹配活动，FAB 可见。
- 当前实现：`filteredActivities` 支持关键字过滤，FAB 始终可见。
- 差距：
  - 搜索回显没有独立空态和结果数量状态。
  - FAB 位置依赖 `bottom: safe + 96rpx + 118rpx`，需要在键盘态隐藏。
- 修改落点：
  - `floating-plus-button` 在 `searchFocused` 且键盘打开时隐藏。
  - 搜索无结果复用空态，但按钮文案仍为 `新增活动`。
- 验收：有结果时列表 top 不跳；FAB 右距 `60rpx`，直径 `152rpx`。

### 0.9.4 筛选与时间筛选组

#### I. `管理后台（派对／活动）-活动中心（筛选）.png`

- 设计状态：筛选面板默认，checkbox 全空。
- 当前实现：`filterPanelOpen` 打开卡片式筛选面板。
- 差距：
  - 面板宽 `690rpx`、padding 接近；但面板在 DOM 中位于 toolbar 后，ScrollView 外，底部空间与活动列表关系未完全对齐。
  - 文案 `重制` 是设计图原文还是 `重置` 需保持蓝湖；当前代码是 `重制`，与现有文档一致。
- 修改落点：
  - `.filter-panel` 上边距固定 `30rpx`，不要受 toolbar padding 影响。
  - 面板打开时列表区域应隐藏或下移，按蓝湖决定；当前面板和列表可能同时存在。
- 验收：面板底部按钮在标准屏内完整显示，不被底栏遮挡。

#### J. `管理后台（派对／活动）-活动中心（筛选选中）.png`

- 设计状态：checkbox 选中态。
- 当前实现：checkbox 选中为绿色块 + 文本勾。
- 差距：
  - 文本勾 `✓` 在小程序字体中可能偏移，不如设计线性勾稳定。
  - checkbox 尺寸 `28rpx` 正确，勾线需要换 icon 或 CSS 绘制。
- 修改落点：
  - `.filter-checkbox.checked::after` 用 CSS 画勾，移除 JSX 文本勾。
- 验收：勾居中，线宽约 `3rpx`，不随字体变化。

#### K. `管理后台（派对／活动）-活动中心-筛选回显.png`

- 设计状态：素材与搜索回显重复。
- 当前实现：应用筛选后只刷新列表，符合“不新增摘要条”的方向。
- 差距：
  - 筛选应用后没有验证列表是否与筛选条件匹配；mock 状态与筛选选项需覆盖所有组合。
- 修改落点：
  - 给 `mock.ts` 保留 draft/pending/approved + up/down/ended 的最小集合。
- 验收：应用筛选后不出现设计稿之外的条件摘要 UI。

#### L. `管理后台（派对／活动）-活动中心（重制回显）.png`

- 设计状态：筛选清空后回显。
- 当前实现：`resetFilter` 会清空并关闭面板。
- 差距：
  - 蓝湖重制回显可能仍停留在面板或列表恢复态；当前直接关闭面板，需要按画板确认。
- 修改落点：
  - 若设计为面板内清空态，`onResetFilter` 不应关闭面板，只清空 `filterState/appliedFilter`。
  - 若设计为列表恢复态，当前行为可保留。
- 验收：与对应画板保持同一层级，不要清空后跳转到首页或改变 tab。

#### M. `管理后台（派对／活动）-活动中心（时间筛选）.png`

- 设计状态：时间二级日期面板打开，未选日期。
- 当前实现：`renderCalendar` 是全屏 overlay，和设计层级不同。
- 差距：
  - 背后筛选面板标题和关闭区域的露出关系错误。
  - 日期面板背景、圆角和位置不按活动中心图。
  - 底部后台 tab 当前仍可能显示。
- 修改落点：
  - 新增 `renderFilterCalendar()`，只用于 `calendarTarget === 'filter'`。
  - 打开筛选日期时隐藏 `.dashboard-bottom-nav` 和 FAB。
- 验收：日期面板宽 `750rpx`，顶部位置与蓝湖一致，月份居中。

#### N. `管理后台（派对／活动）-活动中心（时间筛选-开始时间选择态）.png`

- 设计状态：开始日期选中。
- 当前实现：日期选中后 `.calendar-day.selected` 需要确认是否只改文字。
- 差距：
  - 当前 CSS 未在截取中看到完整 calendar 样式；如果有圆形背景，需要移除。
  - 设计选中仅文字 `#D8FF4F`，不画圆底。
- 修改落点：
  - `.calendar-day.selected` 只设置 `color: #D8FF4F; background: transparent;`。
- 验收：日期文字变黄绿，格子背景不变。

#### O. `管理后台（派对／活动）-活动中心（时间筛选-结束时间选择态）.png`

- 设计状态：结束日期选择中。
- 当前实现：`calendarSelectingEnd` 有状态，但 UI 没有明确开始/结束输入激活态。
- 差距：
  - 需要两个日期输入槽，分别显示开始和结束；当前只有一个 `filter-time-input`。
- 修改落点：
  - filter calendar 内部增加开始/结束两个输入显示行，不复用单输入。
- 验收：开始日期已填，结束 placeholder 为 `请选择日期`。

#### P. `管理后台（派对／活动）-活动中心（时间筛选-回显）.png`

- 设计状态：完整时间范围写回筛选面板。
- 当前实现：显示 `${calendarStart} · ${calendarEnd}`，格式为 `YYYY-MM-DD`。
- 差距：
  - 蓝湖部分图使用 `2026-04-10 · 2026-04-10`，部分选择态使用 `2026-4-10`，需要按面板回显统一两位月日。
- 修改落点：
  - 增加 `formatDisplayDate`，回显态两位月日，选择态按蓝湖决定。
- 验收：清空再选择不会残留旧 endAt。

#### Q. `管理后台（派对／活动）-活动中心（时间筛选-清空态）.png`

- 设计状态：清空日期。
- 当前实现：`clearCalendar` 只清空面板内部，不清空已应用筛选；`resetFilter` 才清空应用态。
- 差距：
  - 时间面板的 `清空` 应同时清空当前输入槽；是否立即影响应用态由蓝湖交互决定。
- 修改落点：
  - `clearCalendar` 同步清空 `filterState.startAt/endAt`，但不改 `appliedFilter`，直到点应用。
- 验收：清空后 placeholder 恢复，列表不提前刷新。

### 0.9.5 发布流程组

#### R. `管理后台（派对／活动）-活动中心-搜索回显.png`：发布第 1 步活动信息

- 设计状态：活动信息表单。
- 当前实现：开发者工具当前可见第 1 步。
- 差距：
  - 最大问题是后台底部 tab 仍显示，设计没有。
  - stepper 与蓝湖相比偏高、方块偏圆、连线位置略低。
  - 输入框/卡片样式接近，但字段整体纵向间距偏大，首屏露出内容比设计少。
  - 富文本工具栏当前只是少量 `AtIcon`，设计为更完整的编辑工具条。
- 修改落点：
  - 隐藏 createWizard 底栏。
  - `.wizard-step-dot` 改 `56rpx` 或按设计 `62rpx` 精确复测；圆角 `8rpx`。
  - `.wizard-section { gap: 28rpx; }`，`.field-block { gap: 20rpx; }` 保持，不再额外叠加。
  - `editor-toolbar` 补齐设计图中的图标数量和排列。
- 验收：第 1 步首屏底部不出现后台 tab；活动概要工具栏位置与蓝湖一致。

#### S. `管理后台（派对／活动）-活动中心-活动发布场地设定.png`：发布第 2 步场地设定

- 设计状态：地区、当前坐标地址、地图。
- 当前实现：`renderStepTwo` 有 CSS mock 地图。
- 差距：
  - 地图 mock 是抽象网格，不接近蓝湖地图真实密度；若蓝湖用地图截图，应优先用实际 map 组件或更真实静态背景。
  - `handleChooseDistrict` 使用 action sheet，设计只是下拉视觉；交互可接受但视觉缺少下拉展开态。
  - 地址字段默认 `天府三街`，设计图若为空态或具体地址不同，需要 fixture 对齐。
- 修改落点：
  - `.map-mock-card` 高度保持 `800rpx`，但背景改为真实地图样式或腾讯/高德地图组件截图。
  - `district/address` fixture 按蓝湖值设置。
- 验收：地图区域宽 `690rpx`、高 `800rpx`，pin 位置偏下居中。

#### T. `管理后台（派对／活动）-活动中心-活动发布上传海报.png`：发布第 3 步上传海报

- 设计状态：4 个上传框长页。
- 当前实现：`renderStepThree` 遍历 `posterSlots`，结构基本齐。
- 差距：
  - 上传框高度 `235rpx` 正确，但文案与蓝湖有空格/标点差异。
  - 上传按钮 `128rpx x 52rpx` 正确，但按钮与说明之间的垂直间距需和图保持 `20rpx`。
  - 若底部后台 tab 未隐藏，长页底部按钮与 tab 冲突。
- 修改落点：
  - `mock.ts` 中 `organizerPosterSlots.helper` 文案完全按蓝湖。
  - 隐藏 createWizard 底栏后重测滚动到底按钮位置。
- 验收：4 个上传块顺序、文案和高度一致；底部 `上一步/下一步` 完整。

#### U. `管理后台（派对／活动）-活动中心-活动发布票券配置.png`：发布第 4 步票券配置

- 设计状态：规格配置卡 + 两张规格详情卡长页。
- 当前实现：`renderStepFour` 有对应结构，但视觉差距最大。
- 差距：
  - 后台底部 tab 错误显示。
  - `.ticket-config-card` 和 `.ticket-detail-card` 仍带通用边框 `1rpx rgba(...)`，蓝湖卡片主要靠背景层级，无明显描边。
  - chip 两列布局接近，但 `gap: 14rpx` 偏小；设计约 `20rpx`。
  - 详情卡字段当前用半宽 `ticket-grid`，设计是 label 左、输入右的纵向行布局。
  - 价格行缺少独立 `¥` 前缀位置；当前数字输入没有货币槽位。
  - header 右侧 `启用/禁用` 文本缺失，只显示 switch。
- 修改落点：
  - `renderStepFour` 详情卡改为 `ticket-detail-row` 列表，不用 `.field-block.half` 两列。
  - 增加 `Text className="ticket-currency">¥</Text>`。
  - `.ticket-config-card,.ticket-detail-card { border: none; border-radius: 12rpx; background: #242424; }`。
  - `.ticket-chip-list { gap: 20rpx; }`。
  - header 加 `启用/禁用` 文案。
- 验收：第 4 步首屏能看到规格配置卡和规格详情标题；向下滚动两张详情卡字段行完全一致。

#### V. `管理后台（派对／活动）-活动中心-搜索回显(1).png`：发布第 5 步活动资质

- 设计状态：活动批文资质选填上传框，提交审核。
- 当前实现：`renderStepFive` 有上传框和提交审核按钮。
- 差距：
  - 上传框 `.qualification` 高 `320rpx` 正确，但文案是一整段，蓝湖要求模板名链接单独高亮。
  - 提交审核按钮若底栏仍显示会被挤压。
- 修改落点：
  - `renderStepFive` 将说明拆成多段 Text，`《活动批文资质模板》` 单独使用蓝色链接样式。
  - `.upload-shell.qualification` 内部行高固定，避免长文案溢出。
- 验收：第 5 步 stepper 前 4 步勾选，第 5 步 active；底部按钮无后台 tab 干扰。

### 0.9.6 交付顺序建议

1. 先修 `createWizard` 隐藏后台底栏、发布流程滚动 padding、stepper 尺寸。
2. 再修第 4 步票券配置，因为当前与蓝湖差距最大，且能暴露 form/card/button 的通用问题。
3. 再修活动中心筛选/时间筛选，重点是日期面板层级和键盘态。
4. 最后修首页和活动列表的细节，包括 iconfont、图片兜底、状态行密度。

实现原则：

- 保留现有 `index.tsx + home + activities + more + account + constants + types + mock + index.scss` 结构。
- 不新增小程序路由，继续在 `pages/user-sub/organizer/index` 内用 state 切换子视图。
- 不做后端真实联调；接口缺失处使用 service wrapper + mock fallback。
- 视觉以 22 张 PNG 为准，不能只做功能相似。

## 2. 坐标与换算体系

所有设计图宽度均为 `1500px`，对应实现中的 CSS viewport 宽度 `375px`，即 `375px @4x` 设计稿。

换算规则：

- `1 设计稿 px = 0.25 CSS px`
- `1 CSS px = 4 设计稿 px`
- 实现尺寸统一使用 CSS `px`，从设计稿量取的 px 数值除以 4。
- 示例：设计稿左右边距 `60px` -> `15px`；卡片宽 `1380px` -> `345px`；底部 tab 高约 `348px` -> `87px`。

全局结构：

- 设计图包含微信状态栏和原生导航栏。代码中 `src/pages/user-sub/organizer/index.config.ts` 已使用原生导航栏：
  - `navigationBarBackgroundColor: '#14131A'`
  - `navigationBarTextStyle: 'white'`
  - `navigationBarTitleText: '管理后台'`
  - `disableScroll: true`
- 业务内容区域从原生导航栏下方开始，设计图中从 `y=370px` 开始，即实现中页面内容顶端视作 `0px`。
- 业务内容左右外边距统一 `15px`，活动中心工具栏等横向内距 `12px`，最终内容宽度 `345px`。
- 底部管理后台 tab 固定在屏幕底部，高度 `calc(87px + env(safe-area-inset-bottom))`，内容滚动区底部 padding `95px`。

页面高度参考：

- 标准屏：`1500 x 3248`，对应 `375px x 812px`。
- 首页长图：`1500 x 3684`，对应 `375px x 921px`。
- 活动信息长图：`1500 x 4422`，对应 `375px x 1105.5px`。
- 上传海报长图：`1500 x 3866`，对应 `375px x 966.5px`。
- 票券配置长图：`1500 x 5878`，对应 `375px x 1469.5px`。

## 3. 设计 Token

### 3.1 颜色

使用以下 token，不要临时凭感觉取色：

```scss
$organizer-bg: #0A0A0A;
$organizer-nav: #14131A;
$organizer-card: #181818;
$organizer-card-2: #202322;
$organizer-panel: #242424;
$organizer-input: #050505;
$organizer-border: #8A8A8A;
$organizer-border-soft: rgba(255, 255, 255, 0.10);
$organizer-text: #FFFFFF;
$organizer-text-secondary: #A0A0A0;
$organizer-text-muted: #747474;
$organizer-text-disabled: #5E5E5E;
$organizer-danger: #FF3150;
$organizer-danger-2: #FF405A;
$organizer-success: #35D34A;
$organizer-calendar-active: #D8FF4F;
$organizer-white-button: #FFFFFF;
$organizer-gray-button: #5A5A5A;
$organizer-bottom-tab: #191919;
```

实际现有代码已有接近值，例如 `#0A0A0A`、`#181818`、`#202322`、`#ff2040`。后续实现可统一到上方 token。

### 3.2 字体

小程序默认系统字体即可，不引入新字体。

设计图中的字号按 `1500px -> 375px` 折算：

- 页面标题 `管理后台`：原生导航栏控制，不在业务页面内重绘。
- 大 section 标题，如 `已上架活动`、`活动数据`、`快速配置`：`14px`，`font-weight: 600`。
- 顶部活动中心 tab：`14px`，active 为 `600`，inactive 为 `400`。
- 卡片主标题：`13px`，`font-weight: 500`。
- 卡片说明、时间、辅助文本：`13px`，`font-weight: 400`。
- 大数字，如首页数据 `8213 / 43 / 72`：`25px`，`font-weight: 700`。
- 表单 label，如 `活动名称`：`14px`，`font-weight: 600`。
- 表单输入文字：`14px`。
- 底部 tab 文案：`12px`。

行高：

- 标题行高：`1.35`
- 卡片说明行高：`1.45`
- 多行说明：`1.6`

### 3.3 圆角、边框、阴影

- 大卡片圆角：`6px`。
- 活动中心搜索框、筛选按钮：`8px`。
- 表单输入框：`8px`。
- 上传框：`7px`，虚线边框。
- 票券 chip：`6px`。
- 主按钮圆角：胶囊按钮用 `999px`；矩形按钮用 `8px`。
- 边框：浅灰 `0.5px solid #8A8A8A`；弱边框使用 `0.5px solid rgba(255,255,255,0.18)`。
- 页面不使用强阴影；卡片主要靠深浅层级区分。

## 4. 设计图状态映射

必须按下面映射实现，旧文档中将 3 张 `搜索回显` 全部归为搜索状态是错误的。

| 文件名 | 实际状态 | 实现目标 |
| --- | --- | --- |
| `管理后台（派对／活动）.png` | 首页空态长图 | 首页无上架活动，展示空活动卡、数据卡、快速配置完整列表 |
| `管理后台（派对／活动）-存在上架活动状态.png` | 首页有上架活动 | 首页展示 2 条上架活动卡和数据卡 |
| `管理后台（派对／活动）-一屏幕显.png` | 首页首屏适配 | 验证标准屏内底部 tab、卡片和快速配置不互相遮挡 |
| `管理后台（派对／活动）-活动中心（空态）.png` | 活动中心空态 | 我的活动为空，展示 `暂无活动` 和红色 `新增活动` |
| `管理后台（派对／活动）-活动中心（活动状态）.png` | 活动中心多状态列表 | 展示不同审核/上下架状态的活动列表 |
| `管理后台（派对／活动）-活动中心（搜索输入状态）.png` | 搜索框 focus | 搜索框激活，保留筛选按钮 |
| `管理后台（派对／活动）-活动中心（搜索键盘唤醒状态）.png` | 搜索 + 键盘 | 输入聚焦时内容高度适配键盘 |
| `管理后台（派对／活动）-活动中心-搜索回显(2).png` | 搜索结果回显 | 搜索后只显示匹配活动，右下红色 FAB 可见 |
| `管理后台（派对／活动）-活动中心（筛选）.png` | 筛选面板默认 | 面板未选中，checkbox 全空 |
| `管理后台（派对／活动）-活动中心（筛选选中）.png` | 筛选面板选中 | checkbox 绿色勾选态 |
| `管理后台（派对／活动）-活动中心-筛选回显.png` | 重复素材：与 `搜索回显(2).png` 像素一致 | 当前未提供独立筛选摘要态；实现筛选应用后只刷新列表，不新增 PNG 中不存在的摘要 UI |
| `管理后台（派对／活动）-活动中心（重制回显）.png` | 重制后回显 | 筛选条件清空，面板或列表恢复默认 |
| `管理后台（派对／活动）-活动中心（时间筛选）.png` | 时间筛选默认 | 时间输入框未选中，日历面板打开 |
| `管理后台（派对／活动）-活动中心（时间筛选-开始时间选择态）.png` | 已选开始 | 开始日期高亮，结束为空 |
| `管理后台（派对／活动）-活动中心（时间筛选-结束时间选择态）.png` | 选择结束 | 范围结束选择态 |
| `管理后台（派对／活动）-活动中心（时间筛选-回显）.png` | 时间范围回显 | 输入框展示开始到结束时间 |
| `管理后台（派对／活动）-活动中心（时间筛选-清空态）.png` | 时间清空 | 时间输入框恢复 placeholder |
| `管理后台（派对／活动）-活动中心-搜索回显.png` | 发布流程第 1 步：活动信息 | 文件名误导，以画面为准，不是搜索页 |
| `管理后台（派对／活动）-活动中心-活动发布场地设定.png` | 发布流程第 2 步：场地设定 | 地区、地址、地图、底部按钮 |
| `管理后台（派对／活动）-活动中心-活动发布上传海报.png` | 发布流程第 3 步：上传海报 | 四个上传框长页面 |
| `管理后台（派对／活动）-活动中心-活动发布票券配置.png` | 发布流程第 4 步：票券配置 | 规格配置 + 规格详情长页面 |
| `管理后台（派对／活动）-活动中心-搜索回显(1).png` | 发布流程第 5 步：活动资质 | 文件名误导，以画面为准，不是搜索页 |

注意：`活动中心-搜索回显(2).png` 与 `活动中心-筛选回显.png` 的 SHA-256 均为 `397befdd049f29a2dea5c74982d231e23dff5d533e05abf5fc996723eebef92a`，当前素材是同一张图。实现筛选回显时不得新增 PNG 中不存在的筛选条件摘要条。

## 5. 复用组件视觉规格

### 5.1 原生导航栏

由 `index.config.ts` 控制，不在页面内重复绘制。

- 背景：`#14131A`
- 标题：`管理后台`
- 标题色：白色
- 业务内容背景从导航栏下方开始：`#0A0A0A`

### 5.2 底部后台 Tab

适用：所有后台子视图，非商家拦截页除外。

- 固定 bottom，宽 `375px`。
- 高度：`87px + env(safe-area-inset-bottom)`。
- 背景：`#191919`。
- 顶部边界不加明显描边。
- 四等分：`首页 / 活动 / 更多 / 账户`。
- icon 视觉尺寸：`23px`。
- 文案字号：`12px`。
- active icon：`#FFFFFF`；inactive：`#666666`。
- active 文案在设计图里仍偏灰，使用 `#8A8A8A`；不要用品牌蓝。
- 底部 home indicator 预留：`20px` 高，颜色由系统绘制。

内容区必须预留底部 padding：

```scss
padding-bottom: calc(env(safe-area-inset-bottom) + 95px);
```

### 5.3 Section Header

适用：首页 `已上架活动 / 活动数据 / 快速配置`。

- 左右外边距：`15px`。
- 标题字号：`14px`，白色，`600`。
- 右侧链接字号：`13px`，颜色 `#8A8A8A`。
- 标题行高度 `22px`。
- 标题与下方卡片间距：`10px`。

### 5.4 通用卡片

- 默认宽度：`345px`。
- 左右页面边距：`15px`。
- 背景：首页普通卡片 `#181818`，强调数据卡 `#202322`，表单/面板卡 `#242424`。
- 圆角：`6px`。
- 卡片间距：`10px`。
- 卡片内边距：首页列表卡 `15px` 左右；表单卡 `15px`。

### 5.5 表单输入框

- 宽度：`345px`。
- 高度：`48px`。
- 背景：表单页输入框 `#242424`；筛选时间输入框 `#050505`。
- 边框：`0.5px solid #8A8A8A`。
- 圆角：`8px`。
- 左右 padding：`15px`。
- placeholder：`#8A8A8A`。
- 输入文字：`#FFFFFF`，`14px`。
- 字数计数器右对齐，颜色 `#A0A0A0`，`14px`。

### 5.6 主按钮

白色主按钮：

- 背景：`#FFFFFF`
- 文案：`#000000`
- 高度：`52px`
- 圆角：`499.5px`
- 字号：`15px`
- 字重：`600`

红色按钮和 FAB：

- 背景：`#FF3150`
- 文案或 icon：白色
- `新增活动` 胶囊按钮：宽 `80px`，高 `32px`
- FAB：直径 `76px`，右边距 `30px`，距底部 tab 顶部 `48px`

灰色副按钮：

- 背景：`#5A5A5A`
- 文案：白色
- 与白色主按钮等高。

### 5.7 Switch

- 宽：`39px`
- 高：`21px`
- 关闭背景：`#3D3D3D`
- 开启背景：`#FFFFFF`
- 圆点：`16px`
- 圆点关闭时白色，开启时 `#0A0A0A`。

## 6. 首页规格

### 6.1 首页空态

参考：`管理后台（派对／活动）.png`。

布局：

- 业务内容顶端 padding：`20px`。
- 左右边距：`15px`。
- 第一段 section 为 `已上架活动`。
- 空态卡片宽 `345px`，高 `105px`。
- 空态卡片背景 `#202322`，圆角 `6px`。
- `暂无活动` 居中，字号 `13px`，颜色 `#747474`。
- section 下方到 `活动数据` 标题间距 `22px`。

活动数据卡：

- 宽 `345px`，高 `105px`。
- 背景 `#202322`。
- 三列等分。
- 数字 baseline 位于卡片上半部分，字号 `25px`，白色，`700`。
- 标签在数字下方，字号 `13px`，颜色 `#747474`。

快速配置：

- 标题与上一张数据卡间距 `28px`。
- 快速配置卡宽 `345px`，高 `81px`。
- icon 容器 `52.5px x 52.5px`，左边距 `15px`。
- icon 容器边框：`0.5px solid #747474`，圆角 `8px`。
- 文案区左距 icon `10px`。
- 主标题 `15px`，白色，`600`。
- 副标题 `13px`，灰色。
- 右箭头居中靠右，距右 `12px`。

### 6.2 首页存在上架活动

参考：`管理后台（派对／活动）-存在上架活动状态.png`。

上架活动卡：

- 最多显示 2 条。
- 卡片宽 `345px`，高 `88px`。
- 卡片间距 `15px`。
- 封面 `68px x 68px`，圆角 `6px`，左距 `8px`。
- 标题位于封面右侧，字号 `15px`，颜色 `#A0A0A0`，可单行省略。
- 时间行字号 `13px`，颜色 `#B8B8B8`。
- 右箭头尺寸 `17px`，居中靠右。

### 6.3 一屏适配

参考：`管理后台（派对／活动）-一屏幕显.png`。

要求：

- 标准 `3248px` 高设计图内，底部 tab 不遮挡快速配置卡主要内容。
- 首页 ScrollView 内容底部 padding 至少 `95px`。
- 不要为了塞进一屏压缩卡片高度；应允许滚动。

## 7. 活动中心规格

### 7.1 顶部 Tab

适用：活动中心所有状态。

- 容器上 padding：`20px`。
- 横向起点：`15px`。
- tab 文案：`我的活动 / 销售数据 / 实时订单 / 核销管理`。
- tab 间距：`21px`。
- active：白色，`16px`，`600`。
- inactive：`#8A8A8A`，`16px`，`400`。
- 移除现有红色 active underline；活动中心顶部 tab 不绘制下划线。

### 7.2 工具栏

参考：`活动中心（搜索输入状态）.png`、`搜索回显(2).png`。

- 工具栏位于 tab 下方，间距 `21px`。
- 左侧筛选按钮：`35px x 35px`，背景 `#1F1F1F`，圆角 `6px`。
- 筛选 icon 白色，视觉尺寸 `18px`。
- 搜索框：高度 `35px`，左距筛选按钮 `10px`，右边距 `15px`。
- 搜索框背景 `#1F1F1F`，圆角 `6px`。
- 搜索 icon `20px`，颜色 `#A8AFBD`。
- placeholder `搜索活动`，字号 `14px`，颜色 `#747474`。

### 7.3 活动列表

参考：`活动中心-搜索回显(2).png`、`活动中心（活动状态）.png`。

- 列表上边距：`15px`。
- 卡片宽 `345px`。
- 有图活动卡高度 `88px`。
- 卡片背景 `#181818`，圆角 `6px`。
- 封面 `68px x 68px`，左距 `8px`，上距 `10px`。
- 标题字号 `15px`，颜色 `#A0A0A0`。
- 时间行字号 `13px`，颜色 `#B8B8B8`。
- 右箭头距右 `12px`，垂直居中。
- 卡片间距 `10px`。

状态列表：

- 审核/上下架状态文案固定放在标题下方第一行，左对齐并与标题左边缘一致；不使用独立右上 badge。
- 状态文案：
  - `待发布`
  - `审核中`
  - `通过`
  - `已上架`
  - `已下架`
  - `已结束`
- 状态颜色：
  - 通过/上架：`#35D34A`
  - 审核中：`#A0A0A0`
  - 失败/拒绝：`#FF3150`
  - 下架/结束：`#747474`

### 7.4 空态与 FAB

参考：`活动中心（空态）.png`。

- 空态文字 `暂无活动` 位于页面中部，字号 `14px`，颜色 `#747474`。
- 红色 `新增活动` 胶囊按钮居中，宽 `80px`，高 `32px`。
- 在有列表的活动中心中，右下角显示红色 FAB：
  - 直径 `76px`
  - 背景 `#FF3150`
  - plus icon 白色，线宽视觉 `5px`
  - 右距 `30px`
  - 距底部 tab 顶部 `48px`

### 7.5 搜索与键盘

参考：`搜索输入状态.png`、`搜索键盘唤醒状态.png`、`搜索回显(2).png`。

- 输入聚焦后搜索框样式不跳动，保持同高同宽。
- 键盘唤醒时列表区域收缩到系统键盘上方；底部 tab 在该状态不可见，不要强行 fixed 到键盘上方。
- 搜索回显只显示匹配项；无匹配进入空态。
- 搜索词清空后恢复完整列表。

## 8. 筛选面板规格

参考：`活动中心（筛选）.png`、`活动中心（筛选选中）.png`、`活动中心-筛选回显.png`、`活动中心（重制回显）.png`。

面板布局：

- 面板是内容区内的深灰卡片，不是全屏新页。
- 顶部仍可见活动中心 tab。
- 面板上边距固定在工具栏下方 `15px`，左边距 `15px`，宽 `345px`。
- 背景：`#242424`。
- 圆角：`8px`。
- 内边距：上 `18px`，左右 `15px`，下 `15px`。
- 面板底部与底部 tab 保持距离，不被 tab 遮挡。

面板头：

- 左侧标题 `筛选（多选）`，字号 `14px`，颜色 `#8A8A8A`，`600`。
- 右侧 `关闭`，字号 `13px`，颜色 `#8A8A8A`，靠右。

checkbox：

- 方框尺寸 `14px`。
- 未选中：透明背景，`0.5px solid #8A8A8A`，圆角 `2px`。
- 选中：绿色 `#35D34A`，内部白色勾，勾线宽 `1.5px`。
- checkbox 与文字间距 `10px`。
- 每行高度 `32px`。
- 分组标题 `审核状态`、`活动状态（多选）`、`时间`，字号 `14px`，灰色，`600`。
- 分组之间垂直间距 `23px`。

时间输入：

- 输入框宽 `315px`，高 `36px`。
- 背景：`#050505`。
- 圆角：`5px`。
- 左 padding `12px`。
- placeholder：`开始时间-结束时间`。
- 右侧日历 icon 区域宽 `32px`。

底部按钮：

- 按钮区 margin-top `18px`。
- `重制` 左，`应用` 右。
- 两按钮同高，`36px`。
- 左按钮宽 `120px`，背景 `#5A5A5A`。
- 右按钮宽 `195px`，背景 `#FFFFFF`，文案黑色。
- 按钮间距 `9px`。
- 圆角 `5px`。

状态差异：

- 默认：checkbox 全空，时间 placeholder。
- 筛选选中：选中项 checkbox 绿色，应用按钮可用。
- 筛选回显：当前素材与搜索回显重复，未提供独立摘要态；应用筛选后只刷新列表数量和列表内容，不在工具栏、搜索区或列表上方新增条件摘要 UI。
- 重制回显：所有 checkbox 恢复未选，时间清空，列表恢复默认。

## 9. 时间筛选规格

参考：`时间筛选` 系列 5 张图。

叠层关系：

- 时间筛选从筛选面板中的时间输入触发。
- 固定使用二级日期面板覆盖在筛选面板上方的方案，不替换筛选面板内容。
- 背后的筛选面板顶部仍可见，标题 `筛选（多选）` 与右侧 `关闭` 保持在二级面板上方露出。
- 二级日期面板左 `0px`，宽 `375px`，顶部距业务内容顶端 `62.5px`，背景 `#181818`，圆角 `6px 6px 0 0`。
- 二级日期面板内部底部显示 `清空 / 应用`，后台底部 tab 在时间筛选图中不可见；时间范围应用回显回到筛选面板后，底部 tab 可见。

输入框：

- 默认 placeholder：`开始时间-结束时间`。
- 选中开始后，开始输入框显示 `2026-4-10`，结束输入框显示 `请选择日期`。
- 完整范围在筛选面板时间输入中显示：`2026-04-10 · 2026-04-10`。
- 清空态恢复 placeholder。

日历面板：

- 月份标题：`2026年4月`，居中，字号 `16px`，白色。
- 左右切月按钮：`33px x 33px` 圆角按钮，在月份行两侧，背景 `#242424`，箭头白色。
- 星期行 7 列，字号 `12px`，颜色 `#8A8A8A`。
- 日期网格 7 列，每格宽 `45px`，高 `42px`。
- 当前月日期：`#FFFFFF`。
- 上/下月日期：`#5E5E5E`。
- 选中日期：仅文字使用 `#D8FF4F`，不绘制圆形、圆角矩形或整格背景。
- 开始/结束日期：同一日期选择态也只改文字颜色为 `#D8FF4F`；输入框边框负责表达开始/结束输入激活状态。
- 范围中间日期：当前 5 张 PNG 未出现范围底色，不绘制弱绿色或深灰范围背景。

交互：

- 第一次点击日期设置 `startAt`。
- 第二次点击日期设置 `endAt`。
- 如果结束早于开始，toast `结束时间不能早于开始时间`，保留开始日期。
- `清空` 清除开始和结束。
- `应用` 在完整范围时写回调用方；不完整时 toast `请选择完整时间范围`。

## 10. 发布流程通用规格

发布流程使用 5 步 stepper。参考：

- `活动中心-搜索回显.png`：第 1 步活动信息。
- `活动发布场地设定.png`：第 2 步场地设定。
- `活动发布上传海报.png`：第 3 步上传海报。
- `活动发布票券配置.png`：第 4 步票券配置。
- `活动中心-搜索回显(1).png`：第 5 步活动资质。

Stepper：

- 位于业务内容顶部，容器宽 `375px`，内部左右 padding `15px`，Stepper 内容宽 `345px`。
- 每步方块 `31px x 31px`。
- 完成态：浅灰背景，白色勾。
- 当前态：深灰背景，浅灰描边 `2px`，显示数字。
- 未完成：深灰背景，无描边，数字灰色。
- 步骤间连线高度 `1px`，颜色 `#8A8A8A`。
- 步骤文案：`活动信息 / 场地设定 / 上传海报 / 票券配置 / 活动资质`，字号 `12px`，当前或完成较亮，未完成灰色。

底部操作：

- 左侧 `上一步`：纯文字按钮，白色，字号 `15px`，左距 `39px`。
- 右侧 `下一步` 或 `提交审核`：白色胶囊按钮，宽 `187.5px`，高 `52px`，右距 `30px`。
- 操作区不是 viewport fixed。它随表单内容滚动，作为表单最后一个区块渲染在内容末尾、底部 tab 上方；滚动到底时按钮底部距底部 tab 顶部 `32px`。
- 内容滚动容器仍保留 `calc(env(safe-area-inset-bottom) + 95px)` 底部 padding，避免长表单按钮被底部 tab 遮挡。

## 11. 发布第 1 步：活动信息

参考：`管理后台（派对／活动）-活动中心-搜索回显.png`。

字段顺序：

1. 活动名称
2. 分享标题
3. 活动日期
4. 实名模式
5. 未成年人校验
6. 活动概要

视觉：

- 每个 label 左距 `15px`，字号 `14px`，白色，`600`。
- label 与输入框间距 `10px`。
- 输入框宽 `345px`，高 `48px`。
- 活动名称计数 `0/80`，分享标题计数 `0/20`，右对齐。
- 活动日期输入框右侧日历 icon，尺寸 `20px`。
- 实名模式和未成年人校验是卡片：
  - 宽 `345px`
  - 高 `90px`
  - 背景 `#242424`
  - 标题白色
  - 说明灰色
  - switch 右侧距卡片内边缘 `15px`，垂直居中
- 活动概要是富文本编辑器：
  - 工具栏两行 icon，背景深色。
  - 编辑区高度 `210px`。
  - placeholder `请输入内容...`。

校验：

- 活动名称、分享标题、活动日期、活动概要必填。

## 12. 发布第 2 步：场地设定

参考：`活动发布场地设定.png`。

字段：

- 地区下拉
- 当前坐标地址
- 地图预览

视觉：

- 地区输入框宽 `345px`，高 `48px`，边框 `#8A8A8A`，右侧下拉箭头。
- 地址输入框同宽同高。
- 地图区域宽 `345px`，高 `400px`，顶部紧跟地址输入框后 `20px`。
- 地图底部左侧展示高德地图标识时使用静态 mock，实际实现保留 CSS mock，高度固定 `400px`。
- 地图 pin 使用黄绿色 `#D8FF4F`，位于地图偏下中间。

交互：

- 点击地图或地址区域调用 `Taro.chooseLocation`。
- 成功后写入 `address/locationName/latitude/longitude`。
- 失败时 toast `无法获取位置，请手动填写地址`。

## 13. 发布第 3 步：上传海报

参考：`活动发布上传海报.png`。

上传项顺序：

1. 活动详情页海报
2. 活动详情长图
3. 活动列表及分享图
4. 活动微信社群

上传框视觉：

- 左右边距 `15px`，宽 `345px`。
- 每个上传框高 `117.5px`。
- 背景 `#242424`。
- 虚线边框：`0.5px dashed #8A8A8A`。
- 圆角 `6px`。
- 中央黑色上传按钮：
  - 宽 `64px`
  - 高 `26px`
  - 背景 `#050505`
  - 圆角 `499.5px`
  - 文案灰色 `上传`
- 说明文字位于按钮下方，居中，灰色。

文案：

- 活动详情页海报：`适用于活动详情页展示，比例5:4，大小2M及以下`
- 活动详情长图：`适用于活动详情页展示，大小2M及以下 显示在购票页面底部`
- 活动列表及分享图：`适用于活动列表及分享页展示，比例4:3文件大小2M以下`
- 活动微信社群：`适用于活动社群二维码展示，大小2M以下`

## 14. 发布第 4 步：票券配置

参考：`活动发布票券配置.png`。

规格配置卡：

- 标题：`规格配置`
- 卡宽 `345px`，背景 `#242424`，圆角 `6px`。
- 卡内 padding `15px`。
- `规格名称` label 白色，输入框黑色，右侧计数 `4/15`。
- `选项2/5` 位于 chip 区上方。
- chip 两列布局：
  - 每个 chip 宽 `150px`
  - 高 `41px`
  - 边框 `#8A8A8A`
  - 内部文字白色
  - 删除 icon 靠右
- `其他选项` 输入框与绿色 `新增` 按钮同一行。
- `新增` 按钮背景 `#35D34A`，白字。
- `全部清除` 和 `保存` 两个按钮居底：
  - `全部清除` 深色描边按钮
  - `保存` 白色主按钮

规格详情卡：

- 每个规格一张卡。
- 标题：`规格名称·早鸟票`、`规格名称·预售票`。
- 右侧显示 `启用/禁用` 和 switch。
- 开售时间输入框宽 `315px`，黑色背景，右侧日历 icon。
- 价格行左侧 label `价格`，中间 `¥`，右侧输入框。
- 库存、限购、观演人同样用右侧黑色输入框。
- 输入框高度 `44px`，圆角 `6px`。

交互限制：

- 票种最多 5 个。
- 至少保留一个票种。
- `全部清除` 清空规格数值，不删除 chip。
- 下一步前至少一个规格启用。

## 15. 发布第 5 步：活动资质

参考：`管理后台（派对／活动）-活动中心-搜索回显(1).png`。

视觉：

- Stepper 前 4 步完成，第 5 步当前。
- 标题：`活动批文资质（选填）`。
- 上传框宽 `345px`，高 `160px`。
- 虚线边框，背景 `#242424`。
- 中央上传按钮与上传海报页一致。
- 文案：
  - `点击下载《活动批文资质模板》`
  - `演出类活动需提交活动批文，大小2M以下`
- 模板链接使用蓝色 `#4E64FF`。
- 底部按钮：左 `上一步`，右白色 `提交审核`。

## 16. 数据模型与代码落点

当前文件：

- `src/pages/user-sub/organizer/types.ts`
- `src/pages/user-sub/organizer/mock.ts`
- `src/pages/user-sub/organizer/constants.ts`
- `src/pages/user-sub/organizer/index.tsx`
- `src/pages/user-sub/organizer/activities/index.tsx`
- `src/pages/user-sub/organizer/home/index.tsx`
- `src/pages/user-sub/organizer/index.scss`

建议新增类型，保持兼容旧字段：

```ts
export type OrganizerAuditStatus = 'draft' | 'pending' | 'approved'
export type OrganizerActivityLifeStatus = 'up' | 'down' | 'ended'

export interface ActivityFilterState {
  auditStatuses: OrganizerAuditStatus[]
  activityStatuses: OrganizerActivityLifeStatus[]
  startAt: string
  endAt: string
}
```

建议扩展活动项：

```ts
eventStartAt: string
eventEndAt: string
auditStatus: OrganizerAuditStatus
activityStatus: OrganizerActivityLifeStatus
```

兼容策略：

- 保留现有 `status: 'published' | 'pending' | 'removed' | 'rejected'`，继续供 badge 和旧列表展示使用。
- 新筛选逻辑优先读 `auditStatus` 和 `activityStatus`。
- mock 数据同步补充新字段。

建议扩展发布草稿：

```ts
locationName: string
latitude?: number
longitude?: number
uploads: Record<string, string>
```

建议扩展上传项：

```ts
filePath?: string
```

## 17. Service 占位

在 `src/services/index.ts` 增加 organizer API wrapper。真实路径未确认时先作为占位，调用方必须有 mock fallback。

```ts
export const servicesOrganizerHome = () => request.get('/api/biz/organizer/home')
export const servicesOrganizerActivities = (params: any) => request.get('/api/biz/organizer/activities', params)
export const servicesOrganizerSales = (params: any) => request.get('/api/biz/organizer/sales', params)
export const servicesOrganizerOrders = (params: any) => request.get('/api/biz/organizer/orders', params)
export const servicesOrganizerVerifiers = (params: any) => request.get('/api/biz/organizer/verifiers', params)
export const servicesOrganizerCreateActivity = (payload: any) => request.post('/api/biz/organizer/activities', payload)
export const servicesOrganizerUpload = (payload: any) => request.post('/api/biz/organizer/upload', payload)
```

失败策略：

- 请求失败不阻塞 UI。
- `console.warn` 后使用 `mock.ts`。
- 不向用户展示接口错误 toast。

## 18. 实施顺序

1. 修正设计图状态映射，按本文档状态实现，不按误导性文件名实现。
2. 抽取或整理 SCSS token，统一颜色、字号、间距。
3. 扩展 `types.ts`、`mock.ts` 和 `constants.ts`。
4. 重做活动中心筛选入口：`onCycleFilter` 改为 `onOpenFilter`。
5. 实现筛选面板和时间筛选面板。
6. 替换活动日期和票券开售时间的 `Taro.showActionSheet`。
7. 补齐发布流程第 1、2、3、4、5 步视觉和交互。
8. 补齐 `chooseLocation`、`chooseImage`、`chooseMessageFile` 的前端逻辑。
9. 添加 service wrapper 和 mock fallback。
10. 跑构建并按验收清单核对。

## 19. 验收清单

构建：

- `npm run build:weapp -- --mode development` 通过。

视觉：

- 宽度按 `1500px -> 375px` 换算，左右边距 `15px`。
- 原生导航栏颜色为 `#14131A`，业务页面背景为 `#0A0A0A`。
- 底部 tab 高度、颜色、active/inactive 状态与设计一致。
- 首页空态、上架活动态、一屏态分别与对应 PNG 对齐。
- 活动中心空态、活动状态、搜索输入、搜索回显、FAB 与对应 PNG 对齐。
- 筛选默认、筛选选中、重制回显与对应 PNG 对齐；筛选回显按重复素材处理，不新增条件摘要 UI。
- 时间筛选默认、开始选择、结束选择、回显、清空态与对应 PNG 对齐。
- 发布流程 5 步分别与对应 PNG 对齐，尤其是 stepper、输入框、上传框、票券卡和底部按钮。

交互：

- 首页快速配置 4 个入口可用。
- 活动中心 4 个 tab 可切换。
- 搜索输入可过滤列表，清空恢复。
- 筛选可多选、关闭、重制、应用。
- 时间筛选可选择开始/结束、清空、应用，并阻止结束早于开始。
- 发布流程可上一步/下一步，必填校验生效。
- 场地设定可手动填写，`chooseLocation` 成功可回填。
- 上传海报和资质可选择文件并显示文件名。
- 票种可新增、删除、清空、保存。
- 提交审核后返回活动中心，并新增一条审核中活动。

## 20. 不在本次范围

- 不要求真实后端联调。
- 不新增独立路由。
- 不完整实现账户页和更多页业务。
- 不修改用户已有本地改动：`package.json`、`project.config.json`、`project.private.config.json`、`AGENTS.md`。
- 不删除用户下载的设计图目录。
