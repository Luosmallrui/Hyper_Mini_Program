import {
  getRelatedNoteCover,
  normalizeRelatedNotes,
  splitRelatedNotesForWaterfall,
} from '../src/pages/square/related-notes'

describe('related notes normalization', () => {
  it('normalizes related note media, author, and counts from API rows', () => {
    const notes = normalizeRelatedNotes([
      {
        id: 123,
        title: '场地实拍',
        content: '这里氛围不错',
        nickname: '小明',
        avatar: 'avatar.png',
        like_count: 8,
        media_data: {
          url: 'image.jpg',
          thumbnail_url: 'thumb.jpg',
          width: 1200,
          height: 1600,
        },
      },
      {
        id: 456,
        user_id: 9,
        media_data: [
          { url: 'a.jpg', width: 100, height: 100 },
          { url: 'b.jpg', width: 100, height: 100 },
        ],
      },
    ])

    expect(notes[0]).toMatchObject({
      id: '123',
      title: '场地实拍',
      content: '这里氛围不错',
      authorName: '小明',
      authorAvatar: 'avatar.png',
      likeCount: 8,
    })
    expect(getRelatedNoteCover(notes[0])).toBe('thumb.jpg')
    expect(notes[1].authorName).toBe('用户9')
    expect(splitRelatedNotesForWaterfall(notes)).toEqual({
      left: [notes[0]],
      right: [notes[1]],
    })
  })
})
