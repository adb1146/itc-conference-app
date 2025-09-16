#!/usr/bin/env node

// Script to generate PWA icons
// This creates placeholder icons - replace with actual logo when available

const fs = require('fs');
const path = require('path');

// Simple SVG icon generator for placeholder
function generateSVGIcon(size) {
  const padding = size * 0.1;
  const fontSize = size * 0.3;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="white" rx="${size * 0.1}"/>
  <rect x="${padding}" y="${padding}" width="${size - padding * 2}" height="${size - padding * 2}" fill="url(#gradient)" rx="${size * 0.05}"/>
  <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">ITC</text>
  <text x="50%" y="65%" font-family="Arial, sans-serif" font-size="${fontSize * 0.5}" fill="white" text-anchor="middle" dominant-baseline="middle">Vegas</text>
</svg>`;
}

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');

// Generate each icon size
iconSizes.forEach(size => {
  const svg = generateSVGIcon(size);
  const fileName = `icon-${size}x${size}.svg`;
  const filePath = path.join(publicDir, fileName);

  fs.writeFileSync(filePath, svg);
  console.log(`✅ Generated ${fileName}`);
});

// Also create favicon.ico placeholder
const faviconSVG = generateSVGIcon(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG);
console.log('✅ Generated favicon.svg');

// Create a simple HTML file to convert SVGs to PNGs manually
const conversionHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Icon Converter</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    .icon { margin: 10px; display: inline-block; border: 1px solid #ccc; }
    canvas { display: none; }
  </style>
</head>
<body>
  <h1>PWA Icon Converter</h1>
  <p>Right-click each icon and save as PNG:</p>
  ${iconSizes.map(size => `
    <div class="icon">
      <img src="icon-${size}x${size}.svg" width="${size}" height="${size}" alt="${size}x${size}">
      <br>icon-${size}x${size}.png
    </div>
  `).join('')}

  <script>
    // Note: For production, use a proper SVG to PNG converter
    console.log('For production, convert these SVGs to PNGs using a tool like:');
    console.log('- ImageMagick: convert icon.svg icon.png');
    console.log('- Online converters');
    console.log('- Design tools like Figma or Sketch');
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'icon-converter.html'), conversionHTML);

console.log('\n📱 PWA Icon Generation Complete!');
console.log('Note: These are SVG placeholders. For production:');
console.log('1. Replace with actual logo designs');
console.log('2. Convert to PNG format for better compatibility');
console.log('3. Optimize file sizes');
console.log('\nYou can view all icons at: /icon-converter.html');