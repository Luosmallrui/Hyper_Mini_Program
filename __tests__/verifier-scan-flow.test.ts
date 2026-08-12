import {
  buildVerifierScanRequest,
  mapVerifierScanErrorCode,
  parseVerifierQrPayload,
} from '../src/utils/verifier-scan'

describe('verifier scan flow', () => {
  it('accepts the original ticket QR code without an activity id', () => {
    expect(parseVerifierQrPayload('TICKET:T2026053114300012ab34cd:xxxx')).toEqual({
      qrCode: 'TICKET:T2026053114300012ab34cd:xxxx',
    })
  })

  it('rejects values that are not ticket QR codes', () => {
    expect(parseVerifierQrPayload('ORDER_TICKET:T2026053114300012ab34cd:xxxx')).toBeNull()
    expect(parseVerifierQrPayload('https://example.com/order/1')).toBeNull()
  })

  it('builds a scan request with only the required QR code', () => {
    expect(buildVerifierScanRequest({ qrCode: 'TICKET:ORDER:TOKEN' })).toEqual({
      qr_code: 'TICKET:ORDER:TOKEN',
    })
  })

  it('includes activity_id only when an activity context is provided', () => {
    expect(buildVerifierScanRequest({ qrCode: 'TICKET:ORDER:TOKEN', activityId: 7 })).toEqual({
      qr_code: 'TICKET:ORDER:TOKEN',
      activity_id: 7,
    })
  })

  it.each([
    ['ORDER_NOT_FOUND', 'orderNotFound'],
    ['WRONG_ACTIVITY', 'wrongActivity'],
    ['ALREADY_VERIFIED', 'alreadyVerified'],
    ['ORDER_CANCELLED', 'orderCancelled'],
    ['INVALID_QR', 'invalidQr'],
    ['NOT_VERIFIABLE_TIME', 'notVerifiableTime'],
  ])('maps backend precheck error %s to %s', (errorCode, expectedStatus) => {
    expect(mapVerifierScanErrorCode(errorCode)).toBe(expectedStatus)
  })
})
