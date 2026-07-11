const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

function getBackendImagePattern() {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

  if (!backendUrl) {
    return null
  }

  try {
    const url = new URL(backendUrl)

    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
    }
  } catch {
    return null
  }
}

const backendPattern = getBackendImagePattern()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "localhost",
      },
      ...(backendPattern ? [backendPattern] : []),
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
