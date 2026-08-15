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

  it('keeps the organizer wizard free of the venue creation branch', () => {
    const organizer = readSource('src', 'pages', 'user-sub', 'organizer', 'index.tsx')

    expect(organizer).not.toContain('nextDraft.type = organizerType')
    expect(organizer).not.toContain('活动类型与入驻类型一致')
    expect(organizer).not.toContain('场地为长期展示，无需选择活动日期')
    expect(organizer).toContain("if (organizerType === 'venue')")
    expect(organizer).toContain('{ venueAddressLocked: organizerType === \'venue\' }')
  })
})
