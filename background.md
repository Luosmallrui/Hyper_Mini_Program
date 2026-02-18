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
