# 后端待修复 / 待确认事项

整理时间：2026-08-10（2026-08-13 追加）
整理人：罗 smallrui（小程序前端）

本文档汇总目前需要后端处理的事项，按优先级排列。P0 是影响线上功能的 bug，P1 需要确认部署/契约，P2 是可选增强。每条都附实测证据。

---

## 2026-08-13 追加（13 项对接中需要后端确认/处理的事项）

> 后端已于 2026-08-13 回复（`docs/backend_fix_requests_20260810_response_20260813.md`），以下为最终状态。

### A. `GET /api/v1/activity/my-list` 的 status 语义（✅ 已闭环）

后端确认：不传 `status` 返回当前商家**全部状态**的活动；子账号（`organizer_staff` 启用状态）自动归属同一组织。前端保持单请求拉全量 + 本地按 tab 过滤。若子账号仍空列表，按回复 §3.2 的 SQL 查 `organizer_staff.status` / `organizers.status/enabled`。

### B. 客服账号配置（待生产配置，非代码问题）

后端要求生产库配置 `customer_service_user_id=77`（SQL 见回复 §4；或管理端「系统配置」页的"客服聊天用户"字段，已上线）。配置后小程序客服入口即通。

### C. 内容关注字段（待后端建表部署）

`content_follows` 建表 SQL 执行 + 部署后生效；前端已按 `target_type`/`target_id` 传参并向前兼容，无需发版。

### D. 历史订单关联已删除活动（✅ 前端已按约定接入）

后端确认活动 8/9/10/13 已物理删除，部署后订单列表/详情返回兜底 `is_hidden=true, name='活动已下架', poster_list=''`。前端已按约定实现：

- 「我参加过的活动」卡片：`is_hidden` 为唯一下架判断，空海报用默认封面，叠加"已下架"遮罩；
- 活动详情页：已购票用户可见只读兜底详情，底部按钮变为置灰"活动已下架"，订阅/关注拦截提示，零值时间显示 `-`；
- 订单详情页：零值活动时间显示 `-`。


---

## P0 必修

### 1. `GET /api/v1/organizer/info` 返回 500

**实测**（携带有效商家 token）：

```json
{ "code": 500, "msg": "sql: expected 4 arguments, got 3" }
```

**影响**：小程序管理后台"账户"页的品牌卡（主办方名称、logo、认证状态、入驻天数、等级、服务费比例）全部拿不到数据。

**前端已做兜底**：该接口失败时改从 `GET /api/v1/organizer/profile` 读名称和 logo，页面不再显示假数据。但入驻天数/等级/服务费比例等字段只有 info 接口有，**请尽快修复这个 SQL 参数个数错误**（疑似 8 月上旬某次改动引入）。

> 状态更新（2026-08-11）：后端回执（`docs/frontend_api_updates_20260810_back.md`）称已修复，待线上回归确认。

---

### 2. `GET /api/v1/order/list` 的 `activity` 对象补 `poster_list`（下架活动也要返回）

> 状态更新（2026-08-11）：✅ 已闭环。后端已在订单 `activity` 对象稳定返回 `poster_list`、`is_hidden`、`hidden_reason`（含已下架活动）；且已支付/已核销/退款中/已退款/退款驳回的购票用户访问已下架活动详情不再返回"活动不存在"（仍不可重新购票、订阅、关注）。小程序端按 `poster_list` 出图、`is_hidden=true` 时卡片叠加"已下架"遮罩。
>
> **追加实测（2026-08-11 晚）**：字段结构已返回，但历史订单的 `activity` 是**零值对象**——以用户"树懒懒懒懒"的订单为例，活动 8/9/10/13 的 `name`、`poster_list` 均为空串，`start_time`/`end_time` 为 `0001-01-01T00:00:00Z`，`is_hidden` 为 `false`。同时 `GET /api/v1/activity/{8,9,10,13}`（无 token 公开访问）全部返回 `{"code":500,"msg":"活动不存在"}`。看起来订单的 activity 关联查询没有取到行，只回填了 `id`。请确认：① 这些活动是否已被**物理删除**？若是，订单侧只能这样，前端会按"已删除"展示；② 若实际是软删/下架（`is_hidden=1` 的行还在），关联查询应当能取到行，请把真实的 `name`/`poster_list`/`is_hidden` 带出来（订单是用户历史数据，不应按 `is_hidden` 或 `status` 过滤）。③ "购票用户可访问已下架详情"需要带 token 验证，前端暂未回归。

**原始问题**（2026-08-11 实测）：订单列表返回的 `activity` 子对象没有 `poster_list`；活动被平台下架（`is_hidden=1`）后公开详情返回 `{"code":500,"msg":"活动不存在"}`，「我的 → 我参加过的活动」卡片没有封面。

---

## P1 待确认

### 2. 内容关注字段是否已部署

按 `docs/content_follow_api_20260810.md`，列表/详情应返回 `follow_target_type`、`follow_target_id`、`follow_count`，关注接口支持 `target_type`/`target_id` 参数。

**8 月 10 日实测（带有效 token）**：

- `GET /api/v1/map/markers`、`GET /api/v1/activity/:id`、`GET /api/v1/merchant/:id` 响应里**仍没有** `follow_target_*` / `follow_count` 字段；
- `POST /api/v1/follow/follow` 带 `target_type=activity&target_id=999999` 返回的是"不能关注自己"（即走了旧的用户关注逻辑），而不是文档说的 404。

结论：线上未部署。前端已做成向前兼容（没字段就维持原用户关注行为），**后端部署后客户端会自动切换，无需发版**。请确认：① 部署时间；② 文档第 8 节的 `content_follows` 建表 SQL 是否已在生产执行。

### 3. `POST /api/v1/auth/login-password` 是否返回 `refresh_token`

小程序的 401 自动续期依赖 `refresh_token`。如果商家密码登录不返回 `refresh_token`/`access_expire`，商家账号任何一次 401 都会清空登录态（真退出登录）。请确认响应是否包含这两个字段；没有请补齐。

### 4. `GET /api/v1/activity/:id` 是否返回 `user_id`

活动详情页的关注按钮需要主办方 `user_id`（场地详情已确认 merchant 接口返回了，活动详情未确认）。若缺失，活动关注会复现之前场地详情"用户信息缺失"的问题。

---

## P2 增强（可选）

### 5. 订单聚合接口（建议新增）

> 状态更新（2026-08-11）：后端已提供 `GET /api/v1/organizer/orders/summary`，小程序/PC 均已接入。✅ 已闭环

`GET /api/v1/organizer/orders/summary`（名称可自定）。

**背景**：管理后台"销售数据"页的成交额/客单价/活动排行目前由前端拉取订单列表（前 100 条）聚合计算。订单量超过 100 后统计会不准。

**建议返回**：成交总额（已支付/已使用订单的 `actual_price` 合计）、成交单数、客单价、按活动聚合的销售额/单数列表。有它之后前端不再全量拉订单。

### 6. 转化率数据源

销售数据页原本有"转化率"卡片，因没有任何流量/访客数据源已下架。如果产品需要这个指标，后端要提供活动的浏览量（或访客数）统计。

### 7. 订单筛选增强

销售数据页原有的"销售渠道""提现状态"两个筛选，因后端不支持已隐藏。如需恢复：

- `/organizer/orders` 增加渠道筛选参数（微信/抖音小程序）；
- 订单或活动维度返回提现状态字段。

### 8. `poster_wechat` 字段用途确认

> 状态更新（2026-08-11）：后端确认无使用场景，小程序与 PC 管理端均已下线该上传项。✅ 已闭环

发布向导里有"活动微信社群"图片上传项（上传 type / 提交字段均为 `poster_wechat`），但客户端没有任何展示入口。请确认后端是否有使用场景（如 IM 转发卡片、分享海报合成、社群二维码生成）。**如果后端也没用，前端将下线该上传项。**

---

## 附：本轮已联调通过（无需处理）

- `GET /api/v1/map/markers` 的 `tag_ids` 硬过滤 ✅
- `GET /api/v1/merchant/{id}` 返回 `user_id`、404 标准化 ✅
- 帖子收藏 `POST/DELETE /api/v1/note/:id/collect` ✅
- `PUT /api/v1/organizer/basic`、`GET/PUT /api/v1/organizer/profile`、`GET /api/v1/auth/profile` ✅
- `GET /api/v1/organizer/orders`（销售数据页/实时订单在用）✅

历史文档：`docs/test_issues_backend_support_20260804.md`（早期问题清单，多数已解决）。
