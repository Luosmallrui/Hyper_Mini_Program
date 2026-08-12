#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.less',
  '.scss',
  '.css',
])

const BAD_PATTERNS = [
  '\uFFFD',
  '\u934f\u3129\u5134',
  '\u74ba\u6fe0\ue79e',
  '\u741b\u5c7e\u6582\u9356',
  '\u93c7\u6751\uff3f',
  '\u93c9\u5a07\u52a8\u603c',
  '\u951b\u5c83\ue1ec',
  '\u7ead\ue1c6\u757e',
  '\u93cc\u30e7\u6e6a\u9362\u3012',
  '\u934f\u866b\u655e',
  '\u7481\u3224\u69d8\u6d3b\u59e9',
]

const skipFile = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/')
  if (!normalized) return true
  if (normalized.startsWith('node_modules/')) return true
  if (normalized.startsWith('.git/')) return true
  if (normalized.startsWith('dist/')) return true
  if (normalized.startsWith('.husky/_/')) return true
  return false
}

const isTextFile = (filePath) => TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())

const getTrackedFiles = () => {
  const out = execSync('git ls-files', { encoding: 'utf8' })
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

const filesFromArgs = process.argv.slice(2)
const candidateFiles = (filesFromArgs.length ? filesFromArgs : getTrackedFiles())
  .map((f) => f.replace(/^["']|["']$/g, ''))
  .filter((f) => !skipFile(f))
  .filter(isTextFile)

const findings = []

for (const file of candidateFiles) {
  if (!fs.existsSync(file)) continue
  let content = ''
  try {
    content = fs.readFileSync(file, 'utf8')
  } catch (error) {
    continue
  }
  const hitPatterns = BAD_PATTERNS.filter((p) => content.includes(p))
  if (hitPatterns.length > 0) {
    findings.push({ file, hitPatterns })
  }
}

if (findings.length > 0) {
  console.error('Detected possible mojibake/encoding corruption in files:')
  findings.forEach(({ file, hitPatterns }) => {
    console.error(`- ${file}: ${Array.from(new Set(hitPatterns)).join(', ')}`)
  })
  console.error('Please fix encoding/content before commit.')
  process.exit(1)
}

console.log(`Encoding check passed (${candidateFiles.length} files scanned).`)
