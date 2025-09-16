/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import analyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = analyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import("next").NextConfig} */
const config = {
  transpilePackages: ["three"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { hostname: "bandcoin-object-store.s3.amazonaws.com" },
      { hostname: "gateway.pinata.cloud" },
      {
        hostname: "actionverse.s3.amazonaws.com",
      },
      {
        hostname: "utfs.io",
      },
      { hostname: "app.wadzzo.com" },
      { hostname: "bandcoin.io" },
      { hostname: "i.scdn.co" },
      { hostname: "wadzzo.s3.amazonaws.com" },
      {
        hostname: "firebasestorage.googleapis.com",
      },
      { hostname: "raw.githubusercontent.com" },
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "ipfs.io" },
      { hostname: "daisyui.com" },
      { hostname: "picsum.photos" },
      { hostname: `${process.env.NEXT_AWS_BUCKET_NAME}.s3.amazonaws.com` },
      {
        hostname: `${process.env.NEXT_AWS_BUCKET_NAME}.s3.us-east-1.amazonaws.com`,
      },
    ],
    unoptimized: true,
  },

  async rewrites() {
    return [
      {
        source: "/.well-known/stellar.toml",
        destination: "/api/toml",
        // persistance: true
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NODE_ENV === "production"
                ? "https://3yearshallow.com"
                : "*", // Allow all origins in development
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NODE_ENV === "production"
                ? "https://3yearshallow.com"
                : "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },

  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
};

export default withBundleAnalyzer(config);
