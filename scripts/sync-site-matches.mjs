import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = process.cwd()
const sites = JSON.parse(
  await readFile(resolve(root, "config/sites.json"), "utf8")
)
const hosts = sites.videoHosts

if (
  !Array.isArray(hosts) ||
  hosts.length === 0 ||
  hosts.some((host) => !/^[a-z0-9.-]+$/i.test(host))
) {
  throw new Error("config/sites.json must contain valid videoHosts")
}

const schemes = ["https", "http"]
const packagePath = resolve(root, "package.json")
const packageSource = await readFile(packagePath, "utf8")
const packageConfig = JSON.parse(packageSource)
packageConfig.manifest.host_permissions = [
  ...hosts.flatMap((host) => schemes.map((scheme) => `${scheme}://${host}/*`)),
  ...schemes.map((scheme) => `${scheme}://*.got06.com/*`)
]
const nextPackage = `${JSON.stringify(packageConfig, null, 2)}\n`
if (nextPackage !== packageSource) await writeFile(packagePath, nextPackage)

const targets = [
  {
    file: "contents/home.ts",
    name: "home",
    paths: ["/", "/?*", "/index.htm*"]
  },
  { file: "contents/list.ts", name: "list", paths: ["/c/*"] },
  { file: "contents/detail.ts", name: "detail", paths: ["/c/*"] },
  { file: "contents/search.ts", name: "search", paths: ["/plus/search.php*"] },
  { file: "contents/tags.ts", name: "tags", paths: ["/tags.php*"] }
]

for (const target of targets) {
  const file = resolve(root, target.file)
  let source = await readFile(file, "utf8")
  const startMarker = `// @site-matches:${target.name}:start`
  const endMarker = `// @site-matches:${target.name}:end`
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)

  if (start < 0 || end < 0) {
    throw new Error(`Missing generated matches markers in ${target.file}`)
  }

  const contentStart = source.indexOf("\n", start) + 1
  const contentEnd = source.lastIndexOf("\n", end)
  const matches = hosts.flatMap((host) =>
    schemes.flatMap((scheme) =>
      target.paths.map((path) => `${scheme}://${host}${path}`)
    )
  )
  const matchLines = matches.map(
    (match, index) =>
      `    ${JSON.stringify(match)}${index < matches.length - 1 ? "," : ""}`
  )
  const next = `${source.slice(0, contentStart)}${matchLines.join("\n")}${source.slice(contentEnd)}`

  if (next !== source) await writeFile(file, next)
}
