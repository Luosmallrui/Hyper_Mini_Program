# 后端接口修改需求（2026-08-18）

前端：Hyper_Mini_Program（微信小程序）
背景：订单详情页 / 订单核销页信息缺失，前端已做兼容映射，但需要后端补字段才能完整展示。

## 1. 核销记录列表：补活动 ID、购票手机号（必须）

`GET /api/v1/verifier/verified-list`

**现状**：列表项仅返回 `order_no` / `activity_name` / `ticket_spec_name` / `quantity` / `buyer_name_masked` / `buyer_id_card_masked` / `poster_list`。

**需要补充**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `activity_id` | number | 活动 ID。核销记录卡片需要点击跳转对应活动详情页 |
| `buyer_phone_masked` | string | 购票人脱敏手机号（如 `138****5678`）。核销员需要核对购票人联系方式 |

**另外两点确认**：

- 海报字段：前端按 `poster_list` 读取（已兼容 `poster` / `activity_poster` / `cover_image` 及 JSON 数组串），请统一固定返回 `poster_list`。目前部分记录该字段为空，卡片封面显示不出来，请排查。
- 空列表时请返回 `code: 200` + `data: { "list": [] }`，不要返回 404 或「暂无记录」类错误码——空列表是正常状态不是异常（前端已兼容，但建议后端统一口径）。

## 2. 扫码识别接口：同步补字段（建议）

`POST /api/v1/verifier/scan`

响应里的 `order` 对象同样补 `activity_id`、`buyer_phone_masked`，与核销记录列表保持同一套字段，核销确认弹窗可直接复用展示。

## 3. 订单详情：活动地址为空（必须）

`GET /api/v1/order/{orderNo}`

**现状**：响应中 `activity.address` 为空，订单详情页地址栏空白（仅显示定位图标）。

**需求**：确认并在 `activity` 对象中返回活动地址。前端按 `activity.address` 读取，已兼容 `location_name` / `venue_name` 两个别名；如果你们用的字段名不在这三个里，告知前端即可。

参考：同接口 `activity` 对象目前已返回 `id` / `name` / `start_time` / `end_time` / `poster_list`，均可正常展示。

## 4. 场地主办方发布活动：允许自定义活动地址（必须，新需求）

`POST /api/v1/activity/create`（step 2）

**现状**：按 `docs/organizer_venue_activity_model_api_20260815.md` 的约定，场地主办方（`type=venue`）发布的活动固定使用已审核场地资料的地址与坐标，后端忽略/覆盖 step2 提交的位置字段。

**需求**：场地主办方发布活动时，允许通过地图选点更换活动地址：

- step2 请求体携带 `address` / `latitude` / `longitude`（可能还有 `district`）时，按提交值保存活动地址；
- step2 未携带位置字段时，维持现状（沿用已审核场地资料地址）；
- 前端已按此口径实现：未选点不提交 step2，选点后提交 step2。

**后端回复（2026-08-18，已改好）**：

- 场地主办方发布 party 活动时：不提交位置字段则继续继承已审核场地地址与坐标；提交任一位置字段则使用活动自身地址，不再被场地主资料覆盖。
- 自定义位置必须同时提交非空 `address`、`latitude`、`longitude`，并继续校验中国境内坐标。
- `province`、`city`、`district` 如前端提交，按活动自己的值保存。
- 不修改场地主办方固定地址；场地迁址仍需走资料二次审核。

前端确认：选点时三个字段（`address`/`latitude`/`longitude`）一定同时提交，与后端校验口径一致，无需改动。

## 5. 商家实时订单 / 核销员列表：补展示字段（建议）

管理后台「实时订单」「核销管理」改版需要以下字段，前端已做兼容映射（缺字段时不显示，不影响现有版本）：

`GET /api/v1/organizer/orders` 列表项：

| 字段 | 类型 | 说明 |
|---|---|---|
| `buyer_phone_masked` | string | 购票人脱敏手机号，订单详情弹层展示 |
| `poster_list` | string | 活动海报（单 URL 或 JSON 数组串均可），订单卡片/弹层封面 |
| `verified_at` | string | 核销时间（已核销订单），ISO 时间 |

`GET /api/v1/verifier/verified-list` 列表项（核销记录卡片已渲染该字段，当前接口未返回）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `verified_at` | string | 核销时间，ISO 时间。核销记录页「核销时间」一行需要它 |

另外确认一个权限问题：核销员/主办方点击核销记录卡片会跳转 `GET /api/v1/order/{orderNo}`（用户订单详情接口），但该订单属于购票人账号。请确认主办方/核销员凭自己的 token 可以读取归属自己活动的订单详情；如不支持，请放开或提供商家侧订单详情接口。

**后端回复（2026-08-18，已改好）**：

- `GET /api/v1/organizer/orders` 已新增 `buyer_phone_masked`、`poster_list`（空时回退其它海报字段）、`verified_at`（未核销为 null）。
- `GET /api/v1/organizer/verifiers` 已新增 `created_at`、`verified_count`（按核销记录累计统计）。
- 订单详情权限：用户侧 `GET /api/v1/order/:order_no` 仍仅购票人本人；新增角色接口——
  - 主办方：`GET /api/v1/organizer/orders/:order_no`
  - 已激活核销员：`GET /api/v1/verifier/orders/:order_no`（须携带核销员自己的 Authorization，仅可查看所属主办方活动的订单）
- 前端已按角色链接入：核销/管理后台进入订单详情时携带 `role=verifier`，依次尝试核销员接口（`X-Verifier-Id`）→ 主办方接口 → 用户接口。

`GET /api/v1/organizer/verifiers` 列表项：

| 字段 | 类型 | 说明 |
|---|---|---|
| `created_at` | string | 核销员添加时间，ISO 时间 |
| `verified_count` | number | 该核销员累计核销数 |

## 6. 管理后台筛选用字段 + 核销员抖音激活码（2026-08-19 补充）

1. **`GET /api/v1/organizer/activities`（我的活动列表）**：列表项请返回 `is_hidden`（平台下架标记）。前端「活动状态-下架」筛选依赖它；未返回时下架筛选恒为空。「结束」由前端按 `end_time < 当前时间` 推导，无需后端处理。
2. **`GET /api/v1/organizer/verifier/:id/activation-qr`**：`douyin_qr` 当前返回为空，前端弹窗显示「抖音二维码暂未生成」。请返回真实抖音激活二维码图片 URL；暂不展示静态示例图（避免误导）。
3. **`GET /api/v1/organizer/bank/withdraw/flow/list`**：用户反馈提现申请提交后「提现记录」为空。请确认响应列表字段名（前端按 `flow_list` 读取，已兼容 `list`/`records`），并确认申请提交后记录立即入列表；时间字段按 `create_time`/`arrival_time` 读取（已兼容 `created_at`/`paid_at`）。

## 无需后端修改（前端已自行解决，仅同步）

- 管理后台首页「今日订单 / 今日销售」：已改为前端调用 `GET /api/v1/organizer/orders/summary?start_date=今天&end_date=今天` 获取，与销售数据页同口径。
- 活动概要富文本：发布端写入 `description`（HTML），详情页 RichText 渲染，链路正常。

## 联系

有问题直接在群里 @前端，或在本文件上批注回复。

---

## 后端回复（2026-08-18，已补齐并验证 `go test ./handler ./service ./types ./dao`）

- `GET /api/v1/verifier/verified-list`
  - 新增 `activity_id`、`buyer_phone_masked`
  - 固定返回 `order_no`、`poster_list`；`poster_list` 为空时依次回退 `poster_detail`、`poster_wechat`、`poster_long`
  - 空列表返回 `200` + `data.list: []`
- `POST /api/v1/verifier/scan`
  - `order` 新增 `order_no`、`activity_id`、`poster_list`、`buyer_phone_masked`
- `GET /api/v1/order/:orderNo`
  - `activity` 新增 `address`（优先活动自身地址，为空回退主办方场地档案地址）；`poster_list` 同样加入海报回退
- 购票手机号取订单购票账号手机号并脱敏（如 `138****5678`）
- 接口文档：后端仓库 `docs/ticketing_api.md`

前端确认：以上字段与前端已上线的兼容映射一致，无需再改动，随当前版本直接生效。
