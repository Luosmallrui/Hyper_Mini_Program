# Dynamic Acceptance Checklist

## 全局
- 第一轮必须 mock-first，不接真实后端。
- 页面必须通过 organizer 模块 adapter 或局部 helper 使用 mock 数据，不直接请求 proposed URL。
- proposed 接口不得当作 existing API。
- 不允许修改全局 request 封装。
- 不允许把 mock 逻辑散落到大量页面里。
- 后台管理入口可打开，非商户逻辑不误伤现有调试。
- 每个内部 view 都有 loading/empty/error 的最小反馈。
- 每次提交类操作都禁用重复点击，并有 Toast/Dialog 反馈。
- 接口缺失时使用 mock/TODO，不破坏现有 request 封装。
- 每完成一个页面后运行 `npx tsc --noEmit`；涉及中文或历史 fragile 页面时运行 `npm run check:encoding`。

## 用户中心入口补充验收

- [ ] 普通用户打开 `/pages/user/index` 时，第 5 个功能入口显示 `我要入驻`，不显示 `主办中心`。
- [ ] 普通用户点击 `我要入驻` 后进入入驻申请表单或审核承接态，不只是 Toast。
- [ ] 已入驻主办方打开 `/pages/user/index` 时，第 5 个功能入口显示 `主办中心`。
- [ ] 用户主页顶部左上角按蓝湖渲染操作区，不再是空白 `nav-side`。
- [ ] active 核销员打开 `/pages/user/index` 时，左上角出现 `扫一扫` + `客服` 两个图标。
- [ ] 普通用户打开 `/pages/user/index` 时，左上角不展示订单核销扫码入口，但客服入口按产品规则展示。
- [ ] 普通用户没有订单核销入口，不能从用户主页直接进入订单核销。
- [ ] active 核销员点击 `扫一扫` 后进入/承接 `verify` 核销页，扫码结果走 mock adapter。
- [ ] 点击客服图标能打开微信客服能力、项目已有客服承接，或至少 Toast `客服功能待接入` 并保留 TODO，不能无响应。
- [ ] 扫码和客服图标均为图标按钮，不使用文字按钮，不放进功能区卡片。
- [ ] active 核销员在功能区可看到 `核销记录`，点击后进入记录列表，不触发扫码。
- [ ] 普通用户看不到 `核销记录`。
- [ ] `我要入驻` 申请表单字段来自局部 mock/adapter 配置，字段 TODO 指向黄总确认，不写成最终契约。
- [ ] 入驻申请提交 mock 成功后进入 `审核中` 状态，失败有 Toast/Dialog。

## Mock-first 验收
- [ ] 未直接调用 `/api/biz/organizer/*` proposed URL。
- [ ] 未修改全局 request 封装。
- [ ] mock 数据集中在 organizer 模块 mock/adapter 中，没有散落到大量页面。
- [ ] 列表可基于 mock 数据完成搜索、筛选、日期筛选。
- [ ] 表单提交走 mock adapter，并展示 Toast/Dialog 反馈。
- [ ] loading、empty、error、submitting 状态可通过 mock 场景切换。
- [ ] 所有未来真实接口位置保留 TODO 或 need-human-confirm。

## 页面清单
### 管理后台（派对/活动）
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。

### 管理后台（派对/活动）-存在上架活动状态
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。

### 管理后台（派对/活动）-活动中心（空态）
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 搜索关键字能过滤或触发刷新；筛选应用/重置有效；日期范围可选择、清空、应用。

### 管理后台（派对/活动）-活动中心（搜索输入状态）
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 搜索关键字能过滤或触发刷新；筛选应用/重置有效；日期范围可选择、清空、应用。

### 管理后台（派对/活动）-活动中心-搜索回显
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 搜索关键字能过滤或触发刷新；筛选应用/重置有效；日期范围可选择、清空、应用。

### 管理后台（派对/活动）-活动中心（筛选）
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 搜索关键字能过滤或触发刷新；筛选应用/重置有效；日期范围可选择、清空、应用。

### 管理后台（派对/活动）-活动中心（筛选选中）
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 搜索关键字能过滤或触发刷新；筛选应用/重置有效；日期范围可选择、清空、应用。

### 管理后台（派对/活动）-活动中心（时间筛选）
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 搜索关键字能过滤或触发刷新；筛选应用/重置有效；日期范围可选择、清空、应用。

### 管理后台（派对/活动）-活动中心-活动发布场地设定
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 上一步/下一步状态正确；字段校验失败不进入下一步；草稿 state 不丢失。

### 管理后台（派对/活动）-活动中心-活动发布上传海报
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 上一步/下一步状态正确；字段校验失败不进入下一步；草稿 state 不丢失。

### 管理后台（派对/活动）-活动中心-活动发布票券配置
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 上一步/下一步状态正确；字段校验失败不进入下一步；草稿 state 不丢失。

### 管理后台（派对/活动）-一屏幕显
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 上一步/下一步状态正确；字段校验失败不进入下一步；草稿 state 不丢失。

### 管理后台（派对/活动）-添加核销员
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 扫码/手动输入触发核销状态弹窗；成功/失败/无效码状态可展示；重复提交被禁用。

### 管理后台-核销
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 扫码/手动输入触发核销状态弹窗；成功/失败/无效码状态可展示；重复提交被禁用。

### 管理后台-核销成功
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 扫码/手动输入触发核销状态弹窗；成功/失败/无效码状态可展示；重复提交被禁用。

### 管理后台-核销失败
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 扫码/手动输入触发核销状态弹窗；成功/失败/无效码状态可展示；重复提交被禁用。

### 管理后台-核销失败-无效码
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 扫码/手动输入触发核销状态弹窗；成功/失败/无效码状态可展示；重复提交被禁用。

### 后台主页-提现信息
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 提现信息可查看、编辑、保存；校验失败有 Toast；保存后回显。

### 后台主页-修改提现信息
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 提现信息可查看、编辑、保存；校验失败有 Toast；保存后回显。

### 审核中
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 搜索关键字能过滤或触发刷新；筛选应用/重置有效；日期范围可选择、清空、应用。

### 审核未通过
- [ ] 页面在 WeChat Mini Program 目标下可打开，不引入新路由破坏。
- [ ] 顶部导航、黑色背景、卡片圆角、底部内部导航与 design-tokens.json 对齐。
- [ ] loading、empty、error 至少有最小可见反馈。
- [ ] 搜索关键字能过滤或触发刷新；筛选应用/重置有效；日期范围可选择、清空、应用。
