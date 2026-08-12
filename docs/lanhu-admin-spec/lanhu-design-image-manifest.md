# 蓝湖设计图图片清单

生成时间：2026-05-30  
图片目录：`docs/lanhu-admin-spec/assets/lanhu-designs/`  
用途：提供给具备多模态能力的 Claude Code 作为视觉还原的一手材料。  
图片来源：蓝湖 `SketchCover` 高分辨率整图，已下载为本地 PNG。  

## 使用规则

1. 多模态模型实现或评审时，应优先查看本清单中的蓝湖设计图。
2. `admin-pages/*.json` 和 `admin-pages/*.md` 仍用于补充尺寸、交互、状态机和数据契约。
3. 当前运行态截图位于 `docs/lanhu-admin-spec/assets/runtime-review/`，用于和蓝湖图做 before/after 对比。
4. 蓝湖页面名有时不等于实际视觉内容，必须同时看 `lanhuIndex`、图片和备注。
5. 本目录下图片只作为规格材料，不要直接作为小程序业务资源引用。

## 重点入口

| 任务 | 必看蓝湖图 |
| --- | --- |
| 核销员管理 | `005-verifier-list.png`, `008-add-verifier.png` |
| 账户页返工 | `009-account-home.png`, `006-account-withdrawal-view.png`, `007-account-withdrawal-edit.png` |
| 后台首页 | `036-admin-home-one-screen.png`, `039-admin-home-listed.png` |
| 活动中心 | `047-activity-empty.png`, `038-activity-status-list.png`, `025-activity-search-input.png`, `040-activity-search-keyboard.png`, `026-activity-date-filter-empty.png`, `027-activity-date-filter.png`, `031-date-filter-start.png`, `041-date-filter-end.png`, `045-date-filter-echo.png`, `046-activity-filter-panel.png`, `032-activity-filter-selected.png`, `042-activity-filter-echo.png`, `043-activity-reset-echo.png`, `044-activity-search-result-duplicate.png` |
| 活动发布 | `030-create-info-step1.png`, `034-activity-search-result-tall.png`, `035-create-venue-setting.png`, `033-create-upload-poster.png`, `037-activity-search-result.png`, `028-create-ticket-config.png` |
| 核销 | `019-verify-ticket-base.png`, `010-verify-ticket-variant.png`, `011-verify-success.png`, `013-verify-repeat.png`, `015-verify-failed.png`, `016-verify-invalid-code.png` |
| 审核状态 | `023-audit-pending.png`, `024-audit-rejected.png` |

## 图片总表

| 蓝湖索引 | 蓝湖页面名 | 本地图片 | 尺寸 | 对应规格 |
| --- | --- | --- | --- | --- |
| 5 | 核销员列表 | [005-verifier-list.png](assets/lanhu-designs/005-verifier-list.png) | 1500x3248 | `add-verifier.json` / need-human-confirm |
| 6 | 后台主页-提现信息 | [006-account-withdrawal-view.png](assets/lanhu-designs/006-account-withdrawal-view.png) | 1500x3248 | `account-withdrawal-info.json` |
| 7 | 后台主页-修改提现信息 | [007-account-withdrawal-edit.png](assets/lanhu-designs/007-account-withdrawal-edit.png) | 1500x3248 | `account-withdrawal-edit.json` |
| 8 | 管理后台（派对/活动）-添加核销员 | [008-add-verifier.png](assets/lanhu-designs/008-add-verifier.png) | 1500x3248 | `add-verifier.json` |
| 9 | 后台主页 | [009-account-home.png](assets/lanhu-designs/009-account-home.png) | 1500x3248 | `account-home.json` |
| 10 | 管理后台-核销 | [010-verify-ticket-variant.png](assets/lanhu-designs/010-verify-ticket-variant.png) | 1500x3248 | `verify-ticket.json` / variant |
| 11 | 管理后台-核销成功 | [011-verify-success.png](assets/lanhu-designs/011-verify-success.png) | 1500x3248 | `verify-success.json` |
| 13 | 管理后台-已核销二次核销 | [013-verify-repeat.png](assets/lanhu-designs/013-verify-repeat.png) | 1500x3248 | `verify-failed.json` / `verify-invalid-code.json` supplement |
| 15 | 管理后台-核销失败 | [015-verify-failed.png](assets/lanhu-designs/015-verify-failed.png) | 1500x3248 | `verify-failed.json` |
| 16 | 管理后台-核销失败-无效码 | [016-verify-invalid-code.png](assets/lanhu-designs/016-verify-invalid-code.png) | 1500x3248 | `verify-invalid-code.json` |
| 19 | 管理后台-核销 | [019-verify-ticket-base.png](assets/lanhu-designs/019-verify-ticket-base.png) | 1500x3248 | `verify-ticket.json` |
| 23 | 审核中 | [023-audit-pending.png](assets/lanhu-designs/023-audit-pending.png) | 1500x3248 | `audit-pending.json` |
| 24 | 审核未通过 | [024-audit-rejected.png](assets/lanhu-designs/024-audit-rejected.png) | 1500x3248 | `audit-rejected.json` |
| 25 | 活动中心（搜索输入状态） | [025-activity-search-input.png](assets/lanhu-designs/025-activity-search-input.png) | 1500x3248 | `activity-center-search-input.json` |
| 26 | 活动中心（时间筛选-清空态） | [026-activity-date-filter-empty.png](assets/lanhu-designs/026-activity-date-filter-empty.png) | 1500x3248 | `activity-center-date-filter.json` |
| 27 | 活动中心（时间筛选） | [027-activity-date-filter.png](assets/lanhu-designs/027-activity-date-filter.png) | 1500x3248 | `activity-center-date-filter.json` |
| 28 | 活动发布票券配置 | [028-create-ticket-config.png](assets/lanhu-designs/028-create-ticket-config.png) | 1500x5878 | `activity-create-ticket-config.json` |
| 30 | 管理后台（派对/活动） | [030-create-info-step1.png](assets/lanhu-designs/030-create-info-step1.png) | 1500x3684 | `activity-create-info.json`；实际是发布 Step 1 |
| 31 | 时间筛选-开始时间选择态 | [031-date-filter-start.png](assets/lanhu-designs/031-date-filter-start.png) | 1500x3248 | `activity-center-date-filter.json` |
| 32 | 活动中心（筛选选中） | [032-activity-filter-selected.png](assets/lanhu-designs/032-activity-filter-selected.png) | 1500x3248 | `activity-center-filter-selected.json` |
| 33 | 活动发布上传海报 | [033-create-upload-poster.png](assets/lanhu-designs/033-create-upload-poster.png) | 1500x3866 | `activity-create-upload-poster.json` |
| 34 | 活动中心-搜索回显 | [034-activity-search-result-tall.png](assets/lanhu-designs/034-activity-search-result-tall.png) | 1500x4422 | 文件名/蓝湖名疑似不准；实际画面是发布 Step 1 空表单 |
| 35 | 活动发布场地设定 | [035-create-venue-setting.png](assets/lanhu-designs/035-create-venue-setting.png) | 1500x3248 | `activity-create-venue-setting.json` |
| 36 | 一屏幕显 | [036-admin-home-one-screen.png](assets/lanhu-designs/036-admin-home-one-screen.png) | 1500x3248 | `admin-home-empty.json`；实际是后台首页一屏态 |
| 37 | 活动中心-搜索回显 | [037-activity-search-result.png](assets/lanhu-designs/037-activity-search-result.png) | 1500x3248 | 文件名/蓝湖名疑似不准；实际画面是发布 Step 5 活动资质 |
| 38 | 活动中心（活动状态） | [038-activity-status-list.png](assets/lanhu-designs/038-activity-status-list.png) | 1500x3248 | `activity-center-search-result.json` / `audit-*` |
| 39 | 存在上架活动状态 | [039-admin-home-listed.png](assets/lanhu-designs/039-admin-home-listed.png) | 1500x3248 | `admin-home-listed.json` |
| 40 | 活动中心（搜索键盘唤醒状态） | [040-activity-search-keyboard.png](assets/lanhu-designs/040-activity-search-keyboard.png) | 1500x3248 | `activity-center-search-input.json` |
| 41 | 时间筛选-结束时间选择态 | [041-date-filter-end.png](assets/lanhu-designs/041-date-filter-end.png) | 1500x3248 | `activity-center-date-filter.json` |
| 42 | 活动中心-筛选回显 | [042-activity-filter-echo.png](assets/lanhu-designs/042-activity-filter-echo.png) | 1500x3248 | `activity-center-filter-selected.json` |
| 43 | 活动中心（重制回显） | [043-activity-reset-echo.png](assets/lanhu-designs/043-activity-reset-echo.png) | 1500x3248 | `activity-center-filter-panel.json` |
| 44 | 活动中心-搜索回显 | [044-activity-search-result-duplicate.png](assets/lanhu-designs/044-activity-search-result-duplicate.png) | 1500x3248 | `activity-center-search-result.json` |
| 45 | 时间筛选-回显 | [045-date-filter-echo.png](assets/lanhu-designs/045-date-filter-echo.png) | 1500x3248 | `activity-center-date-filter.json` |
| 46 | 活动中心（筛选） | [046-activity-filter-panel.png](assets/lanhu-designs/046-activity-filter-panel.png) | 1500x3248 | `activity-center-filter-panel.json` |
| 47 | 活动中心（空态） | [047-activity-empty.png](assets/lanhu-designs/047-activity-empty.png) | 1500x3248 | `activity-center-empty.json` |

## 逐图用途说明

后续 Claude Code 不得只看“重点入口”中的少数图片。下面 35 张图都属于本轮后台管理交付材料，必须按当前 Batch 或当前页面逐张对照。

| 图片 | 后台模块 | 画面/状态说明 | Claude Code 使用方式 |
| --- | --- | --- | --- |
| `005-verifier-list.png` | 核销员管理 | 核销管理 tab 下的核销员列表，包含核销员姓名、手机号、激活状态、渠道、所属活动和删除入口。 | 用于验收核销员列表行布局、状态色、文字密度和删除/渠道入口；不要误当作新增核销员弹窗。 |
| `006-account-withdrawal-view.png` | 账户 | 账户页上的提现信息查看弹窗/浮层，展示收款人、收款账户、银行信息和“修改提现信息”按钮。 | 用于验收提现信息查看态；字段只读，按钮进入编辑态，继续 mock-first。 |
| `007-account-withdrawal-edit.png` | 账户 | 提现信息编辑弹窗/浮层，包含收款人、收款账户、银行信息等输入框和“提交修改”。 | 用于验收提现编辑表单、输入框高度、底部主按钮和最小非空校验。 |
| `008-add-verifier.png` | 核销员管理 | 添加核销员表单态，包含所属主办方、核销人员姓名、手机号、清空和提交按钮，下方保留入口卡片。 | 用于实现/验收添加核销员弹窗或表单区域；字段规则无法确认时只做 minimal validation。 |
| `009-account-home.png` | 账户 | 账户 tab 主页面，包含主办方信息卡、基本信息卡、账户信息卡。 | 账户页主验收图；必须删除当前蓝湖没有的付款信息、付费记录和独立安全性 section。 |
| `010-verify-ticket-variant.png` | 核销 | 订单核销页上的核销结果确认弹窗变体，背景是核销列表，弹窗包含票券信息、继续核销和取消。 | 与 `019`、`011` 一起用于验收核销弹窗层级、遮罩、按钮样式和重复提交防护。 |
| `011-verify-success.png` | 核销 | 识别成功/确认核销弹窗，展示票券卡片和“确认核销”主按钮。 | 用于验收扫码或输入券码后的成功识别态；确认后再进入已核销反馈或刷新列表。 |
| `013-verify-repeat.png` | 核销 | 已核销二次核销失败弹窗，提示订单已完成核销，不能再次核销。 | 用于验收重复核销异常态；必须展示明确失败原因和“我知道了”反馈。 |
| `015-verify-failed.png` | 核销 | 核销失败弹窗，原因是非可核销时间内，并展示票券卡片。 | 用于验收失败态弹窗内容、票券摘要和错误原因优先级。 |
| `016-verify-invalid-code.png` | 核销 | 核销失败弹窗，原因是无效订单码/二维码/条形码无法识别。 | 用于验收无效码异常态；不要把无效码和重复核销合并成同一文案。 |
| `019-verify-ticket-base.png` | 核销 | 订单核销基础页，顶部显示已核销列表和“查看更多”，底部是扫码核销胶囊按钮。 | 核销页基础态主图；用于验收列表卡片、底部扫码按钮、手动输入入口和页面密度。 |
| `023-audit-pending.png` | 审核状态 | 入驻申请审核中状态页，中心图标、审核中标题、预计时长说明、底部“我知道了”按钮。 | 用于验收审核中空白态/状态页；不需要接真实审核接口，状态来源先 mock。 |
| `024-audit-rejected.png` | 审核状态 | 入驻申请审核未通过状态页，展示失败原因和底部“重新申请”按钮。 | 用于验收未通过状态页和重新申请入口；失败原因字段需后端确认。 |
| `025-activity-search-input.png` | 活动中心 | 活动中心搜索输入且键盘展开，列表按关键词过滤。 | 用于验收搜索框聚焦态、键盘遮挡、列表结果区域和搜索按钮行为。 |
| `026-activity-date-filter-empty.png` | 活动中心 | 日期筛选面板清空态，开始/结束日期为空，日历和清空/应用按钮可见。 | 用于验收时间筛选空态、日历间距、底部按钮和“关闭”入口。 |
| `027-activity-date-filter.png` | 活动中心 | 日期筛选基础态，未选择或待选择日期范围。 | 用于验收日期筛选面板默认布局；与 `026`、`031`、`041`、`045` 组合实现完整状态。 |
| `028-create-ticket-config.png` | 活动发布 | 活动发布 Step 4 票券配置长页，包含票种、价格、库存、开售时间、状态等配置。 | 用于验收票券配置表单、增删票种、启用/禁用、长页面滚动和底部操作区。 |
| `030-create-info-step1.png` | 活动发布 | 活动发布 Step 1，包含活动名称、分享标题、活动日期、实名/未成年人开关、富文本概要等。 | Step 1 主图；用于修复底部遮挡、滚动复位、输入框高度和富文本区域。 |
| `031-date-filter-start.png` | 活动中心 | 日期筛选开始日期已选态，开始日期显示具体日期，结束日期未选。 | 用于验收开始日期选择后的回显、选中态和后续结束日期选择流程。 |
| `032-activity-filter-selected.png` | 活动中心 | 筛选面板多选选中态，审核状态和活动状态有勾选项，底部重置/应用。 | 用于验收筛选项选中样式、复选框、日期入口和应用后的过滤行为。 |
| `033-create-upload-poster.png` | 活动发布 | 活动发布 Step 3 上传海报，包含活动详情页海报、活动详情长图、分享图、图文资料等多个上传卡片。 | 用于验收上传卡片、文件大小提示、可选/必填状态、上传/删除/替换交互。 |
| `034-activity-search-result-tall.png` | 活动发布 | 文件名/蓝湖名写“搜索回显”，但真实画面是活动发布 Step 1 空表单长图。 | 不要按文件名实现活动中心；作为 Step 1 空值态补充图，对比 `030` 的填写态/长页细节。 |
| `035-create-venue-setting.png` | 活动发布 | 活动发布 Step 2 场地设定，包含城市/地区、详细地址、地图定位和上一步/下一步。 | 用于验收地图区域、地址输入、定位标记、底部按钮和页面固定/滚动关系。 |
| `036-admin-home-one-screen.png` | 后台首页 | 后台首页一屏态/空活动态，包含活动数据、快速配置入口和“前往活动中心”。 | 后台首页主图之一；必须注意它不是发布 Step 1，映射曾经反过。 |
| `037-activity-search-result.png` | 活动发布 | 文件名/蓝湖名写“搜索回显”，但真实画面是活动发布 Step 5 活动资质上传/提交审核。 | 作为活动发布最后一步主图；用于验收资质上传卡片、上一步和提交审核按钮。 |
| `038-activity-status-list.png` | 活动中心 | 活动中心列表态，展示多个活动卡片、状态文案、右下 FAB。 | 活动中心列表主图；用于验收卡片宽度、列表密度、状态颜色和 FAB 不挤压卡片。 |
| `039-admin-home-listed.png` | 后台首页 | 后台首页已有上架活动状态，顶部上架活动列表、活动数据、快速配置入口。 | 与 `036` 共同验收首页空态/有数据态切换。 |
| `040-activity-search-keyboard.png` | 活动中心 | 活动中心搜索框聚焦键盘唤醒态，列表显示，键盘覆盖底部区域。 | 用于验收键盘弹出后页面高度、列表可见区和搜索输入行为。 |
| `041-date-filter-end.png` | 活动中心 | 日期筛选结束日期选择态，开始日期已选，结束日期待选/选中。 | 用于验收日期范围选择第二步，不要只实现单日筛选。 |
| `042-activity-filter-echo.png` | 活动中心 | 筛选回显后的活动中心结果页，搜索/筛选栏保留，列表结果较少，FAB 可见。 | 用于验收筛选应用后的列表回显和空白区域处理。 |
| `043-activity-reset-echo.png` | 活动中心 | 筛选面板重置回显态，筛选项回到未选，日期输入保留占位。 | 用于验收重置按钮行为；重置后清空本地 filterState 并恢复列表。 |
| `044-activity-search-result-duplicate.png` | 活动中心 | 蓝湖与 `042` 使用同一张来源图，代表搜索/筛选回显的单条结果态。 | 保留用于对应蓝湖页面 ID；实现时可复用 `042` 验收，不要重复写两套逻辑。 |
| `045-date-filter-echo.png` | 活动中心 | 日期范围选择完成后的回显态，开始/结束日期都有值。 | 用于验收日期筛选应用前后的回显和本地过滤结果。 |
| `046-activity-filter-panel.png` | 活动中心 | 筛选面板基础态，审核状态、活动状态、时间入口、重置/应用按钮。 | 用于验收筛选面板默认状态，必须与 `032` 选中态和 `043` 重置态闭环。 |
| `047-activity-empty.png` | 活动中心 | 活动中心空态，顶部 tabs 和搜索栏保留，中间“暂无活动”，红色“新增活动”按钮。 | 活动中心空态主图；用于验收没有 mock 数据或过滤无结果时的展示。 |

## 已知注意事项

- `030-create-info-step1.png` 的蓝湖页面名不是“活动发布 Step 1”，但实际视觉内容是发布向导 Step 1。
- `036-admin-home-one-screen.png` 的蓝湖页面名含“一屏幕显”，实际视觉内容是后台首页一屏态。
- `010-verify-ticket-variant.png` 和 `019-verify-ticket-base.png` 都叫“管理后台-核销”，需同时看图判断具体状态。
- `044-activity-search-result-duplicate.png` 与 `042-activity-filter-echo.png` 来源图片相同，保留是为了对应蓝湖不同页面 ID。
- `034-activity-search-result-tall.png` 和 `037-activity-search-result.png` 的蓝湖名称/本地文件名与真实画面不一致；实现时以图片真实内容和上方逐图说明为准。
