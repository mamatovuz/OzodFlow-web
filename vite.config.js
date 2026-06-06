import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function stripRouteTreeTypes() {
  const routeTreePath = path.resolve(__dirname, "src/routeTree.gen.js");
  const staleRouteTreePath = path.resolve(__dirname, "src/routeTree.gen" + ".ts");

  function stripCode(code) {
    const typeImport = "import" + " type";
    const typeFooterPattern = new RegExp(`\\r?\\n\\r?\\n${typeImport} \\{ getRouter \\}[\\s\\S]*$`);
    return code.replace(typeFooterPattern, "\n");
  }

  function strip() {
    if (existsSync(staleRouteTreePath)) {
      unlinkSync(staleRouteTreePath);
    }

    if (!existsSync(routeTreePath)) return;

    const code = readFileSync(routeTreePath, "utf8");
    const stripped = stripCode(code);
    if (stripped === code) return;

    writeFileSync(routeTreePath, stripped);
  }

  return {
    name: "strip-js-route-tree-types",
    enforce: "post",
    buildStart: strip,
    transform(code, id) {
      if (!path.normalize(id).endsWith(path.normalize("src/routeTree.gen.js"))) {
        return null;
      }

      const stripped = stripCode(code);
      if (stripped !== code) {
        writeFileSync(routeTreePath, stripped);
      }

      return { code: stripped, map: null };
    },
    configureServer(server) {
      setTimeout(strip, 100);
      server.watcher.on("change", (file) => {
        if (path.normalize(file).endsWith(path.normalize("src/routeTree.gen.js"))) {
          setTimeout(strip, 50);
        }
      });
    },
    closeBundle: strip,
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      router: {
        generatedRouteTree: "routeTree.gen.js",
        disableTypes: true,
        routeTreeFileHeader: ["/* eslint-disable */"],
      },
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    nitro({
      preset: "vercel",
      vercel: {
        functions: {
          runtime: "nodejs22.x",
        },
      },
    }),
    react(),
    stripRouteTreeTypes(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
});
