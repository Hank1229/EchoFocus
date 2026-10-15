import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

// Kept apart from support.ts so playwright.config.ts can import it without
// pulling in the test fixtures.
export const EXTENSION_DIR = path.resolve(__dirname, '../../apps/extension/dist-vrt')

// Chrome names an unpacked extension after its folder: the first 32 hex
// digits of the SHA-256 of the absolute path, each mapped 0-f to a-p. The
// dashboard has to know the ID before the browser starts (it reads it from
// NEXT_PUBLIC_EXTENSION_IDS), so it is computed here rather than read back.
export function unpackedExtensionId(dir: string): string {
  const absolute = fs.existsSync(dir) ? fs.realpathSync(dir) : path.resolve(dir)
  return createHash('sha256').update(absolute).digest('hex').slice(0, 32)
    .replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)))
}
