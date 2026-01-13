import Taro from '@tarojs/taro'
import { request } from './request'

const WS_URL = 'wss://www.hypercn.cn/im/wss'
const HEARTBEAT_INTERVAL = 30000 
const RECONNECT_DELAY = 5000 

export default class IMService {
  private static instance: IMService
  private socketTask: Taro.SocketTask | null = null
  private isConnected = false
  private heartbeatTimer: any = null
  private reconnectTimer: any = null
  private manualClose = false 

  static getInstance() {
    if (!this.instance) {
      this.instance = new IMService()
    }
    return this.instance
  }

  constructor() {
    // 监听 Token 刷新，立即重连，不要等待
    Taro.eventCenter.on('TOKEN_REFRESHED', () => {
      console.log('[IM] Token 刷新，立即重置并重连...')
      this.reset() 
      // 这里的 reset 不会阻止重连，立即发起
      setTimeout(() => {
          this.manualClose = false
          this.connect()
      }, 200)
    })

    Taro.eventCenter.on('FORCE_LOGOUT', () => {
        this.close()
    })
  }

  async connect() {
    const token = Taro.getStorageSync('access_token')
    if (!token) {
      console.warn('[IM] 无 AccessToken，暂不连接')
      return
    }

    if (this.isConnected) return

    this.manualClose = false
    console.log('[IM] 开始连接...')

    try {
      this.socketTask = await Taro.connectSocket({
        url: WS_URL,
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: () => console.log('[IM] 连接请求发送成功')
      })
      this.initListeners()
    } catch (e: any) {
      console.error('[IM] 创建连接失败', e)
      this.isConnected = false
      
      const errMsg = e.errMsg || e.message || ''
      if (errMsg.includes('Invalid HTTP status') || errMsg.includes('401') || errMsg.includes('403')) {
           console.log('[IM] 握手鉴权失败，尝试触发 HTTP Token 刷新...')
           this.triggerTokenRefresh()
           return 
      }
      
      this.reconnect()
    }
  }

  async triggerTokenRefresh() {
      try {
          await request({ url: '/api/v1/user/info', method: 'GET' })
      } catch(e) {}
  }

  private initListeners() {
    if (!this.socketTask) return

    this.socketTask.onOpen(() => {
      console.log('[IM] 连接成功!')
      this.isConnected = true
      this.startHeartbeat()
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      
      // 【核心新增】连接成功，广播事件，通知聊天页面进行补洞
      Taro.eventCenter.trigger('IM_CONNECTED')
    })

    this.socketTask.onMessage((res) => {
      this.handleMessage(res.data)
    })

    this.socketTask.onClose((res) => {
      console.log('[IM] 连接关闭', res)
      this.isConnected = false
      this.stopHeartbeat()
      this.socketTask = null

      if (!this.manualClose) {
        this.reconnect()
      }
    })

    this.socketTask.onError((err) => {
      console.error('[IM] 连接错误', err)
      this.isConnected = false
    })
  }

  private handleMessage(dataStr: any) {
    try {
      const msg = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr
      // 心跳响应不打印日志，避免刷屏
      if (msg.type !== 'pong' && msg.event !== 'pong') {
          console.log('[IM] 收到消息:', msg)
      }
      if (msg.type === 'pong' || msg.event === 'pong') return

      Taro.eventCenter.trigger('IM_NEW_MESSAGE', msg)
    } catch (e) {
      console.error('[IM] 消息解析失败', e)
    }
  }

  send(data: object) {
    if (this.isConnected && this.socketTask) {
      this.socketTask.send({
        data: JSON.stringify(data)
      })
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send({ event: 'ping' }) 
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private reconnect() {
    if (this.manualClose) return 
    if (this.reconnectTimer) return 

    console.log(`[IM] ${RECONNECT_DELAY / 1000}秒后尝试重连...`)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, RECONNECT_DELAY)
  }

  close() {
    this.manualClose = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socketTask) {
      try { this.socketTask.close({}) } catch(e) {}
      this.socketTask = null
    }
    this.isConnected = false
  }

  reset() {
      console.log('[IM] Resetting connection...')
      this.stopHeartbeat()
      if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
      }
      if (this.socketTask) {
          try { this.socketTask.close({}) } catch(e) {}
          this.socketTask = null
      }
      this.isConnected = false
  }
}