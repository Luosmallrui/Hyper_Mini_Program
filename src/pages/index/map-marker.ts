import Taro from '@tarojs/taro'

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

const STYLE_VERSION = 'v14.icon.base64-file'

let renderQueue = Promise.resolve()
const queueTask = <T>(task: () => Promise<T>): Promise<T> => {
  const next = renderQueue.then(task).catch(() => task())
  renderQueue = next.then(() => undefined)
  return next
}

const wait = (ms: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, ms)
})

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
  let src = normalizeUrl(normalizeImageSrc(srcInput))
  if (!src) return ''
  if (isDataImageUrl(src)) {
    src = await dataImageToTempFile(src)
  }
  return src
}

const resolveImage = async (srcInput: unknown) => {
  let src = await normalizeImagePath(srcInput)
  if (!src) return null

  try {
    if (/^https:\/\//i.test(src)) {
      const downloadRes = await Taro.downloadFile({ url: src })
      if (downloadRes.statusCode !== 200) {
        console.warn('Image download failed status:', downloadRes.statusCode)
        return null
      }
      src = downloadRes.tempFilePath
    }

    return await Taro.getImageInfo({ src })
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

export const clearMarkerCaches = () => {
  iconOnlyCache.clear()
  avatarCache.clear()
  dataImagePathCache.clear()
}

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
  if (cached?.iconPath) return cached
  if (cached && !cached.iconPath) {
    iconOnlyCache.delete(key)
  }

  return queueTask(async () => {
    const normalizedTarget = await normalizeImagePath(targetIcon)
    const normalizedFallback = await normalizeImagePath(fallbackIcon)

    let img = await resolveImage(normalizedTarget)
    if (!img && normalizedFallback) {
      img = await resolveImage(normalizedFallback)
    }

    const ratio = img?.width && img?.height ? img.width / img.height : safeHint
    const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : safeHint
    const width = Math.max(18, Math.round(safeHeight * safeRatio))
    const height = safeHeight

    const candidates = [normalizedTarget, normalizedFallback, img?.path || '']
    let finalPath = ''
    for (const candidate of candidates) {
      const path = (candidate || '').trim()
      if (!path) continue
      try {
        await Taro.getImageInfo({ src: path })
        finalPath = path
        break
      } catch (error) {}
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
      })
    }
    if (asset.iconPath) {
      iconOnlyCache.set(key, asset)
    }
    return asset
  })
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
  const cached = avatarCache.get(key)
  if (cached) return cached

  let path = await queueTask(async () => drawCircularAvatar(target, fallbackIcon))

  if (!path) {
    await wait(220)
    path = await queueTask(async () => drawCircularAvatar(target, fallbackIcon))
  }

  // Cache generated temp path. If empty, fallback without caching.
  if (path) {
    avatarCache.set(key, path)
    return path
  }

  return fallbackIcon
}

