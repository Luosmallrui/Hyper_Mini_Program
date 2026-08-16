# 前端近期改动对应的后端/管理端修改说明

更新时间：2026-08-16

本文档汇总最近几轮前端改动中，需要后端或管理端（PC）配合修改的点。纯前端改动（双击点赞、地图自动轮播、场地入口直达商家主页、地址点击打开地图）不在此列，无需后端配合。

---

## 一、地图业态图标（marker_icon）—— 发布活动也支持选择

之前仅场地入驻时选业态图标，现在**发布活动（party）也能选**，且编辑活动时回填。

### 后端改动

1. **`activities` 表新增字段**（若未执行）：

```sql
ALTER TABLE `activities`
  ADD COLUMN `marker_icon` varchar(255) NOT NULL DEFAULT '' COMMENT '地图标记图标 URL' AFTER `poster_wechat`;
```

2. **发布活动接收 marker_icon**：

```http
POST /api/v1/activity/create
```
step=1 的请求体增加：
```json
{ "type": "party", "step": 1, "name": "今晚电音派对", "marker_icon": "https://cdn.hypercn.cn/marker-icons/dianyin.png" }
```

3. **活动详情返回 marker_icon**（编辑回填用）：

```http
GET /api/v1/activity/:id
```
响应 `data` 增加 `marker_icon` 字段。

4. **地图 markers 返回 icon**：

`GET /api/v1/map/markers` 中：
- 活动（activity）marker 的 `icon` 优先返回该活动的 `marker_icon`，为空时用默认 `party.png`；
- 场地（venue）marker 的 `icon` 已按主办方 `marker_icon` 返回（前一轮已支持），保持不动。

---

## 二、私信开关（direct_message_enabled + customer_service_user_id）

前端现在用 `direct_message_enabled` 同时控制：用户主页「私信」按钮、消息列表「发起群聊」按钮、消息列表普通用户会话（隐藏，只留客服会话）。

### 后端改动

1. **公开配置返回客服账号 ID**：

```http
GET /api/v1/system-config
```
响应 `data` 需包含 `customer_service_user_id`（用于前端过滤会话）：
```json
{ "code": 200, "data": { "direct_message_enabled": false, "customer_service_user_id": 77 } }
```

2. **管理端配置保存**：

```http
PUT /api/v1/admin/system-config
```
请求体支持 `direct_message_enabled` 与 `customer_service_user_id`（若尚未支持，管理端「系统配置」需增加这两个字段的编辑项）。

3. **发送消息后端强制校验**（已有，确认仍生效）：

关闭时普通用户之间单聊返回 `403 "平台已关闭私信功能"`；`customer_service_user_id` 账号与用户之间的单聊、群聊不受影响。

---

## 三、商家主页场地订阅

### 后端改动

商家主页（`GET /api/v1/organizers/:id`）的 `venues.list[].is_subscribe` 已返回订阅状态，前端已加「订阅」按钮，接口复用已有：

```http
POST   /api/v1/venues/:id/subscribe   # 订阅
DELETE /api/v1/venues/:id/subscribe   # 取消订阅
```

**无需后端改动**，仅确认 `venues.list[0].is_subscribe` 稳定返回即可。

---

## 四、活动时间精确到时分

### 后端改动

活动日期提交格式由「仅日期」改为「日期 + 时间」，前端已按 `YYYY-MM-DD HH:MM:SS` 补齐秒：

```
"start_time": "2026-08-21 19:30:00"
"end_time":   "2026-08-23 02:30:00"
```

后端 `activity/create`、`activity/update` 的活动时间字段需接受带时分秒的日期（若原实现只按 `YYYY-MM-DD` 解析，需要放宽）。

---

## 五、管理端 PC 需要新增/确认的配置项汇总

| 配置 | 位置 | 说明 |
|---|---|---|
| 普通用户私信开关 | 系统配置 | `direct_message_enabled`，关闭后 C 端私信/群聊入口全部隐藏 |
| 客服聊天账号 | 系统配置 | `customer_service_user_id`，消息列表只保留该账号的客服会话 |

其余改动均为 C 端展示/交互，不涉及管理端页面调整。
