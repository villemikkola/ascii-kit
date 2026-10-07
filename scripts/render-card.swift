// Draws a text file centred on a fixed-size canvas, as a PNG. For the GitHub social preview
// (`npm run social`), so the card shows the kit's own output rather than a screenshot.
// Usage: swift scripts/render-card.swift input.txt output.png [theme] [accentLines]
// theme is `dark` or `light`; the first accentLines lines (the banner) get the accent colour.
// Drawn at 2× (2560×1280 pixels), so thin box-drawing lines stay continuous.
import AppKit

let args = CommandLine.arguments
let text = try! String(contentsOfFile: args[1], encoding: .utf8).trimmingCharacters(in: .newlines)
let out = args[2]
let dark = (args.count > 3 ? args[3] : "dark") == "dark"
let accentLines = args.count > 4 ? Int(args[4])! : 0

let width: CGFloat = 1280
let height: CGFloat = 640
let margin: CGFloat = 64
let lines = text.components(separatedBy: "\n")
let cols = CGFloat(lines.map { $0.count }.max() ?? 1)

func font(_ size: CGFloat) -> NSFont {
  NSFont(name: "SF Mono", size: size) ?? NSFont(name: "SFMono-Regular", size: size)
    ?? NSFont.monospacedSystemFont(ofSize: size, weight: .regular)
}
// Ascent plus descent, without leading: box-drawing and block glyphs span exactly this, so
// lines and blocks join from row to row.
func lineHeight(_ f: NSFont) -> CGFloat { f.ascender - f.descender }
func advance(_ f: NSFont) -> CGFloat { ("─" as NSString).size(withAttributes: [.font: f]).width }

// The largest size whose block fits inside the margins.
var size: CGFloat = 40
while size > 8 {
  let f = font(size)
  if advance(f) * cols <= width - 2 * margin && lineHeight(f) * CGFloat(lines.count) <= height - 2 * margin { break }
  size -= 0.5
}
let f = font(size)
let lh = lineHeight(f)

let bg = dark ? NSColor(srgbRed: 0.09, green: 0.10, blue: 0.12, alpha: 1) : NSColor(srgbRed: 0.98, green: 0.98, blue: 0.97, alpha: 1)
let fg = dark ? NSColor(srgbRed: 0.86, green: 0.87, blue: 0.89, alpha: 1) : NSColor(srgbRed: 0.13, green: 0.14, blue: 0.16, alpha: 1)
let accent = dark ? NSColor(srgbRed: 0.98, green: 0.62, blue: 0.27, alpha: 1) : NSColor(srgbRed: 0.78, green: 0.36, blue: 0.05, alpha: 1)

let scale: CGFloat = 2
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(width * scale), pixelsHigh: Int(height * scale),
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
  bytesPerRow: 0, bitsPerPixel: 0)!
rep.size = NSSize(width: width, height: height)
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSGraphicsContext.current!.shouldAntialias = true
bg.setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()

let blockWidth = advance(f) * cols
let x = ((width - blockWidth) / 2).rounded()
var y = ((height + lh * CGFloat(lines.count)) / 2).rounded()
// Block elements are filled as cell rectangles, like a terminal does: font glyphs for them stop
// short of the line height in most fonts, which stripes the banner. Fractions are of the cell,
// from the bottom left: (x, y, width, height).
let blocks: [Character: (CGFloat, CGFloat, CGFloat, CGFloat)] = [
  "█": (0, 0, 1, 1), "▀": (0, 0.5, 1, 0.5), "▄": (0, 0, 1, 0.5), "▌": (0, 0, 0.5, 1), "▐": (0.5, 0, 0.5, 1),
  "▁": (0, 0, 1, 0.125), "▂": (0, 0, 1, 0.25), "▃": (0, 0, 1, 0.375), "▅": (0, 0, 1, 0.625),
  "▆": (0, 0, 1, 0.75), "▇": (0, 0, 1, 0.875),
]
let cell = advance(f)
for (i, line) in lines.enumerated() {
  y -= lh
  let color = i < accentLines ? accent : fg
  for (c, ch) in line.enumerated() {
    let cx = x + CGFloat(c) * cell
    if let (bx, by, bw, bh) = blocks[ch] {
      // Edges snapped to device pixels, so neighbouring cells meet without a hairline.
      let snap = { (v: CGFloat) in (v * scale).rounded() / scale }
      let x0 = snap(cx + bx * cell), x1 = snap(cx + (bx + bw) * cell)
      let y0 = snap(y + by * lh), y1 = snap(y + (by + bh) * lh)
      color.setFill()
      NSRect(x: x0, y: y0, width: x1 - x0, height: y1 - y0).fill()
    } else if ch != " " {
      (String(ch) as NSString).draw(at: NSPoint(x: cx, y: y), withAttributes: [.font: f, .foregroundColor: color])
    }
  }
}
NSGraphicsContext.current = nil
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print("wrote \(out) (\(Int(width * scale))×\(Int(height * scale)) px, \(size) pt)")
