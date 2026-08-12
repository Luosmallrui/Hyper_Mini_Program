# 账户页暴露后的管理后台返工指导

生成时间：2026-05-30  
触发原因：用户检查 `账户` 页发现当前实现明显偏离蓝湖 `后台主页` 设计稿。  
本文件用途：交给 Claude Code 作为下一轮返工指导。  
业务代码改动：无，本文件仅记录修改指导。

## 多模态补充材料

现在 Claude Code 使用的模型具备多模态能力，下一轮返工必须把蓝湖图片作为一手材料：

- 账户主页蓝湖图：`assets/lanhu-designs/009-account-home.png`
- 提现查看蓝湖图：`assets/lanhu-designs/006-account-withdrawal-view.png`
- 提现编辑蓝湖图：`assets/lanhu-designs/007-account-withdrawal-edit.png`
- 当前账户页截图：`assets/runtime-review/account-gap-current-account.png`

完整图片清单见 `lanhu-design-image-manifest.md`，多模态使用流程见 `multimodal-claude-code-guide.md`。

## 反思结论

这次问题不是单纯“Claude Code 没照做”，也不是单纯“蓝湖看不到”。责任要拆开：

1. 规格包存在缺口：我之前把账户相关页面缩窄成 `提现信息/修改提现信息` 两个弹窗规格，没有把蓝湖 index 9 `后台主页` 作为账户主页面单独列入 P0/P1 验收范围。这导致 Claude Code 缺少账户主页的结构化 JSON/MD 参照。
2. 评审范围存在偏差：上一轮 P0 主要围绕用户截图里的活动中心、发布向导、核销页，没有把账户 tab 纳入“必须逐页首屏对比”的硬性门禁。
3. Claude Code 也有实现偏差：当前账户页出现了蓝湖没有的 `付款信息/付费记录` 和单独 `安全性` section。这属于实现时引入了非蓝湖结构，没有把蓝湖 index 9 当 strict source of truth。

因此下一轮不能只修一个账户页。必须先建立“每个后台 tab/内部视图都有对应蓝湖稿和截图验收”的门禁，再继续编码。

## 新增规格文件

本轮已补充账户主页规格：

- `admin-pages/account-home.json`
- `admin-pages/account-home.md`

后续 Claude Code 必须把它们作为账户 tab 的主规格，而不是只看 `account-withdrawal-info.json` 和 `account-withdrawal-edit.json`。

## 账户页必须返工

### 当前运行态证据

当前运行态截图和快照：

- `assets/runtime-review/account-gap-current-account.png`
- `assets/runtime-review/account-gap-current-account-snapshot.txt`

快照显示当前账户页包含：

- `基本信息`
- `付款信息`
- `付费记录`
- `账户信息`
- `认证信息`
- `提现信息`
- `安全性`
- `修改密码`
- `退出登录`

### 蓝湖期望

蓝湖 index 9 `后台主页` 只包含：

- 主办方信息卡：`POWER FLOW / 已认证 / 入驻天数 210 / 当前等级 LV1 / 服务费比例 5%`
- `基本信息`：`主办方编辑`、`主办方区域`
- `账户信息`：`认证信息`、`提现信息`、`修改密码`、`退出登录`

### 必须删除或移动

| 当前内容 | 处理 |
| --- | --- |
| `付款信息` section | 删除，蓝湖账户主页没有 |
| `付费记录` row | 删除，蓝湖账户主页没有 |
| `安全性` section | 删除 |
| `修改密码` row | 移入 `账户信息` card |
| `退出登录` row | 移入 `账户信息` card |
| row 右侧 chevron | 严格蓝湖验收应移除；如产品坚持保留，必须标记为产品扩展 |

### 代码定位

- `src/pages/user-sub/organizer/account/index.tsx:26` 至 `:54`：`SETTING_GROUPS` 当前定义了 4 个 group，应改为 2 个。
- `src/pages/user-sub/organizer/account/index.tsx:139` 至 `:157`：按 group 渲染 row。
- `src/pages/user-sub/organizer/account/index.tsx:151`：当前渲染 chevron。
- `src/pages/user-sub/organizer/account/index.scss:127` 至 `:160`：setting group/row 样式。

### 账户页验收标准

1. 首屏只出现 `基本信息` 和 `账户信息` 两个 section title。
2. 不出现 `付款信息`、`付费记录`、`安全性`。
3. `账户信息` card 内有四行：`认证信息`、`提现信息`、`修改密码`、`退出登录`。
4. `提现信息` 点击后打开提现查看弹窗。
5. 不接真实接口，继续 mock-first。
6. 用微信开发者工具保存账户页截图并与蓝湖 index 9 对比。

## 全后台页面下一轮返工策略

Claude Code 下一轮不要进入新功能 Batch，也不要继续只修用户肉眼指出的点。必须做视觉门禁：

1. 先逐个打开四个底部 tab：首页、活动、更多、账户。
2. 每个 tab 保存截图和 compact snapshot。
3. 对照 `page-map.md`、`admin-pages/*.json`、本文件，逐页列出“蓝湖有/当前有/缺失/多余”。
4. 每页只允许有两类偏差：
   - 明确标记为 `need-human-confirm` 的业务不确定项。
   - 明确标记为产品扩展且不影响蓝湖主体结构的附加入口。
5. 未标记的多余 section、按钮、入口、卡片、浮层，一律视为视觉验收失败。

## 页面级返工清单

| 页面/内部视图 | 下一轮要求 | 优先级 |
| --- | --- | --- |
| account | 按 `account-home.json` 重做主结构，删除多余 section | P0 |
| account:withdrawal | 对齐蓝湖 index 6 弹窗；保留 mock 查看/编辑 | P1 |
| account:withdrawalEdit | 对齐蓝湖 index 7 表单弹窗；保留非空校验 | P1 |
| home | 重新确认蓝湖 index 36/39，避免 Step1/home 映射错误遗留 | P1 |
| activities | 复查卡片宽度、FAB、筛选、日期筛选是否真的通过截图验收 | P0 |
| createWizard step1-4 | 复查滚动复位、底部遮挡、预览按钮和表单首屏 | P0 |
| verify | 复查基础态、扫码胶囊、成功/失败弹窗 | P0 |
| more | 查找对应蓝湖稿；找不到则标记 need-human-confirm，不要自由发挥 | P1 |

## Claude Code 下一轮执行顺序

1. 阅读 `visual-rework-guidance-after-account-gap.md`。
2. 阅读 `admin-pages/account-home.json` 和 `admin-pages/account-home.md`。
3. 先修 `src/pages/user-sub/organizer/account/index.tsx` 的结构，不碰真实接口。
4. 再修 `account/index.scss` 的 section 间距和卡片结构。
5. 运行 `npx tsc --noEmit`。
6. 用微信开发者工具截图账户页。
7. 截图通过后，再继续复查 home、activities、createWizard、verify、more。

## 禁止事项

- 不要把 `account-withdrawal-info` 当成账户主页规格。
- 不要新增真实后端接口。
- 不要修改全局 request。
- 不要把 mock 分散到大量页面。
- 不要新增蓝湖没有的 section，除非写入 `need-human-confirm` 并获得确认。
- 不要只跑 typecheck 后声称视觉通过；必须有微信开发者工具截图。

## 给 Claude Code 的短 Prompt

你上一轮修复了部分 P0，但账户 tab 暴露出主页面未按蓝湖实现的问题。下一轮先停止新功能开发，执行视觉返工。

必读：

1. `docs/lanhu-admin-spec/visual-rework-guidance-after-account-gap.md`
2. `docs/lanhu-admin-spec/admin-pages/account-home.json`
3. `docs/lanhu-admin-spec/admin-pages/account-home.md`
4. `docs/lanhu-admin-spec/admin-pages/account-withdrawal-info.json`
5. `docs/lanhu-admin-spec/admin-pages/account-withdrawal-edit.json`

第一目标：账户页严格对齐蓝湖 index 9 `后台主页`。删除 `付款信息/付费记录` 和单独 `安全性` section，把 `修改密码/退出登录` 放入 `账户信息`。继续 mock-first，不接真实后端。

完成后必须输出：修改文件、截图路径、typecheck 结果、仍未确认项。
