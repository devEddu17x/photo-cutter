/**
 * Image processor — Flipbook de Madera
 *
 * Each uploaded photo is:
 *   1. Center-cropped to 58 × 62 mm (object-fit: cover)  ← the full visible area
 *   2. Split horizontally at the midpoint into:
 *        • Part A (Top)    → 58 × 31 mm
 *        • Part B (Bottom) → 58 × 31 mm
 *
 * Every function runs at 300 DPI for print-quality output.
 *
 * Grid: 3 columns × 8 rows = 24 pieces per A4 sheet.
 */

const MM_TO_PX = 300 / 25.4; // 1 mm at 300 DPI ≈ 11.811 px

// ── Physical dimensions ────────────────────────────────────────────────────────
export const PIECE_WIDTH_MM = 58;
export const PIECE_HEIGHT_MM = 31;
export const FULL_HEIGHT_MM = PIECE_HEIGHT_MM * 2; // 62 mm (before split)

export const PIECE_WIDTH_PX = Math.round(PIECE_WIDTH_MM * MM_TO_PX); // ~685 px
export const PIECE_HEIGHT_PX = Math.round(PIECE_HEIGHT_MM * MM_TO_PX); // ~366 px
export const FULL_HEIGHT_PX = PIECE_HEIGHT_PX * 2; // 732 px (guaranteed exact half)

// ── Grid ──────────────────────────────────────────────────────────────────────
export const COLS = 3;
export const ROWS = 8;
export const PIECES_PER_PAGE = COLS * ROWS; // 24

/**
 * Takes a single photo File, center-crops it to the 58:62 aspect ratio, then
 * splits it horizontally to produce [topPiece, bottomPiece] as base64 JPEGs.
 *
 * The resulting array is always [Part_A_Top, Part_B_Bottom].
 */
export function processAndSplitImage(file: File): Promise<[string, string]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // ── Step 1: center-crop to 58 × 62 proportion ──────────────────────────
      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = PIECE_WIDTH_PX;
      fullCanvas.height = FULL_HEIGHT_PX; // 732 px

      const ctx = fullCanvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        return reject(new Error("Canvas 2D context unavailable"));
      }

      const targetRatio = PIECE_WIDTH_PX / FULL_HEIGHT_PX; // 58:62
      const srcRatio = img.naturalWidth / img.naturalHeight;

      let srcX = 0;
      let srcY = 0;
      let srcW = img.naturalWidth;
      let srcH = img.naturalHeight;

      if (srcRatio > targetRatio) {
        // Source wider → crop left/right sides
        srcW = img.naturalHeight * targetRatio;
        srcX = (img.naturalWidth - srcW) / 2;
      } else {
        // Source taller → crop top/bottom
        srcH = img.naturalWidth / targetRatio;
        srcY = (img.naturalHeight - srcH) / 2;
      }

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, PIECE_WIDTH_PX, FULL_HEIGHT_PX);
      URL.revokeObjectURL(objectUrl);

      // ── Step 2: split at midpoint ───────────────────────────────────────────
      const topCanvas = document.createElement("canvas");
      topCanvas.width = PIECE_WIDTH_PX;
      topCanvas.height = PIECE_HEIGHT_PX;
      const topCtx = topCanvas.getContext("2d")!;
      topCtx.drawImage(
        fullCanvas,
        0, 0, PIECE_WIDTH_PX, PIECE_HEIGHT_PX, // source: upper half
        0, 0, PIECE_WIDTH_PX, PIECE_HEIGHT_PX  // dest: full canvas
      );

      const bottomCanvas = document.createElement("canvas");
      bottomCanvas.width = PIECE_WIDTH_PX;
      bottomCanvas.height = PIECE_HEIGHT_PX;
      const bottomCtx = bottomCanvas.getContext("2d")!;
      bottomCtx.drawImage(
        fullCanvas,
        0, PIECE_HEIGHT_PX, PIECE_WIDTH_PX, PIECE_HEIGHT_PX, // source: lower half
        0, 0,               PIECE_WIDTH_PX, PIECE_HEIGHT_PX  // dest: full canvas
      );

      resolve([
        topCanvas.toDataURL("image/jpeg", 0.95),
        bottomCanvas.toDataURL("image/jpeg", 0.95),
      ]);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

/** Split a flat array into chunks of `size`. */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
