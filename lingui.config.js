module.exports = {
  locales: ['en', 'zh', 'japanese', 'korean', 'vietnamese', 'spanish', 'portuguese'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: '<rootDir>/src/locale/{locale}/messages',
      include: ['<rootDir>/src'],
      exclude: ['**/node_modules/**', '**/*.d.ts', '**/*.test.js', '**/*.test.ts'],
    },
  ],
  format: 'po',
  formatOptions: {
    origins: true,
    lineNumbers: false,
  },
  orderBy: 'messageId',
  fallbackLocales: {
    default: 'en',
  },
}
