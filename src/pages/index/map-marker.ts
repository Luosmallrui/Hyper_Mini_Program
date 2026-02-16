import Taro from '@tarojs/taro'

export const ACTIVE_MARKER_CANVAS_ID = 'active-marker-canvas'
export const INACTIVE_MARKER_CANVAS_ID = 'inactive-marker-canvas'
export const AVATAR_MARKER_CANVAS_ID = 'avatar-marker-canvas'
export const ICON_ONLY_MARKER_CANVAS_ID = 'icon-only-marker-canvas'

// 基础尺寸配置
const PIN_SIZE = 80
const ARROW_HEIGHT = 12
const TEXT_GAP = 4
const TEXT_HEIGHT = 66

export const ACTIVE_MARKER_WIDTH = 160
export const ACTIVE_MARKER_HEIGHT = PIN_SIZE + ARROW_HEIGHT + TEXT_GAP + TEXT_HEIGHT

const INACTIVE_ICON_SIZE = 50
const INACTIVE_TEXT_GAP = 6
const INACTIVE_LINE_HEIGHT = 22
const INACTIVE_TEXT_MAX_LINES = 4
const INACTIVE_TEXT_HEIGHT = INACTIVE_LINE_HEIGHT * INACTIVE_TEXT_MAX_LINES + 8
export const INACTIVE_MARKER_WIDTH = 220
export const INACTIVE_MARKER_HEIGHT = INACTIVE_ICON_SIZE + INACTIVE_TEXT_GAP + INACTIVE_TEXT_HEIGHT

// 3倍图，保证 iOS 视网膜屏清晰度
const SCALE = 3
const CANVAS_WIDTH = ACTIVE_MARKER_WIDTH * SCALE
const CANVAS_HEIGHT = ACTIVE_MARKER_HEIGHT * SCALE
const INACTIVE_CANVAS_WIDTH = INACTIVE_MARKER_WIDTH * SCALE
const INACTIVE_CANVAS_HEIGHT = INACTIVE_MARKER_HEIGHT * SCALE
const AVATAR_MARKER_SIZE = 60
const AVATAR_CANVAS_SIZE = AVATAR_MARKER_SIZE * SCALE

const STYLE_VERSION = 'v7.ios.fix.3'

// 任务队列锁
let renderQueue = Promise.resolve()
const queueTask = <T>(task: () => Promise<T>): Promise<T> => {
  const next = renderQueue.then(task).catch(() => task())
  renderQueue = next.then(() => undefined)
  return next
}

// 规范化图片路径
const normalizeImageSrc = (src: unknown): string => {
  if (!src) return ''
  if (typeof src === 'string') return src
  if (typeof src === 'object') {
    // 兼容 require 进来的本地资源
    const maybeDefault = (src as any).default
    if (typeof maybeDefault === 'string') return maybeDefault
    const maybePath = (src as any).path
    if (typeof maybePath === 'string') return maybePath
  }
  return ''
}

// 图片加载核心逻辑
const resolveImage = async (srcInput: unknown) => {
  let src = normalizeImageSrc(srcInput)
  if (!src) return null

  // 1. 强制 HTTP 转 HTTPS (iOS 必须 HTTPS)
  if (src.startsWith('http://')) {
    src = src.replace('http://', 'https://')
  }
  // 处理无协议头的链接 //example.com/img.png
  if (src.startsWith('//')) {
    src = `https:${src}`
  }

  try {
    // 2. 如果是网络图片，先下载
    if (/^https:\/\//i.test(src)) {
      try {
        const downloadRes = await Taro.downloadFile({ url: src })
        if (downloadRes.statusCode === 200) {
          src = downloadRes.tempFilePath
        } else {
          console.warn('Image download failed status:', downloadRes.statusCode)
          return null
        }
      } catch (err) {
        console.warn('Image download error:', err)
        return null // 下载失败返回 null
      }
    }

    // 3. 获取图片信息 (本地路径或已下载的临时路径)
    const info = await Taro.getImageInfo({ src })
    return info
  } catch (error) {
    console.warn('resolveImage failed:', src, error)
    return null
  }
}

// 导出 Canvas 图片 (关键修复)
const exportCanvas = (canvasId: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve) => {
    // 延时 200ms，等待 iOS 绘图缓冲区刷新
    setTimeout(() => {
      Taro.canvasToTempFilePath({
        canvasId,
        x: 0,
        y: 0,
        width,
        height,
        destWidth: width, // 保持 1:1 输出，避免模糊
        destHeight: height,
        fileType: 'png',
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => {
          console.error('Canvas export failed:', err)
          resolve('') // 失败返回空字符串
        },
      })
    }, 200) // ★ 这里的延时非常重要
  })
}

// 仅绘制图标的 Marker (用于普通状态)
export const buildIconOnlyMarker = async (
  iconUrl: string | undefined,
  fallbackIcon: string,
  targetHeight: number,
  ratioHint = 1,
): Promise<{ iconPath: string; width: number; height: number }> => {
  const safeHeight = Math.max(24, Math.round(targetHeight))
  const safeHint = Number.isFinite(ratioHint) && ratioHint > 0 ? ratioHint : 1
  const targetIcon = iconUrl || ''
  const key = `icon-only::${targetIcon}::${fallbackIcon}::${safeHeight}::${safeHint}::${STYLE_VERSION}`

  const cached = iconOnlyCache.get(key)
  if (cached) return cached

  return queueTask(async () => {
    const normalizedTarget = normalizeImageSrc(targetIcon)
    const normalizedFallback = normalizeImageSrc(fallbackIcon)
    
    // 尝试加载目标图标，失败则加载兜底图标
    let img = await resolveImage(normalizedTarget)
    if (!img && normalizedFallback) {
      console.warn('Target icon failed, using fallback:', normalizedFallback)
      img = await resolveImage(normalizedFallback)
    }

    // 计算宽高
    const ratio = img?.width && img?.height ? img.width / img.height : safeHint
    const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : safeHint
    const width = Math.max(18, Math.round(safeHeight * safeRatio))
    const height = safeHeight

    // 如果连兜底图都加载失败，直接返回本地路径（让 Map 组件自己尝试渲染）
    if (!img) {
      const fallbackAsset = {
        iconPath: normalizedFallback || normalizedTarget || '',
        width,
        height,
      }
      iconOnlyCache.set(key, fallbackAsset)
      return fallbackAsset
    }

    // Canvas 绘制
    const ctx = Taro.createCanvasContext(ICON_ONLY_MARKER_CANVAS_ID)
    ctx.scale(SCALE, SCALE)
    ctx.clearRect(0, 0, width, height)

    // 绘制图片
    ctx.drawImage(img.path, 0, 0, width, height)

    const canvasWidth = width * SCALE
    const canvasHeight = height * SCALE
    
    const iconPath = await new Promise<string>((resolve) => {
      ctx.draw(false, () => {
        exportCanvas(ICON_ONLY_MARKER_CANVAS_ID, canvasWidth, canvasHeight).then(resolve)
      })
    })

    // ★ 关键兜底：如果 Canvas 导出失败（空字符串），返回原始 fallback 路径
    // 这样至少显示本地图片，而不是红色默认 Pin
    const finalPath = iconPath || normalizedFallback || ''
    
    const asset = {
      iconPath: finalPath,
      width,
      height,
    }
    iconOnlyCache.set(key, asset)
    return asset
  })
}

// 缓存 Maps
const iconOnlyCache = new Map<string, { iconPath: string; width: number; height: number }>()
const avatarCache = new Map<string, string>()

// 头像绘制逻辑
const drawCircularAvatar = async (avatarUrl: string, fallbackIcon: string): Promise<string> => {
  const ctx = Taro.createCanvasContext(AVATAR_MARKER_CANVAS_ID)
  ctx.scale(SCALE, SCALE)
  ctx.clearRect(0, 0, AVATAR_MARKER_SIZE, AVATAR_MARKER_SIZE)

  let avatar = await resolveImage(avatarUrl)
  if (!avatar && fallbackIcon) {
    avatar = await resolveImage(fallbackIcon)
  }

  const center = AVATAR_MARKER_SIZE / 2
  const radius = center - 3

  ctx.save()
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (avatar) {
    ctx.drawImage(avatar.path, 0, 0, AVATAR_MARKER_SIZE, AVATAR_MARKER_SIZE)
  } else {
    ctx.setFillStyle('#4a4a4a')
    ctx.fillRect(0, 0, AVATAR_MARKER_SIZE, AVATAR_MARKER_SIZE)
  }
  ctx.restore()

  ctx.setLineWidth(4)
  ctx.setStrokeStyle('#ffffff')
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.stroke()

  return new Promise((resolve) => {
    ctx.draw(false, () => {
      exportCanvas(AVATAR_MARKER_CANVAS_ID, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE).then(resolve)
    })
  })
}

export const buildCircularAvatarMarker = async (
  avatarUrl: string | undefined,
  fallbackIcon: string,
): Promise<string> => {
  const target = avatarUrl || ''
  const key = `avatar::${target}::${fallbackIcon}::${STYLE_VERSION}`
  if (avatarCache.has(key)) return avatarCache.get(key) || fallbackIcon

  const path = await queueTask(async () => drawCircularAvatar(target, fallbackIcon))
  
  // 同样增加兜底
  const finalPath = path || fallbackIcon
  if (finalPath) avatarCache.set(key, finalPath)
  return finalPath
}