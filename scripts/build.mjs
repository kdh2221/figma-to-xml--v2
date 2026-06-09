import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

// Main thread bundle (figma sandbox, no DOM)
await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  outfile: "dist/main.js",
});

// UI bundle, then inline into ui.html
await build({
  entryPoints: ["src/ui.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  outfile: "dist/ui.js",
});

const uiHtml = readFileSync("src/ui.html", "utf8");
const uiJs = readFileSync("dist/ui.js", "utf8");
writeFileSync("dist/ui.html", uiHtml.replace("<!--UI_SCRIPT-->", `<script>${uiJs}</script>`));

console.log("build complete: dist/main.js, dist/ui.html");
