/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⬇️ Remets ici les réglages de ton ANCIEN bloc (images, etc.)
  // Exemple :
  // images: {
  //   remotePatterns: [{ protocol: 'https', hostname: '**' }],
  // },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;