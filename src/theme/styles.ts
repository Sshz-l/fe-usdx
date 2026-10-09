export default {
  global: ({ colorMode }: { theme: any; colorMode: string }) => {
    return {
      'html, body': {
        fontSize: '14',
        color: colorMode === 'light' ? '#666666' : 'white',
        bg:
          colorMode === 'light'
            ? '#FFFFFF'
            : 'black',
        overflowX: 'hidden',
        // w: '100vw',
        minH: '100vh',
      },
      'img[src=""],img:not([src])': {
        opacity: 0,
      },
    }
  },
}
