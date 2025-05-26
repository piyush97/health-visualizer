/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    // Increase body size limit for large file uploads
    serverComponentsExternalPackages: ["sax"],
  },

  // Configure API routes for large uploads
  api: {
    bodyParser: {
      sizeLimit: "5gb", // Allow up to 5GB uploads
    },
    responseLimit: false,
  },
};

export default config;
