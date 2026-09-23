/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@echofocus/shared'],
  // The floating dev button sits exactly over the sidebar footer and keeps
  // photobombing design-review screenshots.
  devIndicators: false,
}

module.exports = nextConfig
