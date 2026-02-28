/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
  sw: "sw.js",
  cacheOnFrontEndNav: true,
  fallbacks: {
    document: "/~offline",
  },
});

const nextConfig = {
  output: "export",
  trailingSlash: true,
  productionBrowserSourceMaps: false,
};

module.exports = withPWA(nextConfig);
