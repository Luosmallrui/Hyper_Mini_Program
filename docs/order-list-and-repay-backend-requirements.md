# 订单列表与重新支付后端需求

本文整理微信小程序订单页当前需要后端确认或补齐的接口契约。客户端页面：

- `src/pages/order/index.tsx`
- `src/pages/order/status.ts`

默认请求头：

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 1. 订单列表筛选

接口：

```http
GET /api/v1/order/list
```

客户端当前会按以下方式请求：

```http
GET /api/v1/order/list?page=1&size=10
GET /api/v1/order/list?page=1&size=10&status=0
GET /api/v1/order/list?page=1&size=10&refund_status=refunding
```

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | number | 是 | 页码，从 `1` 开始 |
| size | number | 是 | 每页数量，当前客户端传 `10` |
| status | number | 否 | 普通订单状态筛选 |
| refund_status | string | 否 | 退款/售后状态筛选 |

### 状态映射

普通订单状态：

| status | 客户端 tab | 说明 |
| --- | --- | --- |
| 0 | 待支付 | 已创建但未完成支付 |
| 1 | 待使用 | 已支付，待核销/入场 |
| 2 | 已使用 | 已核销/已入场 |
| 3 | 已取消 | 已取消 |
| 4 | 退款中 | 兼容旧状态；优先建议用 `refund_status=refunding` |
| 5 | 已退款 | 兼容旧状态；优先建议用 `refund_status=refunded` |
| 6 | 已驳回 | 兼容旧状态；优先建议用 `refund_status=rejected` |

退款状态：

| refund_status | 客户端 tab | 说明 |
| --- | --- | --- |
| pending_review | 待审核 | 退款申请待审核 |
| refunding | 退款中 | 退款处理中 |
| refunded | 已退款 | 退款已完成 |
| rejected | 已驳回 | 退款申请被驳回 |
| cancelled | 已取消 | 退款申请已取消 |

### 筛选行为要求

- 不传 `status` 和 `refund_status` 时返回全部订单。
- 传 `status=0` 时必须返回待支付订单。
- 传 `status=1` 时必须返回待使用订单。
- 传 `status=2` 时必须返回已使用订单。
- 传 `refund_status=pending_review/refunding/refunded/rejected/cancelled` 时返回对应售后状态订单。
- 如果订单带有效 `refund_status`，建议在普通状态筛选中排除，避免同一订单同时出现在“待使用”和“退款中”等 tab。

### 响应结构

期望稳定返回：

```json
{
  "code": 200,
  "data": {
    "list": [],
    "total": 0
  }
}
```

每个订单至少需要以下字段：

```json
{
  "order_no": "T20260619145616f26eeff2",
  "status": 0,
  "refund_status": "",
  "actual_price": 100,
  "total_price": 100,
  "quantity": 1,
  "buyer_name": "张三",
  "buyer_id_card": "5001********0817",
  "created_at": "2026-06-19T14:56:00+08:00",
  "activity": {
    "id": 10,
    "name": "jjjj",
    "poster_list": "https://..."
  },
  "ticket_spec": {
    "id": 1,
    "name": "1元"
  }
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| order_no | string | 是 | 订单号，用于详情页和继续支付 |
| status | number | 是 | 普通订单状态 |
| refund_status | string | 否 | 退款状态，无退款时可为空字符串或不返回 |
| actual_price | number | 是 | 实付金额，单位：分 |
| total_price | number | 是 | 原订单总额，单位：分 |
| quantity | number | 是 | 票数 |
| buyer_name | string | 是 | 购票人姓名 |
| buyer_id_card | string | 是 | 脱敏证件号 |
| created_at | string | 是 | 下单时间 |
| activity.id | number/string | 是 | 活动 ID |
| activity.name | string | 是 | 活动名 |
| activity.poster_list | string | 否 | 订单卡片封面 |
| ticket_spec.id | number/string | 否 | 票档 ID |
| ticket_spec.name | string | 否 | 票档名 |

## 2. 待支付订单重新支付

接口：

```http
POST /api/v1/pay/prepay
```

请求体：

```json
{
  "order_no": "T20260619145616f26eeff2"
}
```

后端要求：

- 对已有待支付订单重新生成或返回微信支付参数。
- 不要重新创建订单。
- 仅 `status=0` 的订单允许重新支付。
- 已支付、已取消、退款中、已退款等订单应返回明确错误信息。

期望响应：

```json
{
  "code": 200,
  "data": {
    "timeStamp": "1781929913",
    "nonceStr": "random-string",
    "package": "prepay_id=wx...",
    "signType": "RSA",
    "paySign": "signature",
    "out_trade_no": "T20260619145616f26eeff2"
  }
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| timeStamp | string | 是 | 微信支付时间戳 |
| nonceStr | string | 是 | 随机串 |
| package | string | 是 | `prepay_id=...` |
| signType | string | 是 | 签名类型，通常为 `RSA` |
| paySign | string | 是 | 支付签名 |
| out_trade_no | string | 否 | 建议返回订单号，支付成功页会优先使用 |

失败示例：

```json
{
  "code": 400,
  "msg": "订单已支付，不能重复支付"
}
```

## 3. 前端当前兼容策略

订单页目前已做临时兼容：

- 状态 tab 会先请求后端筛选。
- 如果某个状态 tab 返回空，但“全部”里存在对应订单，客户端会拉取一页全部订单后按本地状态映射兜底过滤。
- 该兜底只适合短期兼容；后端仍需要正确支持 `status` 和 `refund_status` 筛选，否则分页场景下可能漏单。

## 4. 验收清单

- “全部”列表能看到所有订单。
- “待支付”列表能看到 `status=0` 的订单。
- “待使用”列表能看到 `status=1` 且无有效退款状态的订单。
- “已使用”列表能看到 `status=2` 且无有效退款状态的订单。
- “退款中/已退款/已驳回/已取消”列表能按 `refund_status` 返回对应订单。
- 待支付订单点击“继续支付”可以重新拉起微信支付。
- 非待支付订单调用 `/api/v1/pay/prepay` 时返回明确错误，不生成新的支付单。
