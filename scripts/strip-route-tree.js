import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routeTreePath = path.join(root, "src/routeTree.gen.js");
const staleRouteTreePath = path.join(root, "src/routeTree.gen" + ".ts");

if (existsSync(staleRouteTreePath)) {
  unlinkSync(staleRouteTreePath);
}

if (existsSync(routeTreePath)) {
  const code = readFileSync(routeTreePath, "utf8");
  const marker = "\n\n" + "import" + " type";
  const fallbackMarker = "\r\n\r\n" + "import" + " type";
  const markerIndex = code.includes(marker) ? code.indexOf(marker) : code.indexOf(fallbackMarker);
  const clean = markerIndex === -1 ? code : `${code.slice(0, markerIndex).trimEnd()}\n`;
  writeFileSync(routeTreePath, clean);
}
