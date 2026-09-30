// Mean luminance of an icon's visible pixels (RGBA, as ImageData holds them).
// Below this, a favicon is a dark mark — GitHub's black cat cached from a
// light-mode visit — that disappears on the dark surface.
const DARK_ICON_LUMINANCE = 0.25

export function isDarkIcon(rgba: Uint8ClampedArray): boolean {
  let sum = 0
  let visible = 0
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    sum += (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255
    visible++
  }
  return visible > 0 && sum / visible < DARK_ICON_LUMINANCE
}
