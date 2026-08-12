# 管理后台（派对/活动）-活动中心-活动发布场地设定

## 页面用途
活动发布第 2 步，设置地区、当前坐标地址和地图位置。

## 页面结构
- 推荐路由：`pages/user-sub/organizer/index`
- 内部视图：`createWizard:step2`
- 当前状态：半完成
- 优先级：P0
- 预览资源：`assets/previews/admin-venue-setting.png`

## 关键区域说明
- AdminCustomNav
- AdminBottomNav
- WizardStepHeader
- AdminFormField
- PrimaryPillButton
- DistrictSelect
- LocationMap

## 交互说明
- onLoad/onShow：触发于 页面进入或内部视图切换；成功反馈：渲染数据；失败反馈：error/toast
- onNextStep：触发于 下一步按钮；成功反馈：进入下一步；失败反馈：字段校验失败 toast
- onPrevStep：触发于 上一步按钮；成功反馈：返回上一步；失败反馈：none

## 表单说明
- district (string)：请选择地区
- address (string)：请输入当前坐标地址
- latitude/longitude (number)：定位失败时允许 unknown，但提交前建议确认

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
- Proposed 接口：saveOrganizerActivityDraft
- Mock：`src/pages/user-sub/organizer/mock.ts`

## 与当前代码的差异
当前 step2 有地区、地址和 TaroMap；需补坐标选择/定位失败状态、地图 marker、地区选择禁用/下拉逻辑。

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
- 上一步/下一步状态正确；字段校验失败不进入下一步；草稿 state 不丢失。

## unknown / need-human-confirm
- 上传时间字段只有 update_time，无法确认是否等同 upload_time
- 真实接口路径
- 权限字段
- 复杂表单规则
- 部分 P1 页面缺少节点级 HTML/CSS
