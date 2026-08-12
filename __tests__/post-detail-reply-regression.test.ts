import fs from 'fs'
import path from 'path'

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'pages', 'square-sub', 'post-detail', 'index.tsx'),
  'utf8'
)

describe('post detail reply regression', () => {
  it('normalizes missing latest_replies before reply operations', () => {
    expect(source).toContain('latest_replies: Array.isArray(item.latest_replies) ? item.latest_replies : []')
    expect(source).toContain('const currentReplies = Array.isArray(comment.latest_replies) ? comment.latest_replies : []')
    expect(source).toContain('const currentReplies = Array.isArray(target.latest_replies) ? target.latest_replies : []')
    expect(source).toContain('(Array.isArray(c.latest_replies) ? c.latest_replies : []).map')
    expect(source).not.toContain('comment.latest_replies.some')
    expect(source).not.toContain('target.latest_replies.map')
    expect(source).not.toContain('c.latest_replies.map')
  })

  it('supports deleting own note comments and replies from the detail page', () => {
    expect(source).toContain('handleDeleteNote')
    expect(source).toContain('handleDeleteComment')
    expect(source).toContain("url: `/api/v1/note/${note.id}`")
    expect(source).toContain("url: '/api/v1/comments/delete'")
    expect(source).toContain('data: { comment_id: commentId }')
    expect(source).toContain('setCommentList(prev => prev.filter')
    expect(source).toContain('latest_replies: currentReplies.filter')
    expect(source).toContain('comment_count: Math.max(prev.comment_count - 1, 0)')
    expect(source).toContain('reply_count: Math.max(comment.reply_count - 1, 0)')
  })

  it('maps the new note detail activity fields into the activity preview card', () => {
    expect(source).toContain('normalizeActivityImages(data.activity)')
    expect(source).toContain('poster_list')
    expect(source).toContain('poster_detail')
    expect(source).toContain('data.activity.address')
    expect(source).toContain('formatActivityTimeRange(data.activity.start_time, data.activity.end_time)')
    expect(source).toContain('detail_url: String(data.activity.detail_url || \'\').trim()')
    expect(source).toContain('organizer_name: String(data.activity.organizer_name || \'\').trim()')
    expect(source).not.toContain('location_name: String(data.activity.location_name || \'\').trim()')
    expect(source).not.toContain('images: Array.isArray(data.activity.images) ? data.activity.images.filter(Boolean) : []')
  })
})
