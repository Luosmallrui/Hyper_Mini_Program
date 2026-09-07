import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useRef, useState } from 'react'
import './index.scss'

interface ImageCropperProps {
  open: boolean
  sourceImage: string
  /** 裁剪框宽高比，如 1:1（logo）传 1/1，4:5 海报传 4/5 */
  aspectWidth: number
  aspectHeight: number
  title?: string
  /** 提供时显示「使用原图」按钮（不裁剪直接回原图） */
  onUseOriginal?: () => void
  onConfirm: (tempPath: string) => void
  onCancel: () => void
}

const VIEW_MAX_W = 320
const VIEW_MAX_H = 430
const BOX_MIN = 56

interface Box { x: number; y: number; w: number; h: number }
type DragMode = '' | 'move' | 'tl' | 'tr' | 'bl' | 'br'

/**
 * 图片裁剪弹窗（小红书式）：图片铺满显示，取景框可整体拖动、四角缩放（锁定槽位比例）。
 * 默认取景框为图片上可放下的最大区域（同比例时即整图）。
 */
const ImageCropper: React.FC<ImageCropperProps> = ({
  open,
  sourceImage,
  aspectWidth,
  aspectHeight,
  title = '裁剪图片',
  onUseOriginal,
  onConfirm,
  onCancel,
}) => {
  const aspect = aspectWidth / aspectHeight
  const outW = aspectWidth * 500
  const outH = aspectHeight * 500

  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 })
  const [exporting, setExporting] = useState(false)
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; box: Box }>({
    mode: '', startX: 0, startY: 0, box: { x: 0, y: 0, w: 0, h: 0 },
  })

  useEffect(() => {
    if (!open || !sourceImage) return
    setImgNatural({ w: 0, h: 0 })
    Taro.getImageInfo({
      src: sourceImage,
      success: (info) => {
        if (!info.width || !info.height) return
        setImgNatural({ w: info.width, h: info.height })
        // 图片等比铺满视口（contain），取景框取可放下的最大同比例区域（同比例时即整图）
        const displayScale = Math.min(VIEW_MAX_W / info.width, VIEW_MAX_H / info.height)
        const vw = Math.round(info.width * displayScale)
        const vh = Math.round(info.height * displayScale)
        setViewport({ w: vw, h: vh })
        let bw = vw
        let bh = bw / aspect
        if (bh > vh) {
          bh = vh
          bw = bh * aspect
        }
        setBox({ x: Math.round((vw - bw) / 2), y: Math.round((vh - bh) / 2), w: Math.round(bw), h: Math.round(bh) })
      },
      fail: () => {
        Taro.showToast({ title: '图片读取失败', icon: 'none' })
        onCancel()
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceImage, aspect])

  const clampBox = (next: Box): Box => {
    const w = Math.min(Math.max(next.w, BOX_MIN), viewport.w)
    const h = w / aspect
    const x = Math.min(Math.max(next.x, 0), viewport.w - w)
    const y = Math.min(Math.max(next.y, 0), viewport.h - h)
    return { x, y, w, h }
  }

  const beginDrag = (mode: DragMode) => (e: any) => {
    e.stopPropagation?.()
    const touch = e.touches?.[0]
    if (!touch) return
    dragRef.current = { mode, startX: touch.clientX, startY: touch.clientY, box: { ...box } }
  }

  const onTouchMove = (e: any) => {
    const drag = dragRef.current
    if (!drag.mode) return
    const touch = e.touches?.[0]
    if (!touch) return
    const dx = touch.clientX - drag.startX
    const dy = touch.clientY - drag.startY
    const start = drag.box

    if (drag.mode === 'move') {
      setBox(clampBox({ ...start, x: start.x + dx, y: start.y + dy }))
      return
    }

    // 四角缩放（锁定比例）：以对角为锚点
    let nextW = start.w
    if (drag.mode === 'br' || drag.mode === 'tr') nextW = start.w + dx
    else nextW = start.w - dx
    // 各角的横向边界
    const maxWByRight = viewport.w - (drag.mode === 'br' || drag.mode === 'tr' ? start.x : 0)
    const maxWByLeft = drag.mode === 'bl' || drag.mode === 'tl' ? start.x + start.w : viewport.w
    let w = Math.min(nextW, maxWByRight, maxWByLeft)
    // 纵向边界（按锚点推算）
    const anchorBottom = drag.mode === 'br' || drag.mode === 'bl'
    const anchorTopY = anchorBottom ? start.y : start.y + start.h
    const maxH = anchorBottom ? viewport.h - start.y : anchorTopY
    w = Math.min(w, maxH * aspect)
    w = Math.max(BOX_MIN, w)
    const h = w / aspect

    let x = start.x
    let y = start.y
    if (drag.mode === 'bl' || drag.mode === 'tl') x = start.x + start.w - w
    if (drag.mode === 'tl' || drag.mode === 'tr') y = start.y + start.h - h
    setBox(clampBox({ x, y, w, h }))
  }

  const onTouchEnd = () => {
    dragRef.current.mode = ''
  }

  const handleConfirm = async () => {
    if (!imgNatural.w || !box.w || exporting) return
    setExporting(true)
    try {
      const scale = imgNatural.w / viewport.w
      const srcX = Math.max(0, Math.round(box.x * scale))
      const srcY = Math.max(0, Math.round(box.y * scale))
      const srcW = Math.min(imgNatural.w - srcX, Math.round(box.w * scale))
      const srcH = Math.min(imgNatural.h - srcY, Math.round(box.h * scale))

      const wxApi: any = Taro
      const canvas = wxApi.createOffscreenCanvas?.({ type: '2d', width: outW, height: outH })
        || (typeof (globalThis as any).wx !== 'undefined' && (globalThis as any).wx.createOffscreenCanvas?.({ type: '2d', width: outW, height: outH }))
      if (!canvas) throw new Error('无法创建离屏 Canvas')

      const ctx = canvas.getContext('2d')
      const img = canvas.createImage()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = sourceImage
      })
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)

      const tempPath: string = await new Promise((resolve, reject) => {
        Taro.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: outW,
          height: outH,
          destWidth: outW * 2,
          destHeight: outH * 2,
          fileType: 'png',
          success: (r) => resolve(r.tempFilePath),
          fail: (err) => reject(err),
        } as any)
      })
      onConfirm(tempPath)
    } catch (error) {
      console.error('[ImageCropper] export failed:', error)
      Taro.showToast({ title: '裁剪失败，请重试', icon: 'none' })
    } finally {
      setExporting(false)
    }
  }

  if (!open) return null

  const maskColor = 'rgba(0,0,0,0.55)'

  return (
    <View className='image-cropper-overlay' onClick={onCancel}>
      <View className='image-cropper-panel' onClick={(e) => e.stopPropagation()}>
        <Text className='image-cropper-title'>{title}</Text>
        {viewport.w > 0 && (
          <View
            className='image-cropper-frame'
            style={{ width: `${viewport.w}px`, height: `${viewport.h}px` }}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Image src={sourceImage} mode='scaleToFill' style={{ width: '100%', height: '100%' }} />

            {/* 取景框外暗色遮罩（四边） */}
            <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: `${box.y}px`, background: maskColor }} />
            <View style={{ position: 'absolute', left: 0, top: `${box.y + box.h}px`, width: '100%', height: `${viewport.h - box.y - box.h}px`, background: maskColor }} />
            <View style={{ position: 'absolute', left: 0, top: `${box.y}px`, width: `${box.x}px`, height: `${box.h}px`, background: maskColor }} />
            <View style={{ position: 'absolute', left: `${box.x + box.w}px`, top: `${box.y}px`, width: `${viewport.w - box.x - box.w}px`, height: `${box.h}px`, background: maskColor }} />

            {/* 取景框：框体拖动移动 */}
            <View
              className='image-cropper-box'
              style={{ left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` }}
              onTouchStart={beginDrag('move')}
            >
              {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                <View
                  key={corner}
                  className={`image-cropper-handle ${corner}`}
                  onTouchStart={beginDrag(corner)}
                />
              ))}
            </View>

            {exporting && (
              <View className='image-cropper-mask'>
                <Text className='image-cropper-mask-text'>裁剪中...</Text>
              </View>
            )}
          </View>
        )}
        <Text className='image-cropper-hint'>拖动取景框选择区域 · 拖动四角调整大小</Text>
        <View className='image-cropper-footer'>
          <View className='image-cropper-btn ghost' onClick={onCancel}>
            <Text>取消</Text>
          </View>
          {onUseOriginal && (
            <View className='image-cropper-btn ghost' onClick={onUseOriginal}>
              <Text>使用原图</Text>
            </View>
          )}
          <View className='image-cropper-btn primary' onClick={() => void handleConfirm()}>
            <Text>{exporting ? '裁剪中' : '确认裁剪'}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default ImageCropper
