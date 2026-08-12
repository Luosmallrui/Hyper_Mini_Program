export interface RelatedNoteMedia {
  url?: string
  thumbnail_url?: string
  width?: number
  height?: number
  duration?: number
}

export interface RelatedNote {
  id: string
  title: string
  content: string
  userId: string
  authorName: string
  authorAvatar: string
  media: RelatedNoteMedia[]
  likeCount: number
}

const normalizeNumber = (value: unknown, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const normalizeMediaList = (mediaData: unknown): RelatedNoteMedia[] => {
  if (!mediaData) return []
  if (Array.isArray(mediaData)) return mediaData.filter(Boolean)
  if (typeof mediaData === 'object') return [mediaData as RelatedNoteMedia]
  return []
}

export const normalizeRelatedNotes = (rows: unknown[]): RelatedNote[] => {
  if (!Array.isArray(rows)) return []

  return rows.map((row: any) => {
    const userId = String(row?.user_id ?? row?.user?.user_id ?? '')
    return {
      id: String(row?.id ?? ''),
      title: String(row?.title || row?.content || '动态'),
      content: String(row?.content || ''),
      userId,
      authorName: String(row?.nickname || row?.user_name || row?.user?.nickname || row?.user?.user_name || (userId ? `用户${userId}` : '用户')),
      authorAvatar: String(row?.avatar || row?.user_avatar || row?.user?.avatar || ''),
      media: normalizeMediaList(row?.media_data),
      likeCount: Math.max(normalizeNumber(row?.like_count ?? row?.likes, 0), 0),
    }
  }).filter((note) => note.id)
}

export const getRelatedNoteCover = (note: RelatedNote) => {
  const firstMedia = note.media[0]
  return firstMedia?.thumbnail_url || firstMedia?.url || ''
}

export const splitRelatedNotesForWaterfall = (notes: RelatedNote[]) => ({
  left: notes.filter((_, index) => index % 2 === 0),
  right: notes.filter((_, index) => index % 2 === 1),
})
