export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/square/index',
    'pages/message/index',
    'pages/user/index',
    'pages/search/index',
    'pages/order/index',
    'pages/auth/index',
    'pages/auth-code/index',
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
      root: 'pages/venue',
      pages: ['index']
    },
    {
      root: 'pages/order-sub',
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
        'points/index',
        'organizer/index',
        'organizer-home/index',
        'verifier-bind/index'
      ]
    },
    {
      root: 'pages/chat',
      pages: ['index', 'group-create/index', 'group-members/index', 'group-select/index']
    },
    {
      root: 'pages/my-tickets',
      pages: ['index']
    }
  ],
  window: {
    backgroundTextStyle: 'light',
    // 全局深色页面背景：避免下拉回弹/滑动时露出默认白色背景（异常白块）
    backgroundColor: '#000000',
    // iOS 切换 tab 时 WebView 内容层在首帧渲染前默认露白，需显式指定内容背景色
    backgroundColorContent: '#000000',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    custom: true, // 启用自定义tabBar
    // 自定义 tabBar 顶部是透明渐变，切换瞬间会露出原生 tabBar 背景；
    // 必须与页面同为深色，否则出现白色闪边
    color: '#666666',
    selectedColor: '#ffffff',
    backgroundColor: '#000000',
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
  requiredPrivateInfos: ['chooseLocation'],
  lazyCodeLoading: 'requiredComponents',
})
