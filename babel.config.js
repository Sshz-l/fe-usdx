module.exports = function (api) {
  api.cache(true)

  return {
    presets: [
      [
        'next/babel',
        {
          'preset-env': {
            targets: {
              chrome: '52',
              opera: '39',
              edge: '14',
              firefox: '52',
              safari: '10.1',
              node: '7',
              ios: '10.3',
              samsung: '6',
              electron: '1.3',
            },
          },
          'transform-runtime': {},
          'styled-jsx': {},
          'class-properties': {
            loose: false,
          },
          'transform-exponentiation-operator': {
            chrome: '52',
            opera: '39',
            edge: '14',
            firefox: '52',
            safari: '10.1',
            node: '7',
            ios: '10.3',
            samsung: '6',
            electron: '1.3',
          },
        },
      ],
    ],
    plugins: [
      'macros',
      [
        '@babel/plugin-proposal-decorators',
        {
          legacy: true,
        },
      ],
      '@babel/plugin-transform-unicode-regex',
      '@babel/plugin-transform-private-methods',

      ...(process.env.NODE_ENV === 'development'
        ? []
        : [['transform-remove-console', { exclude: ['error', 'warn'] }]]),
    ],
  }
}
