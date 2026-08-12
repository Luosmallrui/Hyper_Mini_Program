# Resource Readiness Check

检查时间：2026-05-27

## 结论

- 已下载资源共 13 个，文件均存在。
- 文件名均为 ASCII，无空格、中文或明显特殊路径风险。
- 未发现重复资源。
- 当前资源均位于 `docs/lanhu-admin-spec/assets/`，这是规格包资源目录，不是小程序正式静态资源目录。
- P0 页面没有“必须下载但失败”的关键资源；大部分图标、背景、状态栏、按钮可用 WXSS、Taro/小程序原生能力或现有组件实现。

## 已可直接作为规格参考使用的资源

| 资源 | 路径 | 用途 | 小程序中是否直接引用 |
|---|---|---|---|
| 后台首页预览 | `docs/lanhu-admin-spec/assets/previews/admin-home.png` | 人工视觉对照 | 否 |
| 活动中心空态预览 | `docs/lanhu-admin-spec/assets/previews/admin-activity-empty.png` | 人工视觉对照 | 否 |
| 活动中心列表预览 | `docs/lanhu-admin-spec/assets/previews/admin-activity-with-list.png` | 人工视觉对照 | 否 |
| 活动中心筛选预览 | `docs/lanhu-admin-spec/assets/previews/admin-activity-filter.png` | 人工视觉对照 | 否 |
| 上传海报预览 | `docs/lanhu-admin-spec/assets/previews/admin-upload-poster.png` | 人工视觉对照 | 否 |
| 票券配置预览 | `docs/lanhu-admin-spec/assets/previews/admin-ticket-config.png` | 人工视觉对照 | 否 |
| 场地设定预览 | `docs/lanhu-admin-spec/assets/previews/admin-venue-setting.png` | 人工视觉对照 | 否 |
| 当前运行态截图 | `docs/lanhu-admin-spec/assets/runtime/organizer-index-current.png` | 当前实现对照 | 否 |

## 可选迁移到小程序资源目录的资源

| 资源 | 当前路径 | 建议正式路径 | 是否必须迁移 | 说明 |
|---|---|---|---:|---|
| 场地设定地图预览 | `docs/lanhu-admin-spec/assets/slices/activity-venue/map-preview@2x.png` | `src/assets/images/lanhu-admin/map-preview.png` | 否 | 当前代码已有 TaroMap；仅在需要静态占位图时迁移。 |
| 下一步按钮背景 | `docs/lanhu-admin-spec/assets/slices/activity-venue/next-button-bg@2x.png` | `src/assets/images/lanhu-admin/next-button-bg.png` | 否 | 建议优先用 WXSS 渐变/背景色，不依赖图片。 |
| 场地背景渐变 | `docs/lanhu-admin-spec/assets/slices/activity-venue/bg-gradient@2x.png` | 不建议迁移 | 否 | 建议用 WXSS `linear-gradient` 实现。 |
| 导航状态参考 | `docs/lanhu-admin-spec/assets/slices/activity-venue/nav-status@2x.png` | 不建议迁移 | 否 | 状态栏和导航应使用现有自定义导航/原生能力。 |
| 胶囊菜单参考 | `docs/lanhu-admin-spec/assets/slices/activity-venue/nav-menu@2x.png` | 不建议迁移 | 否 | 微信胶囊按钮不应作为业务图片引用。 |

## 建议重命名的资源

- 当前文件名均可用于小程序构建。
- 如迁移到 `src/assets/images/lanhu-admin/`，建议去掉 `@2x` 后缀以降低引用歧义：
  - `map-preview@2x.png` -> `map-preview.png`
  - `next-button-bg@2x.png` -> `next-button-bg.png`

## 下载失败但需要人工补充的资源

- 无 P0 必需资源下载失败。
- `asset-manifest.md` 中的底部 tab icons 标记为“无需下载”，建议用现有图标组件或 WXSS 实现。
- P1 核销、提现、审核状态页面未批量下载切图；目前判断不阻塞 MVP，因为这些页面可用文本、状态标签、弹窗和现有组件实现。

## Claude Code 使用资源注意事项

1. 不能直接在小程序代码里引用 `docs/lanhu-admin-spec/assets/`。
2. 如确实需要图片资源，先迁移到项目正式资源目录，建议为 `src/assets/images/lanhu-admin/` 或按项目现有资源规范选择。
3. 预览图只用于人工对照，不应作为业务 UI 图片。
4. 导航栏、状态栏、胶囊、底部 tab 图标优先用现有代码或 WXSS，不要用蓝湖切图硬贴。
5. 使用任何 proposed 资源前，先确认 `asset-manifest.md` 中是否标记为“必须”。当前没有必须迁移资源。
