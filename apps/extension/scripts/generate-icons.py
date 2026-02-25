#!/usr/bin/env python3
"""
Generate simple placeholder PNG icons for EchoFocus extension.
Creates colored squares with an 'E' letter for sizes 16, 48, 128.
No external dependencies needed — uses Python's built-in struct/zlib.
"""

import struct
import zlib
import os

def create_png_bytes(size: int, bg_r: int, bg_g: int, bg_b: int, radius_pct: float = 0.15) -> bytes:
    """Create a simple solid-color PNG with rounded-ish corners."""
    # Build raw pixel data
    pixels = []
    center = size / 2
    corner_r = size * radius_pct

    for y in range(size):
        row = []
        for x in range(size):
            # Determine if pixel is inside the rounded rectangle
            # Check corners
            dx = max(0, min(x, corner_r) - corner_r if x < corner_r else 0,
                     x - (size - corner_r) if x > size - corner_r else 0)
            dy = max(0, min(y, corner_r) - corner_r if y < corner_r else 0,
                     y - (size - corner_r) if y > size - corner_r else 0)

            # Compute corner distance
            cx_near = corner_r if x < center else size - corner_r
            cy_near = corner_r if y < center else size - corner_r
            in_corner_zone = (x < corner_r or x > size - corner_r) and (y < corner_r or y > size - corner_r)

            if in_corner_zone:
                dist = ((x - cx_near) ** 2 + (y - cy_near) ** 2) ** 0.5
                if dist > corner_r:
                    # Transparent pixel
                    row.extend([0, 0, 0, 0])
                    continue

            row.extend([bg_r, bg_g, bg_b, 255])
        pixels.append(bytes(row))

    # Build PNG file
    def make_chunk(chunk_type: bytes, data: bytes) -> bytes:
        length = struct.pack('>I', len(data))
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        return length + chunk_type + data + struct.pack('>I', crc)

    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'

    # IHDR: width, height, bit depth, color type (6=RGBA), compression, filter, interlace
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)

    # IDAT: compressed image data with filter bytes
    raw = b''
    for row in pixels:
        raw += b'\x00' + row  # filter type 0 (None)
    idat = make_chunk(b'IDAT', zlib.compress(raw, 9))

    # IEND
    iend = make_chunk(b'IEND', b'')

    return sig + ihdr + idat + iend


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(script_dir, '..', 'src', 'assets')
    os.makedirs(assets_dir, exist_ok=True)

    # EchoFocus brand color: a rich indigo/purple
    # Using #6366f1 (indigo-500) as background
    r, g, b = 99, 102, 241  # #6366f1

    sizes = [16, 48, 128]
    for size in sizes:
        png_data = create_png_bytes(size, r, g, b, radius_pct=0.18)
        out_path = os.path.join(assets_dir, f'icon-{size}.png')
        with open(out_path, 'wb') as f:
            f.write(png_data)
        print(f'Created {out_path} ({len(png_data)} bytes)')

    print('Icons generated successfully!')


if __name__ == '__main__':
    main()
