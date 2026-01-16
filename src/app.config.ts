export default defineAppConfig({
  pages: [
    'pages/index/index',          // 首页
    'pages/search/index',            // 搜索页
    'pages/activity-list/index',     // 活动列表（信息流模式）
    'pages/my-tickets/index',        // 我的票夹
    // 'pages/order/index',          // 订单列表页面
    // 'pages/pending-payment/index', // 待付款页面
    // 'pages/pending-shipment/index', //待发货界面
    // 'pages/pending-receipt/index', //待收货界面
    'pages/discount/index',    // 优惠
    'pages/group-buy/index',
    'pages/bargain/index',
    'pages/promotion/index',
    'pages/flash-sale/index',
    'pages/hotpot-party/index',// 火锅局
    'pages/cart/index',        // 购物车
    'pages/coupon/index',  // 添加优惠券页面路由
    // 'pages/address-edit/index',// 添加收货地址编辑页面路由
    'pages/recharge/index',//充值
    'pages/favorites/index',//收藏
    // 'pages/InvoiceRecord/index',//开具发票
    'pages/survey/index',//问卷调查
    'pages/cooperation/index',//商务合作
    'pages/feedback/index',//用户反馈
    'pages/SiteApplyModal/index',//站点申请
    'pages/errand/index',//跑腿
    'pages/agency/index',//代理
    'pages/president/index',//荟长
    'pages/redperson/index',//红人申请
    'pages/square/index', // 广场界面
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
