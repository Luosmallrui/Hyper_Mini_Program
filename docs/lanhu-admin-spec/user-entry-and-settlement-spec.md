# 用户中心入口、订单核销与我要入驻补充规格

更新时间：2026-06-01  
来源：用户补充确认截图 + 蓝湖个人中心/核销设计图 + 当前小程序代码只读审阅。  
适用范围：用户主页 `src/pages/user/index.tsx` 与后台管理内部核销/入驻承接视图。  
本文件是 `visual-review-cc4-user-profile-2026-06-01.md` 的补充，不替代后台管理主规格。

## 已确认产品口径

1. `订单核销` 的真实入口不是普通用户功能区常驻入口。
2. `订单核销` 入口是用户主页左上角的 `扫一扫`。
3. 只有开通核销员身份的用户才有这个入口；普通用户没有。
4. `扫一扫` 进入的核销页面使用现有蓝湖 `管理后台-核销` UI 风格。
5. `核销记录` 不是核销动作入口，而是记录查看入口。
6. `核销记录` 可以放在用户主页 `订单 / 票务 / 积分 / 账号中心 / 我要入驻` 功能区这一排，新增一个 `核销记录` 入口。
7. 点击 `我要入驻` 后需要一个申请表单页，整体使用现有用户中心/后台暗色 UI 风格。
8. 入驻申请需要提交的字段仍需黄总确认，第一轮不能把字段当成最终后端契约。
9. 用户主页左上角必须补齐两个顶部操作图标：`扫一扫` 和 `客服`。
10. `扫一扫` 只对 active 核销员展示/可用，用于进入订单核销；普通用户不展示订单核销扫码入口。
11. `客服` 是用户主页常驻辅助入口，视觉上与 `扫一扫` 并列，点击打开微信客服能力或当前项目已有客服承接方式。

## 入口关系总览

| 入口 | 展示对象 | 入口位置 | 点击行为 | 目标页面/状态 | 是否普通用户可见 | 当前实现状态 | 优先级 |
|---|---|---|---|---|---:|---|---|
| 我要入驻 | 未入驻/未开通主办方用户 | 用户主页功能区第 5 项 | 打开入驻申请表单 | `organizerSettlementForm` 或 organizer 非主办方承接态 | 是 | 未完成 | P0 |
| 主办中心 | 已入驻主办方用户 | 用户主页功能区第 5 项 | 进入后台管理 | `pages/user-sub/organizer/index` | 否，仅主办方 | 半完成，当前被 debug 强制展示 | P0 |
| 扫一扫/订单核销 | 已开通核销员身份用户 | 用户主页左上角图标 | 调起扫码，扫码后进入/停留核销页 | `pages/user-sub/organizer/index (verify)` | 否 | 未确认/待实现 | P0 |
| 客服 | 所有用户，至少登录用户 | 用户主页左上角图标，位于 `扫一扫` 右侧 | 打开客服会话/客服承接 | 微信客服能力或项目已有客服页 | 是 | 未实现 | P0 |
| 核销记录 | 已开通核销员身份用户 | 用户主页功能区，建议靠近 `订单` / `票务` | 查看已核销记录列表 | `verifyRecords` 或 `pages/user-sub/organizer/index (verify:records)` | 否 | 待实现 | P1 |

## 用户身份状态

建议只做最小状态判断，不扩展复杂权限体系。

```ts
type UserEntryRoleState = {
  isOrganizer: boolean;
  organizerStatus?: 'none' | 'pending' | 'rejected' | 'approved';
  isVerifier: boolean;
  verifierStatus?: 'none' | 'active' | 'inactive';
};
```

第一轮 mock-first 规则：

- `isOrganizer` 可先兼容 `userInfo.is_merchant || userInfo.merchant_id`。
- `isVerifier` 字段后端未确认，先在 user mock 或页面本地 mock 中模拟。
- 不要新增全局 RBAC。
- 不要修改全局 request 封装。
- 所有真实字段名都保留 TODO，等后端负责人确认。

## 用户主页左上角顶部操作规格

### 视觉目标

蓝湖个人中心设计图左上角不是空白区域，而是一组两个白色线性图标：

```text
[ 扫一扫 ] [ 客服 ]
```

本地参考图：

- `docs/lanhu-admin-spec/assets/lanhu-designs-user/029-user-center-organizer-entry.png`
- `docs/lanhu-admin-spec/assets/lanhu-designs-user/057-user-center-variant.png`

当前代码缺口：

- `src/pages/user/index.tsx` 的 `custom-nav-bar` 左侧 `nav-side` 仍是空容器。
- `src/pages/user/index.scss` 只给 `.nav-side` 预留宽高，没有渲染扫码和客服按钮。

### 布局规格

| 项 | 规格 |
|---|---|
| 容器 | 位于用户主页顶部自定义导航栏左侧 `nav-side` 内 |
| 排列 | 横向排列，先 `扫一扫`，后 `客服` |
| 垂直对齐 | 与中间 HYPER logo 同一导航行，居中对齐 |
| 点击热区 | 每个图标至少 `44px x 44px` 或等效 rpx，不能只有图标本身可点 |
| 间距 | 两个图标之间保持清晰间距，不能贴边或重叠 |
| 颜色 | 白色或接近白色线性图标，透明背景 |
| 层级 | 高于头图背景，不能被 profile header 或胶囊菜单遮挡 |

### 展示规则

| 图标 | 普通用户 | active 核销员 | 未登录用户 | 行为 |
|---|---:|---:|---:|---|
| 扫一扫 | 不展示订单核销入口 | 展示 | 不展示或先登录 | 调起扫码并进入订单核销流程 |
| 客服 | 展示 | 展示 | 展示或先登录，按项目现有规则 | 打开客服会话/客服承接 |

说明：

- 如果产品后续要求普通用户也有普通扫码功能，必须与订单核销扫码分离；普通扫码不得进入 `verify` 核销页。
- 第一轮按当前已确认口径执行：`扫一扫` 是订单核销入口，仅 active 核销员拥有。

### 交互规格

`扫一扫`：

1. 点击前校验 `isVerifier && verifierStatus === 'active'`。
2. active 核销员调用 `Taro.scanCode`。
3. 扫码成功后进入 `pages/user-sub/organizer/index?view=verify&source=userScan`。
4. 扫码结果写入核销 mock adapter。
5. 取消扫码或失败时 Toast/静默返回，不崩溃。

`客服`：

1. 优先使用微信小程序原生客服能力，例如 Taro `Button openType='contact'` 的透明按钮承接。
2. 如果项目已有客服页或客服 SDK，复用已有承接方式。
3. 如果当前环境无法打开客服，第一轮允许 Toast `客服功能待接入`，但必须保留 TODO，不能无响应。
4. 客服按钮不得触发订单核销、入驻申请或主办中心跳转。

### 实现提醒

- 不要把顶部操作做进 `mainNavItems` 功能区，它们属于自定义导航栏左侧操作。
- 不要只添加一个扫码图标而漏掉客服图标。
- 不要用文字按钮替代图标按钮。
- 如果没有现成图标资源，可先用 CSS/WXSS 线性图标或项目现有 icon 组件实现，后续再替换为蓝湖切图。

### 验收标准

- 用户主页左上角能看到客服图标。
- active 核销员用户主页左上角能看到 `扫一扫` + `客服` 两个图标。
- 普通用户主页左上角不展示订单核销扫码入口；客服入口仍按产品规则展示。
- 两个图标与蓝湖个人中心图位置一致，不能挤压 HYPER logo，也不能被右侧微信胶囊遮挡。
- 点击客服有可感知反馈或打开客服会话。
- 点击扫码进入订单核销 mock 流程，取消/失败不崩溃。

## 订单核销入口规格

### 展示规则

| 用户状态 | 左上角扫一扫 | 点击后行为 |
|---|---|---|
| 普通用户 | 不展示，或展示普通扫码功能但不得进入订单核销 | 不进入核销页 |
| 核销员 active | 展示 `扫一扫` 图标 | 调起扫码，进入订单核销页 |
| 核销员 inactive/禁用 | 不展示或置灰 | Toast `核销员身份未启用`，不进入核销 |
| 未登录 | 不展示或触发登录 | 登录后再判断 |

### 页面跳转建议

不要新增独立路由，优先复用当前已注册的后台管理路由：

```text
pages/user-sub/organizer/index?view=verify&source=userScan
```

进入后由 organizer 页内部把 `dashboardView` 设置为 `verify`。如果当前代码尚未支持 query 参数，Claude Code 可做最小适配，但不要修改 `src/app.config.ts`。

### 扫码流程

1. 用户主页判断当前用户是 active 核销员。
2. 显示左上角 `扫一扫` 图标。
3. 点击后调用小程序扫码能力。
4. 获取券码 `code`。
5. 跳转或进入 `verify` 内部视图。
6. 将 `code` 交给核销 mock adapter。
7. 根据 mock 结果展示成功/失败/无效码弹窗。
8. 成功后刷新 `已核销` 列表。

### 验收标准

- 普通用户看不到订单核销入口，不能从用户主页直接进入核销页。
- active 核销员能看到用户主页左上角 `扫一扫`。
- 点击 `扫一扫` 后可以进入 `管理后台-核销` UI 风格的核销页。
- 扫码失败/取消有 Toast 或静默返回，不崩溃。
- mock code 可以覆盖 success、failed、invalidCode 三类状态。

## 核销记录入口规格

### 产品口径

`核销记录` 是记录查看入口，不是扫码核销入口。可以加在用户主页功能区这一排。

### 展示规则

| 用户状态 | 是否显示核销记录 |
|---|---:|
| 普通用户 | 否 |
| 已开通核销员身份 | 是 |
| 主办方但非核销员 | 待确认，默认否 |

### UI 位置

在用户主页功能区卡片中，与 `订单` / `票务` 同级。当前蓝湖个人中心一行是 5 个入口：

```text
订单 / 票务 / 积分 / 账号中心 / 我要入驻或主办中心
```

新增 `核销记录` 后有两种可选实现：

1. 六宫格/横向滚动：保留原五项，增加 `核销记录`，避免挤压文字。
2. 条件替换：核销员用户显示 `核销记录`，普通用户不显示，保持一行不超过 5 项。

当前建议：第一轮用条件替换或横向滚动，避免在 375px 机型上一行 6 个入口导致挤压。最终布局需视觉验收。

### 目标页面

优先复用核销页记录列表：

```text
pages/user-sub/organizer/index?view=verifyRecords&source=userNav
```

如果没有独立 `verifyRecords` 状态，可先进入 `verify` 并定位到 `已核销` 列表区域。不要新增独立页面路由，除非产品确认。

### 核销记录数据字段

第一轮 mock 字段：

```ts
type VerifyRecordItem = {
  id: string;
  activityTitle: string;
  ticketName: string;
  quantity: number;
  realNameMasked: string;
  phoneMasked?: string;
  idCardMasked?: string;
  cover: string;
  status: 'verified' | 'reverified';
  verifiedAt: string;
  verifierName?: string;
};
```

后端字段和分页规则未确认，必须标记 TODO。

### 验收标准

- 核销员用户在功能区能看到 `核销记录`。
- 普通用户看不到 `核销记录`。
- 点击后打开记录列表，不直接触发扫码。
- 列表能基于 mock 数据展示活动封面、活动名、票种、实名脱敏信息和核销状态。
- empty/loading/error 状态可切换。

## 我要入驻申请表单规格

### 产品口径

点击 `我要入驻` 后，不再只 toast，也不直接进入完整后台管理。需要打开一个申请表单页。该页使用现有暗色 UI 风格即可，字段由黄总确认。

### 入口

```text
用户主页功能区 -> 我要入驻 -> 入驻申请表单
```

推荐路由/状态：

```text
pages/user-sub/organizer/index?view=settlementApply&source=userEntry
```

优先复用 organizer 已注册路由和暗色 UI，不新增 app 路由。

### 页面结构

建议结构：

1. 顶部导航：标题 `我要入驻` 或 `主办方入驻申请`，左上角返回。
2. 说明卡片：简短说明提交后会进入审核。
3. 表单卡片：按确认字段渲染。
4. 底部按钮：`提交申请`。
5. 提交成功后进入 `审核中` 状态页。
6. 审核未通过时可从 `我要入驻` 进入重新申请。

### 第一轮字段策略

字段未由黄总确认前，不要写死为最终契约。第一轮可以用配置化 mock 字段完成前端闭环：

```ts
type SettlementApplyDraft = {
  organizerName?: string;       // proposed, need Huang confirm
  contactName?: string;         // proposed, need Huang confirm
  contactPhone?: string;        // proposed, need Huang confirm
  cityOrRegion?: string;        // proposed, need Huang confirm
  businessDescription?: string; // proposed, need Huang confirm
  attachmentList?: string[];    // proposed, need Huang confirm
};
```

最小可交互要求：

- 至少能展示一个表单页面。
- 字段配置集中在 organizer 局部 mock/adapter，不散落到多个页面。
- 必填字段先做非空校验。
- 手机号字段若存在，做基础手机号格式校验。
- 提交走 mock adapter。
- 成功后显示 Toast 并进入 `审核中` 状态页。
- 失败走 mock error 状态。

### 入驻状态流转

```text
none -> settlementApply -> submitting -> pending -> approved/rejected
```

状态说明：

| 状态 | UI |
|---|---|
| none | 用户主页显示 `我要入驻` |
| settlementApply | 入驻申请表单 |
| submitting | 提交按钮 loading/disabled |
| pending | 审核中状态页 |
| approved | 用户主页显示 `主办中心` |
| rejected | 显示审核未通过，可重新申请 |

### 验收标准

- 普通用户点击 `我要入驻` 后进入申请表单，不再只 toast。
- 表单页风格与现有用户中心/后台暗色 UI 一致。
- 表单字段集中配置，后续黄总确认字段后只改配置和 adapter。
- 提交 mock 成功后进入审核中状态。
- `主办中心` 只在 approved 状态显示。

## 需要后续确认

1. 黄总确认入驻申请最终字段。
2. 后端确认用户信息中的主办方状态字段。
3. 后端确认用户信息中的核销员身份字段。
4. 核销员 inactive/禁用状态是否展示入口。
5. `核销记录` 是否仅核销员可见，主办方是否也可见。
6. `核销记录` 最终是复用核销页内部状态，还是新增独立页面。
7. 扫码后是否先进入核销页确认，还是直接弹出成功/失败结果。

## 给 Claude Code 的执行提醒

- 先实现入口规则，不要先做复杂后端联调。
- 订单核销入口是左上角 `扫一扫`，不是普通用户功能区常驻入口。
- 用户主页左上角必须同时补齐 `扫一扫` 和 `客服` 两个图标；客服不是核销入口。
- 普通用户没有订单核销入口。
- 核销记录入口可以放在用户主页功能区，但它只查看记录，不触发扫码。
- `我要入驻` 后是申请表单，字段未确认前用 mock 配置和 TODO。
- 不要修改全局 request。
- 不要新增 app 路由，除非后续产品明确要求。
