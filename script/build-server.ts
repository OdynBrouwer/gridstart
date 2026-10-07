import { build as esbuild } from "esbuild";
import { rm, cp, mkdir, readdir, copyFile } from "fs/promises";
import path from "path";

async function copyDir(src: string, dest: string) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function buildServer() {
  await rm("dist/server", { recursive: true, force: true });
  console.log("building server (Node.js)...");

  await esbuild({
    entryPoints: ["server/production.ts"],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    outfile: "dist/server/index.js",
    logLevel: "info",
  });

  console.log("copying static files to dist/public/...");
  await mkdir("dist/public", { recursive: true });

  // SPA shell + assets
  await cp("dist/app.html", "dist/public/app.html");
  await copyDir("dist/assets", "dist/public/assets");

  // Landing page
  await cp("client/index.html", "dist/public/index.html");
  await cp("dist/landing.css", "dist/public/landing.css");
  await cp("dist/landing.js", "dist/public/landing.js");

  // Fonts
  await cp("dist/fonts.css", "dist/public/fonts.css");
  try { await copyDir("dist/fonts", "dist/public/fonts"); } catch {}

  // Static assets
  const statics = [
    "favicon.svg", "favicon.png", "apple-touch-icon.png",
    "pwa-192x192.png", "pwa-512x512.png",
    "manifest.webmanifest", "sw.js",
  ];
  for (const f of statics) {
    try { await cp(`dist/${f}`, `dist/public/${f}`); } catch {}
  }

  // Workbox files
  const entries = await readdir("dist");
  for (const f of entries) {
    if (f.startsWith("workbox-") && f.endsWith(".js")) {
      await cp(`dist/${f}`, `dist/public/${f}`);
    }
  }

  console.log("build complete: dist/server/index.js + dist/public/");
}

buildServer().catch((err) => {
  console.error(err);
  process.exit(1);
});