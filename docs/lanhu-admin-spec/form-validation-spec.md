# Form Validation Spec

## 用户中心-我要入驻申请表单

字段需黄总确认。下表只作为第一轮 mock-first 表单配置建议，不能当作最终后端契约。

| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| organizerName | string | 是 | empty | 请输入主办方名称 | 非空 | 请输入主办方名称 | organizerName | organizerName | 是，需黄总确认 |
| contactName | string | 是 | empty | 请输入联系人姓名 | 非空 | 请输入联系人姓名 | contactName | contactName | 是，需黄总确认 |
| contactPhone | phone | 是 | empty | 请输入联系电话 | 11 位手机号基础校验 | 请输入正确的联系电话 | contactPhone | contactPhone | 是，需黄总确认 |
| cityOrRegion | string | 否 | empty | 请选择所在区域 | unknown | 请选择所在区域 | cityOrRegion | cityOrRegion | 是，需黄总确认 |
| businessDescription | textarea | 否 | empty | 请简单介绍主办方/活动类型 | unknown | unknown | businessDescription | businessDescription | 是，需黄总确认 |
| attachmentList | file[] | 否 | [] | 上传资质材料 | 文件规则 unknown，第一轮可不强制 | 上传失败，请重试 | attachmentList | attachmentList | 是，需黄总确认 |

第一轮实现要求：

- 字段配置集中在 organizer 局部 mock/adapter。
- 必填字段只做 minimal validation。
- 提交走 mock adapter。
- 成功后进入 `审核中` 状态页。
- 不调用 proposed `/api/biz/organizer/settlement/apply`。

## 管理后台（派对/活动）
无明确表单；如后续新增弹窗，按 minimal validation。

## 管理后台（派对/活动）-存在上架活动状态
无明确表单；如后续新增弹窗，按 minimal validation。

## 管理后台（派对/活动）-活动中心（空态）
无明确表单；如后续新增弹窗，按 minimal validation。

## 管理后台（派对/活动）-活动中心（搜索输入状态）
无明确表单；如后续新增弹窗，按 minimal validation。

## 管理后台（派对/活动）-活动中心-搜索回显
无明确表单；如后续新增弹窗，按 minimal validation。

## 管理后台（派对/活动）-活动中心（筛选）
无明确表单；如后续新增弹窗，按 minimal validation。

## 管理后台（派对/活动）-活动中心（筛选选中）
无明确表单；如后续新增弹窗，按 minimal validation。

## 管理后台（派对/活动）-活动中心（时间筛选）
无明确表单；如后续新增弹窗，按 minimal validation。

## 管理后台（派对/活动）-活动中心-活动发布场地设定
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| district | string | 是 | unknown | unknown | 请选择地区 | 请选择地区 | district | district | 否 |
| address | string | 是 | unknown | unknown | 请输入当前坐标地址 | 请输入当前坐标地址 | address | address | 否 |
| latitude/longitude | number | 否 | unknown | unknown | 定位失败时允许 unknown，但提交前建议确认 | 定位失败时允许 unknown，但提交前建议确认 | latitude/longitude | latitude/longitude | 是 |

## 管理后台（派对/活动）-活动中心-活动发布上传海报
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| detailPoster | file | 是 | unknown | unknown | 比例 5:4，大小 <=2M | 比例 5:4，大小 <=2M | detailPoster | detailPoster | 否 |
| detailLong | file | 否 | unknown | unknown | 大小 <=2M | 大小 <=2M | detailLong | detailLong | 否 |
| listPoster | file | 是 | unknown | unknown | 比例 4:3，大小 <=2M | 比例 4:3，大小 <=2M | listPoster | listPoster | 否 |
| wechatGroup | file | 否 | unknown | unknown | 二维码图片，大小 <=2M | 二维码图片，大小 <=2M | wechatGroup | wechatGroup | 否 |

## 管理后台（派对/活动）-活动中心-活动发布票券配置
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| ticketTypeName | string | 是 | unknown | unknown | 非空，最多 15 字 | 非空，最多 15 字 | ticketTypeName | ticketTypeName | 否 |
| ticketSpecs | array | 是 | unknown | unknown | 至少 1 项，最多 5 项 | 至少 1 项，最多 5 项 | ticketSpecs | ticketSpecs | 否 |
| price | number | 是 | unknown | unknown | >=0 | >=0 | price | price | 否 |
| stock | integer | 是 | unknown | unknown | >=0 | >=0 | stock | stock | 否 |
| limit | integer | 是 | unknown | unknown | >=0 | >=0 | limit | limit | 否 |
| attendees | integer | 是 | unknown | unknown | >=1 | >=1 | attendees | attendees | 否 |

## 管理后台（派对/活动）-一屏幕显
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| name | string | 是 | unknown | unknown | 活动名称不能为空；长度 unknown | 活动名称不能为空；长度 unknown | name | name | 是 |
| shareTitle | string | 是 | unknown | unknown | 分享标题不能为空 | 分享标题不能为空 | shareTitle | shareTitle | 否 |
| dateRange | dateRange | 是 | unknown | unknown | 请选择活动时间 | 请选择活动时间 | dateRange | dateRange | 否 |
| summary | richText | 是 | unknown | unknown | 活动详情不能为空 | 活动详情不能为空 | summary | summary | 否 |

## 管理后台（派对/活动）-添加核销员
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| code | string | 是 | unknown | unknown | 券码不能为空；格式 unknown | 券码不能为空；格式 unknown | code | code | 是 |
| newVerifierName | string | 是 | unknown | unknown | 姓名不能为空 | 姓名不能为空 | newVerifierName | newVerifierName | 否 |
| newVerifierPhone | phone | 是 | unknown | unknown | 11 位手机号基础校验 | 11 位手机号基础校验 | newVerifierPhone | newVerifierPhone | 否 |

## 管理后台-核销
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| code | string | 是 | unknown | unknown | 券码不能为空；格式 unknown | 券码不能为空；格式 unknown | code | code | 是 |
| newVerifierName | string | 是 | unknown | unknown | 姓名不能为空 | 姓名不能为空 | newVerifierName | newVerifierName | 否 |
| newVerifierPhone | phone | 是 | unknown | unknown | 11 位手机号基础校验 | 11 位手机号基础校验 | newVerifierPhone | newVerifierPhone | 否 |

## 管理后台-核销成功
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| code | string | 是 | unknown | unknown | 券码不能为空；格式 unknown | 券码不能为空；格式 unknown | code | code | 是 |
| newVerifierName | string | 是 | unknown | unknown | 姓名不能为空 | 姓名不能为空 | newVerifierName | newVerifierName | 否 |
| newVerifierPhone | phone | 是 | unknown | unknown | 11 位手机号基础校验 | 11 位手机号基础校验 | newVerifierPhone | newVerifierPhone | 否 |

## 管理后台-核销失败
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| code | string | 是 | unknown | unknown | 券码不能为空；格式 unknown | 券码不能为空；格式 unknown | code | code | 是 |
| newVerifierName | string | 是 | unknown | unknown | 姓名不能为空 | 姓名不能为空 | newVerifierName | newVerifierName | 否 |
| newVerifierPhone | phone | 是 | unknown | unknown | 11 位手机号基础校验 | 11 位手机号基础校验 | newVerifierPhone | newVerifierPhone | 否 |

## 管理后台-核销失败-无效码
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| code | string | 是 | unknown | unknown | 券码不能为空；格式 unknown | 券码不能为空；格式 unknown | code | code | 是 |
| newVerifierName | string | 是 | unknown | unknown | 姓名不能为空 | 姓名不能为空 | newVerifierName | newVerifierName | 否 |
| newVerifierPhone | phone | 是 | unknown | unknown | 11 位手机号基础校验 | 11 位手机号基础校验 | newVerifierPhone | newVerifierPhone | 否 |

## 后台主页-提现信息
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| payeeName | string | 是 | unknown | unknown | 收款人不能为空 | 收款人不能为空 | payeeName | payeeName | 否 |
| accountNumber | string | 是 | unknown | unknown | 收款账户不能为空；格式 need-human-confirm | 收款账户不能为空；格式 need-human-confirm | accountNumber | accountNumber | 是 |
| bankName | string | 是 | unknown | unknown | 银行信息不能为空 | 银行信息不能为空 | bankName | bankName | 否 |

## 后台主页-修改提现信息
| 字段 | 类型 | 必填 | 默认值 | placeholder | 校验规则 | 错误提示 | 提交字段 | 回显字段 | unknown |
|---|---|---:|---|---|---|---|---|---|---|
| payeeName | string | 是 | unknown | unknown | 收款人不能为空 | 收款人不能为空 | payeeName | payeeName | 否 |
| accountNumber | string | 是 | unknown | unknown | 收款账户不能为空；格式 need-human-confirm | 收款账户不能为空；格式 need-human-confirm | accountNumber | accountNumber | 是 |
| bankName | string | 是 | unknown | unknown | 银行信息不能为空 | 银行信息不能为空 | bankName | bankName | 否 |

## 审核中
无明确表单；如后续新增弹窗，按 minimal validation。

## 审核未通过
无明确表单；如后续新增弹窗，按 minimal validation。
