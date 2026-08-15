// 微信基础库字段补丁：Taro 3.6 的 CommonConfig 类型未收录 backgroundColorContent。
// 该字段控制页面内容层背景色——iOS 切 tab 时 WebView 内容层在首帧渲染前默认露白，
// 深色小程序需在 app.json window / 页面 json 中显式配置为深色。
// 单独成文件：global.d.ts 是脚本文件（含全局声明），模块扩展必须写在模块文件里。
import '@tarojs/taro'

declare module '@tarojs/taro' {
  interface CommonConfig {
    /** 页面内容层背景色，HexColor（微信基础库字段，Taro 3.6 类型定义未收录） */
    backgroundColorContent?: string
  }
}
