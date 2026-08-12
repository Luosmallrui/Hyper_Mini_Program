export const VERIFIER_QR_PREFIX = 'HYPER_VERIFY_V1:'
export const PENDING_VERIFIER_SCAN_KEY = 'pending_verifier_scan'

export type VerifierScanPayload = {
  qrCode: string
  activityId?: number
}

export const parseVerifierQrPayload = (rawValue: string): VerifierScanPayload | null => {
  const normalized = rawValue.trim()
  if (/^TICKET:[^:]+:.+/.test(normalized)) return { qrCode: normalized }
  if (!normalized.startsWith(VERIFIER_QR_PREFIX)) return null

  try {
    const decoded = JSON.parse(decodeURIComponent(normalized.slice(VERIFIER_QR_PREFIX.length)))
    const qrCode = typeof decoded?.qrCode === 'string' ? decoded.qrCode.trim() : ''
    const activityId = Number(decoded?.activityId)
    if (!/^TICKET:[^:]+:.+/.test(qrCode)) return null
    return Number.isInteger(activityId) && activityId > 0 ? { qrCode, activityId } : { qrCode }
  } catch (_) {
    return null
  }
}

export const buildVerifierScanRequest = ({ qrCode, activityId }: VerifierScanPayload) => {
  if (!qrCode.trim()) throw new Error('券码缺失')
  const request: { qr_code: string; activity_id?: number } = {
    qr_code: qrCode.trim(),
  }
  if (Number.isInteger(Number(activityId)) && Number(activityId) > 0) {
    request.activity_id = Number(activityId)
  }
  return request
}

export type VerifierScanFailureStatus =
  | 'orderNotFound'
  | 'wrongActivity'
  | 'alreadyVerified'
  | 'orderCancelled'
  | 'invalidQr'
  | 'notVerifiableTime'
  | 'failed'

export const mapVerifierScanErrorCode = (errorCode?: string): VerifierScanFailureStatus => ({
  ORDER_NOT_FOUND: 'orderNotFound',
  WRONG_ACTIVITY: 'wrongActivity',
  ALREADY_VERIFIED: 'alreadyVerified',
  ORDER_CANCELLED: 'orderCancelled',
  INVALID_QR: 'invalidQr',
  NOT_VERIFIABLE_TIME: 'notVerifiableTime',
}[errorCode || ''] as VerifierScanFailureStatus || 'failed')
