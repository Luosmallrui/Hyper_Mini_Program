import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')
const LEGACY_SUBSCRIBE_LIST_ENDPOINT = ['/api/v1', 'subscribe', 'list'].join('/')

describe('client progress completion contracts', () => {
  it('opens agreement and real-name notice details from auth and attendee forms', () => {
    const authGate = readSource('src', 'components', 'AuthGate', 'index.tsx')
    const attendee = readSource('src', 'pages', 'activity-attendee', 'index.tsx')

    expect(authGate).toContain('agreementDetailType')
    expect(authGate).toContain('AGREEMENT_DETAIL_MAP')
    expect(authGate).toContain('《用户协议》')
    expect(authGate).toContain('《隐私协议》')
    expect(attendee).toContain('showRealNameNotice')
    expect(attendee).toContain('setShowRealNameNotice(true)')
  })

  it('navigates subscribed cards from search into venue or activity detail pages', () => {
    const source = readSource('src', 'pages', 'search', 'index.tsx')

    expect(source).toContain('handleSubscriptionClick')
    expect(source).toContain('onClick={() => handleSubscriptionClick(sub)}')
    expect(source).toContain('/pages/venue/index')
    expect(source).toContain('/pages/activity/index')
  })

  it('builds map and list filter query parameters with client-side fallback filtering', () => {
    const home = readSource('src', 'pages', 'index', 'index.tsx')
    const list = readSource('src', 'pages', 'activity-list', 'index.tsx')
    const buildConfig = readSource('config', 'index.ts')

    expect(home).toContain('buildMapMarkerQueryParams')
    expect(home).toContain('filterMapMarkersBySelectedFilters')
    expect(home).not.toContain('process.env.YDY_TENCENT_MAP_LAYER_STYLE')
    expect(home).toContain('__YDY_TENCENT_MAP_LAYER_STYLE__')
    expect(home).toContain("...(MAP_LAYER_STYLE ? { layerStyle: MAP_LAYER_STYLE } : {})")
    expect(buildConfig).toContain('__YDY_TENCENT_MAP_LAYER_STYLE__')
    expect(list).toContain('buildActivityListQueryParams')
    expect(list).toContain('/api/v1/map/markers')
    expect(list).toContain('source=all')
    expect(list).toContain('category_id')
    expect(list).toContain('district=')
    expect(list).not.toContain('/api/v1/merchant/list')
    expect(list).not.toContain('area_id=')
    expect(list).toContain('tag_ids')
    expect(list).toContain('getSelectedTagLabel(selectedTagIds, merchantTags)')
    expect(list).toContain('tags.find((tag) => tag.id === id)?.name')
    expect(list).toContain('return `${tagNames[0]}+${selectedIds.length - 1}`')
  })

  it('offers explicit refund reason, progress, and cancel actions on order details', () => {
    const source = readSource('src', 'pages', 'order-sub', 'order-detail', 'index.tsx')

    expect(source).toContain('refundReasons')
    expect(source).toContain('/api/v1/refund/reasons')
    expect(source).toContain('/api/v1/refund/apply')
    expect(source).toContain("status: 'refundPending'")
    expect(source).toContain('待审核')
    expect(source).toContain('handleCancelRefund')
    expect(source).toContain('/cancel')
  })

  it('supports pending order cancel and continue-pay actions on order details', () => {
    const source = readSource('src', 'pages', 'order-sub', 'order-detail', 'index.tsx')

    expect(source).toContain('handleCancelOrder')
    expect(source).toContain("url: `/api/v1/order/${encodeURIComponent(orderDetail.orderNo)}/cancel`")
    expect(source).toContain('data: { reason_id: 1 }')
    expect(source).toContain('handleContinuePay')
    expect(source).toContain("url: '/api/v1/pay/prepay'")
    expect(source).toContain('paying')
  })

  it('marks all message sessions read and refreshes after private-message sends', () => {
    const message = readSource('src', 'pages', 'message', 'index.tsx')
    const chat = readSource('src', 'pages', 'chat', 'index.tsx')

    expect(message).toContain('handleMarkAllRead')
    expect(message).toContain('/api/v1/session/clear-unread')
    expect(message).toContain('一键已读')
    expect(message).toContain('CHAT_MESSAGE_SENT')
    expect(chat).toContain("Taro.eventCenter.trigger('CHAT_MESSAGE_SENT'")
  })

  it('fills user-center joined/subscribed activities and exposes dynamic deletion', () => {
    const source = readSource('src', 'pages', 'user', 'index.tsx')

    expect(source).toContain('fetchJoinedActivities')
    expect(source).toContain('/api/v1/order/list')
    expect(source).toContain('/api/v1/activity/subscriptions?page=1&pageSize=20')
    expect(source).toContain('Array.isArray(body?.data?.list) ? body.data.list : []')
    expect(source).not.toContain(LEGACY_SUBSCRIBE_LIST_ENDPOINT)
    expect(source).toContain('handleActivityCardClick')
    expect(source).toContain('deleteMyNote')
    expect(source).toContain('/api/v1/note/${noteId}')
    expect(source).toContain("method: 'DELETE'")
  })

  it('uses the activity subscriptions API for search subscription cards', () => {
    const source = readSource('src', 'pages', 'search', 'index.tsx')

    expect(source).toContain('/api/v1/activity/subscriptions?page=1&pageSize=20')
    expect(source).toContain('Array.isArray(body?.data?.list) ? body.data.list : []')
    expect(source).not.toContain(LEGACY_SUBSCRIBE_LIST_ENDPOINT)
  })

  it('keeps user-center empty states free of mojibake text', () => {
    const userCenter = readSource('src', 'pages', 'user', 'index.tsx')
    const postDetail = readSource('src', 'pages', 'square-sub', 'post-detail', 'index.tsx')

    expect(userCenter).toContain('<Text className="empty-icon">暂无</Text>')
    expect(userCenter).toContain('还没有发布动态')
    expect(`${userCenter}\n${postDetail}`).not.toMatch(/馃|摑|鎵|搴|鍒|寮圭獥/)
  })

  it('shows settlement, organizer admin, and verifier records as independent user-center entries', () => {
    const source = readSource('src', 'pages', 'user', 'index.tsx')
    const style = readSource('src', 'pages', 'user', 'index.scss')

    expect(source).toContain('const settlementEntry = {')
    expect(source).toContain("label: '我要入驻'")
    expect(source).toContain('const organizerEntry = {')
    expect(source).toContain("label: '管理后台'")
    expect(source).toContain("route: '/pages/user-sub/organizer/index'")
    expect(source).not.toContain("label: '账号中心'")
    expect(source).not.toContain("action: organizerAuditStatus === 1 ? 'organizerPending'")
    expect(source).not.toContain("(isOrganizerApproved ? undefined : 'settlementApply')")
    expect(source).toContain('const verifierEntry = isActiveVerifier')
    expect(source).toContain("label: '核销记录'")
    expect(source).toContain('settlementEntry,')
    expect(source).toContain('organizerEntry,')
    expect(source).toContain('verifierEntry')
    expect(source).toContain('scrollX')
    expect(source).toContain('showScrollbar={false}')
    expect(source).toContain('main-nav-scrollbar')
    expect(style).toContain('flex: 1 1 0')
    expect(style).toContain('min-width: calc((100vw - 60px) / 6)')
    expect(style).toContain('.main-nav-scrollbar.active')
    expect(source).not.toContain("isActiveVerifier\n      ? {\n          iconClass: 'verify-records'")
  })
})
