import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/manifest.json`} />
        <link rel="apple-touch-icon" href={process.env.NODE_ENV === 'production' ? '/iphone-flashcard-app/icon-192x192.svg' : '/icon-192x192.svg'} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="iPhone Flashcard App" />
        <meta name="theme-color" content="#000000" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}