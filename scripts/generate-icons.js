let fs;
let path;
let sharp;
let publicDir;
let sourcePath;

const colors = {
  ink: "#132019",
  lime: "#d6ff7d",
  paper: "#f7f5ef",
  muted: "#59665f",
};

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

async function findArtworkBounds(raw, width, height, threshold) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = raw[(y * width + x) * 4 + 3];
      if (alpha < threshold) continue;

      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      count += 1;
    }
  }

  if (count === 0) {
    throw new Error("No visible artwork was found in deepflow-logo.png.");
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
    count,
  };
}

async function buildSourceMark() {
  const image = sharp(sourcePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height || !metadata.hasAlpha) {
    throw new Error(
      "deepflow-logo.png must be a transparent PNG with measurable dimensions.",
    );
  }

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let maximumAlpha = 0;

  for (let index = 3; index < data.length; index += 4) {
    maximumAlpha = Math.max(maximumAlpha, data[index]);
  }

  if (maximumAlpha === 0) {
    throw new Error("deepflow-logo.png is fully transparent.");
  }

  const threshold = Math.max(16, Math.round(maximumAlpha * 0.18));
  const bounds = await findArtworkBounds(
    data,
    info.width,
    info.height,
    threshold,
  );
  const aspectRatio = bounds.width / bounds.height;

  if (bounds.width < 80 || bounds.height < 80 || aspectRatio < 1.2 || aspectRatio > 2.2) {
    throw new Error(
      `Detected artwork bounds look unsafe (${bounds.width}x${bounds.height}).`,
    );
  }

  const padding = Math.round(Math.max(bounds.width, bounds.height) * 0.04);
  const crop = {
    left: Math.max(0, bounds.left - padding),
    top: Math.max(0, bounds.top - padding),
    width: Math.min(
      info.width - Math.max(0, bounds.left - padding),
      bounds.width + padding * 2,
    ),
    height: Math.min(
      info.height - Math.max(0, bounds.top - padding),
      bounds.height + padding * 2,
    ),
  };
  const alphaMultiplier = Math.min(5, 255 / maximumAlpha);
  const cropped = await sharp(sourcePath)
    .extract(crop)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 3; index < cropped.data.length; index += 4) {
    const pixelIndex = (index - 3) / 4;
    const x = pixelIndex % cropped.info.width;
    const y = Math.floor(pixelIndex / cropped.info.width);
    const isCropEdge =
      x < 6 ||
      y < 6 ||
      x >= cropped.info.width - 6 ||
      y >= cropped.info.height - 6;

    cropped.data[index] =
      isCropEdge || cropped.data[index] < threshold
        ? 0
        : Math.min(
            255,
            Math.round(cropped.data[index] * alphaMultiplier),
          );
  }

  return {
    buffer: await sharp(cropped.data, { raw: cropped.info }).png().toBuffer(),
    bounds,
    maximumAlpha,
  };
}

async function createTintedMark(markBuffer, width, height, color) {
  const mask = await sharp(markBuffer)
    .resize({
      width,
      height,
      fit: "contain",
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const tintedMark = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .joinChannel(mask.data, { raw: mask.info })
    .png()
    .toBuffer();

  const offsets = [-3, 0, 3];
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      offsets.flatMap((top) =>
        offsets.map((left) => ({
          input: tintedMark,
          left,
          top,
        })),
      ),
    )
    .png()
    .toBuffer();
}

async function createIconMaster(markBuffer) {
  const size = 512;
  const mark = await createTintedMark(markBuffer, 330, 220, colors.lime);
  const background = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="112" fill="${colors.ink}" />
    </svg>
  `);

  return sharp(background)
    .composite([{ input: mark, left: 91, top: 146 }])
    .png()
    .toBuffer();
}

async function createHorizontalLogo(iconMaster) {
  const width = 512;
  const height = 128;
  const icon = await sharp(iconMaster).resize(104, 104).png().toBuffer();
  const wordmark = Buffer.from(`
    <svg width="380" height="${height}" viewBox="0 0 380 ${height}">
      <text
        x="18"
        y="83"
        fill="${colors.ink}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="61"
        font-weight="750"
        letter-spacing="-2.5"
      >${escapeXml("DeepFlow")}</text>
    </svg>
  `);

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: icon, left: 4, top: 12 },
      { input: wordmark, left: 122, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function createOgImage(iconMaster) {
  const icon = await sharp(iconMaster).resize(154, 154).png().toBuffer();
  const text = Buffer.from(`
    <svg width="820" height="300" viewBox="0 0 820 300">
      <text
        x="0"
        y="94"
        fill="${colors.ink}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="82"
        font-weight="750"
        letter-spacing="-4"
      >${escapeXml("DeepFlow")}</text>
      <text
        x="0"
        y="166"
        fill="${colors.ink}"
        font-family="Georgia, serif"
        font-size="45"
      >${escapeXml("Focus better. Finish what matters.")}</text>
      <text
        x="0"
        y="224"
        fill="${colors.muted}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="25"
      >${escapeXml("Calm timers and focus tools for deep work.")}</text>
    </svg>
  `);
  const accent = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630">
      <circle cx="1090" cy="-20" r="330" fill="${colors.lime}" opacity="0.42" />
      <circle cx="1140" cy="600" r="230" fill="#d8eee5" opacity="0.72" />
    </svg>
  `);

  return sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: colors.paper,
    },
  })
    .composite([
      { input: accent, left: 0, top: 0 },
      { input: icon, left: 82, top: 86 },
      { input: text, left: 278, top: 82 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function writePng(buffer, filename, width, height = width) {
  await sharp(buffer)
    .resize(width, height, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, filename));
}

async function main() {
  fs = await import("node:fs/promises");
  path = await import("node:path");
  sharp = (await import("sharp")).default;
  const root = path.resolve(__dirname, "..");
  publicDir = path.join(root, "public");
  sourcePath = path.join(publicDir, "deepflow-logo.png");

  await fs.access(sourcePath);
  const sourceMark = await buildSourceMark();
  const iconMaster = await createIconMaster(sourceMark.buffer);
  const horizontalLogo = await createHorizontalLogo(iconMaster);
  const ogImage = await createOgImage(iconMaster);

  await Promise.all([
    sharp(horizontalLogo)
      .png({ compressionLevel: 9 })
      .toFile(path.join(publicDir, "deepflow-logo-512.png")),
    writePng(iconMaster, "deepflow-icon-512.png", 512),
    writePng(iconMaster, "deepflow-icon-192.png", 192),
    writePng(iconMaster, "apple-icon.png", 180),
    writePng(iconMaster, "favicon-32x32.png", 32),
    writePng(iconMaster, "favicon-16x16.png", 16),
    sharp(ogImage).toFile(path.join(publicDir, "deepflow-og.png")),
  ]);

  const outputs = [
    "deepflow-logo-512.png",
    "deepflow-icon-512.png",
    "deepflow-icon-192.png",
    "apple-icon.png",
    "favicon-32x32.png",
    "favicon-16x16.png",
    "deepflow-og.png",
  ];

  console.log(
    `Detected source artwork ${sourceMark.bounds.width}x${sourceMark.bounds.height} with max alpha ${sourceMark.maximumAlpha}.`,
  );
  console.log(`Generated ${outputs.map((name) => `public/${name}`).join(", ")}.`);
}

main().catch((error) => {
  console.error(`Icon generation failed: ${error.message}`);
  process.exitCode = 1;
});
