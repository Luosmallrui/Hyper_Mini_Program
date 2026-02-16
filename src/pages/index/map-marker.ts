import Taro from '@tarojs/taro'

export const ACTIVE_MARKER_CANVAS_ID = 'active-marker-canvas'
export const INACTIVE_MARKER_CANVAS_ID = 'inactive-marker-canvas'
export const AVATAR_MARKER_CANVAS_ID = 'avatar-marker-canvas'

// Pin and text layout in logical pixels.
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

// 3x export to keep iOS output sharp.
const SCALE = 3
const CANVAS_WIDTH = ACTIVE_MARKER_WIDTH * SCALE
const CANVAS_HEIGHT = ACTIVE_MARKER_HEIGHT * SCALE
const INACTIVE_CANVAS_WIDTH = INACTIVE_MARKER_WIDTH * SCALE
const INACTIVE_CANVAS_HEIGHT = INACTIVE_MARKER_HEIGHT * SCALE
const AVATAR_MARKER_SIZE = 60
const AVATAR_CANVAS_SIZE = AVATAR_MARKER_SIZE * SCALE

const STYLE_VERSION = 'v6.ios.fix.2'

let renderQueue = Promise.resolve()
const queueTask = <T>(task: () => Promise<T>): Promise<T> => {
  const next = renderQueue.then(task).catch(() => task())
  renderQueue = next.then(() => undefined)
  return next
}

const resolveImage = async (src: string) => {
  if (!src) return null
  try {
    return await Taro.getImageInfo({ src })
  } catch {
    if (src.startsWith('//')) {
      try {
        const res = await Taro.downloadFile({ url: `https:${src}` })
        if (res.statusCode === 200) return await Taro.getImageInfo({ src: res.tempFilePath })
      } catch {
        return null
      }
    }
    if (/^https?:\/\//i.test(src)) {
      try {
        const res = await Taro.downloadFile({ url: src })
        if (res.statusCode === 200) return await Taro.getImageInfo({ src: res.tempFilePath })
      } catch {
        return null
      }
    }
    return null
  }
}

const exportCanvas = (canvasId: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve) => {
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
      fail: () => resolve(''),
    })
  })
}

const charUnit = (char: string) => {
  if (/[\u4e00-\u9fa5]/.test(char)) return 1
  if (/[a-z0-9]/i.test(char)) return 0.62
  return 0.5
}

const wrapText = (text: string, maxUnitsPerLine: number, maxLines: number) => {
  const safeText = (text || '').trim()
  if (!safeText) return ['']
  const lines: string[] = []
  let currentLine = ''
  let currentUnits = 0

  for (const ch of safeText) {
    const unit = charUnit(ch)
    if (currentLine && currentUnits + unit > maxUnitsPerLine) {
      lines.push(currentLine)
      currentLine = ch
      currentUnits = unit
      if (lines.length >= maxLines) break
    } else {
      currentLine += ch
      currentUnits += unit
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }

  if (lines.length === maxLines) {
    const consumed = lines.join('').length
    if (consumed < safeText.length) {
      lines[maxLines - 1] = `${lines[maxLines - 1]}…`
    }
  }

  return lines
}

const drawTextWithStroke = (
  ctx: Taro.CanvasContext,
  text: string,
  x: number,
  y: number,
  size = 18,
) => {
  ctx.setTextAlign('center')
  ctx.setTextBaseline('middle')
  ctx.setFontSize(size)
  ctx.setLineJoin('round')
  ctx.setLineWidth(4)
  ctx.setStrokeStyle('#F1F1F1')
  ctx.strokeText(text, x, y)
  ctx.setFillStyle('#000000')
  ctx.fillText(text, x, y)
}

const drawActivePin = async (iconUrl: string, fallbackIcon: string, title: string): Promise<string> => {
  const ctx = Taro.createCanvasContext(ACTIVE_MARKER_CANVAS_ID)
  ctx.scale(SCALE, SCALE)

  const w = ACTIVE_MARKER_WIDTH
  const centerX = w / 2

  const bubbleY = 4
  const bubbleSize = PIN_SIZE
  const radius = 20

  ctx.save()
  ctx.setShadow(0, 4, 10, 'rgba(0, 0, 0, 0.5)')
  ctx.beginPath()
  ctx.moveTo(centerX - bubbleSize / 2 + radius, bubbleY)
  ctx.lineTo(centerX + bubbleSize / 2 - radius, bubbleY)
  ctx.quadraticCurveTo(centerX + bubbleSize / 2, bubbleY, centerX + bubbleSize / 2, bubbleY + radius)
  ctx.lineTo(centerX + bubbleSize / 2, bubbleY + bubbleSize - radius)
  ctx.quadraticCurveTo(
    centerX + bubbleSize / 2,
    bubbleY + bubbleSize,
    centerX + bubbleSize / 2 - radius,
    bubbleY + bubbleSize,
  )
  const arrowBaseY = bubbleY + bubbleSize
  const arrowTipY = arrowBaseY + ARROW_HEIGHT
  ctx.lineTo(centerX + 10, arrowBaseY)
  ctx.lineTo(centerX, arrowTipY)
  ctx.lineTo(centerX - 10, arrowBaseY)
  ctx.lineTo(centerX - bubbleSize / 2 + radius, bubbleY + bubbleSize)
  ctx.quadraticCurveTo(
    centerX - bubbleSize / 2,
    bubbleY + bubbleSize,
    centerX - bubbleSize / 2,
    bubbleY + bubbleSize - radius,
  )
  ctx.lineTo(centerX - bubbleSize / 2, bubbleY + radius)
  ctx.quadraticCurveTo(centerX - bubbleSize / 2, bubbleY, centerX - bubbleSize / 2 + radius, bubbleY)
  ctx.closePath()
  ctx.setFillStyle('#2b2b2b')
  ctx.fill()
  ctx.setShadow(0, 0, 0, 'transparent')
  ctx.setLineWidth(2)
  ctx.setStrokeStyle('rgba(255, 255, 255, 0.3)')
  ctx.stroke()
  ctx.restore()

  let img = await resolveImage(iconUrl)
  if (!img && fallbackIcon) {
    img = await resolveImage(fallbackIcon)
  }
  const logoSize = 50
  const logoY = bubbleY + (bubbleSize - logoSize) / 2
  const logoX = centerX - logoSize / 2

  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(centerX, logoY + logoSize / 2, logoSize / 2, 0, 2 * Math.PI)
    ctx.clip()
    ctx.drawImage(img.path, logoX, logoY, logoSize, logoSize)
    ctx.restore()
  } else {
    ctx.beginPath()
    ctx.arc(centerX, logoY + logoSize / 2, logoSize / 2, 0, 2 * Math.PI)
    ctx.setFillStyle('#444')
    ctx.fill()
  }

  const lines = wrapText(title, 11.5, 3)
  const lineHeight = 22
  const textTop = bubbleY + bubbleSize + ARROW_HEIGHT + TEXT_GAP + 8
  lines.forEach((line, idx) => {
    drawTextWithStroke(ctx, line, centerX, textTop + idx * lineHeight + lineHeight / 2, 18)
  })

  return new Promise((resolve) => {
    ctx.draw(false, () => {
      exportCanvas(ACTIVE_MARKER_CANVAS_ID, CANVAS_WIDTH, CANVAS_HEIGHT).then(resolve)
    })
  })
}

const drawInactiveMarker = async (iconUrl: string, fallbackIcon: string, title: string): Promise<string> => {
  const ctx = Taro.createCanvasContext(INACTIVE_MARKER_CANVAS_ID)
  ctx.scale(SCALE, SCALE)

  const centerX = INACTIVE_MARKER_WIDTH / 2
  let img = await resolveImage(iconUrl)
  if (!img && fallbackIcon) {
    img = await resolveImage(fallbackIcon)
  }

  const iconX = centerX - INACTIVE_ICON_SIZE / 2
  const iconY = 0
  if (img) {
    ctx.drawImage(img.path, iconX, iconY, INACTIVE_ICON_SIZE, INACTIVE_ICON_SIZE)
  } else {
    ctx.setFillStyle('#2b2b2b')
    ctx.fillRect(iconX, iconY, INACTIVE_ICON_SIZE, INACTIVE_ICON_SIZE)
  }

  const lines = wrapText(title, 15, INACTIVE_TEXT_MAX_LINES)
  const textTop = INACTIVE_ICON_SIZE + INACTIVE_TEXT_GAP + 4
  lines.forEach((line, idx) => {
    drawTextWithStroke(
      ctx,
      line,
      centerX,
      textTop + idx * INACTIVE_LINE_HEIGHT + INACTIVE_LINE_HEIGHT / 2,
      18,
    )
  })

  return new Promise((resolve) => {
    ctx.draw(false, () => {
      exportCanvas(INACTIVE_MARKER_CANVAS_ID, INACTIVE_CANVAS_WIDTH, INACTIVE_CANVAS_HEIGHT).then(resolve)
    })
  })
}

const memoryCache = new Map<string, string>()
const inactiveCache = new Map<string, string>()
const avatarCache = new Map<string, string>()

export const buildActiveMarkerIcon = async (
  iconUrl: string | undefined,
  fallbackIcon: string,
  title: string,
): Promise<string> => {
  const targetIcon = iconUrl || ''
  const key = `active::${targetIcon}::${fallbackIcon}::${title}::${STYLE_VERSION}`

  if (memoryCache.has(key)) return memoryCache.get(key) || fallbackIcon

  return queueTask(async () => {
    const path = await drawActivePin(targetIcon, fallbackIcon, title)
    if (path) memoryCache.set(key, path)
    return path || fallbackIcon
  })
}

export const buildInactiveMarkerIcon = async (
  iconUrl: string | undefined,
  fallbackIcon: string,
  title: string,
): Promise<{ iconPath: string; width: number; height: number; anchor: { x: number; y: number } }> => {
  const targetIcon = iconUrl || ''
  const key = `inactive::${targetIcon}::${fallbackIcon}::${title}::${STYLE_VERSION}`

  if (inactiveCache.has(key)) {
    return {
      iconPath: inactiveCache.get(key) || fallbackIcon,
      width: INACTIVE_MARKER_WIDTH,
      height: INACTIVE_MARKER_HEIGHT,
      anchor: { x: 0.5, y: Number((INACTIVE_ICON_SIZE / 2 / INACTIVE_MARKER_HEIGHT).toFixed(2)) },
    }
  }

  const path = await queueTask(async () => {
    return await drawInactiveMarker(targetIcon, fallbackIcon, title)
  })
  if (path) inactiveCache.set(key, path)
  return {
    iconPath: path || fallbackIcon,
    width: INACTIVE_MARKER_WIDTH,
    height: INACTIVE_MARKER_HEIGHT,
    anchor: { x: 0.5, y: Number((INACTIVE_ICON_SIZE / 2 / INACTIVE_MARKER_HEIGHT).toFixed(2)) },
  }
}

export const getActiveMarkerAnchor = () => {
  const arrowTipY = 4 + PIN_SIZE + ARROW_HEIGHT
  const anchorY = Number((arrowTipY / ACTIVE_MARKER_HEIGHT).toFixed(2))
  return { x: 0.5, y: anchorY }
}

export const resolveMarkerIconSize = (baseSize: number) => {
  return { width: baseSize, height: baseSize }
}

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
  if (path) avatarCache.set(key, path)
  return path || fallbackIcon
}
