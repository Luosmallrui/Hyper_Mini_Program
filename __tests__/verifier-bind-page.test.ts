import fs from 'fs'
import path from 'path'

const root = path.join(__dirname, '..')

const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('verifier bind page', () => {
  it('registers the page in the user subpackage with the expected title', () => {
    const appConfig = read('src/app.config.ts')
    const pageConfig = read('src/pages/user-sub/verifier-bind/index.config.ts')

    expect(appConfig).toContain("'verifier-bind/index'")
    expect(pageConfig).toContain("navigationBarTitleText: '核销员绑定'")
    expect(pageConfig).toContain("navigationStyle: 'custom'")
  })

  it('loads organizer confirmation from the scan scene and submits the phone with verifier id', () => {
    const source = read('src/pages/user-sub/verifier-bind/index.tsx')

    expect(source).toContain('核销员绑定')
    expect(source).toContain('getActivationVersion(params.scene)')
    expect(source).toContain('fetchVerifierActivationInfo(version)')
    expect(source).toContain('是否绑定')
    expect(source).toContain('{organizerName}')
    expect(source).toContain('核销人电话')
    expect(source).toContain('输入相关负责人的联系方式')
    expect(source).toContain('绑定成功后')
    expect(source).toContain('activateVerifier')
    expect(source).toContain('activateVerifier({ phone, verifierId: verifierId || undefined })')
    expect(source).not.toContain('onInput={(event) => setOrganizerName')
    expect(source).not.toContain("channel: 'wechat'")
    expect(source).not.toContain('PURE LOOP')
    expect(source).not.toContain('douyin')
    expect(source).not.toContain('抖音')
  })

  it('exposes the verifier activation API adapter', () => {
    const adapter = read('src/pages/user-sub/organizer/adapter.ts')

    expect(adapter).toContain('export const fetchVerifierActivationInfo')
    expect(adapter).toContain("url: `/api/v1/verifier/activation-info?v=${encodeURIComponent(version)}`")
    expect(adapter).toContain('data?.verifier_id')
    expect(adapter).toContain('export const activateVerifier')
    expect(adapter).toContain("url: '/api/v1/verifier/activate'")
    expect(adapter).toContain('phone: payload.phone')
    expect(adapter).toContain("channel: 'wechat'")
    expect(adapter).toContain('verifier_id:')
    expect(adapter).not.toContain('channel: payload.channel')
  })

  it('uses a restrained monochrome confirmation button', () => {
    const styles = read('src/pages/user-sub/verifier-bind/index.scss')

    expect(styles).toContain('background: #fff;')
    expect(styles).not.toContain('background: #D8FF4F;')
  })
})
