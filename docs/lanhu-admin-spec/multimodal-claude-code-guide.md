# 多模态 Claude Code 使用指南

生成时间：2026-05-30  
适用对象：具备图片理解能力的 Claude Code 模型。  

## 结论先行

现在后续实现不应只依赖纯文本规格。必须同时使用三类材料：

1. 蓝湖设计图：`docs/lanhu-admin-spec/assets/lanhu-designs/*.png`
2. 页面结构规格：`docs/lanhu-admin-spec/admin-pages/*.json` 和 `*.md`
3. 当前运行态截图：`docs/lanhu-admin-spec/assets/runtime-review/*.png`

视觉还原的优先级调整为：

1. 蓝湖设计图图片：用于多模态直接看布局、密度、层级和缺失元素。
2. 蓝湖 HTML/CSS 提取出的 JSON/MD：用于尺寸、颜色、节点和交互说明。
3. 当前运行态截图：用于定位偏差和验证修复。

## Claude Code 每个页面的固定流程

1. 从 `lanhu-design-image-manifest.md` 找到页面对应蓝湖图。
2. 打开对应 `admin-pages/*.json` 和 `*.md`。
3. 打开当前运行态截图或用微信开发者工具重新截图。
4. 先写差异清单，再改代码。
5. 改完后重新截图，和蓝湖图做并排视觉比对。
6. 输出修改文件、截图路径、仍未通过项。

## 全量后台图分组

不要只看重点图片。下面所有后台管理图片都已经下载到 `assets/lanhu-designs/`，Claude Code 需要按当前 Batch 覆盖对应分组。

核销员管理：

- `assets/lanhu-designs/005-verifier-list.png`
- `assets/lanhu-designs/008-add-verifier.png`

账户页返工：

- `assets/lanhu-designs/009-account-home.png`
- `assets/lanhu-designs/006-account-withdrawal-view.png`
- `assets/lanhu-designs/007-account-withdrawal-edit.png`
- 当前运行态：`assets/runtime-review/account-gap-current-account.png`

活动中心返工：

- `assets/lanhu-designs/047-activity-empty.png`
- `assets/lanhu-designs/038-activity-status-list.png`
- `assets/lanhu-designs/025-activity-search-input.png`
- `assets/lanhu-designs/040-activity-search-keyboard.png`
- `assets/lanhu-designs/026-activity-date-filter-empty.png`
- `assets/lanhu-designs/027-activity-date-filter.png`
- `assets/lanhu-designs/031-date-filter-start.png`
- `assets/lanhu-designs/041-date-filter-end.png`
- `assets/lanhu-designs/045-date-filter-echo.png`
- `assets/lanhu-designs/046-activity-filter-panel.png`
- `assets/lanhu-designs/032-activity-filter-selected.png`
- `assets/lanhu-designs/042-activity-filter-echo.png`
- `assets/lanhu-designs/043-activity-reset-echo.png`
- `assets/lanhu-designs/044-activity-search-result-duplicate.png`
- 当前运行态：`assets/runtime-review/lanhu-full-current-activity.png`

发布向导返工：

- `assets/lanhu-designs/030-create-info-step1.png`
- `assets/lanhu-designs/035-create-venue-setting.png`
- `assets/lanhu-designs/033-create-upload-poster.png`
- `assets/lanhu-designs/028-create-ticket-config.png`
- `assets/lanhu-designs/034-activity-search-result-tall.png`
- `assets/lanhu-designs/037-activity-search-result.png`
- 当前运行态：`assets/runtime-review/lanhu-full-current-create1.png`

核销返工：

- `assets/lanhu-designs/019-verify-ticket-base.png`
- `assets/lanhu-designs/010-verify-ticket-variant.png`
- `assets/lanhu-designs/011-verify-success.png`
- `assets/lanhu-designs/013-verify-repeat.png`
- `assets/lanhu-designs/015-verify-failed.png`
- `assets/lanhu-designs/016-verify-invalid-code.png`
- 当前运行态：`assets/runtime-review/lanhu-full-current-verify.png`

审核状态：

- `assets/lanhu-designs/023-audit-pending.png`
- `assets/lanhu-designs/024-audit-rejected.png`

## 逐图说明入口

每张图的用途、状态说明和验收重点见 `lanhu-design-image-manifest.md` 的“逐图用途说明”章节。实现前必须先查该章节，不能只按文件名猜页面含义。

当前已知有几个蓝湖名称/文件名与真实画面不一致：

- `034-activity-search-result-tall.png` 实际是活动发布 Step 1 空表单，不是活动中心搜索结果。
- `037-activity-search-result.png` 实际是活动发布 Step 5 活动资质，不是活动中心搜索结果。
- `036-admin-home-one-screen.png` 实际是后台首页一屏态，不是发布 Step 1。

## 账户页多模态验收重点

请直接对比：

- 蓝湖：`assets/lanhu-designs/009-account-home.png`
- 当前：`assets/runtime-review/account-gap-current-account.png`

必须修正：

- 蓝湖没有 `付款信息`。
- 蓝湖没有 `付费记录`。
- 蓝湖没有单独的 `安全性` section。
- 蓝湖的 `账户信息` 卡片内包含 `认证信息`、`提现信息`、`修改密码`、`退出登录` 四行。
- 当前结构不允许以“功能更多”为理由覆盖蓝湖主体结构。

## 交付要求

每完成一个页面，Claude Code 必须输出：

1. 使用的蓝湖图片路径。
2. 使用的文本规格路径。
3. 当前运行态截图路径。
4. 修改文件。
5. 仍不一致的视觉点。
6. `npx tsc --noEmit` 或对应检查结果。

## 禁止事项

- 不要只看 JSON 不看图片。
- 不要只看图片不看动态规格。
- 不要把 `assets/lanhu-designs/` 图片直接引用到业务代码。
- 不要用当前实现反推蓝湖结构。
- 不要把产品新增入口混入蓝湖严格验收，除非明确标记为扩展。
