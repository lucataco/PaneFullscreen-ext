#!/usr/bin/env node
/**
 * Icon Generator for Pane Fullscreen Extension
 * 
 * This script converts SVG icons to PNG format.
 * 
 * On macOS, it uses the built-in `qlmanage` tool.
 * For other systems, install one of:
 *   - librsvg: `brew install librsvg` (then use rsvg-convert)
 *   - ImageMagick: `brew install imagemagick` (then use convert)
 * 
 * Run with: node generate-icons.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
const sizes = [16, 48, 128];

function convertWithQlmanage(svgPath, pngPath, size) {
  const dir = path.dirname(pngPath);
  const svgName = path.basename(svgPath);
  execSync(`qlmanage -t -s ${size} -o "${dir}" "${svgPath}" 2>/dev/null`, { stdio: 'pipe' });
  // qlmanage outputs as svgName.png, need to rename
  const tempPath = path.join(dir, `${svgName}.png`);
  if (fs.existsSync(tempPath)) {
    fs.renameSync(tempPath, pngPath);
    return true;
  }
  return false;
}

function convertWithRsvg(svgPath, pngPath, size) {
  execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${pngPath}"`, { stdio: 'pipe' });
  return true;
}

function convertWithImageMagick(svgPath, pngPath, size) {
  // Try both `convert` (v6) and `magick` (v7)
  try {
    execSync(`convert -background none -resize ${size}x${size} "${svgPath}" "${pngPath}"`, { stdio: 'pipe' });
    return true;
  } catch {
    execSync(`magick -background none -resize ${size}x${size} "${svgPath}" "${pngPath}"`, { stdio: 'pipe' });
    return true;
  }
}

function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Detect available converter
let converter;
if (hasCommand('qlmanage')) {
  converter = convertWithQlmanage;
  console.log('Using qlmanage (macOS) for conversion');
} else if (hasCommand('rsvg-convert')) {
  converter = convertWithRsvg;
  console.log('Using rsvg-convert for conversion');
} else if (hasCommand('convert') || hasCommand('magick')) {
  converter = convertWithImageMagick;
  console.log('Using ImageMagick for conversion');
} else {
  console.error('No SVG converter found! Please install one of:');
  console.error('  - librsvg: brew install librsvg');
  console.error('  - ImageMagick: brew install imagemagick');
  process.exit(1);
}

// Convert each icon
sizes.forEach(size => {
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  const pngPath = path.join(iconsDir, `icon${size}.png`);
  
  if (!fs.existsSync(svgPath)) {
    console.error(`SVG not found: ${svgPath}`);
    return;
  }
  
  try {
    converter(svgPath, pngPath, size);
    console.log(`Created ${pngPath}`);
  } catch (err) {
    console.error(`Failed to convert ${svgPath}: ${err.message}`);
  }
});

console.log('\nIcons generated successfully!');
