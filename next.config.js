/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/iphone-flashcard-app' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/iphone-flashcard-app/' : '',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
