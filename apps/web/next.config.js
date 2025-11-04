/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Optimize for production
  poweredByHeader: false,

  // Image optimization for Vercel
  images: {
    domains: [
      'localhost',
      'arweave.net',
      '*.vercel.app',
      'sol-itaire.vercel.app'
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Environment variables with fallbacks
  env: {
    NEXT_PUBLIC_SOLANA_NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Sol-itaire',
    NEXT_PUBLIC_WALLET_AUTO_CONNECT: process.env.NEXT_PUBLIC_WALLET_AUTO_CONNECT || 'true',
    NEXT_PUBLIC_WALLET_TIMEOUT: process.env.NEXT_PUBLIC_WALLET_TIMEOUT || '10000',
    NEXT_PUBLIC_DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE || 'false',
    NEXT_PUBLIC_MAX_RETRIES: process.env.NEXT_PUBLIC_MAX_RETRIES || '3',
    NEXT_PUBLIC_TRANSACTION_TIMEOUT: process.env.NEXT_PUBLIC_TRANSACTION_TIMEOUT || '30000',
  },

  // Webpack configuration for Web3 compatibility
  webpack: (config, { isServer }) => {
    // Fallbacks for browser compatibility
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
    };

    // Optimize bundle size
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@solana/web3.js': require.resolve('@solana/web3.js'),
      }

      // Exclude unused dependencies from client bundle
      config.externals = {
        ...config.externals,
        'bs58': 'bs58',
      }
    }

    // Improve performance for Web3 packages
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            chunks: 'all',
            name: 'framework',
            enforce: true,
            priority: 40,
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
          },
          lib: {
            test(module) {
              return (
                module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier())
              )
            },
            name(module) {
              // Simple hash fallback for module naming
              const identifier = module.identifier()
              return identifier.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8)
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name: 'shared',
            priority: 10,
            minChunks: 2,
            enforce: true,
            reuseExistingChunk: true,
          },
          solana: {
            test: /[\\/]node_modules[\\/]@solana[\\/]/,
            name: 'solana',
            priority: 25,
            minChunks: 1,
          },
        },
      },
    }

    return config
  },

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    largePageDataBytes: 128 * 1000,
  },

  // Compression configuration
  compress: true,

  // Generate etags for caching
  generateEtags: true,

  // Trailing slash configuration
  trailingSlash: false,

  // Redirects for legacy routes
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig