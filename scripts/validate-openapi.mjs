// Validates openapi/openapi.yaml and checks it documents every route handler under app/api.
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";

const spec = await SwaggerParser.validate("openapi/openapi.yaml");

function findRoutes(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...findRoutes(full));
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

const implemented = findRoutes("app/api").map(
  (file) =>
    "/" +
    relative("app", file)
      .split(sep)
      .slice(0, -1)
      .join("/")
      .replace(/\[(\w+)\]/g, "{$1}"),
);
const documented = Object.keys(spec.paths);
const missing = implemented.filter((p) => !documented.includes(p));
const extra = documented.filter((p) => !implemented.includes(p));

if (missing.length || extra.length) {
  console.error({ undocumentedRoutes: missing, documentedButNotImplemented: extra });
  process.exit(1);
}
console.log(`OpenAPI ${spec.openapi} valid; ${documented.length} paths match app/api routes`);
