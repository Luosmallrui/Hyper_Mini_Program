# Interaction Flow

## 页面初始化
1. 进入 `pages/user-sub/organizer/index`。
2. 读取 userInfo，执行 `isMerchantUser`。当前 `ALLOW_ORGANIZER_DEBUG=true` 会放行。
3. 计算导航栏 metrics。
4. 根据 dashboardView 渲染 home/activities/more/account/createWizard/verify。
5. 若接入接口：进入 loading，成功后 loaded/empty，失败 error。

## 用户主页入口
1. 进入 `/pages/user/index`。
2. 读取 userInfo / mock role state。
3. 未入驻用户：功能区第 5 项显示 `我要入驻`，点击进入 `pages/user-sub/organizer/index?view=settlementApply&source=userEntry`。
4. 已入驻主办方：功能区第 5 项显示 `主办中心`，点击进入 `pages/user-sub/organizer/index`。
5. 左上角顶部操作区：按蓝湖展示 `扫一扫` / `客服` 图标组，不能保持空白。
6. active 核销员：用户主页左上角展示 `扫一扫`，点击进入扫码核销流程。
7. 普通用户：不展示订单核销扫码入口；如果未来产品要求普通扫码，必须与订单核销分离。
8. 客服入口：用户主页左上角展示 `客服` 图标，点击打开微信客服能力、项目已有客服承接，或 Toast `客服功能待接入` 并保留 TODO。
9. active 核销员：功能区可展示 `核销记录`，点击进入 `pages/user-sub/organizer/index?view=verifyRecords&source=userNav` 或核销页已核销列表。

## 我要入驻申请
1. 用户点击 `我要入驻`。
2. 进入入驻申请表单页，沿用用户中心/后台暗色 UI 风格。
3. 表单字段从 organizer 局部 mock/adapter 配置读取；字段未确认前标记 need-human-confirm。
4. 用户填写表单并点击 `提交申请`。
5. minimal validation：必填非空，手机号字段做基础格式校验。
6. 提交走 mock adapter，不调用真实接口。
7. 成功后 Toast `提交成功`，进入 `审核中` 状态页。
8. 失败后停留表单并显示 Toast/Dialog。

## 查询 / 搜索 / 筛选
1. 输入搜索关键字写入 `activityKeyword`。
2. 本地过滤或调用 proposed `getOrganizerActivities`。
3. 打开筛选时写临时 `filterState`。
4. 应用筛选后写 `appliedFilter`，关闭面板，刷新列表。
5. 重置筛选清空 audit/life/channel/date。
6. 日期选择通过 `calendarStart/calendarEnd` 回写筛选或表单。

## 新增活动
1. 后台首页“发布活动”或活动中心“新增活动”进入 createWizard step1。
2. 每一步先 minimal validation，通过后 `wizardStep += 1`。
3. step1 活动信息，step2 场地，step3 上传，step4 票券，step5 资质。
4. 最终提交 proposed save API 或 mock createActivityFromDraft，成功后回到活动列表并刷新。

## 编辑 / 删除 / 审核
- 编辑入口设计稿不明确；建议从活动卡片进入详情/编辑，复用 createWizard 并带 activityId。
- 删除/清空票券/删除核销员是危险操作，必须二次确认。
- 审核动作设计稿只体现状态，未体现管理端审核按钮；标记 need-human-confirm。

## 核销
1. active 核销员在用户主页点击左上角 `扫一扫`。
2. 调起小程序扫码能力；普通用户没有该入口。
3. 扫码成功后进入 `pages/user-sub/organizer/index?view=verify&source=userScan` 或停留 verify 内部视图。
4. 将扫码得到的券码写入 mock verify adapter。
5. success 显示确认核销弹窗，确认后刷新已核销列表。
6. failed/invalid/reverify 显示失败弹窗，关闭后停留当前页。
7. 手动输入券码可作为 verify 页内的备用入口，不替代用户主页左上角扫码入口。

## 核销记录
1. active 核销员在用户主页功能区点击 `核销记录`。
2. 进入 `pages/user-sub/organizer/index?view=verifyRecords&source=userNav`。
3. 展示已核销记录列表，不触发扫码。
4. mock 数据支持 loaded/empty/error。
5. 点击记录项如需详情，先保留 TODO，等待产品确认。

## 提现信息
1. 账户页点击提现信息。
2. view modal 展示脱敏或完整信息。
3. 编辑进入 edit modal，非空校验后提交 proposed update API。
4. 成功关闭并回显，失败 Toast。
