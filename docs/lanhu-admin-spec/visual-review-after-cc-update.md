# Claude Code 二轮更新后视觉评审

> 过期提示：2026-05-29 已完成新的蓝湖全量视觉复核，后续以 `visual-review-lanhu-full-compare.md` 为准。本文件保留为历史记录，其中“核销页横向溢出”“活动中心 FAB 遮挡”等判断已被新快照进一步细化或修正。

生成时间：2026-05-29  
评审对象：Claude Code 完成 Batch 0/1 后又一轮更新的管理后台运行态页面  
评审方式：微信开发者工具 MCP 运行态截图 + 当前 `src/pages/user-sub/organizer/` 代码只读审阅  
业务代码改动：无

## 证据截图

本轮截图已保存到 `docs/lanhu-admin-spec/assets/runtime-review/`：

| 截图 | 覆盖页面 / 状态 |
| --- | --- |
| `cc2-admin-home.png` | 后台首页 |
| `cc2-activity-center.png` | 活动中心列表 |
| `cc2-filter-panel.png` | 活动中心筛选面板 |
| `cc2-date-picker.png` | 日期入口点击后的当前表现 |
| `cc2-create-step1.png` | 活动发布 Step 1 |
| `cc2-create-step2.png` | 活动发布 Step 2 |
| `cc2-create-step3.png` | 活动发布 Step 3 |
| `cc2-create-step4.png` | 活动发布 Step 4 |
| `cc2-account.png` | 账户页 |
| `cc2-withdrawal-modal-2.png` | 提现信息弹窗 |
| `cc2-verify-entry.png` | 核销员管理列表 |
| `cc2-verify-ticket.png` | 订单核销页 |
| `cc2-verify-manual-modal.png` | 手动输入券码弹窗 |

同时保存了若干 `cc2-snapshot-*.txt/json` 页面快照，用于定位元素位置和溢出问题。

## 本轮已修复 / 有明显进展

1. 后台首页统计已从全 0 改为非零 mock 数据：`82 / 4360.00 / 72`，并且第三项文案已是“活动订阅量”。
2. 活动中心筛选按钮文案已从“重制”修正为“重置”。
3. `rejected` 活动的 `auditStatus` 已统一为 `rejected`，审核未通过筛选的数据字段冲突已修复。
4. 活动发布 Step 3 已出现上传后状态：首个海报位有文件态，并提供“替换 / 删除”；其他海报位仍有上传入口。
5. 核销页已区分“扫码核销”和“手动输入验证券码”，手动券码弹窗已可打开。
6. 新增核销员表单已补充渠道和权限范围字段。
7. 提现信息已改成更明确的遮罩弹窗，较上一轮“页内上浮卡片”形态更接近弹窗。

## P1 必须优先处理

### V1. 订单核销页横向溢出，右侧状态和“查看更多”被裁切

影响规格页：

- `verify-ticket`
- `verify-success`
- `verify-failed`
- `verify-invalid-code`

运行态证据：

- `cc2-verify-ticket.png` 中“查看更多”和每张票券卡右侧“核销成功”贴到屏幕右边并被裁切。
- `cc2-snapshot-verify.txt` 显示：
  - `scroll-view#_gI` 宽度为 `464`，已经超过 430 宽视口。
  - `view#_fL` 票券卡位置为 `left=17 width=430`，右边界为 447。
  - `text#_es` “查看更多”位置为 `left=391 width=56`，右边界为 447。
  - `text#_ey` “核销成功”位置为 `left=382 width=52`，右边界为 434。

代码定位：

- `src/pages/user-sub/organizer/verify/index.scss:71`：`.verify-scroll` 设置了左右 padding。
- `src/pages/user-sub/organizer/verify/index.scss:81`：`.verify-section-header` 使用 `width: 100%`。
- `src/pages/user-sub/organizer/verify/index.scss:109`：`.verify-ticket-card` 未限制为可视区内宽度。
- `src/pages/user-sub/organizer/verify/index.scss:184`：`.verify-ticket-status` 虽有 `max-width`，但父容器已经溢出。

建议：

- 不要让 `ScrollView` padding 与子节点 `width: 100%` 叠加导致内容宽度超过屏幕。
- 可选方案：
  - 去掉 `.verify-scroll` 的左右 padding，改为给内部 header/card/button 统一设置 `margin: 0 30rpx`。
  - 或保持 padding，但所有一级子元素设置 `width: auto; box-sizing: border-box;`，避免 `left + width` 超出视口。
- 验收标准：
  - `cc2-snapshot-verify.txt` 中票券卡、header、按钮右边界不得超过 430。
  - “查看更多”“核销成功”完整可读，不贴边、不裁切。

### V2. 活动发布向导切换步骤后没有回到顶部，Step 2/3/4 首屏被截断

影响规格页：

- `activity-create-venue-setting`
- `activity-create-upload-poster`
- `activity-create-ticket-config`

运行态证据：

- `cc2-create-step2.png` 首屏从“地区 / 当前坐标地址”中段开始，步骤条和页面顶部字段不在视口内。
- `cc2-create-step3.png` 首屏从海报列表中段开始，顶部“活动详情页海报”标题被截断。
- `cc2-create-step4.png` 首屏从“开售时间”开始，票券配置顶部字段被截断。
- 快照中 Step 3 的步骤条 `view#_KM` 位置为 `top=-158`，说明滚动位置沿用了上一页。

代码定位：

- `src/pages/user-sub/organizer/index.tsx:1411`：`renderCreateWizard` 使用同一个 `ScrollView`。
- `src/pages/user-sub/organizer/index.tsx:1422`：上一步只 `setWizardStep`，未重置滚动。
- `src/pages/user-sub/organizer/index.tsx:1427`：下一步只触发 `handleNextStep`，未重置滚动。

建议：

- 切换 `wizardStep` 时强制滚动到顶部。
- 可选方案：
  - 使用受控 `scrollTop`，每次 step 变化设置为 0。
  - 使用 `scrollIntoView` 指向步骤顶部锚点。
  - 或给 Step 内容容器加 `key={wizardStep}` 触发重挂载，但需要验证微信端滚动是否重置。
- 验收标准：
  - 从 Step 1 点“下一步”进入 Step 2 后，首屏必须看到步骤条和 Step 2 顶部字段。
  - Step 3/4 同理，不允许顶部标题和第一组字段被截断。

### V3. 发布向导内出现 `DEBUG: 点击步骤跳转` 文案

影响规格页：

- `activity-create-info`
- `activity-create-venue-setting`
- `activity-create-upload-poster`
- `activity-create-ticket-config`
- `audit-pending` / `audit-rejected` 相关发布闭环

运行态证据：

- `cc2-snapshot-create1.txt`、`cc2-snapshot-create2.txt`、`cc2-snapshot-create3.txt` 均包含 `DEBUG: 点击步骤跳转`。
- Step 2 快照中该文案位置为 `top=2`，理论上可能在真机顶部闪现或被导航栏遮挡。

代码定位：

- 需要 Claude Code 在 `src/pages/user-sub/organizer/index.tsx` 中搜索 `DEBUG: 点击步骤跳转`。

建议：

- 删除该调试文案，或仅在明确的开发态调试开关下渲染，并且不参与正式布局高度计算。
- 验收标准：运行态快照不再出现 `DEBUG:` 文案。

### V4. 发布向导“预览”FAB 压住底部“下一步”按钮

影响规格页：

- `activity-create-venue-setting`
- `activity-create-upload-poster`
- `activity-create-ticket-config`

运行态证据：

- `cc2-create-step2.png`、`cc2-create-step3.png`、`cc2-create-step4.png` 中红色“预览”按钮压在“下一步”按钮右下区域。

代码定位：

- `src/pages/user-sub/organizer/index.tsx:1420`：wizard footer。
- `src/pages/user-sub/organizer/index.scss:865`：`.floating-plus-button` 绝对定位样式也被用于浮动按钮体系。

建议：

- 发布向导的“预览”不应复用活动列表 FAB 的固定位置。
- 可选方案：
  - 把“预览”并入 footer，形成“上一步 / 预览 / 下一步”或“预览 + 下一步”组合。
  - 在 Step 2/3/4 隐藏浮动预览，仅保留底部按钮。
  - 将预览按钮上移，但需保证不遮挡表单、地图、上传区和票券配置。
- 验收标准：任一 Step 首屏和底部区域中，“预览”不得遮挡“下一步”、表单字段或地图/上传组件。

### V5. 活动中心 FAB 仍压在审核未通过卡片上

影响规格页：

- `activity-center-search-result`
- `activity-center-filter-selected`
- `audit-rejected`

运行态证据：

- `cc2-activity-center.png` 中红色 `+` FAB 仍覆盖审核未通过卡片右侧区域；拒绝原因虽然左侧可读，但右侧操作箭头和卡片区域被占用。

代码定位：

- `src/pages/user-sub/organizer/activities/index.tsx`：活动中心 FAB 渲染。
- `src/pages/user-sub/organizer/index.scss:865`：`.floating-plus-button`。
- `src/pages/user-sub/organizer/index.scss:1445`：`.organizer-safe-bottom.large` 已增高，但不能解决首屏中部覆盖。

建议：

- 活动中心列表中，FAB 应只悬浮在空白区域，不能压住卡片。
- 可选方案：
  - 审核未通过卡片进入 FAB 覆盖区时隐藏 FAB。
  - 将新增活动入口改为顶部或底部固定按钮。
  - 调整列表默认排序，让长卡片不落在 FAB 热区，但这只是规避，不是根治。
- 验收标准：任何列表卡片文字、箭头、状态标签都不被 FAB 遮挡。

## P2 建议本轮一起处理

### V6. 手动券码弹窗直接展示测试券码，需限定为开发态

影响规格页：

- `verify-ticket`
- `verify-success`
- `verify-failed`
- `verify-invalid-code`

运行态证据：

- `cc2-verify-manual-modal.png` 中展示“测试券码: 成功任意码 / invalid / reverify / expired”。

代码定位：

- `src/pages/user-sub/organizer/verify/index.tsx:361` 至 `:364`。

建议：

- mock-first 阶段可以保留测试码，但必须受开发态或调试开关控制。
- 正式视觉验收版本不应向用户展示 mock 错误码。
- 验收标准：默认运行态不出现测试券码说明；开发态如需出现，应有明确开关。

### V7. 日期筛选入口本轮未能稳定打开日期面板

影响规格页：

- `activity-center-date-filter`

运行态证据：

- 点击筛选面板的“开始时间-结束时间”后，`cc2-date-picker.png` 仍停留在筛选面板，没有出现日期选择器。

注意：

- 本项可能是 MCP 点击命中了容器但没有触发内部事件，也可能是运行态入口事件绑定问题。需要 Claude Code 用真机或开发者工具手动复核。

建议：

- 复核日期输入区域点击热区，确保点文字、点黑色输入框、点日历 icon 都能打开日期面板。
- 验收标准：日期面板可稳定打开，选择后能回填筛选面板并应用过滤。

## 仍需补充覆盖的状态

以下状态本轮没有完整运行态覆盖，后续继续按 mock-first 方式补测试入口：

- 首页空态 `admin-home-empty`。
- 活动中心空态 `activity-center-empty`。
- 活动中心筛选选中态 `activity-center-filter-selected`。
- 核销成功 / 失败 / 无效码弹窗的实际提交后状态。
- 活动发布 Step 5 和最终“提交审核”后的状态页。

## Claude Code 下一轮建议

推荐按以下顺序处理，不要扩大到真实后端：

1. 修复核销页横向溢出，先保证 430 宽视口所有元素不裁切。
2. 修复发布向导 Step 切换滚动位置，删除 `DEBUG:` 文案。
3. 重新设计发布向导“预览”按钮位置，避免遮挡底部操作。
4. 处理活动中心 FAB 遮挡卡片。
5. 将手动券码测试码文案改成开发态可见。
6. 手动复核日期筛选入口，若确认为事件问题再修复。

## 不建议本轮做的事

- 不接真实后端接口，继续使用 `backend-not-ready-strategy.md` 中的 mock-first adapter 策略。
- 不新增独立后台路由。
- 不重构全局 request、app config 或非后台页面。
- 不为了视觉问题重写整个 organizer 页面；优先做局部布局和状态修复。
