# CC4 用户中心视觉审核与修改指导

审核时间：2026-06-01  
审核范围：用户主页第 5 个入口的 `我要入驻` / `主办中心` 状态切换、个人资料编辑弹窗。  
审核方式：蓝湖 MCP 读取设计稿 + 微信开发者工具 MCP 运行态截图 + 当前代码只读审阅。  
本轮未修改任何小程序业务代码。

## 使用材料

### 蓝湖设计图

| 设计图 | 蓝湖索引 | 蓝湖 ID | 本地图片 |
|---|---:|---|---|
| 增加签名编辑 | 4 | `daec82e7-aaa8-448e-a235-cd70fd4344a5` | `docs/lanhu-admin-spec/assets/lanhu-designs-user/004-user-profile-edit-signature.png` |
| 个人中心（主办中心态） | 29 | `02ea170d-3cb1-41f0-a5ce-a70b68f2dd23` | `docs/lanhu-admin-spec/assets/lanhu-designs-user/029-user-center-organizer-entry.png` |
| 个人中心（主办中心态备份） | 56 | `01a69f02-581c-4faf-8ec4-5c4f2a6124d2` | `docs/lanhu-admin-spec/assets/lanhu-designs-user/056-user-center-variant.png` |
| 个人中心（我要入驻态） | 57 | `2809eb2e-ce81-443b-b527-2c5b4fb04e59` | `docs/lanhu-admin-spec/assets/lanhu-designs-user/057-user-center-variant.png` |

说明：
- 蓝湖存在两个用户中心入口状态：已是主办方时显示 `主办中心`，未入驻/未开通时显示 `我要入驻`。
- `增加签名编辑` 设计图中的弹窗是当前个人资料编辑的权威参照，包含 `昵称` 和 `个性签名` 两个可编辑字段。

### 当前运行态截图

| 运行态 | 截图 | 快照 |
|---|---|---|
| 用户主页 | `docs/lanhu-admin-spec/assets/runtime-review/cc4-user-home.png` | `docs/lanhu-admin-spec/assets/runtime-review/cc4-user-home-snapshot.txt` |
| 编辑个人信息弹窗 | `docs/lanhu-admin-spec/assets/runtime-review/cc4-user-edit-modal.png` | `docs/lanhu-admin-spec/assets/runtime-review/cc4-user-edit-modal-snapshot.txt` |

## 总体结论

本轮编码仍未覆盖用户中心两项关键需求：

1. 用户主页第 5 个入口没有按蓝湖状态切换，当前运行态始终显示 `主办中心`。
2. 个人资料编辑弹窗没有实现 `个性签名` 编辑，视觉结构也没有按蓝湖的双行胶囊输入区域实现。

这部分不能完全归因于 Claude Code 实现问题：此前 `docs/lanhu-admin-spec/` 的主规格包重点是后台管理页面，对用户主页入口和个人资料编辑没有给出足够明确的 P0 规格。但在本轮已经明确要求后，当前代码仍保留硬编码和 debug 覆盖，属于需要继续修复的实现缺口。

## 2026-06-01 入口补充确认

本轮新增产品口径已落到 `docs/lanhu-admin-spec/user-entry-and-settlement-spec.md`：

- `订单核销` 入口是用户主页左上角 `扫一扫`，只对已开通核销员身份的用户展示/可用，普通用户没有。
- 用户主页左上角必须同时补齐 `扫一扫` 和 `客服` 两个图标；当前实现两个都没有渲染。
- `核销记录` 是记录查看入口，不是核销动作入口；可加在用户主页 `订单 / 票务 / 积分 / 账号中心 / 我要入驻` 功能区这一排。
- 点击 `我要入驻` 后需要一个申请表单页，沿用当前暗色 UI 风格；提交字段需要黄总确认。
- 第一轮不要新增独立 app 路由，优先通过 `pages/user-sub/organizer/index?view=...` 进入 organizer 内部状态。

## P0-USER-001：用户主页第 5 个入口状态切换未实现

### 用户可见问题

当前运行态 `cc4-user-home.png` 中，第 5 个功能入口显示为 `主办中心`。但蓝湖与用户提供参考图要求：

- 未入驻 / 非主办方：显示 `我要入驻`，图标为握手样式，点击进入入驻/激活/审核流程。
- 已入驻 / 主办方：显示 `主办中心`，点击进入 `pages/user-sub/organizer/index`。

### 证据

运行态快照：

```text
uid=view#_CW view "订单\n票务\n积分\n账号中心\n主办中心" pos=[17,447] size=[396x77]
uid=text#_CU text "主办中心" pos=[337.828125,496] size=[44x16]
```

当前代码：

- `src/pages/user/index.tsx:59`：`ALLOW_ORGANIZER_DEBUG = true`
- `src/pages/user/index.tsx:61` 到 `:64`：`isMerchantUser` 被 debug 覆盖为恒真
- `src/pages/user/index.tsx:537` 到 `:543`：非主办方点击被 toast 拦截
- `src/pages/user/index.tsx:583` 到 `:587`：第 5 个入口文案硬编码为 `主办中心`

### 修改指导

Claude Code 下一轮必须把第 5 个入口改为状态驱动，而不是硬编码。

建议状态口径：

```ts
type OrganizerEntryState = 'settle' | 'pending' | 'rejected' | 'approved';
```

最小实现规则：

| 用户状态 | 第 5 个入口文案 | 图标 | 点击行为 |
|---|---|---|---|
| `approved` / `is_merchant` / `merchant_id` 存在 | `主办中心` | 主办中心图标 | `Taro.navigateTo({ url: '/pages/user-sub/organizer/index' })` |
| 未入驻 / 未开通 | `我要入驻` | 握手图标 | 进入入驻申请表单，不要只 toast |
| 审核中 | `我要入驻` 或 `入驻审核中`，待产品确认 | 握手图标或状态图标 | 进入审核中状态页 |
| 审核未通过 | `我要入驻` 或 `重新入驻`，待产品确认 | 握手图标或状态图标 | 进入审核未通过/重新申请状态页 |

实现约束：

- 不要继续用 `ALLOW_ORGANIZER_DEBUG = true` 掩盖真实状态。
- 不要把非主办方点击只处理成 `当前账号未开通主办中心` toast。
- 如果真实后端字段未完成，先用本地 mock/userInfo 字段模拟 `approved` 与 `settle` 两种状态。
- 不要新增复杂权限体系；只做入口文案、图标和跳转状态。
- 入驻第一轮建议进入 `pages/user-sub/organizer/index?view=settlementApply&source=userEntry`，由 organizer 内部渲染申请表单；不要新增 app 路由。

### 验收标准

- 用非主办方 mock 用户打开 `/pages/user/index`，第 5 个入口必须显示 `我要入驻`。
- 点击 `我要入驻` 后不能只 toast，必须进入入驻申请表单或审核状态承接页面。
- 用主办方 mock 用户打开 `/pages/user/index`，第 5 个入口必须显示 `主办中心`。
- 点击 `主办中心` 后进入 `pages/user-sub/organizer/index`。
- 两种状态都需要截图落盘，分别命名为：
  - `cc-next-user-home-settle-entry.png`
  - `cc-next-user-home-organizer-entry.png`

## P0-USER-002：个人资料编辑缺少个性签名字段

### 用户可见问题

蓝湖 `增加签名编辑` 弹窗包含两行：

- `昵称 JENDO`
- `个性签名 春花秋月 酒吧里`

当前运行态 `cc4-user-edit-modal.png` 只有一行 `昵称`，没有 `个性签名`。

### 证据

运行态快照：

```text
uid=text#_DS text "编辑个人信息"
uid=text#_DU text "获取您的头像和昵称以展示"
uid=text#_Da text "昵称"
uid=button#_De button "保存信息"
```

当前代码：

- `src/pages/user/index.tsx:90` 到 `:92`：只有 `tempAvatar`、`tempNickname`、`isEditMode`
- `src/pages/user/index.tsx:415` 到 `:416`：打开弹窗只初始化头像和昵称
- `src/pages/user/index.tsx:461` 到 `:463`：提交只发送 `nickname` 和 `avatar`
- `src/pages/user/index.tsx:827` 到 `:837`：弹窗只渲染昵称输入
- `src/pages/user/index.tsx:839` 到 `:841`：按钮文案为 `保存信息`
- `src/pages/user-sub/profile/index.tsx:13`：他人主页数据结构已有 `signature` 字段，可作为字段命名参考

### 修改指导

Claude Code 下一轮必须补齐签名编辑的状态、UI、提交和回显。

最小实现：

- 新增 `tempSignature` 状态。
- `handleOpenEdit` 初始化 `tempSignature = userInfo.signature || ''`。
- 弹窗中在昵称下方新增一行 `个性签名` 输入。
- 保存时提交 `{ nickname, avatar, signature }`，其中 `signature` 在真实接口未确认前标记 TODO。
- 保存成功后本地 `userInfo` 也要回写 `signature`，保证不接真实后端时仍能看到闭环。
- 如果当前 `/api/v1/user/info` 不支持 `signature`，不要改全局 request 封装；保留页面级 TODO 或最小 adapter。

### 视觉规格

以蓝湖 `增加签名编辑` HTML/CSS 为准：

| 元素 | 蓝湖规格 |
|---|---|
| 遮罩 | `rgba(0, 0, 0, 0.52)` |
| 弹窗卡片 | `background-color: rgba(44,44,46,1)`, `border-radius: 24px`, 宽约 `600px` |
| 标题 | `编辑个人信息`, `font-size: 30px`, `font-weight: 600`, 白色 |
| 副标题 | `获取您的头像和昵称以展示`, `font-size: 22px`, `rgba(142,142,142,1)` |
| 头像占位 | 圆形，`161px`, `rgba(68,68,68,1)`；已有头像时可显示头像，但仍需保持圆形尺寸 |
| 输入行 | 胶囊背景 `rgba(38,38,38,1)`, `border-radius: 43px`, 宽约 `541px`, padding `25px 30px` |
| 第一行 | label `昵称`, value 当前昵称，右侧编辑图标 |
| 第二行 | label `个性签名`, value 当前签名或 placeholder，右侧编辑图标 |
| 保存按钮 | 白底黑字，圆角 `40px`，文案 `保存`，不是 `保存信息` |

### 验收标准

- 点击 `编辑个人资料` 后弹窗包含 `昵称` 和 `个性签名` 两行。
- 输入签名后点击 `保存`，弹窗关闭并更新本地 `userInfo.signature`。
- 空签名允许保存；昵称仍保留非空校验。
- 保存按钮文案必须为 `保存`。
- 弹窗视觉必须接近蓝湖：双胶囊输入行、右侧编辑图标、卡片垂直高度覆盖两行输入。
- 截图落盘为 `cc-next-user-edit-signature-modal.png`。

## P1-USER-003：编辑弹窗视觉结构仍偏离蓝湖

当前弹窗可用，但不是蓝湖结构：

- 当前有右上角关闭图标，蓝湖弹窗没有明显关闭图标。是否保留需要产品确认。
- 当前昵称输入是下划线式结构，蓝湖是深色胶囊输入行。
- 当前按钮文案为 `保存信息`，蓝湖为 `保存`。
- 当前弹窗内容高度偏短，因为少了签名行；补签名后需要重新检查卡片高度和按钮位置。

修改建议：

- 先按 P0 补齐签名行和保存文案。
- 再将 `.input-group` 从下划线样式改为胶囊样式。
- 若保留关闭按钮，视觉上不能压到标题区域；并在文档里标记为产品适配。

## P1-USER-004：用户主页入口图标需要按状态切换

蓝湖 `我要入驻` 态的第 5 个入口是握手图标；`主办中心` 态是主办中心/组织节点类图标。当前运行态始终展示主办中心类图标。

修改建议：

- 非主办方：使用握手图标，文案 `我要入驻`。
- 主办方：使用当前主办中心图标，文案 `主办中心`。
- 如果缺握手图标，优先复用蓝湖切图或现有资源，不要用文字占位。

## P0-USER-006：订单核销入口需要按核销员身份控制

产品已确认：`订单核销` 的入口是用户主页左上角 `扫一扫`，开通核销员身份后才有，普通用户没有。

### 当前新增反馈

用户再次确认：蓝湖个人中心左上角的 `扫一扫` 和 `客服` 图标目前都还没有添加。不能只在文档里说明核销入口，也不能只实现核销页；必须在用户主页顶部导航左侧实际渲染这两个操作入口。

当前代码证据：

```text
src/pages/user/index.tsx:602  <View className="nav-side" />
src/pages/user/index.tsx:610  <View className="nav-side" />
src/pages/user/index.scss:25  .nav-side { width: 80px; height: 100%; }
```

左侧 `nav-side` 为空，未渲染任何扫码或客服按钮。

修改建议：

- 用户主页读取/模拟 `isVerifier` 或 `verifierStatus`。
- active 核销员展示左上角 `扫一扫`。
- 用户主页左上角同时展示 `客服` 图标，客服与扫码横向并列。
- 普通用户不展示订单核销入口；如果保留普通扫码入口，也不得进入订单核销。
- 点击 `扫一扫` 后进入 `pages/user-sub/organizer/index?view=verify&source=userScan`，由 organizer 内部进入 `verify` 视图。
- 扫码结果通过 mock adapter 映射 success/failed/invalidCode。
- 不要把 `订单核销` 作为普通用户功能区常驻入口。

验收标准：

- 普通用户主页无订单核销入口。
- 核销员主页左上角有 `扫一扫` 和 `客服` 两个图标。
- 普通用户主页左上角至少有 `客服`；若未开通核销员身份，不展示订单核销扫码入口。
- 点击后可进入蓝湖 `管理后台-核销` 风格页面。
- 取消扫码、扫码失败、无效码不崩溃，有 Toast 或失败弹窗。
- 点击客服打开微信客服能力或项目已有客服承接；暂未接入时必须 Toast/TODO，不能无响应。

## P0-USER-008：用户主页左上角客服入口未实现

### 用户可见问题

蓝湖个人中心顶部左侧有两个入口：左为扫码，右为客服。当前实现左侧导航位为空，导致用户无法从个人中心进入客服。

### 修改指导

- 在 `custom-nav-bar` 左侧 `nav-side` 中渲染一组 `top-action-icons`。
- 第一个图标为扫码，按 `P0-USER-006` 的核销员身份规则展示。
- 第二个图标为客服，常驻展示，至少对登录用户展示。
- 客服入口优先使用微信原生客服能力，例如透明 `Button openType='contact'` 覆盖图标点击热区。
- 若当前小程序客服能力未配置，第一轮保留图标并 Toast `客服功能待接入`，同时写 TODO；不要让点击无反馈。
- 两个图标必须是图标按钮，不要放文字，不要放进功能区卡片。

### 视觉验收

- 图标位于顶部左侧，和蓝湖 `029-user-center-organizer-entry.png` / `057-user-center-variant.png` 一致。
- 图标为白色线性风格，尺寸、间距和导航行高度一致。
- 图标不会挤压中间 HYPER logo，不会与右侧微信胶囊菜单重叠。
- 点击热区不小于 `44px x 44px` 或等效 rpx。
- 需要补两张截图：
  - `cc-next-user-home-top-actions-verifier.png`
  - `cc-next-user-home-top-actions-normal.png`

## P1-USER-007：新增核销记录入口

产品已确认：`核销记录` 是查看记录入口，可在用户主页功能区这一排增加。

修改建议：

- 仅核销员用户展示 `核销记录`。
- 点击 `核销记录` 进入 `pages/user-sub/organizer/index?view=verifyRecords&source=userNav`。
- 如果暂时没有独立 `verifyRecords`，可先进入 `verify` 视图并定位到 `已核销` 列表。
- `核销记录` 不触发扫码，不进入手动核销弹窗。
- 一行入口超过 5 个时需避免挤压，可用横向滚动或条件替换，最终以视觉验收为准。

验收标准：

- 核销员用户可以从功能区进入核销记录列表。
- 普通用户看不到 `核销记录`。
- 记录列表展示 mock 数据、empty/loading/error。
- 功能区文字不挤压、不换行重叠。

## P2-USER-005：用户主页数据态需要补充 populated state 回归截图

当前运行态是空活动状态：

```text
我订阅的活动（0）
暂无参加过的活动
去首页或活动列表看看吧
```

蓝湖个人中心参考图展示的是有订阅活动海报堆叠的 populated state。这个差异可能只是当前账号数据为空，不一定是实现错误。

下一轮建议：

- 额外用 mock 数据或测试账号截一张有活动堆叠的用户主页。
- 验证海报堆叠、`20+` 角标、卡片高度和底部导航是否与蓝湖一致。
- 不作为本轮 P0 阻塞，但需要在最终视觉验收中补齐。

## 给 Claude Code 的下一轮执行顺序

1. 先修 `P0-USER-008`：用户主页左上角 `扫一扫` + `客服` 两个图标。
2. 再修 `P0-USER-001`：`我要入驻` / `主办中心` 入口状态切换。
3. 再修 `P0-USER-006`：核销员左上角 `扫一扫` 订单核销入口和 mock 核销承接。
4. 再修 `P0-USER-002`：签名编辑完整闭环。
5. 再补 `我要入驻` 后的申请表单，字段配置按 `user-entry-and-settlement-spec.md` 做 mock-first。
6. 再修 `P1-USER-003`：弹窗胶囊输入样式和保存文案。
7. 再修 `P1-USER-004`：第 5 个入口图标随状态切换。
8. 再修 `P1-USER-007`：核销记录入口。
9. 最后补 `P2-USER-005`：用户主页 populated state 回归截图。

## 禁止事项

- 不要重构整个用户页。
- 不要修改全局 request 封装。
- 不要凭空编造真实后端接口字段；`signature` 字段可先按现有 `UserProfile.signature` 使用并保留 TODO。
- 不要把入驻状态做成复杂 RBAC；本轮只需要 `我要入驻` / `主办中心` 两态能跑通。
- 不要只改文案不改点击行为。
- 不要只加签名输入框不处理保存后的本地回显。
- 不要把订单核销入口暴露给普通用户。
- 不要把核销记录入口做成扫码入口。
- 不要漏掉左上角客服按钮。
- 不要把客服按钮做成跳转核销、入驻或设置。

## 仍需确认

- 后端 `/api/v1/user/info` 是否支持 `signature` 字段写入。
- 用户信息中主办方状态字段最终使用 `is_merchant`、`merchant_id`、`organizer_status` 还是其他字段。
- 入驻申请表单最终字段需要黄总确认。
- 入驻申请表单后续是否需要独立 app 路由，目前建议先不新增。
- 核销员身份字段最终使用哪个后端字段。
- 审核中/审核未通过时，第 5 个入口文案是否仍显示 `我要入驻`，还是显示 `审核中` / `重新入驻`。
- 编辑弹窗是否保留右上角关闭按钮。
