import {PropsWithChildren, useEffect} from 'react'
import Taro, {useLaunch} from '@tarojs/taro'
import {appUpdate} from './utils'
import IMService from './utils/im'
import './app.less'
// 在app.js或app.tsx文件顶部添加这段代码
if (typeof console.time !== 'function') {
  const timeMap = {};

  console.time = function(label) {
    timeMap[label] = Date.now();
  };

  console.timeEnd = function(label) {
    if (timeMap[label]) {
      console.log(`${label}: ${Date.now() - timeMap[label]}ms`);
      delete timeMap[label];
    } else {
      console.log(`Timer '${label}' does not exist`);
    }
  };
}

function App({children}: PropsWithChildren<any>) {

  useLaunch(() => {
    // 小程序更新
    appUpdate();

    // 不要删除，用来识别当前项目环境
    console.log(
      `\n %c 电子科技大学${process.env.NODE_ENV} %c ${process.env.YDY_APP_API} \n`,
      "color: #fff; background: #008bf8; padding:5px 0; font-size:12px;font-weight: bold;",
      "background: #008bf8; padding:5px 0; font-size:12px;"
    );
  })

  useEffect(() => {
    // 检查登录状态
    const token = Taro.getStorageSync('token')
    if (token) {
      // 如果已登录，启动 IM 连接
      IMService.getInstance().connect()
    }
    
    // 监听全局登录成功事件（如果你在登录页登录成功后触发了这个事件）
    // 或者在登录页直接调用 IMService.getInstance().connect()
    Taro.eventCenter.on('LOGIN_SUCCESS', () => {
       IMService.getInstance().connect()
    })
    
    // 监听退出登录
    Taro.eventCenter.on('LOGOUT', () => {
       IMService.getInstance().close()
    })
    
  }, [])

  // children 是将要会渲染的页面
  return children
}

export default App
