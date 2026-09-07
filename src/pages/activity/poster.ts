import Taro from '@tarojs/taro'

/**
 * 活动购票分享海报：canvas 离屏合成（海报图 + 标题/时间/地点 + 主办方 + 小程序码），
 * 导出临时图片路径供预览与保存相册。小程序码由后端 GET /activity/:id/wxacode 提供。
 */

export const POSTER_WIDTH = 640
export const POSTER_HEIGHT = 1008

export interface ActivityPosterParams {
  title: string
  /** 已格式化的时间文案（如 2026-09-25 20:00 - 2026-09-25 23:00 或场地营业时间自由文本） */
  timeText: string
  locationText: string
  /** 以下图片均为本地临时路径（downloadFile 后的 tempFilePath） */
  posterImage: string
  qrImage: string
  organizerName: string
  organizerAvatar: string
}

/** 从路由参数解析活动 ID：优先 id，其次扫码进入的 scene（兼容扩展格式 活动ID_分享者ID） */
export const resolveActivityIdFromParams = (params?: { id?: unknown; scene?: unknown }) => {
  const id = String(params?.id ?? '').trim()
  if (id) return id
  const sceneRaw = String(params?.scene ?? '').trim()
  if (!sceneRaw) return ''
  let scene = sceneRaw
  try {
    scene = decodeURIComponent(sceneRaw)
  } catch (error) {
    // scene 未编码时保留原值
  }
  return (scene.split('_')[0] || '').trim()
}

const WEEKDAY_TEXTS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** 从时间文案提取首个日期，输出海报用的「09.25 + 周五」；提取不到返回 null（如场地营业时间自由文本） */
export const extractPosterDate = (timeText: string): { dateText: string; weekday: string } | null => {
  const matched = String(timeText || '').match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!matched) return null
  const date = new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]))
  if (Number.isNaN(date.getTime())) return null
  return { dateText: `${matched[2]}.${matched[3]}`, weekday: WEEKDAY_TEXTS[date.getDay()] }
}

/** 按测量宽度折行，超出 maxLines 时末行加省略号 */
export const wrapPosterLines = (
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] => {
  const input = String(text || '').trim()
  if (!input) return []
  const lines: string[] = []
  let current = ''
  for (const char of input) {
    if (measure(current + char) > maxWidth && current) {
      lines.push(current)
      current = char
      if (lines.length >= maxLines) break
    } else {
      current += char
    }
  }
  if (lines.length < maxLines && current) lines.push(current)
  const used = lines.join('').length
  if (used < input.length && lines.length > 0) {
    let last = lines[lines.length - 1]
    while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1)
    lines[lines.length - 1] = `${last}…`
  }
  return lines
}

const loadCanvasImage = (canvas: any, src: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const img = canvas.createImage()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })

/** cover 模式绘制：图片等比放大铺满目标区域，居中裁掉溢出部分 */
const drawCoverImage = (ctx: any, img: any, x: number, y: number, w: number, h: number) => {
  const iw = img.width || w
  const ih = img.height || h
  const scale = Math.max(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

/** 在离屏 canvas 上合成海报（版式参照分享样图：上图下文，右下角小程序码） */
export const drawActivityPoster = async (canvas: any, params: ActivityPosterParams) => {
  const ctx = canvas.getContext('2d')
  const W = POSTER_WIDTH
  const H = POSTER_HEIGHT
  const pad = 40

  // 白底
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // 顶部海报图 640x480（poster_list 为 4:3，恰好铺满）
  const posterImg = await loadCanvasImage(canvas, params.posterImage)
  drawCoverImage(ctx, posterImg, 0, 0, W, 480)

  // 标题（最多两行）
  ctx.fillStyle = '#111111'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = 'bold 30px sans-serif'
  const titleLines = wrapPosterLines((t) => ctx.measureText(t).width, params.title, W - pad * 2, 2)
  titleLines.forEach((line, index) => {
    ctx.fillText(line, pad, 548 + index * 42)
  })

  // 时间 + 地点行
  const metaBaseline = 636
  const posterDate = extractPosterDate(params.timeText)
  if (posterDate) {
    ctx.fillStyle = '#111111'
    ctx.font = 'bold 34px sans-serif'
    ctx.fillText(posterDate.dateText, pad, metaBaseline)
    const dateWidth = ctx.measureText(posterDate.dateText).width
    ctx.font = '24px sans-serif'
    ctx.fillText(` ${posterDate.weekday}`, pad + dateWidth, metaBaseline)
  } else if (params.timeText) {
    ctx.fillStyle = '#111111'
    ctx.font = '24px sans-serif'
    const lines = wrapPosterLines((t) => ctx.measureText(t).width, params.timeText, 320, 1)
    if (lines[0]) ctx.fillText(lines[0], pad, metaBaseline)
  }
  if (params.locationText) {
    ctx.fillStyle = '#555555'
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'right'
    const lines = wrapPosterLines((t) => ctx.measureText(t).width, params.locationText, 220, 1)
    if (lines[0]) ctx.fillText(lines[0], W - pad, metaBaseline)
    ctx.textAlign = 'left'
  }

  // 分隔线
  ctx.strokeStyle = '#e5e5e5'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, 684)
  ctx.lineTo(W - pad, 684)
  ctx.stroke()

  // 主办方（左）：圆形头像 + 名称
  const avatarSize = 64
  const avatarY = 716
  if (params.organizerAvatar) {
    try {
      const avatarImg = await loadCanvasImage(canvas, params.organizerAvatar)
      ctx.save()
      ctx.beginPath()
      ctx.arc(pad + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
      ctx.clip()
      drawCoverImage(ctx, avatarImg, pad, avatarY, avatarSize, avatarSize)
      ctx.restore()
    } catch (error) {
      // 头像加载失败时保留占位圆
    }
  }
  ctx.strokeStyle = '#eeeeee'
  ctx.beginPath()
  ctx.arc(pad + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#111111'
  ctx.font = '26px sans-serif'
  const nameLines = wrapPosterLines((t) => ctx.measureText(t).width, params.organizerName || '主办方', 240, 1)
  if (nameLines[0]) ctx.fillText(nameLines[0], pad + avatarSize + 20, avatarY + 42)

  // 小程序码（右）：白底卡片 + 码 + 引导文案
  const qrSize = 148
  const qrX = W - pad - qrSize
  const qrY = 712
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16)
  ctx.strokeStyle = '#eeeeee'
  ctx.strokeRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16)
  const qrImg = await loadCanvasImage(canvas, params.qrImage)
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
  ctx.fillStyle = '#999999'
  ctx.font = '20px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('微信扫码 立即购票', qrX + qrSize / 2, qrY + qrSize + 34)
  ctx.textAlign = 'left'

  // 品牌落款
  ctx.fillStyle = '#111111'
  ctx.font = 'italic bold 30px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('HYPER', W / 2, H - 44)
  ctx.textAlign = 'left'
}

/** 下载网络图片为本地临时路径；失败返回空串（由调用方决定是否可缺省） */
const downloadImage = async (url: string) => {
  if (!url) return ''
  try {
    const res = await Taro.downloadFile({ url })
    if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) return res.tempFilePath
  } catch (error) {
    console.warn('[poster] download image failed:', url, error)
  }
  return ''
}

/** 合成海报并导出临时图片路径（2 倍尺寸保证清晰度） */
export const generateActivityPoster = async (
  input: Omit<ActivityPosterParams, 'posterImage' | 'qrImage' | 'organizerAvatar'> & {
    posterUrl: string
    qrUrl: string
    organizerAvatarUrl: string
  },
): Promise<string> => {
  const posterImage = await downloadImage(input.posterUrl)
  if (!posterImage) throw new Error('海报图下载失败')
  const qrImage = await downloadImage(input.qrUrl)
  if (!qrImage) throw new Error('小程序码下载失败')
  const organizerAvatar = await downloadImage(input.organizerAvatarUrl)

  const wxApi: any = Taro
  const canvas = wxApi.createOffscreenCanvas?.({ type: '2d', width: POSTER_WIDTH, height: POSTER_HEIGHT })
    || (typeof (globalThis as any).wx !== 'undefined' && (globalThis as any).wx.createOffscreenCanvas?.({ type: '2d', width: POSTER_WIDTH, height: POSTER_HEIGHT }))
  if (!canvas) throw new Error('当前环境不支持海报生成')

  await drawActivityPoster(canvas, {
    title: input.title,
    timeText: input.timeText,
    locationText: input.locationText,
    posterImage,
    qrImage,
    organizerName: input.organizerName,
    organizerAvatar,
  })

  const tempPath: string = await new Promise((resolve, reject) => {
    Taro.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      destWidth: POSTER_WIDTH * 2,
      destHeight: POSTER_HEIGHT * 2,
      success: (res) => resolve(res.tempFilePath),
      fail: () => reject(new Error('海报导出失败')),
    })
  })
  if (!tempPath) throw new Error('海报导出失败')
  return tempPath
}
