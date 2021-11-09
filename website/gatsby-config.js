module.exports = {
  flags: {
    DEV_SSR: false
  },
  plugins: [
    {
      resolve: '@elegantstack/gatsby-theme-flexiblocks',
      options: {
        createDemoPages: false,
        colorMode: false
      }
    },
    {
      resolve: `gatsby-plugin-s3`,
      options: {
        bucketName: 'powersheet.io'
      }
    }
  ],
  siteMetadata: {
    title: 'Powersheet',
    name: 'Powersheet',
    description: 'A lightning fast spreadsheet for businesses.'
  }
}
