import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {},
  // pdf.js (the ID-card preview) optionally imports the Node-only `canvas`
  // package; the browser never needs it.
  turbopack: { resolveAlias: { canvas: { browser: './lib/empty-module.ts' } } },
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, canvas: false }
    return config
  },
}

export default nextConfig
