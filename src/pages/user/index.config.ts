export default definePageConfig({
  navigationStyle: 'custom',
  navigationBarTextStyle: 'white',
  enableShareAppMessage: true,
  enableShareTimeline: true,
  enablePullDownRefresh: true,
  backgroundColor: '#000000',
  // @ts-expect-error 微信基础库字段，Taro 3.6 类型定义未收录：iOS 切 tab WebView 内容层露白
  backgroundColorContent: '#000000',
  backgroundTextStyle: 'light',
})
