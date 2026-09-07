import { readFileSync } from 'fs'
import { join } from 'path'
import {
  extractPosterDate,
  resolveActivityIdFromParams,
  wrapPosterLines,
  POSTER_WIDTH,
  POSTER_HEIGHT,
} from '../src/pages/activity/poster'

const readSource = (...segments: string[]) => readFileSync(join(__dirname, '..', ...segments), 'utf-8')

describe('activity share poster', () => {
  it('resolves activity id from route params with scene fallback', () => {
    expect(resolveActivityIdFromParams({ id: '86' })).toBe('86')
    expect(resolveActivityIdFromParams({ id: '86', scene: '99' })).toBe('86')
    expect(resolveActivityIdFromParams({ scene: '86' })).toBe('86')
    // 兼容扩展格式 scene=活动ID_分享者ID
    expect(resolveActivityIdFromParams({ scene: '86_12345' })).toBe('86')
    // scene 可能被 URL 编码
    expect(resolveActivityIdFromParams({ scene: '86%5F12345' })).toBe('86')
    expect(resolveActivityIdFromParams({})).toBe('')
    expect(resolveActivityIdFromParams(undefined)).toBe('')
  })

  it('extracts poster date with weekday from formatted time text', () => {
    // 2026-09-25 是周五
    expect(extractPosterDate('2026-09-25 20:00 - 2026-09-25 23:00')).toEqual({
      dateText: '09.25',
      weekday: '周五',
    })
    expect(extractPosterDate('2026-12-31T22:00:00+08:00')).toEqual({
      dateText: '12.31',
      weekday: '周四',
    })
    // 场地营业时间等自由文本提取不到日期
    expect(extractPosterDate('早上9点到晚上9点')).toBeNull()
    expect(extractPosterDate('')).toBeNull()
  })

  it('wraps title lines by measured width with ellipsis', () => {
    // 模拟等宽测量：每字符 10px
    const measure = (text: string) => text.length * 10
    expect(wrapPosterLines(measure, 'TRAVIS SCOTT 音乐纪元专场', 130, 2)).toEqual([
      'TRAVIS SCOTT ',
      '音乐纪元专场',
    ])
    // 超过两行截断并加省略号（24 字超出两行 20 字容量）
    const long = '一二三四五六七八九十甲乙丙丁戊己庚辛壬癸子丑寅卯'
    const lines = wrapPosterLines(measure, long, 100, 2)
    expect(lines).toHaveLength(2)
    expect(lines[1].endsWith('…')).toBe(true)
    expect(lines.join('').replace('…', '').length).toBeLessThan(long.length)
    expect(wrapPosterLines(measure, '', 100, 2)).toEqual([])
  })

  it('keeps poster canvas at the documented 2x export size', () => {
    expect(POSTER_WIDTH).toBe(640)
    expect(POSTER_HEIGHT).toBe(1008)
  })

  it('wires scene parsing, wxacode fetch, poster entry and album save into the activity page', () => {
    const page = readSource('src', 'pages', 'activity', 'index.tsx')

    // scene 参数解析
    expect(page).toContain('resolveActivityIdFromParams(router.params)')
    // 小程序码接口
    expect(page).toContain('/wxacode')
    // 海报入口（场地不售票，不展示购票海报入口）
    expect(page).toContain("className='poster-pill'")
    // canvas 合成 + 保存相册
    expect(page).toContain('generateActivityPoster({')
    expect(page).toContain('saveImageToPhotosAlbum')
  })
})
