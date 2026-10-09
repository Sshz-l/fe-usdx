const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')

const projectRoot = path.resolve(__dirname, '..', '..')
const originalTsLoader = Module._extensions['.ts']
const originalTsxLoader = Module._extensions['.tsx']
const originalResolveFilename = Module._resolveFilename

Module._resolveFilename = function resolveWithAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const mappedRequest = path.join(projectRoot, 'src', request.slice(2))
    return originalResolveFilename.call(this, mappedRequest, parent, isMain, options)
  }

  return originalResolveFilename.call(this, request, parent, isMain, options)
}

const compileTypescriptModule = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
    fileName: filename,
  })
  module._compile(outputText, filename)
}

Module._extensions['.ts'] = compileTypescriptModule
Module._extensions['.tsx'] = compileTypescriptModule

const { getLocaleMessages, resolveInitialLocale } = require('./useLinguiInit.tsx')

test.after(() => {
  Module._resolveFilename = originalResolveFilename

  if (originalTsLoader) {
    Module._extensions['.ts'] = originalTsLoader
  } else {
    delete Module._extensions['.ts']
  }

  if (originalTsxLoader) {
    Module._extensions['.tsx'] = originalTsxLoader
  } else {
    delete Module._extensions['.tsx']
  }
})

test('getLocaleMessages loads japanese translations instead of falling back to english', async () => {
  const japaneseLocale = await getLocaleMessages('japanese')

  assert.equal(japaneseLocale.locale, 'japanese')
  assert.equal(japaneseLocale.messages['+K0AvT'], '接続を解除')
  assert.notEqual(japaneseLocale.messages['+K0AvT'], 'Disconnect')
})

test('getLocaleMessages loads spanish and portuguese catalogs', async () => {
  const spanishLocale = await getLocaleMessages('spanish')
  const portugueseLocale = await getLocaleMessages('portuguese')

  assert.equal(spanishLocale.locale, 'spanish')
  assert.equal(portugueseLocale.locale, 'portuguese')
  assert.ok(Object.keys(spanishLocale.messages).length > 100)
  assert.ok(Object.keys(portugueseLocale.messages).length > 100)
})

test('resolveInitialLocale supports locale aliases for japanese spanish and portuguese', () => {
  const originalWindow = global.window

  global.window = {
    location: {
      href: 'https://debox.pro/?lang=pt-BR',
    },
    localStorage: {
      getItem: () => 'es',
    },
    navigator: {
      language: 'ja-JP',
    },
  }

  try {
    assert.equal(resolveInitialLocale(), 'portuguese')
  } finally {
    global.window = originalWindow
  }
})
