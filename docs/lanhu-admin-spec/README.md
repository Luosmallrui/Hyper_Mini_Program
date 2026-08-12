# Lanhu Admin Spec

本规格包用于把 Lanhu 静态设计稿和当前 Taro 微信小程序代码转成 Claude Code + DeepSeek V4 可执行的纯文本实现规格。

重点范围是 2026 年 4 月 / 5 月新上传的后台管理相关页面。非后台管理页面只做轻量对比，除非与后台管理强依赖，否则不进入本次实现范围。

DeepSeek V4 不能直接看蓝湖截图，实现时必须优先阅读：

1. `admin-pages/*.json`：结构化页面规格、动态行为、接口契约、状态机、校验和验收。
2. `admin-pages/*.md`：人类可读的页面语义说明。
3. `design-tokens.json`：统一视觉 token 和 rpx 换算。
4. `components.json`：组件复用和抽象建议。
5. `api-data-contract.md`、`interaction-flow.md`、`page-state-machine.md`、`form-validation-spec.md`、`dynamic-acceptance-checklist.md`：动态功能实现规格。

本包不是小程序源码，不允许直接把 Lanhu HTML/CSS 当代码复制。所有 unknown 和 need-human-confirm 均集中记录在 `needs-human-confirm.md`。

生成日期：2026-05-27
