/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/iphone-flashcard-app' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/iphone-flashcard-app/' : '',
  images: {
    unoptimized: true,
  },
  experimental: {
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 1,
      userScalable: false,
    },
  },
}

module.exports = {
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json'
          }
        ]
      }
    ];
  }
}