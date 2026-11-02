import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
// Small original raster fixtures. No photograph, character likeness or real AI inference.
const glyphs: Record<string, string[]> = {
  M: ['10101', '11111', '10101', '10101', '10101'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  C: ['01111', '10000', '10000', '10000', '01111'],
  K: ['10001', '10010', '11100', '10010', '10001'],
};
function crc32(bytes: Buffer) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer) {
  const t = Buffer.from(type),
    length = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([length, t, data, crc]);
}
export function mockRaster(
  seed: number,
  ratio: string,
  prompt: string,
  strength: string,
  source?: Uint8Array,
) {
  const dimensions: Record<string, [number, number]> = {
    '1:1': [480, 480],
    '4:5': [384, 480],
    '9:16': [270, 480],
    '16:9': [480, 270],
  };
  const [width, height] = dimensions[ratio] ?? dimensions['1:1'];
  const hash = createHash('sha256')
    .update(`${seed}:${prompt}:${strength}`)
    .update(source ?? new Uint8Array())
    .digest();
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * (width * 3 + 1) + 1 + x * 3;
      const pattern =
        ((Math.floor(x / (20 + (hash[3] % 35))) + Math.floor(y / (20 + (hash[4] % 35)))) % 2) * 35;
      for (let c = 0; c < 3; c++)
        pixels[i + c] =
          80 +
          ((hash[c] + Math.floor((x * 80) / width) + Math.floor((y * 50) / height) + pattern) %
            150);
    }
  for (let n = 0; n < 4; n++)
    glyphs['MOCK'[n]].forEach((row, y) =>
      [...row].forEach((v, x) => {
        if (v === '1')
          for (let dy = 0; dy < 6; dy++)
            for (let dx = 0; dx < 6; dx++) {
              const i = (25 + y * 6 + dy) * (width * 3 + 1) + 1 + (20 + n * 36 + x * 6 + dx) * 3;
              pixels.fill(255, i, i + 3);
            }
      }),
    );
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk(
      'tEXt',
      Buffer.from(`Description\0MOCK procedural test pattern; seed ${seed}; not AI photography`),
    ),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
