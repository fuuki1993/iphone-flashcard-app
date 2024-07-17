module.exports = {
  basePath: process.env.NODE_ENV === 'production' ? '/your-repo-name' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '',
  images: {
    loader: 'akamai',
    path: '',
  },
}
