export default definePageConfig({
  navigationStyle: 'custom',
  navigationBarTextStyle: 'white',
  // 页面级深色背景：切 tab 时 WebView 重建先绘制原生窗口底色，白色会闪屏
  backgroundColor: '#000000',
  backgroundColorContent: '#000000',
  backgroundTextStyle: 'light',
  enableShareAppMessage: true,
  enableShareTimeline: true,
})
