import Taro from '@tarojs/taro'
import defaultActiveBackground from '../../assets/images/map-maker-background.png'

export const ACTIVE_MARKER_CANVAS_ID = 'active-marker-canvas'
export const INACTIVE_MARKER_CANVAS_ID = 'inactive-marker-canvas'
export const AVATAR_MARKER_CANVAS_ID = 'avatar-marker-canvas'
export const ICON_ONLY_MARKER_CANVAS_ID = 'icon-only-marker-canvas'

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

export const USER_AVATAR_MARKER_SIZE = 52
const AVATAR_MARKER_SIZE = USER_AVATAR_MARKER_SIZE
const AVATAR_CANVAS_SIZE = AVATAR_MARKER_SIZE

const STYLE_VERSION = 'v15.icon.active-background'

let renderQueue = Promise.resolve()
const queueTask = <T>(task: () => Promise<T>): Promise<T> => {
  const next = renderQueue.then(task).catch(() => task())
  renderQueue = next.then(() => undefined)
  return next
}

const wait = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms)
})

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
  return await Promise.race<T | null>([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs)
    }),
  ])
}

const drawCanvasAndExport = async (
  ctx: Taro.CanvasContext,
  canvasId: string,
  width: number,
  height: number,
  timeoutMs = 2600,
): Promise<string> => {
  return queueTask(async () => {
    const drawDone = new Promise<string>((resolve) => {
      ctx.draw(false, () => {
        exportCanvas(canvasId, width, height).then((path) => resolve(path || ''))
      })
    })
    const result = await withTimeout(drawDone, timeoutMs)
    if (!result) {
      console.warn('drawCanvasAndExport timeout', { canvasId, width, height, timeoutMs })
      return ''
    }
    return result
  })
}

const normalizeImageSrc = (src: unknown): string => {
  if (!src) return ''
  if (typeof src === 'string') return src
  if (typeof src === 'object') {
    const maybeDefault = (src as { default?: unknown }).default
    if (typeof maybeDefault === 'string') return maybeDefault
    const maybePath = (src as { path?: unknown }).path
    if (typeof maybePath === 'string') return maybePath
  }
  return ''
}

const normalizeUrl = (src: string): string => {
  if (!src) return ''
  if (src.startsWith('http://')) return src.replace('http://', 'https://')
  if (src.startsWith('//')) return `https:${src}`
  return src
}

const isDataImageUrl = (src: string) => /^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(src)

const dataImagePathCache = new Map<string, string>()

const dataImageToTempFile = async (src: string): Promise<string> => {
  if (!isDataImageUrl(src)) return src
  const cached = dataImagePathCache.get(src)
  if (cached) return cached

  const match = src.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/)
  if (!match) return ''

  const mime = (match[1] || '').toLowerCase()
  const ext = mime.includes('png') ? 'png' : (mime.includes('jpg') || mime.includes('jpeg') ? 'jpg' : 'png')
  const base64Data = match[2] || ''
  if (!base64Data) return ''

  try {
    const fs = (Taro as any).getFileSystemManager?.()
    const userDataPath = (Taro as any).env?.USER_DATA_PATH
    if (!fs || !userDataPath) return ''

    const filePath = `${userDataPath}/marker_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    await new Promise<void>((resolve, reject) => {
      fs.writeFile({
        filePath,
        data: base64Data,
        encoding: 'base64',
        success: () => resolve(),
        fail: (err: any) => reject(err),
      })
    })
    dataImagePathCache.set(src, filePath)
    return filePath
  } catch (error) {
    console.warn('dataImageToTempFile failed', error)
    return ''
  }
}

const normalizeImagePath = async (srcInput: unknown): Promise<string> => {
  const raw = normalizeImageSrc(srcInput)
  if (!raw) return ''
  const cached = normalizedPathCache.get(raw)
  if (cached) return cached

  let src = normalizeUrl(raw)
  if (!src) return ''
  if (isDataImageUrl(src)) {
    src = await dataImageToTempFile(src)
  }
  if (src) {
    normalizedPathCache.set(raw, src)
  }
  return src
}

const resolveImage = async (srcInput: unknown) => {
  let src = await normalizeImagePath(srcInput)
  if (!src) return null
  const cached = resolvedImageCache.get(src)
  if (cached) return cached

  try {
    const cacheKey = src
    if (/^https:\/\//i.test(src)) {
      const downloadRes = await withTimeout(Taro.downloadFile({ url: src }), 2500)
      if (!downloadRes) {
        console.warn('Image download timeout:', src)
        return null
      }
      if (downloadRes.statusCode !== 200) {
        console.warn('Image download failed status:', downloadRes.statusCode)
        return null
      }
      src = downloadRes.tempFilePath
    }

    const imageInfo = await withTimeout(Taro.getImageInfo({ src }), 2000)
    if (!imageInfo) {
      console.warn('getImageInfo timeout:', src)
      return null
    }
    resolvedImageCache.set(cacheKey, imageInfo)
    return imageInfo
  } catch (error) {
    console.warn('resolveImage failed:', src, error)
    return null
  }
}

const exportCanvas = (canvasId: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      Taro.canvasToTempFilePath({
        canvasId,
        x: 0,
        y: 0,
        width,
        height,
        destWidth: width,
        destHeight: height,
        fileType: 'png',
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => {
          console.warn('Canvas export failed:', canvasId, err)
          resolve('')
        },
      })
    }, 160)
  })
}

const iconOnlyCache = new Map<string, { iconPath: string; width: number; height: number }>()
const avatarCache = new Map<string, string>()
const svgRasterCache = new Map<string, string>()
const activeCompositeCache = new Map<string, { iconPath: string; width: number; height: number }>()
const resolvedImageCache = new Map<string, any>()
const normalizedPathCache = new Map<string, string>()
const ACTIVE_BACKGROUND_RATIO = 735 / 817
const ACTIVE_ICON_BOX_WIDTH_RATIO = 0.62
const ACTIVE_ICON_BOX_HEIGHT_RATIO = 0.45
const ACTIVE_ICON_BOX_TOP_RATIO = 0.26
const DEFAULT_ACTIVE_BACKGROUND = defaultActiveBackground

const drawActiveBubbleFallback = (
  ctx: Taro.CanvasContext,
  width: number,
  height: number,
) => {
  const radius = Math.max(10, Math.min(width, height) * 0.18)
  const pointerWidth = Math.max(14, Math.round(width * 0.18))
  const pointerHeight = Math.max(10, Math.round(height * 0.1))
  const bodyBottom = height - pointerHeight
  const centerX = width / 2

  ctx.setFillStyle('#4f5562')
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(width - radius, 0)
  ctx.arc(width - radius, radius, radius, -Math.PI / 2, 0, false)
  ctx.lineTo(width, bodyBottom - radius)
  ctx.arc(width - radius, bodyBottom - radius, radius, 0, Math.PI / 2, false)
  ctx.lineTo(centerX + pointerWidth / 2, bodyBottom)
  ctx.lineTo(centerX, height)
  ctx.lineTo(centerX - pointerWidth / 2, bodyBottom)
  ctx.lineTo(radius, bodyBottom)
  ctx.arc(radius, bodyBottom - radius, radius, Math.PI / 2, Math.PI, false)
  ctx.lineTo(0, radius)
  ctx.arc(radius, radius, radius, Math.PI, Math.PI * 1.5, false)
  ctx.closePath()
  ctx.fill()

  ctx.setLineWidth(2)
  ctx.setStrokeStyle('rgba(255,255,255,0.82)')
  ctx.stroke()
}

const isSvgImageSource = (src: string) =>
  /^data:image\/svg\+xml[,;]/i.test(src) || /\.svg([?#].*)?$/i.test(src)

const rasterizeSvgToPng = async (src: string, width: number, height: number): Promise<string> => {
  const safeWidth = Math.max(18, Math.round(width))
  const safeHeight = Math.max(18, Math.round(height))
  const ctx = Taro.createCanvasContext(ICON_ONLY_MARKER_CANVAS_ID)
  ctx.clearRect(0, 0, safeWidth, safeHeight)
  ctx.drawImage(src, 0, 0, safeWidth, safeHeight)
  return await drawCanvasAndExport(ctx, ICON_ONLY_MARKER_CANVAS_ID, safeWidth, safeHeight)
}

const composeActiveMarkerWithBackground = async (
  iconPath: string,
  backgroundPath: string,
  targetHeight: number,
): Promise<{ iconPath: string; width: number; height: number }> => {
  const preparedBackgroundPath = await resolveMarkerIconPath(backgroundPath, backgroundPath)
  const normalizedBackgroundPath = await normalizeImagePath(preparedBackgroundPath || backgroundPath)
  const bgSourcePath = normalizedBackgroundPath || preparedBackgroundPath || backgroundPath
  const bgInfo = await resolveImage(bgSourcePath)
  const iconInfo = await resolveImage(iconPath)
  if (!iconInfo?.path) {
    return { iconPath: '', width: 0, height: 0 }
  }

  const safeHeight = Math.max(32, Math.round(targetHeight))
  const bgRatio = bgInfo?.width && bgInfo?.height ? bgInfo.width / bgInfo.height : ACTIVE_BACKGROUND_RATIO
  const markerWidth = Math.max(26, Math.round(safeHeight * bgRatio))

  const ctx = Taro.createCanvasContext(ICON_ONLY_MARKER_CANVAS_ID)
  ctx.clearRect(0, 0, markerWidth, safeHeight)
  // Always paint a bubble base first so iOS drawImage failures won't degrade to plain enlarged icon.
  drawActiveBubbleFallback(ctx, markerWidth, safeHeight)

  if (bgInfo?.path) {
    try {
      ctx.drawImage(bgInfo.path, 0, 0, markerWidth, safeHeight)
    } catch (error) {}
  } else if (bgSourcePath) {
    try {
      ctx.drawImage(bgSourcePath, 0, 0, markerWidth, safeHeight)
    } catch (error) {}
  }

  const iconBoxWidth = markerWidth * ACTIVE_ICON_BOX_WIDTH_RATIO
  const iconBoxHeight = safeHeight * ACTIVE_ICON_BOX_HEIGHT_RATIO
  const iconRatio = iconInfo.width > 0 && iconInfo.height > 0 ? iconInfo.width / iconInfo.height : 1
  const boxRatio = iconBoxWidth / iconBoxHeight
  const drawIconWidth = iconRatio >= boxRatio ? iconBoxWidth : iconBoxHeight * iconRatio
  const drawIconHeight = iconRatio >= boxRatio ? iconBoxWidth / iconRatio : iconBoxHeight
  const iconX = (markerWidth - drawIconWidth) / 2
  const iconY = safeHeight * ACTIVE_ICON_BOX_TOP_RATIO + (iconBoxHeight - drawIconHeight) / 2
  ctx.drawImage(iconInfo.path, iconX, iconY, drawIconWidth, drawIconHeight)

  let path = await drawCanvasAndExport(ctx, ICON_ONLY_MARKER_CANVAS_ID, markerWidth, safeHeight, 4200)
  if (!path) {
    await wait(180)
    path = await drawCanvasAndExport(ctx, ICON_ONLY_MARKER_CANVAS_ID, markerWidth, safeHeight, 4200)
  }
  return {
    iconPath: path,
    width: markerWidth,
    height: safeHeight,
  }
}

const resolveMarkerIconPath = async (iconUrl: string, fallbackIcon: string): Promise<string> => {
  const normalizedTarget = await normalizeImagePath(iconUrl)
  const normalizedFallback = await normalizeImagePath(fallbackIcon)
  const source = normalizedTarget || normalizedFallback
  if (!source) return ''
  if (!isSvgImageSource(source)) return source

  const cached = svgRasterCache.get(source)
  if (cached) return cached

  const imageInfo = await resolveImage(source)
  if (!imageInfo?.path) {
    return normalizedFallback || ''
  }

  try {
    const pngPath = await rasterizeSvgToPng(imageInfo.path, imageInfo.width, imageInfo.height)
    if (pngPath) {
      svgRasterCache.set(source, pngPath)
      return pngPath
    }
  } catch (error) {
    console.warn('rasterize svg marker failed:', source, error)
  }

  return normalizedFallback || ''
}

export const clearMarkerCaches = () => {
  iconOnlyCache.clear()
  avatarCache.clear()
  dataImagePathCache.clear()
  svgRasterCache.clear()
  activeCompositeCache.clear()
  resolvedImageCache.clear()
  normalizedPathCache.clear()
}

export const buildIconOnlyMarker = async (
  iconUrl: string | undefined,
  fallbackIcon: string,
  targetHeight: number,
  ratioHint = 1,
  options?: {
    isActive?: boolean
    activeBackground?: string
  },
): Promise<{ iconPath: string; width: number; height: number }> => {
  const safeHeight = Math.max(24, Math.round(targetHeight))
  const safeHint = Number.isFinite(ratioHint) && ratioHint > 0 ? ratioHint : 1
  const targetIcon = iconUrl || ''
  const isActive = Boolean(options?.isActive)
  const activeBackground = options?.activeBackground || ''
  const normalizedActiveBackground = await normalizeImagePath(activeBackground)
  const normalizedDefaultBackground = await normalizeImagePath(DEFAULT_ACTIVE_BACKGROUND)
  const safeActiveBackground = normalizedActiveBackground || normalizedDefaultBackground || activeBackground || DEFAULT_ACTIVE_BACKGROUND
  const key = `icon-only::${targetIcon}::${fallbackIcon}::${safeHeight}::${safeHint}::${isActive}::${safeActiveBackground}::${STYLE_VERSION}`

  const cached = iconOnlyCache.get(key)
  if (cached?.iconPath) return cached
  if (cached && !cached.iconPath) {
    iconOnlyCache.delete(key)
  }

  const normalizedFallback = await normalizeImagePath(fallbackIcon)
  const resolvedMarkerIcon = await resolveMarkerIconPath(targetIcon, fallbackIcon)

  let img = await resolveImage(resolvedMarkerIcon)
  if (!img && normalizedFallback && resolvedMarkerIcon !== normalizedFallback) {
    img = await resolveImage(normalizedFallback)
  }

  const ratio = img?.width && img?.height ? img.width / img.height : safeHint
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : safeHint
  let width = Math.max(18, Math.round(safeHeight * safeRatio))
  let height = safeHeight
  let composedSuccess = false

  const candidates = [resolvedMarkerIcon, img?.path || '', normalizedFallback]
  let finalPath = ''
  for (const candidate of candidates) {
    const path = (candidate || '').trim()
    if (!path) continue
    try {
      const check = await withTimeout(Taro.getImageInfo({ src: path }), 1200)
      if (!check) continue
      finalPath = path
      break
    } catch (error) {}
  }

  if (!finalPath) {
    // Best-effort fallback: avoid returning empty iconPath, which makes marker invisible on map.
    finalPath = (img?.path || '').trim() || resolvedMarkerIcon || normalizedFallback || ''
  }

  if (isActive && finalPath && safeActiveBackground) {
    const compositeKey = `active-composite::${finalPath}::${safeActiveBackground}::${safeHeight}::${STYLE_VERSION}`
    const cachedComposite = activeCompositeCache.get(compositeKey)
    if (cachedComposite?.iconPath) {
      iconOnlyCache.set(key, cachedComposite)
      return cachedComposite
    }

    const composed = await composeActiveMarkerWithBackground(finalPath, safeActiveBackground, safeHeight)
    if (composed.iconPath) {
      activeCompositeCache.set(compositeKey, composed)
      iconOnlyCache.set(key, composed)
      composedSuccess = true
      return composed
    }
    console.warn('active marker compose failed, fallback to raw icon', {
      finalPath,
      activeBackground: safeActiveBackground,
    })
  }

  const asset = {
    iconPath: finalPath,
    width,
    height,
  }
  if (!asset.iconPath) {
    console.warn('buildIconOnlyMarker resolved empty iconPath', {
      targetIcon,
      fallbackIcon,
      resolvedMarkerIcon,
      normalizedFallback,
    })
  }
  // If active composite failed this round, avoid caching raw enlarged icon,
  // so next refresh can retry composition instead of being stuck in fallback.
  if (asset.iconPath && (!isActive || composedSuccess || !safeActiveBackground)) {
    iconOnlyCache.set(key, asset)
  }
  return asset
}

const drawCircularAvatar = async (avatarUrl: string, fallbackIcon: string): Promise<string> => {
  const ctx = Taro.createCanvasContext(AVATAR_MARKER_CANVAS_ID)
  ctx.clearRect(0, 0, AVATAR_MARKER_SIZE, AVATAR_MARKER_SIZE)

  let avatar = await resolveImage(avatarUrl)
  if (!avatar && fallbackIcon) {
    avatar = await resolveImage(fallbackIcon)
  }

  const center = AVATAR_MARKER_SIZE / 2
  const borderWidth = 4
  const safeInset = 0.5
  const radius = center - borderWidth / 2 - safeInset
  const drawSize = radius * 2

  ctx.save()
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (avatar) {
    const srcW = Number(avatar.width) || AVATAR_MARKER_SIZE
    const srcH = Number(avatar.height) || AVATAR_MARKER_SIZE
    const coverScale = Math.max(drawSize / srcW, drawSize / srcH)
    const renderW = srcW * coverScale
    const renderH = srcH * coverScale
    const renderX = center - renderW / 2
    const renderY = center - renderH / 2
    ctx.drawImage(avatar.path, renderX, renderY, renderW, renderH)
  } else {
    ctx.setFillStyle('#4a4a4a')
    ctx.fillRect(center - radius, center - radius, drawSize, drawSize)
  }
  ctx.restore()

  ctx.setLineWidth(borderWidth)
  ctx.setStrokeStyle('#ffffff')
  ctx.beginPath()
  ctx.arc(center, center, radius, 0, Math.PI * 2)
  ctx.stroke()

  return await drawCanvasAndExport(ctx, AVATAR_MARKER_CANVAS_ID, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE)
}

export const buildCircularAvatarMarker = async (
  avatarUrl: string | undefined,
  fallbackIcon: string,
): Promise<string> => {
  const target = avatarUrl || ''
  const key = `avatar::${target}::${fallbackIcon}::${STYLE_VERSION}`
  const cached = avatarCache.get(key)
  if (cached) return cached

  let path = await drawCircularAvatar(target, fallbackIcon)

  if (!path) {
    await wait(220)
    path = await drawCircularAvatar(target, fallbackIcon)
  }

  // Cache generated temp path. If empty, fallback without caching.
  if (path) {
    avatarCache.set(key, path)
    return path
  }

  return fallbackIcon
}

