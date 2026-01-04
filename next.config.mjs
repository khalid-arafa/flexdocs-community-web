/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [new URL('https://picsum.photos/**')],
  },
};

export default nextConfig;
