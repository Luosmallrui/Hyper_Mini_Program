import { getActivationVersion } from '../src/pages/user-sub/verifier-bind/scene'

describe('verifier bind scene parsing', () => {
  it('extracts v from a normal scene query', () => {
    expect(getActivationVersion('v=abc123')).toBe('abc123')
  })

  it('extracts v from an encoded scene query', () => {
    expect(getActivationVersion('v%3Dabc%252F123')).toBe('abc/123')
  })

  it('returns an empty value when v is missing', () => {
    expect(getActivationVersion('source=scan')).toBe('')
  })
})
