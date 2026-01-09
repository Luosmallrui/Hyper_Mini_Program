import Taro from '@tarojs/taro'

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
    // 【新增】监听 Token 刷新成功事件
    Taro.eventCenter.on('TOKEN_REFRESHED', () => {
      console.log('[IM] 监听到 Token 刷新，准备重连...')
      // 如果当前连接是断开的，或者连接是用旧 Token 建立的，尝试重连
      // 为了保险，先关闭旧连接（如果有）
      this.close() 
      // 稍等一下再连，避免冲突
      setTimeout(() => {
          this.manualClose = false // 重置手动关闭标志
          this.connect()
      }, 500)
    })

    // 监听强制登出
    Taro.eventCenter.on('FORCE_LOGOUT', () => {
        this.close()
    })
  }

  async connect() {
    const token = Taro.getStorageSync('access_token') // 注意这里用 access_token
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
      
      // 如果是 401 错误，通常不需要立即重连，而是等待 Token 刷新逻辑触发
      if (e.errMsg && e.errMsg.includes('Invalid HTTP status')) {
           console.log('[IM] 握手失败(401/403)，等待 Token 刷新...')
           return 
      }
      
      this.reconnect()
    }
  }

  // 2. 初始化监听
  private initListeners() {
    if (!this.socketTask) return

    this.socketTask.onOpen(() => {
      console.log('[IM] 连接成功！')
      this.isConnected = true
      this.startHeartbeat()
      // 连接成功，清除重连定时器
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
    })

    this.socketTask.onMessage((res) => {
      console.log(JSON.stringify(res))
      this.handleMessage(res.data)
    })

    this.socketTask.onClose((res) => {
      console.log('[IM] 连接关闭', res)
      this.isConnected = false
      this.stopHeartbeat()
      this.socketTask = null // 清理引用

      // 非手动关闭（异常断开），触发重连
      if (!this.manualClose) {
        this.reconnect()
      }
    })

    this.socketTask.onError((err) => {
      console.error('[IM] 连接错误', err)
      this.isConnected = false
      // 错误通常也会触发 onClose，这里不需要重复逻辑，打印日志即可
    })
  }

  // 3. 处理消息
  private handleMessage(dataStr: any) {
    try {
      // 兼容处理：有些环境返回的是对象，有些是字符串
      const msg = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr
      console.log('[IM] 收到消息:', msg)

      // 心跳响应（根据后端协议调整，这里假设 type 为 pong）
      if (msg.type === 'pong') return

      // --- 核心：通过事件总线分发消息 ---
      // 页面可以通过 Taro.eventCenter.on('IM_NEW_MESSAGE', callback) 监听
      Taro.eventCenter.trigger('IM_NEW_MESSAGE', msg)

    } catch (e) {
      console.error('[IM] 消息解析失败', e)
    }
  }

  // 4. 发送消息
  send(data: object) {
    if (this.isConnected && this.socketTask) {
      this.socketTask.send({
        data: JSON.stringify(data),
        fail: (res) => console.error('[IM] 发送失败', res)
      })
    }
  }

  // 5. 心跳保活
  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      // 发送心跳包，具体格式需根据后端协议调整
      this.send({ event: 'pong' }) 
    }, HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 6. 断线重连
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
      // 必须用 try catch 包裹，防止未连接时关闭报错
      try {
          this.socketTask.close({})
      } catch(e) {}
      this.socketTask = null
    }
    this.isConnected = false
  }
}