import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "frontend", "public");

// ── Shield + Lock SVG (reused at multiple sizes) ─────────────────────
const shieldSvg = fs.readFileSync(path.join(PUBLIC, "favicon.svg"));

// ── 1. Favicon ICO (32x32 PNG renamed to .ico works for browsers) ────
async function generateFavicon() {
  await sharp(shieldSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC, "favicon.ico"));
  console.log("  favicon.ico (32x32)");
}

// ── 2. PWA Icons ─────────────────────────────────────────────────────
async function generatePwaIcons() {
  for (const size of [192, 512]) {
    await sharp(shieldSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(PUBLIC, `icon-${size}.png`));
    console.log(`  icon-${size}.png`);
  }

  // Apple touch icon (180x180)
  await sharp(shieldSvg)
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC, "apple-touch-icon.png"));
  console.log("  apple-touch-icon.png (180x180)");
}

// ── 3. OG Image (1200x630) ──────────────────────────────────────────
async function generateOgImage() {
  const W = 1200;
  const H = 630;

  // Build the shield icon for the right side (280px)
  const shieldIcon = await sharp(shieldSvg)
    .resize(220, 220)
    .png()
    .toBuffer();

  // Create dot pattern as a tile
  const dotTileSvg = Buffer.from(`
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="1" fill="rgba(255,255,255,0.04)"/>
    </svg>
  `);

  // Build the text overlay as SVG
  const textOverlay = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0f"/>
          <stop offset="50%" stop-color="#0e0e16"/>
          <stop offset="100%" stop-color="#0a0a0f"/>
        </linearGradient>
        <radialGradient id="glow1" cx="20%" cy="40%" r="50%">
          <stop offset="0%" stop-color="rgba(0,229,160,0.08)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <radialGradient id="glow2" cx="80%" cy="30%" r="40%">
          <stop offset="0%" stop-color="rgba(99,102,241,0.06)"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
      </defs>

      <!-- Background -->
      <rect width="${W}" height="${H}" fill="url(#bg)"/>
      <rect width="${W}" height="${H}" fill="url(#glow1)"/>
      <rect width="${W}" height="${H}" fill="url(#glow2)"/>

      <!-- Dot grid pattern -->
      ${Array.from({ length: Math.ceil(W / 28) * Math.ceil(H / 28) }, (_, i) => {
        const col = i % Math.ceil(W / 28);
        const row = Math.floor(i / Math.ceil(W / 28));
        return `<circle cx="${col * 28 + 14}" cy="${row * 28 + 14}" r="0.8" fill="rgba(255,255,255,0.035)"/>`;
      }).join("\n      ")}

      <!-- Top accent line -->
      <rect x="80" y="0" width="200" height="3" rx="1.5" fill="#00e5a0" opacity="0.8"/>

      <!-- Title -->
      <text x="80" y="215" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="64" fill="#f0f0f5" letter-spacing="-1">
        Trusted PayGram
      </text>

      <!-- Subtitle -->
      <text x="80" y="275" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="30" fill="#00e5a0">
        Confidential Trust-Gated Payroll
      </text>

      <!-- Description -->
      <text x="80" y="325" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="18" fill="#6b7280">
        Powered by Zama FHEVM  |  ERC-7984  |  Fully Homomorphic Encryption
      </text>

      <!-- Bottom badges -->
      <!-- Badge 1: Encrypted Salaries -->
      <rect x="80" y="490" width="200" height="40" rx="10" fill="rgba(0,229,160,0.1)" stroke="rgba(0,229,160,0.3)" stroke-width="1"/>
      <circle cx="104" cy="510" r="6" fill="#00e5a0" opacity="0.8"/>
      <text x="120" y="516" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="14" fill="#00e5a0">
        Encrypted Salaries
      </text>

      <!-- Badge 2: Trust Scoring -->
      <rect x="300" y="490" width="180" height="40" rx="10" fill="rgba(99,102,241,0.1)" stroke="rgba(99,102,241,0.3)" stroke-width="1"/>
      <circle cx="324" cy="510" r="6" fill="#6366f1" opacity="0.8"/>
      <text x="340" y="516" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="14" fill="#6366f1">
        Trust Scoring
      </text>

      <!-- Badge 3: Instant Payments -->
      <rect x="500" y="490" width="200" height="40" rx="10" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" stroke-width="1"/>
      <circle cx="524" cy="510" r="6" fill="#f59e0b" opacity="0.8"/>
      <text x="540" y="516" font-family="Arial, Helvetica, sans-serif" font-weight="600" font-size="14" fill="#f59e0b">
        Instant Payments
      </text>

      <!-- Bottom accent line -->
      <rect x="0" y="${H - 4}" width="${W}" height="4" fill="#00e5a0" opacity="0.6"/>

      <!-- Zama badge bottom right -->
      <text x="${W - 200}" y="${H - 20}" font-family="Arial, Helvetica, sans-serif" font-weight="500" font-size="13" fill="#4b5563">
        Built on Zama Protocol
      </text>
    </svg>
  `);

  // Composite: text overlay + shield icon on right
  await sharp(textOverlay)
    .composite([
      {
        input: shieldIcon,
        top: 160,
        left: 890,
      },
    ])
    .png({ quality: 95 })
    .toFile(path.join(PUBLIC, "og-image.png"));
  console.log("  og-image.png (1200x630)");
}

// ── Run ──────────────────────────────────────────────────────────────
async function main() {
  console.log("Generating assets...\n");
  await generateFavicon();
  await generatePwaIcons();
  await generateOgImage();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Asset generation failed:", err);
  process.exit(1);
});
