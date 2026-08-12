import fs from 'fs'
import path from 'path'

const readSource = (...segments: string[]) => fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8')

describe('organizer audit backend contract', () => {
  it('keeps the audit status fields returned by the backend', () => {
    const adapter = readSource('src', 'pages', 'user-sub', 'organizer', 'adapter.ts')

    expect(adapter).toContain("url: '/api/v1/organizer/audit-status'")
    expect(adapter).toContain('submitted_at')
    expect(adapter).toContain('reviewed_at')
    expect(adapter).toContain('application_id')
    expect(adapter).toContain('organizer_id')
    expect(adapter).toContain('enabled')
  })

  it('uses the submit response to enter pending audit immediately', () => {
    const userPage = readSource('src', 'pages', 'user', 'index.tsx')

    expect(userPage).toContain('const applyResult = await submitSettlementApplyRequest(settlementForm)')
    expect(userPage).toContain('setOrganizerAuditStatus(applyResult.status)')
    expect(userPage).toContain('void refreshOrganizerAuditStatus()')
  })

  it('checks backend audit status before opening or submitting the settlement form', () => {
    const userPage = readSource('src', 'pages', 'user', 'index.tsx')

    expect(userPage).toContain('const openSettlementApply = async () =>')
    expect(userPage).toContain('const audit = await fetchOrganizerAuditStatus()')
    expect(userPage).toContain('if (audit.status === 1)')
    expect(userPage).toContain('if (audit.status === 2)')
    expect(userPage).toContain('const latestAudit = await fetchOrganizerAuditStatus()')
    expect(userPage).toContain('审核状态获取失败，请稍后重试')
  })
})
