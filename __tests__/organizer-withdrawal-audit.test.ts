import fs from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '..')

const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('organizer withdrawal audit flow', () => {
  it('maps official bank account and audit status from withdraw-info', () => {
    const types = read('src/pages/user-sub/organizer/types.ts')
    const adapter = read('src/pages/user-sub/organizer/adapter.ts')

    expect(types).toContain('canWithdraw?: boolean')
    expect(types).toContain('pendingAudit?: OrganizerBankAccountAudit | null')
    expect(types).toContain('latestAudit?: OrganizerBankAccountAudit | null')
    expect(adapter).toContain('can_withdraw?: boolean')
    expect(adapter).toContain('pending_audit?: ApiBankAccountAudit | null')
    expect(adapter).toContain('latest_audit?: ApiBankAccountAudit | null')
    expect(adapter).toContain('const mapBankAudit')
  })

  it('submits bank changes for audit instead of treating them as official account changes', () => {
    const adapter = read('src/pages/user-sub/organizer/adapter.ts')
    const accountPage = read('src/pages/user-sub/organizer/account/index.tsx')
    const styles = read('src/pages/user-sub/organizer/account/index.scss')

    expect(adapter).toContain('method: \'PUT\'')
    expect(adapter).toContain('return fetchWithdrawalInfo()')
    expect(accountPage).toContain('收款账户审核中，请勿重复提交')
    expect(accountPage).toContain('审核通过后才会更新为正式提现账户')
    expect(accountPage).toContain('上次审核未通过')
    expect(accountPage).toContain('提交审核')
    expect(styles).toContain('.account-audit-card.pending')
    expect(styles).toContain('.account-modal-btn.disabled')
  })
})
