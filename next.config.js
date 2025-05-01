/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    scrollRestoration: true,
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
    outputFileTracingIncludes: {
      '*': ['data/**/*'],
    },
  },
  // Include data files in the build
  webpack: (config, { isServer }) => {
    // Add the data directory to be processed by webpack
    if (isServer) {
      const { readdirSync } = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');
      
      try {
        const files = readdirSync(dataDir);
        console.log('Data directory files:', files);
      } catch (error) {
        console.error('Error reading data directory:', error);
      }
    }
    
    return config;
  },
  // Ensure the data directory is available at runtime
  output: 'standalone',
  outputFileTracing: true,
}

module.exports = nextConfig 