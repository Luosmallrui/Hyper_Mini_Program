import fs from 'fs'
import path from 'path'

const pagePath = path.join(__dirname, '..', 'src', 'pages', 'user-sub', 'organizer', 'index.tsx')
const pageSource = fs.readFileSync(pagePath, 'utf8')

const stylePath = path.join(__dirname, '..', 'src', 'pages', 'user-sub', 'organizer', 'index.scss')
const styleSource = fs.readFileSync(stylePath, 'utf8')

describe('organizer date range picker', () => {
  it('renders the unified range picker header and date cards', () => {
    expect(pageSource).toContain('选择日期范围')
    expect(pageSource).toContain('calendar-range-preview')
    expect(pageSource).toContain('calendar-date-card start')
    expect(pageSource).toContain('calendar-date-card end')
    expect(pageSource).toContain('calendar-range-arrow')
    expect(pageSource).toContain('active-selecting-end')
  })

  it('uses the design button copy and bottom-sheet layout', () => {
    expect(pageSource).toContain('<Text>应用</Text>')
    expect(pageSource).not.toContain('<Text>确定</Text>')
    expect(styleSource).toContain('.calendar-panel')
    expect(styleSource).toContain('bottom: 0;')
    expect(styleSource).toContain('.calendar-date-card')
    expect(styleSource).toContain('.calendar-apply-btn')
  })

  it('highlights the full selected date range, not only endpoints', () => {
    expect(pageSource).toContain('isRangeStart')
    expect(pageSource).toContain('isRangeEnd')
    expect(pageSource).toContain('isInRange')
    expect(pageSource).toContain('range-start')
    expect(pageSource).toContain('range-end')
    expect(pageSource).toContain('in-range')
    expect(styleSource).toContain('.calendar-day.in-range')
    expect(styleSource).toContain('.calendar-day.range-start')
    expect(styleSource).toContain('.calendar-day.range-end')
  })
})
