import {
  buildOrderViewerFields,
  toggleViewerSelection,
} from '../src/pages/activity/viewer-selection'

describe('activity viewer selection', () => {
  it('supports selecting and deselecting multiple viewers up to ticket quantity', () => {
    expect(toggleViewerSelection([], 1, 2)).toEqual([1])
    expect(toggleViewerSelection([1], 2, 2)).toEqual([1, 2])
    expect(toggleViewerSelection([1, 2], 3, 2)).toEqual([1, 2])
    expect(toggleViewerSelection([1, 2], 1, 2)).toEqual([2])
  })

  it('replaces the selected viewer when buying a single ticket', () => {
    expect(toggleViewerSelection([1], 2, 1)).toEqual([2])
    expect(toggleViewerSelection([], 2, 1)).toEqual([2])
    expect(toggleViewerSelection([2], 2, 1)).toEqual([])
  })

  it('builds the documented multi-viewer order fields', () => {
    expect(buildOrderViewerFields([
      { id: 1, real_name: '张三', id_card: '5101', phone: '13800000000' },
      { id: 2, real_name: '李四', id_card: '5102', phone: '13900000000' },
    ])).toEqual({
      viewer_ids: [1, 2],
      viewers: [
        { id: 1, real_name: '张三', id_card: '5101', phone: '13800000000' },
        { id: 2, real_name: '李四', id_card: '5102', phone: '13900000000' },
      ],
    })
  })

  it('creates ticket orders with points_amount in points, not money', () => {
    const fs = require('fs')
    const path = require('path')
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'activity', 'index.tsx'), 'utf8')

    expect(source).toContain('use_points: pointsAmount > 0')
    expect(source).toContain('points_amount: pointsAmount')
    expect(source).toContain('payableCents')
    expect(source).not.toContain('points_amount: usePoints ? pointsToDeduct : 0')
  })
})
