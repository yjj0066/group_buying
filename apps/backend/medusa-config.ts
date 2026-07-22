import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProduction = process.env.NODE_ENV === "production"
const useDatabaseSsl =
  isProduction || process.env.DATABASE_SSL === "true"
const backendUrl =
  process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:9000"

const useS3Storage = Boolean(
  process.env.S3_BUCKET?.trim() &&
    process.env.S3_REGION?.trim() &&
    process.env.S3_FILE_URL?.trim()
)

const fileProvider = useS3Storage
  ? {
      resolve: "@medusajs/medusa/file-s3",
      id: "s3",
      options: {
        file_url: process.env.S3_FILE_URL,
        access_key_id: process.env.S3_ACCESS_KEY_ID,
        secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
        prefix: process.env.S3_PREFIX ?? "group-buying",
        acl: process.env.S3_ACL === "false" ? false : "public-read",
      },
    }
  : {
      resolve: "@medusajs/medusa/file-local",
      id: "local",
      options: {
        backend_url: `${backendUrl}/static`,
      },
    }

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions: useDatabaseSsl
      ? {
          connection: {
            ssl: process.env.DATABASE_SSL === "false"
              ? false
              : { rejectUnauthorized: false },
          },
        }
      : {},
    workerMode:
      (process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server") ||
      "shared",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [fileProvider],
      },
    },
    {
      resolve: "./src/modules/group-buying",
    },
    {
      resolve: "@medusajs/medusa/translation",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/toss-payments",
            id: "toss-payments",
            options: {
              secretKey: process.env.TOSS_SECRET_KEY,
              clientKey: process.env.TOSS_CLIENT_KEY,
              webhookSecret: process.env.TOSS_WEBHOOK_SECRET,
              testMode: process.env.TOSS_TEST_MODE !== "false",
              supportedCountries: (process.env.TOSS_SUPPORTED_COUNTRIES ?? "kr")
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean),
              enabledEasyPayMethods: [
                "naverpay",
                "kakaopay",
                "tosspay",
                "payco",
              ],
            },
          },
          {
            resolve: "./src/modules/stripe-group-deal",
            id: "stripe-group-deal",
            options: {
              apiKey: process.env.STRIPE_SECRET_KEY,
              publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              testMode: process.env.STRIPE_TEST_MODE !== "false",
              supportedCountries: (process.env.STRIPE_SUPPORTED_COUNTRIES ?? "")
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean),
            },
          },
        ],
      },
    },
  ],
  featureFlags: {
    translation: true,
  },
})
