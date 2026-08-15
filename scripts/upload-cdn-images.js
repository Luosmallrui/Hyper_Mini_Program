// 将主包大图上传到 CDN（POST /api/v1/upload），输出 URL 映射到 cdn-urls.json
// 用法：ACCESS_TOKEN=<token> node scripts/upload-cdn-images.js
const fs = require('fs')
const path = require('path')

const BASE = 'https://www.hypercn.cn/api/v1/upload'
const TOKEN = process.env.ACCESS_TOKEN

const IMAGES = [
  { key: 'backgound', file: 'src/assets/images/backgound.png' },
  { key: 'auditUrgeQrcode', file: 'src/assets/organizer/audit-urge-qrcode.png' },
  { key: 'backgroundWebp', file: 'src/assets/images/background.webp' },
  { key: 'mockBadSofaCover', file: 'src/assets/organizer/mock-bad-sofa-cover.png' },
  { key: 'coin', file: 'src/assets/images/coin.png' },
  { key: 'mockPowerFlowCover', file: 'src/assets/organizer/mock-power-flow-cover.png' },
  { key: 'powerFlowLogo', file: 'src/assets/organizer/power-flow-logo.png' },
]

async function uploadOne({ key, file }) {
  const abs = path.resolve(__dirname, '..', file)
  const buf = fs.readFileSync(abs)
  const form = new FormData()
  form.append('file', new Blob([buf]), path.basename(file))
  form.append('type', 'misc')

  const res = await fetch(BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  return { key, code: data?.code, url: data?.data?.url || data?.url || '', raw: data }
}

;(async () => {
  if (!TOKEN) {
    console.error('请先设置 ACCESS_TOKEN：ACCESS_TOKEN=<token> node scripts/upload-cdn-images.js')
    process.exit(1)
  }
  const out = []
  for (const img of IMAGES) {
    try {
      const r = await uploadOne(img)
      out.push(r)
      console.log(`[${r.code}] ${r.key} -> ${r.url || JSON.stringify(r.raw)}`)
    } catch (e) {
      console.error(`[ERR] ${img.key}: ${e.message}`)
    }
  }
  fs.writeFileSync(path.resolve(__dirname, '..', 'cdn-urls.json'), JSON.stringify(out, null, 2))
  console.log('\n已写入 cdn-urls.json')
})()
