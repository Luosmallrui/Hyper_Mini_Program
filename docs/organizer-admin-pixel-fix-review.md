# 管理后台复刻实现审查与像素级修改指导

审查时间：2026-05-14

审查对象：`/Users/zijian_nong/Desktop/code/Hyper_Mini_Program/src/pages/user-sub/organizer`

结论：当前实现没有完全还原交付意图。功能结构补了很多，但视觉仍把 `此刻霓虹NeoNow` 的黄绿色直接带进了我们自己的管理后台；padding 对齐不稳定；发布预览的手机壳结构和内容渲染不符合要求。

核心原则：功能向 `此刻霓虹NeoNow` 对齐，视觉向我们当前小程序 `管理后台` 对齐。不要做 `NeoNow` 品牌换肤。

## P0：移除原版黄绿色品牌污染

不要再把 `$organizer-calendar-active: #D8FF4F` 当全局主色使用。它只能保留在日历选中、局部日期 active 这类已有场景里。

必须改的选择器：

1. `src/pages/user-sub/organizer/index.scss`
   - `.segmented-item.active`
     - 现状：`background: $organizer-calendar-active; color: #000;`
     - 改为：`background: $organizer-white-button; color: #121212;`
     - active 分段高度保持 `84rpx`，外层 margin 改为 `0 30rpx 24rpx`，和工具栏左右对齐。
   - `.home-stat-value`
     - 现状：黄绿色数字。
     - 改为：`color: $organizer-text;`
     - 字号从 `48rpx` 调到 `44rpx`，避免三列 `0.00` 加 label 后拥挤。
   - `.green-button`
     - 不要再叫视觉语义 green。可保留 class 名，但样式改为白底黑字：
       - `background: $organizer-white-button;`
       - `color: #121212;`
       - `width: 120rpx; height: 88rpx; border-radius: 16rpx;`
   - `.crop-upload-btn`、`.crop-confirm-btn`
     - 现状：黄绿色。
     - 改为：白底黑字，复用 `$organizer-white-button`。
   - `.preview-fab`
     - 现状：黄绿色小圆。
     - 改为当前管理后台 FAB 风格：`background: $organizer-danger; color: #fff; width/height: 152rpx; right: 60rpx; bottom: calc(env(safe-area-inset-bottom) + 96rpx + 118rpx);`
     - shadow 改为 `rgba(255, 49, 80, 0.28)`。
   - `.notice-icon`
     - 改为中性深色描边或白色 icon：`background: transparent; border: 1rpx solid $organizer-text-muted; color: $organizer-text;`
   - `.channel-checkbox-box.checked`
     - 改为白底黑勾：`background: $organizer-white-button; border-color: $organizer-white-button; color: #000;`
   - `.template-link`
     - 改为 `color: $organizer-text; text-decoration: underline;`，不要黄绿色。
   - `.toast-icon`、`.toast-title`
     - 不是成功提示时不要黄绿色；表单校验提示用 `$organizer-danger`。

2. `src/pages/user-sub/organizer/index.tsx`
   - `renderPreviewModal` 里两个 inline gradient：
     - `linear-gradient(180deg, #D8FF4F 0%, #1a4a1a 100%)`
     - 全部删除。预览必须用已上传图片或当前项目中性占位背景，不允许硬编码 NeoNow 绿。
   - `renderCheckbox` 和渠道 checkbox 内的勾号颜色可以保留黑色/白色，但要跟上面的 checked token 对齐。

允许保留的绿色：

- `$organizer-success: #35D34A` 只用于真正成功状态，例如“已上传”状态，不用于主按钮、分段控件、FAB、预览价格。
- `$organizer-calendar-active` 只用于日历选中、日期范围等已有 calendar 语义。

## P0：修正 padding 和对齐

统一页面网格：

- 页面左右外边距：`30rpx`。
- 卡片内边距：`24rpx` 到 `30rpx`。发布表单大卡片统一 `30rpx`。
- 卡片间距：`20rpx`。
- section 间距：`36rpx`。
- 底部 tab 高度按现有：`118rpx + safe-area`。
- scroll 底部 padding：至少 `calc(118rpx + env(safe-area-inset-bottom) + 48rpx)`。

具体修正：

1. `.segmented-control`
   - 当前 `margin: 0 16rpx 30rpx` 导致活动页分段与工具栏错位。
   - 改为 `margin: 0 30rpx 24rpx`。
   - 高度保持 `84rpx`，不要让 active 块撑开整体高度。

2. `.toolbar-row`
   - 保持 `padding: 0 30rpx 10rpx`。
   - 搜索框、筛选按钮、视图切换总高度保持 `70rpx` 到 `76rpx`。

3. 首页活动数据三列
   - `.home-stat-card padding: 30rpx 24rpx 26rpx`。
   - `.home-stat-value font-size: 44rpx; line-height: 58rpx;`
   - `.home-stat-label font-size: 22rpx; line-height: 30rpx; white-space: nowrap;`
   - 三列 grid 不要让 `专区订阅量` 换行。

4. 发布流程
   - `.wizard-scroll` 底部 padding 改为 `calc(118rpx + env(safe-area-inset-bottom) + 180rpx)`，避免 `预览` FAB 和底部 tab 遮挡最后一个表单块。
   - `.wizard-footer` 保持内容流内显示时，底部再留 `48rpx` 空白；如果改固定底部，则必须放在 tab 上方 `bottom: calc(118rpx + env(safe-area-inset-bottom) + 24rpx)`。
   - `preview-fab` 不能压住 `下一步 / 提交审核`，横向位置跟现有 FAB 一致，右侧 `60rpx`。

## P0：预览手机壳重做

当前问题：

- `renderPreviewModal` 用绿色渐变和 fileName 文字代替图片。
- 手机壳宽度 `375rpx` 太小，且没有真实 iPhone 屏幕比例。
- `preview-phone-info` 放在 body 外，导致海报、渐变和文字不是同一个屏幕层级。
- 状态栏用了 emoji 电池，微信小程序渲染不稳定。

目标结构：

```tsx
<View className="preview-phone-frame">
  <View className="preview-phone-screen">
    <Image className="preview-phone-bg" src={posterPreviewUrl} mode="aspectFill" />
    <View className="preview-phone-shade" />
    <View className="preview-phone-status">...</View>
    <View className="preview-phone-nav">...</View>
    <View className="preview-phone-info">...</View>
  </View>
</View>
```

像素规格：

- `.preview-panel`
  - `width: 690rpx`
  - `max-height: calc(100vh - 120rpx)`
  - `border-radius: 24rpx`
  - `background: $organizer-panel`
  - 内部可以 `overflow-y: auto`
- `.preview-header`
  - height 约 `112rpx`
  - `padding: 24rpx 30rpx`
  - 下方加 `border-bottom: 1rpx solid $organizer-border-soft`
- `.preview-phone-frame`
  - `width: 460rpx`
  - `height: 920rpx`
  - `margin: 34rpx auto 48rpx`
  - `border-radius: 72rpx`
  - `border: 8rpx solid #1F1F1F`
  - `background: #000`
  - `box-shadow: 0 0 0 4rpx rgba(255,255,255,0.08)`
- `.preview-phone-screen`
  - `position: relative`
  - `width: 100%`
  - `height: 100%`
  - `border-radius: 64rpx`
  - `overflow: hidden`
- `.preview-phone-bg`
  - `position: absolute; inset: 0; width: 100%; height: 100%;`
  - `mode="aspectFill"`
- `.preview-phone-shade`
  - `position: absolute; left: 0; right: 0; bottom: 0; height: 55%;`
  - `background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.86) 72%, #111 100%)`
- `.preview-phone-status`
  - `position: absolute; top: 24rpx; left: 34rpx; right: 34rpx; height: 32rpx;`
  - 不用 emoji，电池用纯 CSS 小矩形。
- `.preview-phone-nav`
  - `position: absolute; top: 74rpx; left: 30rpx; right: 30rpx; height: 52rpx;`
  - 微信胶囊用一个 `96rpx x 42rpx` 半透明圆角容器。
- `.preview-phone-info`
  - `position: absolute; left: 40rpx; right: 40rpx; bottom: 58rpx;`
  - 标题 `32rpx/44rpx`，最多 2 行。
  - 日期 `24rpx/34rpx`。
  - 价格不要黄绿色，改用当前项目主视觉：`color: $organizer-text; font-size: 44rpx; font-weight: 700;`
  - 摘要 `24rpx/34rpx`，`color: $organizer-text-muted`。

数据要求：

- 上传裁切确认后，`posterSlots` 不能只存 `fileName`，至少要保存 `tempFilePath` 或 `previewUrl`。
- 预览背景优先使用 `活动详情页海报` 的 `previewUrl`。
- 没有图片时使用 `$organizer-card-2` 中性占位，不要使用绿色渐变。
- 价格从当前选中/第一个启用票种读取；为空时显示 `¥0`，不要写死 `¥888`。

## P1：素材裁切弹层重做

当前问题：

- 弹层是全屏 flex 布局，不像当前管理后台卡片弹层。
- 上传按钮和确认按钮是黄绿色。
- 裁切区没有显示待裁切图片，只显示空虚线框。

目标：

- overlay 仍全屏，但中间放 `.crop-panel`。
- `.crop-panel`
  - `width: 690rpx`
  - `max-height: calc(100vh - 80rpx)`
  - `border-radius: 24rpx`
  - `background: $organizer-panel`
  - `overflow: hidden`
- header
  - `height: 112rpx`
  - `padding: 0 30rpx`
  - `border-bottom: 1rpx solid $organizer-border-soft`
- 裁切区
  - `padding: 48rpx 34rpx`
  - 方形图：`634rpx x 634rpx`
  - 详情页海报：按配置比例缩放，但最大宽 `634rpx`，最大高 `760rpx`
  - 背景必须显示选中图片，不能只显示空框。
- footer
  - `display: grid; grid-template-columns: 1fr 1fr; gap: 24rpx;`
  - `padding: 24rpx 30rpx calc(env(safe-area-inset-bottom) + 24rpx)`
  - 取消：黑底描边白字。
  - 确认：白底黑字。

交互：

- `上传图片` 只负责 `Taro.chooseImage`。
- `确认` 才进入上传中并回写 slot。
- 点击遮罩不要直接取消正在编辑的裁切；只允许 `取消` 和关闭按钮关闭，避免误触。

## P1：活动页和更多页 FAB

当前 `.floating-plus-button` 是红色且符合现有风格；新增的 `preview-fab` 不应另起一套绿色样式。

统一规则：

- 活动、更多、预览浮动按钮都使用同一个视觉：
  - `width: 152rpx`
  - `height: 152rpx`
  - `border-radius: 50%`
  - `background: $organizer-danger`
  - `right: 60rpx`
  - `bottom: calc(env(safe-area-inset-bottom) + 96rpx + 118rpx)`
- 如果按钮文字过长，如 `预览`，字体 `28rpx`，白字，居中。

## P1：第 4/5 步按钮和状态

- 第 4 步 `新增 / 保存 / 下一步` 不用黄绿色。
- `新增`：白底黑字，`120rpx x 88rpx`。
- `保存`：白底黑字，`160rpx x 88rpx`，不要用绿色。
- `全部清除`：黑底描边，`240rpx x 88rpx`。
- `下一步 / 提交审核`：复用 `.white-pill-button`，`375rpx x 104rpx`。
- 渠道 checkbox 选中：白底黑勾。
- 启用 switch：可保持当前白色 on 态，不要改成黄绿色。

## 必须复查的文件

- `src/pages/user-sub/organizer/index.scss`
- `src/pages/user-sub/organizer/index.tsx`
- `src/pages/user-sub/organizer/home/index.tsx`
- `src/pages/user-sub/organizer/activities/index.tsx`

## 验收截图标准

修改后在微信开发者工具 `iPhone 15 Pro Max 71%` 至少截 4 张图：

1. 首页：统计数字不是黄绿色；快速配置和卡片左右对齐；`专区订阅量` 不换行。
2. 活动页：分段 active 不是黄绿色；工具栏与分段左右边线一致。
3. 发布第 4/5 步：按钮、checkbox、link、toast 不再出现 NeoNow 黄绿色。
4. 预览弹层：手机壳居中、比例接近真实手机、背景使用上传海报或中性占位，文字位于同一个手机屏幕内。

