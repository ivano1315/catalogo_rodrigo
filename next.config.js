/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'pdf-parse'],
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse tenta carregar arquivos de teste que não existem — ignora
      config.resolve.alias['canvas'] = false
    }
    return config
  },
}

module.exports = nextConfig
