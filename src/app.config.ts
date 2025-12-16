export default defineAppConfig({
  pages: [
    'pages/index/index',          // 首页
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
    'pages/user/index',//用户界面
  ],
  subPackages: [
    {
      root: 'order',
      name: 'order',
      pages: [
        'pages/order/index',
        'pages/pending-payment/index',
        'pages/pending-receipt/index',
        'pages/pending-shipment/index',
        'pages/address-edit/index',
        'pages/InvoiceRecord/index'
      ]
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
        pagePath: 'pages/discount/index',
        text: '广场',
      },
      {
        pagePath: "pages/cart/index",
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
