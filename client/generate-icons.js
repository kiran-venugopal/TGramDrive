import sharp from 'sharp';
import fs from 'fs';

async function generate() {
    const svgBuffer = fs.readFileSync('public/logo.svg');
    await sharp(svgBuffer).resize(192, 192).toFile('public/logo-192x192.png');
    await sharp(svgBuffer).resize(512, 512).toFile('public/logo-512x512.png');

    // Also generate a maskable icon (just a copy of 512 for now as our SVG has a solid bg)
    await sharp(svgBuffer).resize(512, 512).toFile('public/logo-maskable-512x512.png');
    console.log('Icons generated successfully');
}

generate().catch(console.error);
