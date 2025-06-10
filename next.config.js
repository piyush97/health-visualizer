/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Add external packages for XML parsing
  serverExternalPackages: ["sax"],

  experimental: {
    // For compatibility with existing configuration
    serverComponentsExternalPackages: ["sax"],

    // Increase timeouts and memory limits for large files
    largePageDataBytes: 128 * 1000 * 1000, // 128MB

    // Server actions configuration
    serverActions: {
      bodySizeLimit: "8gb", // Allow up to 8GB uploads
    },
  },

  // Configure API routes for large uploads
  api: {
    bodyParser: {
      sizeLimit: "8gb", // Allow up to 8GB uploads
    },
    responseLimit: false,
  },
};

export default config;
