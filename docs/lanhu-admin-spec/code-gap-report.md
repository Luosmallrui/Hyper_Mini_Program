# Code Gap Report

## 当前已经完成
- 后台管理入口存在：`src/pages/user-sub/organizer/index.tsx`，已注册在 `src/app.config.ts` 的 `pages/user-sub` 分包。
- 已有内部视图：home、activities、more、account、createWizard、verify、nonMerchant。
- 已有 mock/types/constants：`mock.ts`、`types.ts`、`constants.ts`。
- 已有基础动态逻辑：搜索、本地筛选、日期范围、发布向导、海报上传模拟、票券规格、本地核销模拟、提现信息弹窗。
- 已有样式 token：`src/pages/user-sub/organizer/index.scss`。

## 缺失或半完成
- 真实后台接口封装缺失：`src/services/index.ts` 未发现 organizer/activity/ticket/verify/withdrawal 接口。
- 列表分页/加载更多缺失。
- loading/empty/error 状态不完整，更多依赖局部静态空态。
- 活动发布第 1-5 步的字段校验不完整，尤其上传比例/大小、票券数字、时间范围。
- 用户主页左上角扫码和客服按钮未实现：`src/pages/user/index.tsx` 的左侧 `nav-side` 仍为空，蓝湖要求 `扫一扫` + `客服` 两个图标。
- 添加核销员缺少真实保存接口、权限范围、渠道、二维码邀请状态。
- 核销缺少真实扫码校验接口、错误码映射和已核销列表刷新。
- 账户提现缺少真实接口、账号格式校验、权限控制。
- 审核中/审核未通过只体现列表状态，重新编辑/重新提交流程 unknown。

## 建议 Claude Code 修改文件
- `src/pages/user-sub/organizer/index.tsx`
- `src/pages/user-sub/organizer/index.scss`
- `src/pages/user-sub/organizer/activities/index.tsx`
- `src/pages/user-sub/organizer/home/index.tsx`
- `src/pages/user-sub/organizer/verify/index.tsx`
- `src/pages/user-sub/organizer/account/index.tsx`
- `src/pages/user-sub/organizer/mock.ts`
- `src/pages/user-sub/organizer/types.ts`
- `src/pages/user-sub/organizer/constants.ts`
- `src/pages/user/index.tsx`
- `src/pages/user/index.scss`
- 可选新增 `src/services/organizer.ts`，但仅在确认接口或以 mock/TODO 方式接入时。

## 不建议改动
- 不要修改非后台管理页面；例外是用户主页 `/pages/user/index` 中已纳入本轮的后台入口、扫码、客服、入驻和个人资料编辑前置项。
- 不要改 app.config.ts，除非产品确认需要独立核销/后台子路由。
- 不要删除现有 mock 和内部视图。
