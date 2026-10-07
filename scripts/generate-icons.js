import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard CRC32 table for PNG chunk checksums
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 1); // height
  ihdr.writeUInt8(8, 8);       // 8 bit
  ihdr.writeUInt8(6, 9);       // RGBA
  ihdr.writeUInt8(0, 10);      // compression
  ihdr.writeUInt8(0, 11);      // filter
  ihdr.writeUInt8(0, 12);      // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data with scanlines
  // Each scanline: 1 byte filter type (0) + size * 4 bytes (RGBA)
  const rowSize = 1 + size * 4;
  const rawData = Buffer.alloc(rowSize * size);

  const radius = size / 2;
  const innerRadius = radius * 0.75;
  const center = size / 2;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - center + 0.5;
      const dy = y - center + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Rounded badge background: Deep Indigo/Cyan gradient
        const t = (x + y) / (size * 2);
        // Slate-900 background #0f172a
        const r = Math.round(15 + t * 20);
        const g = Math.round(23 + t * 60);
        const b = Math.round(42 + t * 120);

        // Core icon dot / circle
        if (dist <= innerRadius * 0.45) {
          // Cyan accent #06b6d4
          rawData[pxOffset] = 6;
          rawData[pxOffset + 1] = 182;
          rawData[pxOffset + 2] = 212;
          rawData[pxOffset + 3] = 255;
        } else if (dist <= innerRadius * 0.8 && dist >= innerRadius * 0.65) {
          // Ring accent #38bdf8
          rawData[pxOffset] = 56;
          rawData[pxOffset + 1] = 189;
          rawData[pxOffset + 2] = 248;
          rawData[pxOffset + 3] = 230;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach((size) => {
  const pngBuf = generatePng(size);
  const targetPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(targetPath, pngBuf);
  console.log(`Generated: ${targetPath} (${pngBuf.length} bytes)`);
});
