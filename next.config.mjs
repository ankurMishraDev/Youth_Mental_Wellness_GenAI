/** @type {import('next').NextConfig} */
const normalizePath = (path) => {
  const withLeadingSlash = path ? (path.startsWith("/") ? path : `/${path}`) : "/api/ws"
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
    return withLeadingSlash.slice(0, -1)
  }
  return withLeadingSlash
}

const normalizeDestination = (url) => {
  if (!url) return url
  if (url.startsWith("ws://")) {
    return `http://${url.slice(5)}`
  }
  if (url.startsWith("wss://")) {
    return `https://${url.slice(6)}`
  }
  return url
}

const wsProxyPath = normalizePath(process.env.NEXT_PUBLIC_WS_PATH)
const wsServiceUrl = normalizeDestination(process.env.WS_SERVICE_URL)

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable SWC minification for faster builds
  swcMinify: true,
  
  // Optimize webpack for development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Optimize chunk splitting for faster recompilation
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Common chunks across pages
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
              priority: 10,
            },
            // React and Next.js in separate chunk
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
          },
        },
      };
    }
    return config;
  },
  
  async rewrites() {
    if (!wsServiceUrl) {
      return []
    }

    return [
      {
        source: wsProxyPath,
        destination: wsServiceUrl,
      },
    ]
  },
}

export default nextConfig
