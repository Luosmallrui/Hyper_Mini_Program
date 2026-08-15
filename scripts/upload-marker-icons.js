// 上传地图业态图标到 CDN，输出 name -> url 映射到 marker-icons.json
// 用法：ACCESS_TOKEN=<token> node scripts/upload-marker-icons.js
const fs = require('fs')
const path = require('path')

const BASE = 'https://www.hypercn.cn/api/v1/upload'
const TOKEN = process.env.ACCESS_TOKEN
const LOGO_DIR = process.env.LOGO_DIR || '/Users/luosmallrui/Downloads/logo'

async function uploadOne(filePath) {
  const buf = fs.readFileSync(filePath)
  const form = new FormData()
  form.append('file', new Blob([buf]), path.basename(filePath))
  form.append('type', 'misc')
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  const name = path.basename(filePath, path.extname(filePath))
  return { name, url: data?.data?.url || data?.url || '', code: data?.code, raw: data }
}

;(async () => {
  if (!TOKEN) {
    console.error('需要 ACCESS_TOKEN：ACCESS_TOKEN=<token> node scripts/upload-marker-icons.js')
    process.exit(1)
  }
  const files = fs.readdirSync(LOGO_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort()
  const out = []
  for (const f of files) {
    try {
      const r = await uploadOne(path.join(LOGO_DIR, f))
      out.push(r)
      console.log(`[${r.code}] ${r.name} -> ${r.url || JSON.stringify(r.raw)}`)
    } catch (e) {
      console.error(`[ERR] ${f}: ${e.message}`)
    }
  }
  fs.writeFileSync(path.resolve(__dirname, '..', 'marker-icons.json'), JSON.stringify(out, null, 2))
  console.log(`\n已写入 marker-icons.json，共 ${out.length} 个`)
})()
