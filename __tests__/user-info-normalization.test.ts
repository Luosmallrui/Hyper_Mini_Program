import { normalizeUserInfoPayload } from '../src/utils/user-info'

describe('user info normalization', () => {
  it('merges top-level verifier fields into the nested user', () => {
    const normalized = normalizeUserInfoPayload({
      is_verifier: true,
      verifier_id: 12,
      verifier: {
        id: 12,
        name: '张三',
        phone: '13800138000',
        organizer_id: 3,
        organizer_name: '测试主办方',
      },
      user: {
        user_id: 9,
        nickname: '用户',
        verifier: { id: 12, organizer_name: '测试主办方' },
      },
    })

    expect(normalized).toMatchObject({
      user_id: 9,
      is_verifier: true,
      verifier_id: 12,
      verifier: {
        id: 12,
        name: '张三',
        organizer_name: '测试主办方',
      },
    })
  })

  it('supports verifier fields returned only inside user', () => {
    const normalized = normalizeUserInfoPayload({
      user: {
        is_verifier: true,
        verifier_id: 15,
        verifier: { id: 15, organizer_name: '另一主办方' },
      },
    })

    expect(normalized.is_verifier).toBe(true)
    expect(normalized.verifier_id).toBe(15)
    expect(normalized.verifier.organizer_name).toBe('另一主办方')
  })
})
