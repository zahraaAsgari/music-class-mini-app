// لودر تست: نگاشت @/ به src/ و افزودن پسوند .ts به ایمپورت‌های بدون پسوند (هم‌خانواده با سورس Next).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC_ROOT = new URL("../src/", import.meta.url).href.replace("file://", "") + "/";

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;
  if (target.startsWith("@/")) {
    target = SRC_ROOT + target.slice(2);
  }
  if (target.startsWith("./") || target.startsWith("../")) {
    target = fileURLToPath(new URL(target, context.parentURL));
  }
  if (target.startsWith("/") && !/\.(ts|js|mjs|cjs|json)$/.test(target)) {
    const withTs = target + ".ts";
    if (existsSync(withTs)) {
      return { url: pathToFileURL(withTs).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
