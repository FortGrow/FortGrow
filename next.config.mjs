/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build autossuficiente para deploy em Docker/Render/Railway
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
