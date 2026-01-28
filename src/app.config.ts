export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/square/index',
    'pages/message/index',
    'pages/user/index',
    'pages/search/index',
    'pages/order/index',
  ],
  subpackages: [
    {
      root: 'pages/activity',
      pages: ['index']
    },
    {
      root: 'pages/activity-attendee',
      pages: ['index']
    },
    {
      root: 'pages/activity-list',
      pages: ['index']
    },
    {
      root: 'pages/order',
      pages: [
        'order-detail/index',
        'order-pay-success/index'
      ]
    },
    {
      root: 'pages/square-sub',
      pages: [
        'post-create/index',
        'post-detail/index'
      ]
    },
    {
      root: 'pages/user-sub',
      pages: [
        'follow-list/index',
        'profile/index',
        'points/index'
      ]
    },
    {
      root: 'pages/chat',
      pages: ['index']
    },
    {
      root: 'pages/my-tickets',
      pages: ['index']
    }
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
  lazyCodeLoading: 'requiredComponents',
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于小程序位置接口的效果展示',
    },
  },
})
