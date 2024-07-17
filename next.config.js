/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/iphone-flashcard-app' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/iphone-flashcard-app/' : '',
  images: {
    unoptimized: true,
  },
}

<<<<<<< HEAD
module.exports = nextConfig
=======
module.exports = nextConfig
>>>>>>> c52ebde7408e40d05c59ef1d638a788174c80754
