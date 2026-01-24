export default defineAppConfig({
  pages: [
    'pages/index/index',          // 首页
    'pages/search/index',            // 搜索页
    'pages/activity-list/index',     // 活动列表（信息流模式）
    'pages/my-tickets/index',        // 我的票夹
    // 'pages/order/index',          // 订单列表页面


    'pages/square/index', // 广场界面
    'pages/order-success/index', // 订单购买成功
    'pages/square/post-create/index', // 发布页
    'pages/square/post-detail/index', // 详情页
    'pages/message/index', // 消息界面
    'pages/chat/index', // chat detail
    'pages/activity/index', // activity detail (new)
    'pages/activity-attendee/index', // activity attendee (new)
    'pages/user/index', // 用户界面
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    custom: true, // 启用自定义tabBar
    color: '#999999',
    selectedColor: '#1677FF',
    backgroundColor: '#ffffff',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
      },
      {
        pagePath: 'pages/square/index',
        text: '广场',
      },
      {
        pagePath: "pages/message/index",
        text: "消息",
      },
      {
        pagePath: "pages/user/index",
        text: "我的",
      },
    ],
  },
  requiredPrivateInfos: ['getLocation'],
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于小程序位置接口的效果展示',
    },
  },
})
