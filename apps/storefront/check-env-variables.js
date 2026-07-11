const c = require("ansi-colors")

const requiredEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    description:
      "Learn how to create a publishable key: https://docs.medusajs.com/v2/resources/storefront-development/publishable-api-keys",
  },
]

const productionEnvs = [
  {
    key: "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
    description: "Deployed Medusa backend URL (e.g. https://api.yourshop.com)",
  },
  {
    key: "NEXT_PUBLIC_BASE_URL",
    description: "Storefront URL (e.g. https://yourshop.com)",
  },
]

function checkEnvVariables() {
  const isProduction = process.env.NODE_ENV === "production"
  const envsToCheck = isProduction
    ? [...requiredEnvs, ...productionEnvs]
    : requiredEnvs

  const missingEnvs = envsToCheck.filter(function (env) {
    return !process.env[env.key]
  })

  if (missingEnvs.length > 0) {
    console.error(
      c.red.bold("\n🚫 Error: Missing required environment variables\n")
    )

    missingEnvs.forEach(function (env) {
      console.error(c.yellow(`  ${c.bold(env.key)}`))
      if (env.description) {
        console.error(c.dim(`    ${env.description}\n`))
      }
    })

    console.error(
      c.yellow(
        "\nPlease set these variables in your .env file or environment before starting the application.\n"
      )
    )

    process.exit(1)
  }
}

module.exports = checkEnvVariables
