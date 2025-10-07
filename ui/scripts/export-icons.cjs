const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true }).catch(() => {});
}

async function fileInfo(p) {
  try {
    const stat = await fsp.stat(p);
    const meta = await sharp(p).metadata();
    return {
      exists: true,
      sizeBytes: stat.size,
      sizeMB: +(stat.size / (1024 * 1024)).toFixed(3),
      width: meta.width || null,
      height: meta.height || null,
      format: meta.format || null,
    };
  } catch (e) {
    return { exists: false };
  }
}

async function renderFromSvg(svgPath, outDir) {
  const sizes = [512, 1024];
  const svgBuf = await fsp.readFile(svgPath);
  await ensureDir(outDir);

  const results = [];
  for (const size of sizes) {
    const base = `app-icon-${size}`;
    const outPng = path.join(outDir, `${base}.png`);
    const outJpg = path.join(outDir, `${base}.jpg`);

    // PNG (keep transparency)
    await sharp(svgBuf, { density: size })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(outPng);

    // JPG (flatten to white background)
    await sharp(svgBuf, { density: size })
      .resize(size, size, { fit: "contain" })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
      .toFile(outJpg);

    const pngInfo = await fileInfo(outPng);
    const jpgInfo = await fileInfo(outJpg);
    results.push({ size, png: { path: outPng, ...pngInfo }, jpg: { path: outJpg, ...jpgInfo } });
  }
  return results;
}

async function main() {
  try {
    const root = path.resolve(__dirname, "..");
    const publicDir = path.join(root, "public");
    const svgPath = path.join(publicDir, "app-icon-1024.svg");
    const fallbackSvg = path.join(publicDir, "placeholder-logo.svg");

    let sourceSvg = svgPath;
    try {
      await fsp.access(sourceSvg, fs.constants.R_OK);
    } catch {
      // Fallback if app-icon SVG missing
      await fsp.access(fallbackSvg, fs.constants.R_OK);
      sourceSvg = fallbackSvg;
      console.warn(`Bron SVG ontbreekt: ${svgPath}. Gebruik fallback: ${fallbackSvg}`);
    }

    const results = await renderFromSvg(sourceSvg, publicDir);
    console.log("\nIcon export voltooid:\n");
    for (const r of results) {
      console.log(`- ${r.size}x${r.size} PNG => ${r.png.path} | ${r.png.width}x${r.png.height} | ${r.png.sizeMB} MB`);
      console.log(`- ${r.size}x${r.size} JPG => ${r.jpg.path} | ${r.jpg.width}x${r.jpg.height} | ${r.jpg.sizeMB} MB`);
      if (r.png.sizeMB > 5 || r.jpg.sizeMB > 5) {
        console.warn(`  Waarschuwing: bestand groter dan 5MB voor ${r.size}x${r.size}. Overweeg lagere kwaliteit.`);
      }
    }
    console.log("\nKlaar. Upload een PNG of JPG volgens Meta‑eisen (512–1024px, <5MB).\n");
  } catch (e) {
    console.error("Fout bij export:", e && e.message ? e.message : e);
    process.exitCode = 1;
  }
}

main();