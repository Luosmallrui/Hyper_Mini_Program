# Visual Review Batch 1

评审时间：2026-05-27

评审范围：Claude Code 已完成的 Batch 0 + Batch 1，即后台首页、活动中心列表、搜索、筛选、日期筛选、loading/empty/error 的前端闭环。

本文件只记录视觉评审和修改建议，不代表已修改业务代码。

## 评审依据

- 蓝湖参考图：
  - `docs/lanhu-admin-spec/assets/previews/admin-home.png`
  - `docs/lanhu-admin-spec/assets/previews/admin-activity-with-list.png`
  - `docs/lanhu-admin-spec/assets/previews/admin-activity-empty.png`
  - `docs/lanhu-admin-spec/assets/previews/admin-activity-filter.png`
- 微信开发者工具运行截图：
  - `docs/lanhu-admin-spec/assets/runtime-review/batch1-organizer-home.png`
  - `docs/lanhu-admin-spec/assets/runtime-review/batch1-activity-center.png`
  - `docs/lanhu-admin-spec/assets/runtime-review/batch1-filter-panel.png`
- 相关规格：
  - `docs/lanhu-admin-spec/design-tokens.json`
  - `docs/lanhu-admin-spec/admin-pages/admin-home-empty.json`
  - `docs/lanhu-admin-spec/admin-pages/admin-home-listed.json`
  - `docs/lanhu-admin-spec/admin-pages/activity-center-empty.json`
  - `docs/lanhu-admin-spec/admin-pages/activity-center-filter-panel.json`

## 总体结论

Batch 1 的前端闭环已基本可运行：后台首页、活动中心列表、搜索、筛选面板、mock 数据、loading/error 状态已经接入。但视觉还原仍有明显偏差，尤其是活动中心筛选面板被 FAB 遮挡、首页已上架活动卡缺少封面图和活动时间、活动中心 tab 样式与蓝湖不一致。

建议先修 P1 问题，再进入 Batch 2。

## P1 必修问题

### 1. 筛选面板被 FAB 遮挡

严重级别：P1

运行截图：`docs/lanhu-admin-spec/assets/runtime-review/batch1-filter-panel.png`

现象：
- 活动中心筛选面板打开后，右下角红色 FAB 仍显示。
- FAB 覆盖在筛选面板的时间输入和“应用”按钮附近，影响视觉完整性，也可能影响点击。

代码位置：
- `src/pages/user-sub/organizer/activities/index.tsx`
  - `showFAB = activityTab === 'mine' || activityTab === 'verifiers'`
  - FAB 渲染在文件末尾。
- `src/pages/user-sub/organizer/index.scss`
  - `.floating-plus-button`

建议：
- 筛选面板打开时隐藏 FAB。
- 日历面板打开时也应隐藏 FAB。
- 最小修改建议：
  - 将 `showFAB` 改为同时判断 `!filterPanelOpen`。
  - 如果后续 calendar 状态传入 activities 视图，也应加入 `!calendarPanelOpen`。

验收标准：
- 打开筛选面板时，红色 FAB 不再遮挡筛选内容和底部按钮。
- 关闭筛选面板后，FAB 恢复显示。

### 2. 首页已上架活动卡缺少封面和活动时间

严重级别：P1

运行截图：`docs/lanhu-admin-spec/assets/runtime-review/batch1-organizer-home.png`

蓝湖参考：`docs/lanhu-admin-spec/assets/previews/admin-activity-with-list.png`

现象：
- 蓝湖“存在上架活动状态”中，活动卡左侧有封面图。
- 蓝湖活动卡有标题、上架时间、活动时间。
- 当前首页卡片只展示标题和上架时间，缺少封面图和活动时间，卡片信息密度偏低。

代码位置：
- `src/pages/user-sub/organizer/home/index.tsx`
  - `featured-activity-card` 渲染逻辑。
- `src/pages/user-sub/organizer/index.scss`
  - `.featured-cover` 已存在但当前首页卡片未使用。

建议：
- 在首页 `featured-activity-card` 中补充活动封面：
  - 使用 `item.cover`。
  - 样式使用已有 `.featured-cover`。
- 增加活动时间文案：
  - `活动时间：{item.eventTime}`。
- 若图片加载失败，保持卡片高度稳定，可给封面容器兜底背景。

验收标准：
- 首页已上架活动卡与蓝湖一样有左侧封面图。
- 每个卡片至少展示标题、上架时间、活动时间。
- 卡片高度和左右间距不因图片加载失败抖动。

## P2 建议优化

### 3. 首页标题行右侧入口与蓝湖不一致

严重级别：P2

蓝湖参考：
- `已上架活动` 右侧为 `前往活动中心`
- `活动数据` 右侧为 `前往数据中心`

当前表现：
- 标题左侧增加了图标。
- 右侧使用斜向箭头。

代码位置：
- `src/pages/user-sub/organizer/home/index.tsx`
  - 已上架活动 header。
  - 活动数据 header。

建议：
- 去掉标题前的小图标。
- 右侧改为灰色文字入口：
  - `前往活动中心`
  - `前往数据中心`
- 如果需要箭头，可用小 chevron 放在文字后，不建议继续使用大号斜向箭头。

验收标准：
- 首页 section header 与蓝湖文字结构一致。
- 右侧入口不会喧宾夺主。

### 4. 活动中心顶部 tab 样式偏离蓝湖

严重级别：P2

运行截图：`docs/lanhu-admin-spec/assets/runtime-review/batch1-activity-center.png`

蓝湖参考：`docs/lanhu-admin-spec/assets/previews/admin-activity-empty.png`

现象：
- 蓝湖活动中心顶部 tab 是纯文字横排，active 为白字加粗，inactive 为灰字。
- 当前实现是带边框 segmented control，active 为白底黑字。

代码位置：
- `src/pages/user-sub/organizer/activities/index.tsx`
  - `renderActivityTopTabs`
- `src/pages/user-sub/organizer/index.scss`
  - `.activity-top-tabs-strip`
  - `.activity-top-tab-cell`
  - `.activity-top-tab-cell.active`
  - `.activity-top-tab-label`

建议：
- 去掉外框、圆角和 active 白底。
- 改为纯文字 tab：
  - active: `#FFFFFF`，font-weight 600。
  - inactive: muted gray。
  - tab 间距参考蓝湖，避免四个 tab 被挤成块状按钮。

验收标准：
- 活动中心 tab 与蓝湖视觉一致，不再出现白底分段控件。
- 四个 tab 在 375px 宽度下不拥挤、不换行。

### 5. 筛选面板字段和文案需要收敛

严重级别：P2

运行截图：`docs/lanhu-admin-spec/assets/runtime-review/batch1-filter-panel.png`

蓝湖参考：`docs/lanhu-admin-spec/assets/previews/admin-activity-filter.png`

现象：
- 蓝湖 P0 筛选包含审核状态、活动状态、时间。
- 当前实现增加了“渠道”，导致筛选面板更高，底部按钮区域更容易被 FAB 或底部导航影响。
- 蓝湖标题为 `筛选（多选）`，右侧为 `关闭`；当前为 icon + `筛选` 和 `✕`。

代码位置：
- `src/pages/user-sub/organizer/activities/index.tsx`
  - 筛选面板 header。
  - `FILTER_CHANNEL_OPTIONS` 区域。
- `src/pages/user-sub/organizer/index.scss`
  - `.filter-panel`
  - `.filter-panel-title`
  - `.filter-panel-close`

建议：
- 第一轮 MVP 先隐藏“渠道”筛选，除非产品确认必须保留。
- 标题改为 `筛选（多选）`。
- 右侧关闭入口改为 `关闭`。
- 筛选面板高度和内边距参考蓝湖，保留足够底部按钮空间。

验收标准：
- 筛选面板内容与蓝湖 P0 规格一致。
- 底部“重制/应用”按钮完整可见且不被遮挡。

## 非阻塞问题

### 6. 首页数据格式与蓝湖有轻微差异

严重级别：P3

现象：
- 蓝湖有活动订阅量为整数 `1` 或 `72`。
- 当前首页使用 `formatStatValue` 统一 `toFixed(2)`，订阅量显示为 `0.00`。

代码位置：
- `src/pages/user-sub/organizer/home/index.tsx`
  - `formatStatValue`
  - 活动数据统计渲染。

建议：
- 订单和销售是否保留小数需要按产品确认。
- 订阅量建议按整数展示。

## 验证记录

- 已用微信开发者工具打开 `/pages/user-sub/organizer/index`。
- 已保存首页截图：`docs/lanhu-admin-spec/assets/runtime-review/batch1-organizer-home.png`。
- 已保存活动中心截图：`docs/lanhu-admin-spec/assets/runtime-review/batch1-activity-center.png`。
- 已保存筛选面板截图：`docs/lanhu-admin-spec/assets/runtime-review/batch1-filter-panel.png`。
- 已运行 `npx tsc --noEmit`，当前失败来自既有文件 `src/pages/square/index.tsx` 的 `WechatMiniprogram` namespace 缺失，位置约 410-411 行；不是本轮 organizer 视觉评审改动范围，但会阻塞全量 typecheck 通过。

## 建议修复顺序

1. P1：隐藏筛选面板打开时的 FAB。
2. P1：首页活动卡补封面图和活动时间。
3. P2：首页 section header 改为蓝湖右侧文字入口。
4. P2：活动中心 tab 改为纯文字样式。
5. P2：筛选面板隐藏渠道字段，标题/关闭文案对齐蓝湖。
6. P3：统计数字按字段类型格式化，订阅量用整数。
