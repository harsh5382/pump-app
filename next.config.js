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
  // Two dev servers on one checkout deadlock fighting over the same build
  // directory. Set NEXT_DIST_DIR to give a second instance its own; unset,
  // this is the stock ".next".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Server runtime (Route Handlers / Server Actions + Firebase Admin SDK).
  // Previously "export" (static) — removed so trusted server operations can run.
  trailingSlash: true,
  // Don't trailing-slash-redirect API routes (webhooks POST to an exact URL).
  skipTrailingSlashRedirect: true,
  productionBrowserSourceMaps: false,
};

module.exports = withPWA(nextConfig);
