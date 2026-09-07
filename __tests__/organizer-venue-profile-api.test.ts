import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

// 场地入驻与资料二审契约（docs/organizer_venue_activity_model_api_20260815.md §1/§2/§4）
describe('organizer venue profile api contract', () => {
  it('submits settlement apply with type venue/merchant and venue_profile', () => {
    const adapter = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')

    expect(adapter).toContain("url: '/api/v1/organizer/apply'")
    expect(adapter).toContain("type: isVenue ? 'venue' : 'merchant'")
    expect(adapter).toContain('venue_profile: {')
    expect(adapter).toContain('cover_image: venueProfile.cover_image')
    expect(adapter).toContain('business_hours: venueProfile.business_hours')
    expect(adapter).toContain('average_spend: yuanToFen(venueProfile.average_spend)')
  })

  it('maps pending profile revision fields from audit-status and profile', () => {
    const adapter = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')

    expect(adapter).toContain('has_pending_profile_revision')
    expect(adapter).toContain('pending_profile_reason')
    expect(adapter).toContain('pending_profile_revision')
    expect(adapter).toContain('hasPendingProfileRevision')
    expect(adapter).toContain('pendingProfileReason')
    expect(adapter).toContain('pendingProfileRevision')
  })

  it('updates venue profile with the full payload through /organizer/profile', () => {
    const adapter = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')

    expect(adapter).toContain('export const updateOrganizerVenueProfile')
    expect(adapter).toContain('marker_icon: payload.markerIcon')
    expect(adapter).toContain('contact_name: vp.contactName')
    expect(adapter).toContain('service_phone: vp.servicePhone')
    expect(adapter).toContain('average_spend: vp.averageSpend')
  })

  it('publishes activities as party only and skips step2 for venue organizers', () => {
    const adapter = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')

    // 发布向导不再伪造场地“长期有效”时间、不再按场地跳过票券 step4
    expect(adapter).not.toContain("const isVenue = draft.type === 'venue'")
    expect(adapter).not.toContain('2099-12-31')
    expect(adapter).toContain('venueAddressLocked')
    expect(adapter).not.toContain('updateOrganizerBusinessHours')
  })

  // 地图封面契约：活动 poster_map / 场地 map_cover（2026-09-03 后端新增，选填，缺省不清空）
  it('submits activity map cover as poster_map in step3 and backfills it on edit', () => {
    const adapter = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')

    expect(adapter).toContain('poster_map?: string')
    expect(adapter).toContain("mapPoster: 'poster_map'")
    expect(adapter).toContain('mapPoster: detail.poster_map')
    expect(adapter).toContain("poster_map: posterFields.poster_map || ''")
  })

  it('keeps the map cover slot optional in the wizard', () => {
    const mock = readSource('src', 'pages', 'user-sub', 'organizer', 'mock.ts')
    const organizer = readSource('src', 'pages', 'user-sub', 'organizer', 'index.tsx')

    expect(mock).toContain("key: 'mapPoster'")
    expect(mock).toContain('optional: true')
    expect(organizer).toContain('mapPoster: { width: 1292, height: 400 }')
    // 必填校验排除选填槽位
    expect(organizer).toContain('!slot.fileName && !slot.optional')
  })

  it('submits venue map cover flat as map_cover through /organizer/profile', () => {
    const adapter = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')
    const account = readSource('src', 'pages', 'user-sub', 'organizer', 'account', 'index.tsx')

    expect(adapter).toContain('map_cover?: string')
    expect(adapter).toContain("mapCover: rawVenue.map_cover || ''")
    expect(adapter).toContain('map_cover: vp.mapCover')
    // 账户页上传地图封面走 venue_map_cover，并回读修订快照
    expect(account).toContain("'venue_map_cover'")
    expect(account).toContain('form.map_cover = vp.mapCover')
    expect(account).toContain("if (typeof revision.map_cover === 'string') form.map_cover = revision.map_cover")
  })

  it('keeps the organizer wizard free of the venue creation branch', () => {
    const organizer = readSource('src', 'pages', 'user-sub', 'organizer', 'index.tsx')

    expect(organizer).not.toContain('nextDraft.type = organizerType')
    expect(organizer).not.toContain('活动类型与入驻类型一致')
    expect(organizer).not.toContain('场地为长期展示，无需选择活动日期')
    expect(organizer).toContain("if (organizerType === 'venue')")
    // 场地主办方默认沿用已审核场地地址；地图选点更换后随 step2 提交自定义地址
    expect(organizer).toContain("venueAddressLocked: organizerType === 'venue'")
    expect(organizer).toContain("venueCustomAddress: organizerType === 'venue' && venueAddressPicked")
  })
})
