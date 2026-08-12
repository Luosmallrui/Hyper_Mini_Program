# Asset Manifest

资源优先写入 `docs/lanhu-admin-spec/assets/`，因为当前项目虽有 `src/assets/` 和历史 `HYPER小程序/` 预览图，但本任务不应改业务资源目录。后续 Claude Code 如需使用，再迁移到 `src/assets/images/lanhu-admin/` 或 `src/assets/icons/lanhu-admin/`。

| 资源名称 | 蓝湖来源节点 | 本地保存路径 | 推荐代码引用路径 | 原始尺寸 | 文件类型 | 使用页面 | 使用位置 | 必须 | 可复用已有资源 | 可用 WXSS 替代 | 下载状态 | 备注 |
|---|---|---|---|---|---|---|---|---:|---:|---:|---|---|
| admin-home preview | index 30 cover | docs/lanhu-admin-spec/assets/previews/admin-home.png | 仅规格参考 | 187.5x460.5 | png | admin-home-empty | 设计预览 | 否 | 否 | 否 | 已下载 | 供 Claude 纯文本外人工查看 |
| admin activity empty preview | index 47 cover | docs/lanhu-admin-spec/assets/previews/admin-activity-empty.png | 仅规格参考 | 187.5x406 | png | activity-center-empty | 设计预览 | 否 | 否 | 否 | 已下载 |  |
| admin activity listed preview | index 39 cover | docs/lanhu-admin-spec/assets/previews/admin-activity-with-list.png | 仅规格参考 | 187.5x406 | png | admin-home-listed | 设计预览 | 否 | 否 | 否 | 已下载 |  |
| admin filter preview | index 46 cover | docs/lanhu-admin-spec/assets/previews/admin-activity-filter.png | 仅规格参考 | 187.5x406 | png | activity-center-filter-panel | 设计预览 | 否 | 否 | 否 | 已下载 |  |
| upload poster preview | index 33 cover | docs/lanhu-admin-spec/assets/previews/admin-upload-poster.png | 仅规格参考 | 187.5x483.25 | png | activity-create-upload-poster | 设计预览 | 否 | 否 | 否 | 已下载 |  |
| ticket config preview | index 28 cover | docs/lanhu-admin-spec/assets/previews/admin-ticket-config.png | 仅规格参考 | 187.5x734.75 | png | activity-create-ticket-config | 设计预览 | 否 | 否 | 否 | 已下载 |  |
| venue setting preview | index 35 cover | docs/lanhu-admin-spec/assets/previews/admin-venue-setting.png | 仅规格参考 | 187.5x406 | png | activity-create-venue-setting | 设计预览 | 否 | 否 | 否 | 已下载 |  |
| venue bg gradient | slice 504739AA... 矩形 | docs/lanhu-admin-spec/assets/slices/activity-venue/bg-gradient@2x.png | proposed src/assets/images/lanhu-admin/bg-gradient.png | 750x870 | png | activity-create-venue-setting | 背景渐变 | 否 | 可用 CSS gradient | 是 | 已下载 | 建议用 WXSS gradient 替代 |
| venue map preview | slice 16EC1B3D... 位图 | docs/lanhu-admin-spec/assets/slices/activity-venue/map-preview@2x.png | proposed src/assets/images/lanhu-admin/map-preview.png | 692x529 | png | activity-create-venue-setting | 地图占位 | 否 | 当前 TaroMap 可替代 | 否 | 已下载 | 运行态应使用 TaroMap，不要固定图片 |
| nav menu/status | slices nav | docs/lanhu-admin-spec/assets/slices/activity-venue/nav-menu@2x.png 等 | 不建议引用 | 750x88/174x64 | png | all | 微信原生状态栏/胶囊参考 | 否 | 原生导航/现有 renderCustomNav | 是 | 已下载 | 不应进入业务代码 |
| bottom tab icons | Lanhu 多个 label_2 | 未逐个下载 | proposed src/assets/icons/lanhu-admin/ | 40x36 | png | all admin | 底部内部导航图标 | 否 | AtIcon/现有图标可复用 | 是 | 无需下载 | 代码实现更稳定 |

## 下载失败 / 待人工确认
- P1 5 月核销、提现、审核相关页面未批量下载切图；多数图标可用现有 AtIcon 或 WXSS 实现。
- 切图工具要求下载前询问倍率，但用户明确要求不中断；本次按 Web 2x 下载到 docs 目录，并在 needs-human-confirm 中记录。
