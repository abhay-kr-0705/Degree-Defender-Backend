import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/images/logo.png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        
        {/* Meta tags */}
        <meta name="description" content="Degree Defenders - AI-powered platform for detecting and preventing fake degrees and forged academic certificates" />
        <meta name="keywords" content="degree verification, certificate validation, fake degree detection, blockchain verification" />
        <meta name="author" content="Government of Jharkhand - Department of Higher and Technical Education" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Degree Defenders - Certificate Verification System" />
        <meta property="og:description" content="AI-powered platform for detecting and preventing fake degrees and forged academic certificates" />
        <meta property="og:image" content="/images/logo.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Degree Defenders - Certificate Verification System" />
        <meta property="twitter:description" content="AI-powered platform for detecting and preventing fake degrees and forged academic certificates" />
        <meta property="twitter:image" content="/images/logo.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
