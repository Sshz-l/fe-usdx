const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')

const projectRoot = path.resolve(__dirname, '..', '..')
const originalTsLoader = Module._extensions['.ts']
const originalResolveFilename = Module._resolveFilename

Module._resolveFilename = function resolveWithAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mappedRequest = path.join(projectRoot, 'src', request.slice(2))
    return originalResolveFilename.call(this, mappedRequest, parent, isMain, options)
  }

  return originalResolveFilename.call(this, request, parent, isMain, options)
}

Module._extensions['.ts'] = function compileTypescriptModule(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
    fileName: filename,
  })
  module._compile(outputText, filename)
}

const {
  APP_LOCALES,
  APP_LOCALE_OPTIONS,
  normalizeLocaleInput,
} = require('./appLocales.ts')

test.after(() => {
  Module._resolveFilename = originalResolveFilename

  if (originalTsLoader) {
    Module._extensions['.ts'] = originalTsLoader
  } else {
    delete Module._extensions['.ts']
  }
})

test('APP_LOCALES includes japanese spanish and portuguese alongside existing locales', () => {
  assert.deepEqual(APP_LOCALES, [
    'en',
    'zh',
    'japanese',
    'korean',
    'vietnamese',
    'spanish',
    'portuguese',
  ])
})

test('APP_LOCALE_OPTIONS exposes labels and icons for all supported locales', () => {
  assert.deepEqual(APP_LOCALE_OPTIONS, [
    { locale: 'en', label: 'English', icon: 'En' },
    { locale: 'zh', label: '简体中文', icon: '中' },
    { locale: 'japanese', label: '日本語', icon: '日' },
    { locale: 'korean', label: '한국어', icon: '한' },
    { locale: 'vietnamese', label: 'Tiếng Việt', icon: 'Vi' },
    { locale: 'spanish', label: 'Español', icon: 'Es' },
    { locale: 'portuguese', label: 'Português', icon: 'Pt' },
  ])
})

test('normalizeLocaleInput accepts locale aliases for new languages', () => {
  assert.equal(normalizeLocaleInput('ja'), 'japanese')
  assert.equal(normalizeLocaleInput('ja-JP'), 'japanese')
  assert.equal(normalizeLocaleInput('es'), 'spanish')
  assert.equal(normalizeLocaleInput('pt-BR'), 'portuguese')
})

test('normalizeLocaleInput ignores prototype-chain keys', () => {
  assert.equal(normalizeLocaleInput('__proto__'), null)
  assert.equal(normalizeLocaleInput('constructor'), null)
  assert.equal(normalizeLocaleInput('toString'), null)
})
