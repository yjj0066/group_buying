import fs from "fs"

const src = fs.readFileSync(
  new URL("../src/lib/data/account-group-deals-queries.ts", import.meta.url),
  "utf8"
)
const fns = [...src.matchAll(/^export async function (\w+)/gm)].map((m) => m[1])

let out = `"use server"\n\n`

for (const fn of fns) {
  out += `export async function ${fn}(...args: any[]) {
  const mod = await import("./account-group-deals-queries")
  return (mod.${fn} as (...a: any[]) => any)(...args)
}

`
}

out += `export type { CreateHostedGroupDealInput } from "./account-group-deals-queries"\n`

fs.writeFileSync(
  new URL("../src/lib/data/account-group-deals-actions.ts", import.meta.url),
  out
)

console.log(`wrote ${fns.length} wrappers`)
