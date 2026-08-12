# 游客模式（免登录浏览）接口改造需求

> 面向：后端
> 日期：2026-07-24
> 背景版本：微信小程序提审版本

## 一、背景

微信审核驳回，原文：

> 小程序打开一进入【首页】页面，未浏览体验功能服务，即要求授权手机号码、头像、昵称进行授权登录，请在用户体验浏览功能服务后，再自行选择授权登录。请整改后再提交审核。

整改方向：小程序改为**游客模式**——未登录用户可以正常浏览内容，仅在用户主动操作需要登录的功能（关注、订阅、购票、发帖、评论、消息、订单等）时才引导登录。

前端已在改造：无 token 时请求**不会携带 `Authorization` 头**，需要后端配合放开浏览类接口的匿名访问。

## 二、后端需要做的事

1. **浏览类接口匿名放行**：下表中的接口，在未携带 `Authorization` 头时返回 `200` + 正常数据，而不是 `401`。
2. **匿名时用户态字段按默认值返回**：响应中涉及当前用户状态的字段（如 `is_follow`、`is_subscribe`、`is_liked`、`isFollowed` 等），匿名访问时统一按 `false` / `0` 返回。
3. **他人主页接口脱敏**：`/api/v1/user/info?user_id=` 匿名调用时只返回公开展示字段（昵称、头像、简介、粉丝/关注计数等），不返回手机号、微信标识等敏感信息。
4. **安全建议**：匿名放行的接口请评估限流/防爬策略；响应中不要携带与页面展示无关的用户隐私字段。

鉴权接口的 `401` 语义和现有的 `X-New-Access-Token` 刷新头机制保持不变。

## 三、需要匿名放行的接口清单

### P0：首屏与核心浏览链路（不过审的命门，优先）

| 接口 | 用途（调用页面） | 备注 |
| --- | --- | --- |
| `GET /api/v1/map/markers` | 首页地图点位、活动列表（pages/index、pages/activity-list） | 参数：`source=all&limit=200`，可选 `category_id`、`district`、`tag_ids`、`distance&lat&lng`、`sort`；匿名按游客返回 |
| `GET /api/v1/category/list` | 分类筛选（首页、活动列表） | 全量只读 |
| `GET /api/v1/districts/tree` | 行政区/商圈筛选（首页、活动列表） | 全量只读 |
| `GET /api/v1/merchant/tags` | 商家标签筛选（首页、活动列表） | 全量只读 |
| `GET /api/v1/activity/{id}` | 活动详情（pages/activity） | 匿名返回详情，`is_subscribe`、`is_follow` 等按 false |
| `GET /api/v1/note/related` | 活动详情/场地详情的相关笔记（pages/activity、pages/venue） | 参数：`activity_id` 或 `store_id` |
| `GET /api/v1/note/list` | 广场笔记流（pages/square） | 参数：`pageSize`、`cursor`，可选 `channel_id`；`search_type=follow` 的"关注"流匿名时可返回空列表或游客推荐流，由后端定 |
| `GET /api/v1/note/{id}` | 帖子详情（pages/square-sub/post-detail） | 匿名返回详情，`is_liked`、`is_follow` 按 false |
| `GET /api/v1/comments/list/{id}` | 帖子评论列表（post-detail） | 匿名可翻看评论 |
| `GET /api/v1/channel` | 广场频道列表（pages/square） | 匿名时 `is_subscribe` 按 false |
| `GET /api/v1/search/?type=0&keyword=` | 活动/场地搜索（pages/search） | 匿名可搜索 |

### P1：次级浏览页面

| 接口 | 用途（调用页面） | 备注 |
| --- | --- | --- |
| `GET /api/v1/merchant/{id}` | 场地详情（pages/venue、pages/venue/product） | 匿名返回，`is_follow` 按 false |
| `GET /api/v1/merchant/{id}/follower/count` | 场地粉丝数（pages/venue） | 计数，正常返回 |
| `GET /api/v1/merchant/{id}/goods` | 场地商品/套餐（pages/venue/product） | 浏览即可，购买动作前端会拦登录 |
| `GET /api/v1/comments/replies/{rootId}` | 评论的楼中楼回复（post-detail） | 匿名可翻看 |
| `GET /api/v1/user/info?user_id=` | 他人主页资料（pages/user-sub/profile） | **需脱敏**，见上文第 3 点 |
| `GET /api/v1/user/note` | 他人主页的笔记列表（pages/user-sub/profile） | 匿名返回公开笔记 |

## 四、保持鉴权不变的接口（前端已做登录拦截，无需改动）

以下接口维持 `401` 语义即可，前端会在操作前统一引导登录，游客不会触发：

- 账号：`/api/v1/auth/*`、本人 `GET /api/v1/user/info`
- 互动：`POST /api/v1/follow/{action}`、`/api/v1/activity/{id}/subscribe|unsubscribe`、`/api/v1/note/{id}/like`、`/api/v1/channel/subscribe|unsubscribe`、`/api/v1/comments/*`（写操作）、`/api/v1/note/create`、`/api/v1/note/upload`
- 交易：`/api/v1/order/*`、`/api/v1/pay/*`、`/api/v1/refund/*`、`/api/v1/viewers`
- 消息：`/api/v1/session/*`、`/api/v1/message/*`、`/api/v1/group*`、`/api/groupmember/*`
- 其他：`/api/v1/points/*`、`/api/v1/search/history`、`/api/v1/activity/subscriptions`、`/api/v1/organizer/*`、`/api/v1/verifier/*`、`/api/v1/user/my-notes`、`/api/v1/follow/list`

## 五、统一约定

1. 无 `Authorization` 头 = 游客。放行的浏览接口对游客返回 `200`；未放行的接口返回 `401`。
2. 游客访问放行接口时，响应中的用户态字段（`is_follow` / `is_subscribe` / `is_liked` / `isFollowed` 等）一律 `false`，计数字段（粉丝数、参与人数等）正常返回。
3. （推荐，非必须）放行接口在携带**过期 token** 调用时，可按游客降级返回 `200` 而不是 `401`，避免 token 刚过期时浏览页闪断；不实现也不影响主流程，前端有刷新和清理逻辑。
4. 不要在放行接口的匿名响应中返回：手机号、邮箱、微信 openid/unionid、实名信息等。

## 六、自验方式

逐个接口不带 token 直接请求，期望 `200`：

```bash
# 示例：地图点位
curl -i 'https://www.hypercn.cn/api/v1/map/markers?source=all&limit=200'

# 示例：活动详情（把 1 换成真实 id）
curl -i 'https://www.hypercn.cn/api/v1/activity/1'

# 示例：搜索
curl -i 'https://www.hypercn.cn/api/v1/search/?type=0&keyword=%E9%9F%B3%E4%B9%90'
```

对照组（仍应 `401`）：

```bash
curl -i 'https://www.hypercn.cn/api/v1/order/list'
```

## 七、联调排期建议

1. 后端先确认清单中每个接口的现状（是否已匿名放行），标记差异；
2. P0 接口优先上线测试环境，前端同步联调游客浏览主链路（首页 → 活动详情 → 广场 → 帖子详情 → 搜索）；
3. P1 接口跟上后，前端全量自验并提审。

有疑问随时拉群对齐（前端：小程序端；接口归属：HYPER 服务端）。
