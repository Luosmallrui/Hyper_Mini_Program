export default definePageConfig({
  navigationStyle: 'custom',
  navigationBarTextStyle: 'white',
  // 页面级深色背景：切 tab 时 WebView 重建先绘制原生窗口底色，白色会闪屏
  backgroundColor: '#000000',
  // @ts-expect-error 微信基础库字段，Taro 3.6 类型定义未收录：iOS 切 tab WebView 内容层露白
  backgroundColorContent: '#000000',
  backgroundTextStyle: 'light',
  enableShareAppMessage: true,
  enableShareTimeline: true,
})
