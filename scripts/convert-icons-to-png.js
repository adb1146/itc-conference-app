#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Special sizes for Apple and other platforms
const specialIcons = [
  { size: 180, name: 'apple-touch-icon.png' }, // iOS home screen
  { size: 32, name: 'favicon-32x32.png' }, // Browser favicon
  { size: 16, name: 'favicon-16x16.png' }, // Browser favicon small
];

const publicDir = path.join(__dirname, '..', 'public');

async function convertSvgToPng() {
  console.log('🎨 Converting SVG icons to PNG format...\n');

  // Convert standard PWA icons
  for (const size of iconSizes) {
    const svgPath = path.join(publicDir, `icon-${size}x${size}.svg`);
    const pngPath = path.join(publicDir, `icon-${size}x${size}.png`);

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to convert icon-${size}x${size}.svg:`, error.message);
    }
  }

  // Convert special icons
  for (const { size, name } of specialIcons) {
    const svgPath = path.join(publicDir, `icon-${size}x${size}.svg`);
    const pngPath = path.join(publicDir, name);

    // If specific size doesn't exist, use the closest larger size
    let sourceSvg = svgPath;
    if (!fs.existsSync(sourceSvg)) {
      const closestSize = iconSizes.find(s => s >= size) || 512;
      sourceSvg = path.join(publicDir, `icon-${closestSize}x${closestSize}.svg`);
    }

    try {
      await sharp(sourceSvg)
        .resize(size, size)
        .png()
        .toFile(pngPath);

      console.log(`✅ Generated ${name}`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
    }
  }

  // Create a favicon.ico from the 32x32 PNG
  try {
    const favicon32Path = path.join(publicDir, 'favicon-32x32.png');
    const faviconPath = path.join(publicDir, 'favicon.ico');

    await sharp(favicon32Path)
      .resize(32, 32)
      .toFile(faviconPath.replace('.ico', '.png'));

    console.log('✅ Generated favicon.png (use as favicon.ico alternative)');
  } catch (error) {
    console.error('❌ Failed to generate favicon:', error.message);
  }

  console.log('\n📱 PNG Conversion Complete!');
  console.log('✨ All icons have been converted to PNG format for production use.');
}

convertSvgToPng().catch(console.error);