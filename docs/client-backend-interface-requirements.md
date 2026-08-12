# 客户端后端接口需求清单

本文整理微信小程序客户端已接入或已预留，但需要后端提供、确认或补齐的接口契约。默认请求头：

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## P0 必须确认

### 1. 地图标记筛选

客户端页面：`src/pages/index/index.tsx`

```http
GET /api/v1/map/markers?source=all&limit=200&category_id=1&district_id=2&area_id=3&tag_ids=1,2
```

请求参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| source | string | 是 | 当前固定 `all` |
| limit | number | 否 | 当前客户端传 `200` |
| category_id | number | 否 | 分类 ID |
| district_id | number | 否 | 行政区 ID |
| area_id | number | 否 | 商圈/区域 ID |
| tag_ids | string | 否 | 逗号分隔标签 ID |

响应字段要求：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| source | string | `activity` / `venue` / `merchant` 等 |
| source_id | number/string | 详情页跳转 ID |
| title | string | 标记标题 |
| lat/lng | number | GCJ-02 坐标 |
| category_id | number/array | 用于客户端兜底过滤 |
| district_id | number | 用于客户端兜底过滤 |
| area_id | number | 用于客户端兜底过滤 |
| tag_ids | number[]/string | 用于客户端兜底过滤 |

客户端当前处理：已传筛选参数；如果后端暂未过滤，会按响应中的分类/区域/标签字段做兜底过滤。若响应不带这些字段，客户端不会强行过滤该项。

### 2. 活动/场地列表筛选

客户端页面：`src/pages/activity-list/index.tsx`

```http
GET /api/v1/merchant/list?category=1,2&sort=distance&lat=30.657&lng=104.066&district_id=2&area_id=3&tag_ids=1,2
```

请求参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| category | string | 否 | 逗号分隔分类 ID |
| sort | string | 否 | `distance` / `popularity` / `rating` |
| lat/lng | number | 否 | 距离排序坐标 |
| district_id | number | 否 | 行政区 ID |
| area_id | number | 否 | 商圈/区域 ID |
| tag_ids | string | 否 | 逗号分隔标签 ID |

响应字段要求同地图标记，至少需要 `id/title/type/location/lat/lng/cover_image/current_count/post_count/user_id/username/user_avatar/is_follow/is_subscribe`。如后端过滤未上线，请返回 `category_id/district_id/area_id/tag_ids` 供客户端兜底。

### 3. 积分余额与下单抵扣

客户端页面：`src/pages/activity/index.tsx`

#### 查询积分余额

```http
GET /api/v1/points/balance
```

期望响应：

```json
{
  "code": 200,
  "data": {
    "balance": 1200
  }
}
```

兼容字段：客户端也会读取 `points`、`available_points`、`available`。

#### 创建订单时使用积分

客户端已在创建订单时传入：

```http
POST /api/v1/order/create
```

新增/需确认字段：

```json
{
  "activity_id": 1,
  "ticket_spec_id": 10,
  "quantity": 1,
  "buyer_name": "张三",
  "buyer_id_card": "510xxxxxxxxxxxxx",
  "use_points": true,
  "points_amount": 100
}
```

后端需要确认：

| 项 | 要求 |
| --- | --- |
| 抵扣比例 | 当前客户端按 `10 积分 = 1 元` 估算展示 |
| 校验 | 后端必须校验积分余额、可抵扣上限、活动是否允许抵扣 |
| 响应 | 建议返回 `order_no/total_price/points_amount/points_discount/actual_price` |
| 失败 | 积分不足或不可用时返回明确 `msg`，客户端会提示 |

客户端当前处理：如果后端忽略 `use_points/points_amount`，客户端仍可完成原价下单，但实际抵扣不会生效。

### 4. 用户售后订单列表

客户端当前已经在订单详情中完成退款申请、进度和取消退款。若产品仍需要独立“售后订单”模块，需要后端提供用户侧售后列表：

```http
GET /api/v1/refund/list?page=1&size=10&status=0
```

建议响应：

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "refund_no": "R20260611120000abcd",
        "order_no": "O20260611115900abcd",
        "status": 1,
        "status_text": "退款中",
        "refund_amount": 8800,
        "reason": "行程冲突",
        "created_at": "2026-06-11T12:00:00+08:00",
        "updated_at": "2026-06-11T12:05:00+08:00",
        "activity": {
          "id": 1,
          "name": "活动名称",
          "poster_list": "https://..."
        }
      }
    ],
    "total": 1
  }
}
```

状态建议沿用现有退款状态：`0 待审核`、`1 退款中`、`2 已退款`、`3 已驳回`、`4 已取消`。

### 5. 订单详情返回退款单号

客户端页面：`src/pages/order-sub/order-detail/index.tsx`

```http
GET /api/v1/order/:order_no
```

退款中或已退款订单建议返回：

```json
{
  "code": 200,
  "data": {
    "order_no": "O20260611115900abcd",
    "status": 4,
    "refund_no": "R20260611120000abcd",
    "refund": {
      "refund_no": "R20260611120000abcd",
      "status": 1,
      "status_text": "退款中"
    }
  }
}
```

客户端当前兼容读取：`refund_no`、`refund.refund_no`、`refund_order.refund_no`。

### 6. 用户动态删除

客户端页面：`src/pages/user/index.tsx`

```http
DELETE /api/v1/note/:id
```

要求：

| 项 | 要求 |
| --- | --- |
| 鉴权 | 仅允许删除当前登录用户自己的动态 |
| 成功响应 | `{ "code": 200, "msg": "删除成功" }` |
| 失败响应 | 非作者、已删除、不存在需返回明确 `msg` |
| 数据处理 | 建议软删除，避免破坏评论、点赞、转发卡片关联 |

客户端当前处理：成功后本地移除动态；接口不存在或失败时提示“删除失败，后端接口未开放”。

## P0 已接入但需保持契约稳定

### 7. 退款流程

客户端页面：`src/pages/order-sub/order-detail/index.tsx`

| 功能 | 接口 | 方法 | 关键字段 |
| --- | --- | --- | --- |
| 退款原因 | `/api/v1/refund/reasons` | GET | `id/name` 或 `id/reason` |
| 提交退款 | `/api/v1/refund/apply` | POST | `order_no/reason_id`，返回 `refund_no` |
| 退款详情 | `/api/v1/refund/:refund_no` | GET | `status/status_text/reason/updated_at` |
| 取消退款 | `/api/v1/refund/:refund_no/cancel` | POST | 成功后订单恢复待使用 |

### 8. 活动订阅列表

客户端页面：`src/pages/search/index.tsx`、`src/pages/user/index.tsx`

```http
GET /api/v1/activity/subscriptions?page=1&pageSize=20
```

响应结构：

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 10,
        "name": "jjjj",
        "poster_list": "https://...",
        "start_time": "2026-06-13T16:51:00+08:00",
        "end_time": "2026-06-19T16:51:00+08:00",
        "status": 3,
        "is_subscribe": true
      }
    ],
    "total": 1
  }
}
```

客户端当前使用 `id/name/poster_list` 展示订阅活动入口；旧字段 `title/cover_image/type` 仅作为兼容兜底。

客户端当前判断：`type` 包含 `场地` / `venue` / `club` 时跳场地详情，否则跳活动详情。

### 9. 我的参加活动来源

客户端页面：`src/pages/user/index.tsx`

```http
GET /api/v1/order/list?page=1&size=50
```

响应项需要包含活动信息，客户端会从 `status=1` 待使用和 `status=2` 已使用订单派生“我参加过的活动”：

```json
{
  "order_no": "O20260611115900abcd",
  "status": 1,
  "activity": {
    "id": 1,
    "name": "活动名称",
    "poster_list": "https://..."
  }
}
```

### 10. 消息已读和发送后会话刷新

客户端页面：`src/pages/message/index.tsx`、`src/pages/chat/index.tsx`

| 功能 | 接口 | 方法 | 说明 |
| --- | --- | --- | --- |
| 会话列表 | `/api/v1/session/` | GET | 返回 `list[].unread/peer_id/session_type/last_msg` |
| 清空未读 | `/api/v1/session/clear-unread` | POST | 支持单会话清空；客户端“一键已读”会逐会话调用 |
| 发送消息 | `/api/v1/message/send` | POST | 成功返回后客户端触发会话列表刷新 |

活动分享通过该接口发送 `msg_type=9`、`ext.card_type=activity_forward` 的卡片消息，并携带唯一 `client_msg_id`。后端必须在接口可用前启动消息队列生产者；若返回 `producer is not running`，表示消息生产者未运行，客户端无法完成投递，需要后端恢复生产者及其消息队列连接。

建议后端后续提供批量已读接口以减少请求数：

```http
POST /api/v1/session/clear-all-unread
```

## P1 建议补强

### 11. 支付预支付参数完整性

客户端页面：`src/pages/activity/index.tsx`

```http
POST /api/v1/pay/prepay
```

必须返回微信支付所需字段：

```json
{
  "code": 200,
  "data": {
    "timeStamp": "1718080000",
    "nonceStr": "random",
    "package": "prepay_id=xxx",
    "signType": "RSA",
    "paySign": "signature",
    "out_trade_no": "O20260611115900abcd"
  }
}
```

客户端已校验 `timeStamp/noncestr/package/signType/paySign`，缺失会中断支付并提示。

### 12. 主办方与核销员接口

客户端页面：`src/pages/user-sub/organizer/*`、`src/pages/user-sub/verifier-bind/*`

当前沿用 `ticketing_api.md` 中已有接口，需保持字段稳定：

| 功能 | 接口 |
| --- | --- |
| 主办方信息 | `GET /api/v1/organizer/info` |
| 入驻申请 | `POST /api/v1/organizer/apply` |
| 审核状态 | `GET /api/v1/organizer/audit-status` |
| 核销员列表 | `GET /api/v1/organizer/verifiers` |
| 添加核销员 | `POST /api/v1/organizer/verifier` |
| 删除核销员 | `DELETE /api/v1/organizer/verifier/:id` |
| 查询核销员激活信息 | `GET /api/v1/verifier/activation-info?v=<v>` |
| 激活核销员 | `POST /api/v1/verifier/activate` |
| 扫码识别 | `POST /api/v1/verifier/scan` |
| 确认核销 | `POST /api/v1/verifier/confirm` |
| 核销记录 | `GET /api/v1/verifier/verified-list` |

核销员绑定页从扫码参数 `options.scene` 中解析 `v`，通过激活信息接口读取 `organizer_name`。确认绑定时激活接口仅提交 `{ "phone": "手机号" }`；微信渠道由后端默认处理，客户端不提交主办方名称。

### 13. 腾讯地图暗色样式

这不是业务后端接口，但需要平台侧配置：小程序地图 `layerStyle` 已通过 `YDY_TENCENT_MAP_LAYER_STYLE` 接入。需要在腾讯位置服务控制台配置对应地图样式 ID，并确保小程序 `subkey` 有权限使用。

## 客户端降级策略汇总

| 能力 | 后端未提供时客户端行为 |
| --- | --- |
| 地图/列表筛选 | 已传参；若响应带筛选字段则本地兜底过滤，否则展示后端返回列表 |
| 积分抵扣 | 可展示余额；下单字段若被忽略则按原价支付 |
| 售后列表 | 当前不新增独立页面，退款能力在订单详情内完成 |
| 退款详情 | 无 `refund_no` 时仅展示“退款申请已提交/退款中” |
| 动态删除 | 接口失败则不删除本地卡片并提示后端未开放 |
| 消息一键已读 | 逐会话调用 `clear-unread`；失败则回滚未读状态 |
