import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

process.env.TEST_TYPE = "unit"
process.env.NODE_OPTIONS = "--experimental-vm-modules"

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const jestArgs = ["jest", "--runInBand", "--forceExit", ...process.argv.slice(2)]

const result = spawnSync("npx", jestArgs, {
  stdio: "inherit",
  shell: true,
  env: process.env,
  cwd: backendRoot,
})

process.exit(result.status ?? 1)
