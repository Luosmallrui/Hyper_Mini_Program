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
