#!/usr/bin/env node
/**
 * 从 fe-interface 同步 USDX 依赖的源码，用于逐步迁移。
 *
 * 从本工程 src/pages（及 sync.config.json 的 extraEntries）出发递归解析 import：
 * - owned（sync.config.json）或源仓库不存在的文件：视为本工程自有，读取本地版本继续解析，不覆盖
 * - 其余文件：从源仓库复制到相同相对路径
 * 迁移一个文件 = 在本地修改它并加入 owned；全部迁完后即可删除本脚本。
 *
 * 用法：
 *   node scripts/sync-from-fe-interface.js [--source <fe-interface 路径>] [--dry-run] [--include-locale]
 *   --include-locale  额外覆盖 src/locale/{locale}/messages.{po,js}（首次初始化用，之后用 yarn i18n 维护）
 */
const fs = require('fs')
const path = require('path')

const LOCAL = path.join(__dirname, '..')
const config = require('./sync.config.json')

const argValue = (name) => {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : undefined
}
const DRY_RUN = process.argv.includes('--dry-run')
const INCLUDE_LOCALE = process.argv.includes('--include-locale')
const SOURCE = path.resolve(LOCAL, argValue('--source') || process.env.FE_INTERFACE_DIR || config.source)

if (!fs.existsSync(path.join(SOURCE, 'src'))) {
  console.error(`[sync] source not found: ${SOURCE}（用 --source 或 FE_INTERFACE_DIR 指定 fe-interface 路径）`)
  process.exit(1)
}

const EXTS = ['.ts', '.tsx', '.js', '.jsx']
const ALIASES = [
  ['@fe-common/sdk/', 'fe-common/sdk/'],
  ['@fe-common/chakra-components/', 'fe-common/chakra-components/'],
  ['@/', 'src/'],
]
const IMPORT_RE =
  /(?:import\s[^'"]*?from\s*|export\s[^'"]*?from\s*|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g

const globToRegExp = (glob) =>
  new RegExp(
    `^${glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '\0')
      .replace(/\*/g, '[^/]*')
      .replace(/\0/g, '.*')}$`
  )
const ownedPatterns = config.owned.map(globToRegExp)

const existsIn = (root, rel) => fs.existsSync(path.join(root, rel)) && fs.statSync(path.join(root, rel)).isFile()
const isOwned = (rel) => ownedPatterns.some((re) => re.test(rel)) || !existsIn(SOURCE, rel)

const findRel = (base) => {
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => `${base}/index${e}`)]
  return candidates.find((c) => existsIn(isOwned(c) ? LOCAL : SOURCE, c))
}

const npmPackages = new Set()
const unresolved = []

const resolveSpec = (spec, fromRel) => {
  if (spec.startsWith('.')) return findRel(path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec)))
  for (const [alias, target] of ALIASES) {
    if (spec.startsWith(alias)) return findRel(target + spec.slice(alias.length))
  }
  if (spec === '@/stores' || spec === '@/theme') return findRel(`src/${spec.slice(2)}`)
  npmPackages.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])
  return null
}

const visited = new Set()
const copied = []
const owned = []

const visit = (rel) => {
  if (visited.has(rel)) return
  visited.add(rel)
  const fromLocal = isOwned(rel)
  if (fromLocal) {
    owned.push(rel)
  } else {
    copied.push(rel)
    if (!DRY_RUN) {
      fs.mkdirSync(path.dirname(path.join(LOCAL, rel)), { recursive: true })
      fs.copyFileSync(path.join(SOURCE, rel), path.join(LOCAL, rel))
    }
  }
  if (!/\.(tsx?|jsx?)$/.test(rel)) return
  const typings = rel.replace(/\.jsx?$/, '.d.ts')
  if (typings !== rel && existsIn(isOwned(typings) ? LOCAL : SOURCE, typings)) visit(typings)
  const test = rel.replace(/\.(tsx?|jsx?)$/, '.test.js')
  if (!rel.endsWith('.test.js') && existsIn(isOwned(test) ? LOCAL : SOURCE, test)) visit(test)
  const source = fs.readFileSync(path.join(fromLocal ? LOCAL : SOURCE, rel), 'utf8')
  for (const [, spec] of source.matchAll(IMPORT_RE)) {
    const target = resolveSpec(spec, rel)
    if (target) visit(target)
    else if (spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('@fe-common/')) {
      unresolved.push(`${rel} -> ${spec}`)
    }
  }
}

if (INCLUDE_LOCALE) {
  for (const locale of fs.readdirSync(path.join(SOURCE, 'src/locale'))) {
    for (const name of ['messages.po', 'messages.js']) {
      const rel = `src/locale/${locale}/${name}`
      if (!existsIn(SOURCE, rel)) continue
      copied.push(rel)
      if (!DRY_RUN) {
        fs.mkdirSync(path.dirname(path.join(LOCAL, rel)), { recursive: true })
        fs.copyFileSync(path.join(SOURCE, rel), path.join(LOCAL, rel))
      }
    }
  }
}

const pagesDir = path.join(LOCAL, 'src/pages')
for (const file of fs.readdirSync(pagesDir)) visit(`src/pages/${file}`)
// 不被 import、只供 lingui extract 收集文案的文件
for (const rel of config.extraEntries || []) visit(rel)

for (const asset of config.publicAssets) {
  const from = path.join(SOURCE, 'public', asset)
  if (!fs.existsSync(from)) {
    unresolved.push(`public/${asset}`)
    continue
  }
  copied.push(`public/${asset}`)
  if (!DRY_RUN) {
    const to = path.join(LOCAL, 'public', asset)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.cpSync(from, to, { recursive: true })
  }
}

const pkg = require(path.join(LOCAL, 'package.json'))
const declared = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})])
const builtins = new Set(require('module').builtinModules)
const missingDeps = [...npmPackages].filter((p) => !declared.has(p) && !p.startsWith('node:') && !builtins.has(p) && p !== 'next')

if (!DRY_RUN) {
  fs.writeFileSync(
    path.join(__dirname, 'synced-files.txt'),
    `# 由 sync-from-fe-interface.js 生成：仍从 fe-interface 同步的文件\n${copied.sort().join('\n')}\n`
  )
}

console.log(`[sync] source: ${SOURCE}`)
console.log(`[sync] ${DRY_RUN ? 'would copy' : 'copied'} ${copied.length} files, owned ${owned.length} files`)
if (unresolved.length) console.log(`[sync] unresolved:\n  ${unresolved.join('\n  ')}`)
if (missingDeps.length) console.log(`[sync] npm packages not in package.json:\n  ${missingDeps.sort().join('\n  ')}`)
