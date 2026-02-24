## 当前阶段与目标
- 阶段：登录体系稳定化 + 地图交互细节打磨 + 关键页面视觉一致性。
- 目标：新会话可直接继续开发，无需重复排查历史问题。

## 本轮已完成（2026-02）
1. 强制登录链路
- 接入并稳定 `FORCE_LOGOUT` / `AUTH_LOGIN_SUCCESS` 事件流。
- 未登录时不渲染 `src/pages/index/index.tsx` 地图页，不触发首页数据请求。
- 登录成功后恢复首页数据加载与用户定位刷新。

2. 登录页与验证码登录
- 登录主页支持视频背景（`https://cdn.hypercn.cn/video/video.mp4`）。
- 验证码登录拆分为独立页面流程，支持 6 位验证码。
- 协议未勾选时弹提示抽屉，并支持“同意并登录”。
- 顶部 Hyper 图标按胶囊区对齐方案处理。

3. 地图 Marker 与中心点
- 修复登录后 marker 丢失与重建时序问题（先准备图标再渲染 marker）。
- 用户定位 marker 支持头像圆形白边方案并做 fallback。
- 地图聚焦支持平滑镜头动画（非瞬移）。
- 中心偏移从“固定经纬度”改为“像素偏移 + 当前 scale 换算”，避免缩放漂移。
- 聚焦前主动读取 `MapContext.getScale`，修复“放大后第一次聚焦偏移错误、第二次正常”。

4. 认证图标统一替换
- 统一使用 `src/assets/images/certification.png`。
- 已替换页面：
  - `src/pages/index/index.tsx`
  - `src/pages/activity-list/index.tsx`
  - `src/pages/activity/index.tsx`
  - `src/pages/venue/index.tsx`
- `activity` / `venue` 页图标尺寸已调为 `20px`，与名称上下居中，名称间距 `10px`。

5. Venue 头图手势修复
- 修复 `src/pages/venue/index.tsx` 顶部红框区域无法滑动轮播的问题。
- 原因：`hero-content` 的动态 `paddingTop` 覆盖触摸区域。
- 处理：移除该内联 `paddingTop`，让手势透传到 `Swiper`。

## 当前关键参数（首页地图）
- 文件：`src/pages/index/index.tsx`
- `DEFAULT_MAP_SCALE = 14`（初始更放大）
- `MAP_FOCUS_PIXEL_OFFSET = 128`（目标点相对屏幕位置偏移）
- 聚焦流程：`getCurrentMapScale()` -> `getFocusCenter()` -> `animateMapCenterTo()`

## 注意事项 / 踩坑记录
- `src/pages/activity/index.tsx` 历史上多次出现编码损坏风险；编辑该文件时避免整文件批量替换，优先最小补丁。
- 避免使用会改变文件编码的脚本式全量重写（尤其在 PowerShell 下）。
- 地图交互问题优先检查：层级覆盖（pointer events）+ 时序（数据/scale/marker 构建顺序）。

### 编码事故记录（2026-02-18）
- 问题：`src/pages/index/index.tsx` 出现中文常量与文案乱码（mojibake），导致筛选文案/类型匹配异常。
- 根因：PowerShell 脚本式改写文件时引入编码污染（非最小补丁编辑）。
- 处理：
  - 已恢复 `CATEGORIES` / `AREA_LEVEL1` / `MORE_TAGS` 等中文常量。
  - 新增项目级巡检脚本 `scripts/check-mojibake.js`，并接入：
    - `npm run check:encoding`
    - `lint-staged`（提交前自动检测 staged 文本文件）
- 后续强约束：
  - 优先使用最小补丁编辑，避免整文件重写。
  - 提交前至少运行一次 `npm run check:encoding`。

## 建议新会话优先任务
1. 真机回归四个认证图标页面（不同机型字号/基线）。
2. 首页地图聚焦参数微调（`MAP_FOCUS_PIXEL_OFFSET` 可按机型分档）。
3. 登录后首页首帧体验优化（卡片/marker加载节奏与骨架过渡）。
4. 对 `request` 层补充更严格的成功态判定与埋点日志。

## 快速自检清单
- `pnpm -s tsc --noEmit` 通过。
- 未登录进入首页：不渲染地图、不请求首页接口。
- 登录后：marker/卡片可见，切卡激活态变化正常，定位按钮可用。
- Venue 顶部大图区域可左右滑动轮播。

## 本次新增上下文（追加，2026-02-18）

### A. Square 频道与列表能力
1. 频道数据源切换
- `src/pages/square/index.tsx` 已切到 `GET /api/v1/channel`。
- 顶部 tab 以 `my_channels` 为主，编辑区区分 `my_channels / other_channels`。

2. 订阅/退订
- 接入：
  - `POST /api/v1/channel/subscribe`（`channel_id`）
  - `POST /api/v1/channel/unsubscribe`（`channel_id`）
- 已做频道管理“编辑态”控制：进入编辑态才展示删除入口；完成编辑可退出编辑态并刷新频道。

3. 默认频道规则
- 已加入默认频道语义（`关注`、`推荐`）并在交互上与可编辑频道区分。
- 进入 `square` 默认展示 `推荐` 分支（按最近实现约定）。

4. 点赞能力
- `square` 列表卡片支持点赞/取消点赞，复用：
  - `POST /api/v1/note/{id}/like`
  - `DELETE /api/v1/note/{id}/like`
- 增加乐观更新、并发点击保护（pending set）、失败回滚。
- 已按后续要求移除“`likes > 0` 就红心”的兼容判定，红心只由“我是否点赞”驱动。

### B. Activity / Attendee 观演人联动
1. `src/pages/activity/index.tsx`
- 购票抽屉接入真实观演人列表：`GET /api/v1/order/list-viewer`。
- 支持选中观演人、无观演人支付前校验、跳转观演人管理页并通过 `eventChannel` 回填。

2. `src/pages/activity-attendee/index.tsx`
- 已实现“单页双态”：`list`（管理/选择/删除） + `create`（新增）。
- 接口：
  - `GET /api/v1/order/list-viewer`
  - `POST /api/v1/order/create-viewer`
  - `POST /api/v1/order/delete-viewer`（body: `{ id }`）
- 重点修复：曾出现 `list-viewer` 刷屏，已通过请求触发时机收敛（避免 effect 循环）。

### C. 首页地图（index）近期改造与当前状态
1. 已做改造
- `src/pages/index/index.tsx` 恢复并接入：
  - `CommonHeader`
  - `useNavBarMetrics`
  - `src/pages/index/map-marker.ts` 的 marker 构建能力
- 用户定位 marker 与派对/场地 marker 分链路处理。
- 非激活态 icon 规则：高度固定 `50`，宽度按比例自适应；激活态仅“略放大 icon”（不再强依赖底座背景）。
- marker 名称位置逻辑已多次调整为“图标下方”。

2. iOS 关键坑位
- 服务端大量返回 SVG icon，iOS 地图原生层对 SVG marker 兼容差，曾触发红 pin 或黑块。
- 已在 `map-marker.ts` 引入 icon 解析/离屏导出与 fallback 思路，但链路仍在迭代，当前仍需真机回归确认。

3. 名称样式目标
- 当前目标明确：marker 名称“黑字 + 白色描边（或近似描边）”，且长文案可换行/不截断。
- 注意：原生 label 对样式支持有限；若要严格描边一致性，最终可能仍需 Canvas 标题图方案。

### D. 其它页面改造要点（已落地过）
- `activity` 详情页：时间/地址/按钮尺寸/tab 交互（可切换）等样式对齐设计稿。
- `venue` 页：头图可左右滑动、商品/动态切换相关遮挡问题与样式问题有过修复。
- `activity-list`：接入下拉刷新（含刷新状态管理与失败提示）。

### E. 当前遗留风险（新会话优先关注）
1. 首页地图 iOS 真机稳定性
- 重点验证：派对/场地 marker 是否仍出现红 pin/黑块。
- 若继续异常，优先落地“SVG -> PNG 本地临时路径”强制转换后再喂给 marker。

2. marker 标题样式一致性
- 需要在“性能可接受”前提下确认是否切到 Canvas 标题图，避免原生 label 样式差异。

3. Attendee 空态交互
- 用户反馈“多余页面”语义：当无观演人时更偏向直接进入新增态，保留列表态入口但避免空白感。

## 本次新增上下文（追加，2026-02-21）

### A. 首页地图（index）最近调整
1. Marker 激活态
- 激活态继续使用底图叠加方案（`map-maker-background`）+ 前景 icon 组合。
- 多轮微调后，前景 icon 已做位置上移微调（小步进像素级调整）。

2. Marker 名称与层级
- 已修复“激活态不在最顶层”与“被其他 marker 名称遮挡”的问题方向，当前仍以真机视觉为准继续微调。
- 非激活态名称间距参数已调整：`MARKER_LABEL_ANCHOR_Y_INACTIVE` 近期从 `52 -> 44 -> 30`，用于缩短图标与标题距离。

3. iOS 兼容结论
- iOS 地图对 SVG marker 支持不稳定，激活态底图统一优先 PNG 资源（避免 SVG 渲染失败导致仅放大前景图标）。

### B. Square 页（关注分支）近期变更
1. 视觉结构
- `src/pages/square/index.tsx` 的关注流单列卡片已按设计图进行一轮结构对齐：头部信息、菜单点位、底部操作区布局。

2. 点赞图标方案
- 已改为 lightning 图标体系：
  - 已点赞：`src/assets/icons/lightning.svg`
  - 未点赞：`src/assets/icons/lightning-outline.svg`
- 瀑布流图标尺寸改为 `24x35`，与点赞数间距 `4px`。

### C. 提交流程踩坑（重要）
1. lint-staged 报错根因
- 出现过 “VSCode 只显示 Preparing lint-staged” 的场景，实际是 `eslint --fix` 失败。
- 典型报错：`import/first`（绝对路径 import 需在相对路径 import 之前）。

2. 部分暂存陷阱
- 文件状态 `MM`（部分暂存）时，`lint-staged` 检查的是“已暂存版本”，可能反复报旧错。
- 处理方式：先 `git add` 目标文件再执行 `npx lint-staged`。

### D. Chat 页当前待处理问题（已确认）
- 文件：`src/pages/chat/index.tsx` / `src/pages/chat/index.scss`
- 待修项：
  1. 顶部区域存在黑块，遮挡消息内容。
  2. 他人转发卡片与自己转发卡片宽度不一致。
  3. 自己发送的转发卡片需要改为蓝色气泡背景（与普通自己消息一致）。
- 建议实现方向：清理顶部冗余占位块、统一 `card-bubble` 宽度规则、补齐 `.msg-right .card-bubble` 及子元素颜色体系。

## 本次新增上下文（追加，2026-02-23）

### A. merchant 关注字段切换（`is_follow`）
1. 列表接口字段变更
- `/api/v1/merchant/list` 已返回 `is_follow`（替代旧兼容思路）。
- 首页 `src/pages/index/index.tsx` 与列表页 `src/pages/activity-list/index.tsx` 已改为优先并最终统一使用 `is_follow` 初始化关注状态。

2. 详情页关注能力补齐
- `/api/v1/merchant/{id}` 已返回 `is_follow`，并用于：
  - `src/pages/activity/index.tsx`
  - `src/pages/venue/index.tsx`
- 两页【关注】按钮已接入：
  - `POST /api/v1/follow/follow`
  - `POST /api/v1/follow/unfollow`
- 已实现：乐观更新、失败回滚、防重复点击（pending 状态）。

### B. `activity` 页编码事故修复经验（重要）
1. 现象
- `src/pages/activity/index.tsx` 出现大量中文乱码，且部分字符串被截断，导致：
  - JSX 标签损坏（如 `</Text>` 被破坏）
  - 引号不闭合
  - `if/else` 结构被挤坏
  - `tsc` 大量语法报错

2. 高风险操作特征
- 在含乱码文件上做脚本式批量替换/整段替换时，极易继续扩大损坏范围。
- 即使功能改动很小（例如增加关注按钮），也可能触发整文件更多中文区域异常。

3. 实战修复策略（有效）
- 先做“最小功能补丁”（仅加关注逻辑和按钮点击）。
- 再按 `tsc` 报错行号逐段修复，优先处理：
  - 未闭合字符串
  - 损坏的 JSX 文本节点
  - 被破坏的条件分支结构
- 对乱码严重、补丁匹配失败的片段：
  - 用“按行号定点替换”方式修复（而不是整文件重写）。
- 修复后必须执行：`npx tsc --noEmit`。

### C. 额外操作细节（避免重复踩坑）
- PowerShell 下不要把 `git diff` 输出误管道给 `cat`（会被当作 `Get-Content`，产生误导性错误）。
- 需要查看 diff 时直接用 `git diff -- <file>`，或用 `Get-Content` 读取具体文件片段。

## 本次新增上下文（追加，2026-02-23，续）

### A. Square 频道编辑层（`src/pages/square/index.tsx` / `index.scss`）
1. 频道编辑层视觉对齐（按设计图）
- 编辑层背景改为纯黑（不再使用灰色透明蒙层）。
- 编辑层不再铺满整页到底部，改为顶部下拉面板（高度随内容）。
- 新增顶部向下展开动画（CSS-only，打开时下拉铺开）。
- 增加 `maxHeight + overflow-y`，频道过多时面板内部可滚动。

2. 交互与显示细节
- 删除按钮被裁剪问题已修复（移除 chip 裁剪导致的截断）。
- 删除图标文字做了居中微调（解决视觉偏移）。
- 推荐频道长文本支持“`+` 固定、仅文字滚动”展示。
- 后续已升级为“按真实渲染宽度测量后决定是否滚动”，避免本可完整显示的文案误滚动。
- 滚动距离按真实溢出像素计算，避免滚过头（最后一个字完整露出后停住，再回到起点）。

3. 初次进入频道栏定位
- `square` 页首次进入时，顶部频道栏不再自动 `scrollIntoView` 到偏右位置。
- 仅在用户手动点击 tab / 左右滑动后，才启用频道栏自动对齐逻辑。

### B. Activity / Venue / Message / Activity-list 的 iOS 样式与滚动修复
1. `activity` 页（`src/pages/activity/index.*`）
- 页面原生背景色配置改为纯黑（`backgroundColor/backgroundColorTop/backgroundColorBottom`）。
- 增加 `page { background: #000; }`，防止 iOS 回弹露白。
- 分享弹层 `AtFloatLayout` 改为“关闭时不渲染内容”，修复未打开时 placeholder（如“说点什么吧...(可选)”）泄露到主页面的问题。

2. `venue` 页（`src/pages/venue/index.config.ts`）
- 补齐页面原生背景黑色配置，防止 iOS 回弹出现白底/样式异常。

3. `activity-list` / `message` 页右侧滚动条遮挡内容
- 根因：`ScrollView` 自身使用左右 `padding`，iOS 滚动条绘制在内容区域内侧。
- 处理：将左右 `padding` 从滚动容器挪到内部包裹层（`list-content` / `message-scroll-content`），使滚动条回到最右边，不压卡片/消息内容。

### C. 首页地图（`src/pages/index/index.tsx` / `map-marker.ts` / `index.less`）本轮调整
1. 离屏 Canvas 误显示（左上角头像）
- 左上角出现“用户定位头像点”实际不是地图 marker，而是离屏渲染用 Canvas 微弱显示。
- 已将 `.avatar-marker-canvas` / `.icon-marker-canvas` 改为真正离屏隐藏（`left/top: -9999px`，`opacity: 0`）。

2. marker 尺寸微调（派对/场地）
- 地图 marker（选中态/非选中态）整体缩小约 30%。
- 同步调整标题锚点间距，避免图标变小后标题离得过远。

3. marker 名称样式（黑字 + 描边）
- 原生 `label` 双层叠加方案会出现重影，已弃用。
- 已升级为 Canvas 标题图方案：生成透明 PNG 标题（黑字 + 描边）后作为独立 marker 渲染。
- 新增标题离屏 Canvas：`TITLE_MARKER_CANVAS_ID` + `.title-marker-canvas`。
- 当前标题样式已按设计参数微调：
  - `PingFangSC, PingFang SC`
  - `font-weight: 500`
  - `font-size: 16px`
  - `line-height: 22px`
  - `fill: #000000`
  - 描边近似 `2px #DBDBDB`
  - 文本左对齐（在标题图内部）

4. 用户定位头像 marker 尺寸
- 仅改地图 marker `width/height` 在真机上可能不明显（部分端表现不稳定）。
- 已进一步改为缩小用户定位头像 marker 的 Canvas 生成尺寸，并 bump `STYLE_VERSION` 强制刷新缓存。
- 该调整会直接影响用户定位头像图本身大小（比仅改 marker 宽高更稳）。

### D. 提交流程补充踩坑（lint-staged）
- “VSCode 弹窗卡在 `Preparing lint-staged...`”时，需要手动执行 `npx lint-staged` 看真实报错。
- 本轮实测一个常见拦截源：`scripts/check-mojibake.js` 会拦截文档里出现的 replacement char（`�` / U+FFFD）。
- 即使只是背景文档在描述乱码现象，也不要把该字符直接写进 `background.md`；建议写成 `U+FFFD` 文本描述。
