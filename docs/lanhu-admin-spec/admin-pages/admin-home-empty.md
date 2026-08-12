# 管理后台（派对/活动）-一屏幕显

## 页面用途
后台首页，展示已上架活动、活动数据和快速配置入口。

> **蓝湖映射修正**：蓝湖页面名"一屏幕显"，实际视觉内容是后台首页一屏态。原索引30被错误映射为此页面，已按视觉复核结论修正为索引36。

## 页面结构
- 推荐路由：`pages/user-sub/organizer/index`
- 内部视图：`home`
- 蓝湖索引：36
- 当前状态：半完成
- 优先级：P0
- 预览资源：`assets/previews/admin-home.png`

## 关键区域说明
- AdminCustomNav
- AdminBottomNav
- PublishedActivityCard
- StatsCard
- QuickActionCard

## 交互说明
- onLoad/onShow：触发于 页面进入或内部视图切换；成功反馈：渲染数据；失败反馈：error/toast

## 表单说明
- 本页面无明确表单；如出现操作弹窗，按 minimal validation。

## 列表 / 弹窗 / 状态
- idle：保持上一次数据或空壳布局
- loading：显示 loading 或骨架；设计稿未给出则使用 Taro.showLoading/局部 loading
- loaded：展示列表/表单/卡片
- empty：展示“暂无活动/暂无订单”等空态和必要 CTA
- error：显示错误提示和重试入口；设计稿未给出，需最小实现
- submitting：按钮 loading 或禁用，Taro.showLoading
- dialogOpen：遮罩 + 面板

## 动态功能说明
- 初始化：使用现有 mock 保底；如接入接口，先 loading，再根据 list length 进入 loaded/empty。
- 搜索：keyword 变化后本地过滤或请求 proposed list API；确认搜索重置 page=1。
- 筛选：filterState 临时态，应用后写入 appliedFilter 并刷新列表。
- 弹窗：所有 overlay 打开时锁定底层滚动，关闭时保留或重置临时态按页面定义。
- 反馈：提交时 showLoading/禁用按钮，成功 Toast，失败 Toast/Dialog。

## 接口数据说明
- 已有后台接口：未找到。当前只发现登录和首页接口。
- Proposed 接口：getOrganizerDashboard
- Mock：`src/pages/user-sub/organizer/mock.ts`

## 与当前代码的差异
当前已实现首页，但部分文案、图标、快捷入口数量和数据字段与设计稿存在差异。

## Claude Code 实现建议
1. 先复用当前 `src/pages/user-sub/organizer` 的 state、types、mock 和 SCSS token。
2. 不新增独立路由，除非产品确认需要；当前更适合补齐内部 view。
3. 接口没有真实封装时先用 mock/proposed contract，并保留 TODO。

## 视觉验收标准
- 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。

## 动态功能验收标准
- 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- loading、empty、error 至少有最小可见反馈。

## unknown / need-human-confirm
- 上传时间字段只有 update_time，无法确认是否等同 upload_time
- 真实接口路径
- 权限字段
- 复杂表单规则
- 部分 P1 页面缺少节点级 HTML/CSS
