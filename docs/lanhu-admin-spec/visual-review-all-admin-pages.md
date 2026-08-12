# 管理后台全量视觉评审与修改意见

> 过期提示：2026-05-29 已完成新的蓝湖全量视觉复核，后续以 `visual-review-lanhu-full-compare.md` 为准。本文件保留为历史记录，其中部分页面覆盖结论已经不适用于当前 Claude Code 最新实现。

生成时间：2026-05-28  
评审范围：`docs/lanhu-admin-spec/admin-pages/` 下 21 个后台管理规格页  
评审方式：微信开发者工具运行态截图 + 当前 `src/pages/user-sub/organizer/` 代码只读审阅  
业务代码改动：无

> 本文件是 `visual-review-batch1.md` 之后的全量复核结果。Batch 1 中“首页活动卡片缺封面/活动时间”“首页右侧入口文案不一致”等问题在当前运行态已基本修复，本文件以当前实现为准。

## 证据截图

已保存到 `docs/lanhu-admin-spec/assets/runtime-review/`：

- `all-admin-home.png`：后台首页，覆盖 `admin-home-empty` / `admin-home-listed` 当前有数据状态。
- `all-activity-center.png`：活动中心列表，覆盖搜索入口、审核中、审核未通过、已下架、待发布、已结束卡片。
- `all-activity-filter-panel.png`：活动中心筛选面板。
- `all-activity-date-filter.png`：活动中心日期筛选弹层。
- `all-create-step1-info.png`：活动发布 Step 1 基础信息。
- `all-verify-ticket.png`：订单核销页。
- `all-add-verifier-modal.png`：新增核销员弹窗。
- `all-account-main.png`：账户中心。
- `all-account-withdrawal-info.png`：提现信息查看弹窗。
- `all-account-withdrawal-edit.png`：提现信息编辑弹窗。

## 页面覆盖结论

| 规格页 | 运行态覆盖 | 当前结论 | 备注 |
| --- | --- | --- | --- |
| `admin-home-empty` | 部分 | 需补空态验证入口 | 当前 mock 默认有活动，未触发首页空态。 |
| `admin-home-listed` | 是 | 基本通过，有 P2 数据问题 | 卡片封面、上架时间、活动时间、入口文案已出现。 |
| `activity-center-empty` | 部分 | 需补空态验证入口 | 当前 mock 默认有活动，空态分支未运行验证。 |
| `activity-center-search-input` | 是 | 基本通过 | 搜索框可见。 |
| `activity-center-search-result` | 代码审阅 | 需补运行态截图 | 过滤逻辑存在，未落搜索结果截图。 |
| `activity-center-filter-panel` | 是 | 有 P2 文案/布局建议 | 见下方问题 A3、A4。 |
| `activity-center-filter-selected` | 部分 | 需补选择后截图 | 当前只截取了未选中面板。 |
| `activity-center-date-filter` | 是 | 基本通过，有 P2 层级确认项 | 日期弹层可打开。 |
| `activity-create-info` | 是 | 有 P2 可用性问题 | Step 1 可打开。 |
| `activity-create-venue-setting` | 代码审阅 | 需补运行态截图 | Step 1 校验阻挡，未直接进入 Step 2。 |
| `activity-create-upload-poster` | 代码审阅 | 有 P1 功能/视觉缺口 | 上传后只显示文件名，未见海报预览/删除/替换完整态。 |
| `activity-create-ticket-config` | 代码审阅 | 需补运行态截图 | Step 4 有实现，未运行触达。 |
| `add-verifier` | 是 | 有 P2 字段和弹窗样式建议 | 弹窗可打开。 |
| `verify-ticket` | 是 | 有 P1 视觉溢出问题 | 核销卡片右侧状态被裁切。 |
| `verify-success` | 代码审阅 | 需补可测入口 | 依赖 `scanCode` 返回，运行态未能稳定触发。 |
| `verify-failed` | 代码审阅 | 需补可测入口 | 同上。 |
| `verify-invalid-code` | 代码审阅 | 需补可测入口 | 同上。 |
| `account-withdrawal-info` | 是 | 有 P2 弹窗层级建议 | 可打开。 |
| `account-withdrawal-edit` | 是 | 有 P2 弹窗层级/字段建议 | 可打开。 |
| `audit-pending` | 是 | 基本通过 | 活动中心列表中可见审核中状态。 |
| `audit-rejected` | 是 | 有 P1 遮挡问题 | 活动中心列表中拒绝原因被 FAB 干扰。 |

## 修改意见

### P1：必须先处理

#### A1. 活动中心 FAB 遮挡列表内容和审核未通过原因

影响页面：

- `activity-center-empty`
- `activity-center-search-result`
- `activity-center-filter-selected`
- `audit-rejected`

现象：

- `all-activity-center.png` 中红色 FAB 压在第五张“审核未通过”卡片右侧，拒绝原因靠近底部时阅读被干扰。
- 当前 `showFAB` 已避开筛选面板，但没有避开列表底部内容。

代码定位：

- `src/pages/user-sub/organizer/activities/index.tsx:218`：`showFAB` 仅判断 tab 和 `filterPanelOpen`。
- `src/pages/user-sub/organizer/activities/index.tsx:406`：FAB 渲染在列表上层。
- `src/pages/user-sub/organizer/index.scss:865`：`.floating-plus-button` 绝对定位。
- `src/pages/user-sub/organizer/index.scss:1353`：`.organizer-safe-bottom` 当前高度为 `0`。

建议：

- 将活动列表底部安全区恢复为足够高度，例如 `large` 至少覆盖 FAB 高度 + bottom nav 高度。
- 或者让 FAB 在滚动到底部、筛选/日期/搜索空态、审核未通过原因区域显示时下移/隐藏。
- 验收标准：`audit-rejected` 卡片拒绝原因完整可读，FAB 不压住卡片文字、箭头或底部导航。

#### A2. 核销页卡片右侧状态文字被裁切，页面宽度适配有风险

影响页面：

- `verify-ticket`
- `verify-success`
- `verify-failed`
- `verify-invalid-code`

现象：

- `all-verify-ticket.png` 中核销列表卡片右侧的“核销成功”靠近屏幕右侧，视觉上有被裁切风险。
- 卡片整体宽度和字号使用 px，当前 Taro/weapp 容器是移动端宽度，容易在真机尺寸变化时溢出。

代码定位：

- `src/pages/user-sub/organizer/verify/index.tsx:38`：核销卡片结构。
- `src/pages/user-sub/organizer/verify/index.scss:111`：`.verify-ticket-card`。
- `src/pages/user-sub/organizer/verify/index.scss:123`：封面固定 `136px`。
- `src/pages/user-sub/organizer/verify/index.scss:185`：状态文本 `white-space: nowrap`。

建议：

- 优先把 `verify/index.scss` 中页面级宽高、卡片、封面、字体单位从设计稿 px 按项目规范转换为 rpx 或响应式约束。
- 卡片右侧状态应设置最大宽度或让标题区域压缩，保证状态完整可见。
- 核销成功/失败弹窗中的票券卡也复用同一约束，避免弹窗内横向溢出。

#### A3. 上传海报 Step 3 缺少上传后视觉闭环

影响页面：

- `activity-create-upload-poster`

现象：

- 代码中上传区域只在上传后展示 `已上传: 文件名`，没有海报缩略图、替换、删除入口。
- 这对“上传海报”页面视觉验收不够，用户无法确认列表页海报、分享图、详情长图是否正确。

代码定位：

- `src/pages/user-sub/organizer/index.tsx:948`：Step 3 上传区域。
- `src/pages/user-sub/organizer/index.scss:1163`：上传区域样式。

建议：

- 上传后展示缩略图或文件卡，至少包含文件名、尺寸提示、替换、删除。
- 三类图片建议分别标明用途：列表页海报、活动分享图、活动详情长图。
- 第一轮仍可 mock 上传，但视觉上要有上传前/上传后两个状态。

### P2：建议本轮补齐

#### A4. 首页统计数据与活动 mock 数据不一致

影响页面：

- `admin-home-listed`

现象：

- 首页已有上架活动，但活动数据仍显示 `0 / 0.00 / 0`。
- 当前 mock 活动里已有订单、销售额、订阅量字段，首页统计不应保持全零。

代码定位：

- `src/pages/user-sub/organizer/mock.ts:20`：`organizerStats` 全部为 0。
- `src/pages/user-sub/organizer/mock.ts:38`、`:39`、`:40`：活动本身已有非零数据。
- `src/pages/user-sub/organizer/home/index.tsx:107`：今日订单展示。
- `src/pages/user-sub/organizer/home/index.tsx:111`：今日销售展示。
- `src/pages/user-sub/organizer/home/index.tsx:115`：订阅量展示。

建议：

- mock-first 阶段可直接让 `organizerStats` 使用非零 mock。
- 或在 adapter 中从 mock activities 聚合出统计值，避免静态数据不一致。
- 若蓝湖 listed 首页期望固定展示 `8213 / 43 / 72` 这类设计值，需在规格内标注为视觉占位数据。

#### A5. 首页统计第三项文案与设计语义需确认

影响页面：

- `admin-home-listed`
- `admin-home-empty`

现象：

- 当前文案为“专区订阅量”，规格/后台首页语义更接近“活动订阅量”。

代码定位：

- `src/pages/user-sub/organizer/home/index.tsx:116`

建议：

- 按蓝湖最终稿统一文案。若后端字段是主办方专区订阅，则保留“专区订阅量”；若是活动粒度，则改为“活动订阅量”。
- 在 `needs-human-confirm.md` 或后续 Claude Code 输出中保留产品确认项。

#### A6. 筛选面板“重制”应改为“重置”

影响页面：

- `activity-center-filter-panel`
- `activity-center-filter-selected`

现象：

- `all-activity-filter-panel.png` 中底部按钮显示“重制”，应为常规筛选动作“重置”。

代码定位：

- `src/pages/user-sub/organizer/activities/index.tsx:370`

建议：

- 修改为“重置”。
- 同时确认蓝湖文案是否为“重置/清空”，保持筛选和日期弹层一致。

#### A7. 日期筛选弹层层级正确，但筛选面板仍在背景中，需确认是否符合设计

影响页面：

- `activity-center-date-filter`

现象：

- `all-activity-date-filter.png` 中日期范围弹层打开时，筛选面板被遮罩压暗但仍作为背景存在。
- 如果蓝湖设计为从筛选面板内嵌日期选择，这个表现可接受；如果是全屏独立日期弹层，应关闭筛选面板或隐藏其内容。

代码定位：

- `src/pages/user-sub/organizer/index.tsx:407`：统一 `openCalendar`。
- `src/pages/user-sub/organizer/index.tsx:1488`：日历弹层和页面其他浮层并列渲染。

建议：

- 保留当前实现前，需用蓝湖 `activity-center-date-filter` 再确认遮罩层级。
- 验收时重点看“关闭/清除/应用”操作后是否回到筛选面板并回填日期。

#### A8. 发布向导 Step 1 校验阻挡后续步骤运行态检查，需要测试态入口

影响页面：

- `activity-create-info`
- `activity-create-venue-setting`
- `activity-create-upload-poster`
- `activity-create-ticket-config`

现象：

- `all-create-step1-info.png` 可见 Step 1，但运行态不易进入 Step 2/3/4，因为 Step 1 校验要求活动名称、分享标题和富文本概要。
- 微信开发者工具自动化对 Taro `Editor` 输入不稳定，导致后续步骤截图只能通过代码审阅覆盖。

代码定位：

- `src/pages/user-sub/organizer/index.tsx:699`：Step 1 校验。
- `src/pages/user-sub/organizer/index.tsx:737`：下一步逻辑。
- `src/pages/user-sub/organizer/index.tsx:895`：Step 2。
- `src/pages/user-sub/organizer/index.tsx:948`：Step 3。
- `src/pages/user-sub/organizer/index.tsx:968`：Step 4。

建议：

- Claude Code 下一轮可以加仅开发态可用的 mock prefill 或内部跳步调试入口，但不要暴露给正式用户。
- 或者在 adapter/mock 中预置草稿，进入创建向导时可选择“继续编辑草稿”以覆盖 Step 2/3/4 视觉。

#### A9. 核销“手动输入验证券码”实际调用扫码，文案和交互不一致

影响页面：

- `verify-ticket`
- `verify-success`
- `verify-failed`
- `verify-invalid-code`

现象：

- 按钮文案是“手动输入验证券码”，但点击逻辑调用 `Taro.scanCode`。
- 成功、失败、无效码弹窗都依赖扫码返回特殊 code，微信开发者工具里不容易触发。

代码定位：

- `src/pages/user-sub/organizer/verify/index.tsx:74`：`handleScanCode`。
- `src/pages/user-sub/organizer/verify/index.tsx:184`：按钮文案和点击事件。
- `src/pages/user-sub/organizer/verify/index.tsx:117`：弹窗状态配置。

建议：

- 若设计要求手动输入，应增加券码输入弹窗/底部面板，再调用 mock adapter 验证。
- 若设计要求扫码，应把按钮文案改为“扫码核销”或另增“手动输入”入口。
- 为 mock-first 阶段提供三组测试券码：success、out_of_time、invalid_code，用于稳定复现三个弹窗视觉。

#### A10. 新增核销员弹窗字段少于后台管理规格

影响页面：

- `add-verifier`

现象：

- 当前弹窗只有所属主办方、姓名、手机号。
- 规格中还提到活动范围、渠道、权限范围等字段需要确认/补齐。

代码定位：

- `src/pages/user-sub/organizer/verify/index.tsx:242`
- `src/pages/user-sub/organizer/verify/index.scss:383`

建议：

- 第一轮 mock 可保留姓名/手机号最小表单，但文档和 UI 需明确这是 MVP。
- 如果蓝湖添加核销员页面有活动范围/渠道选择，应在 Batch 4 补齐。

#### A11. 提现弹窗像页面内上浮卡片，需确认是否应为居中弹窗或底部弹层

影响页面：

- `account-withdrawal-info`
- `account-withdrawal-edit`

现象：

- `all-account-withdrawal-info.png` 和 `all-account-withdrawal-edit.png` 中弹窗覆盖在账户页顶部，底部仍能看到账户列表和底部导航。
- 视觉上更像页面内卡片，而不是完整遮罩居中弹窗。

代码定位：

- `src/pages/user-sub/organizer/account/index.tsx:160`：查看弹窗。
- `src/pages/user-sub/organizer/account/index.tsx:192`：编辑弹窗。
- `src/pages/user-sub/organizer/account/index.scss:163`：`.account-modal-overlay`。
- `src/pages/user-sub/organizer/account/index.scss:176`：`.account-modal-card`。

建议：

- 对照蓝湖确认弹窗形态：居中弹窗、底部弹层、还是页内展开卡。
- 如果是弹窗，应确保 overlay 全屏遮罩、内容垂直居中或按设计底部贴边，并避免底部导航抢视觉焦点。

#### A12. 审核未通过 mock 数据字段不一致，可能影响筛选视觉结果

影响页面：

- `audit-rejected`
- `activity-center-filter-selected`

现象：

- 活动卡片可显示“审核未通过”，但 mock 数据中该项 `auditStatus` 仍为 `pending`。
- 筛选按审核状态时可能无法正确筛出“审核未通过”状态。

代码定位：

- `src/pages/user-sub/organizer/mock.ts:95`：`status: 'rejected'`。
- `src/pages/user-sub/organizer/mock.ts:96`：`auditStatus: 'pending'`。

建议：

- 将 rejected 活动的筛选字段与展示字段统一。
- 如果审核状态枚举没有 rejected，应明确由 `status` 还是 `auditStatus` 驱动筛选。

### P3：后续打磨

#### A13. 首页空态、活动中心空态没有运行态截图入口

影响页面：

- `admin-home-empty`
- `activity-center-empty`

建议：

- 增加 mock adapter 的空数据模式或开发态 query 参数，便于微信开发者工具稳定截图。
- 验收时需要同时覆盖 loading、empty、error 三态。

#### A14. 活动发布 Step 2/3/4 建议补齐运行态截图后再做视觉微调

影响页面：

- `activity-create-venue-setting`
- `activity-create-upload-poster`
- `activity-create-ticket-config`

建议：

- 当前只完成代码审阅，下一轮实现前应先打开对应步骤截图。
- 如果不加测试态跳步入口，Claude Code 容易只根据静态 JSON 调样式，忽略真机滚动、底部按钮和地图/上传组件高度。

## Claude Code 下一轮建议

1. 先处理 P1：
   - 活动中心 FAB 遮挡。
   - 核销页卡片宽度/文字裁切。
   - 上传海报上传后状态。
2. 再处理 P2：
   - 首页统计 mock 数据。
   - “重制”改“重置”。
   - 手动输入券码与扫码交互统一。
   - 提现弹窗形态确认后微调。
3. 为后续视觉验收补测试态能力：
   - mock 空数据模式。
   - 发布向导预填/跳步模式。
   - 核销成功/失败/无效码 mock 触发入口。

## 不建议本轮扩大范围

- 不建议新增独立后台路由，当前 21 个页面都可以先继续收敛在 `pages/user-sub/organizer/index` 内部视图。
- 不建议接真实后端接口，仍按 `backend-not-ready-strategy.md` 的 mock-first adapter 方案推进。
- 不建议重构全局 request、app config 或非后台页面。
