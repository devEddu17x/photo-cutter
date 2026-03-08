/**
 * PDF Generator — Flipbook de Madera
 *
 * Physical specs (all in mm):
 *   Page:     A4 210 × 297 mm
 *   Grid:     3 columns × 8 rows = 24 pieces/page
 *   Piece:    58 × 31 mm
 *   Gutter:   2 mm between pieces
 *   Grid W:   3×58 + 2×2 = 178 mm
 *   Margin X: (210 - 178) / 2 = 16 mm   ← horizontally centered
 *   Margin Y: 15 mm                      ← safe top for home printers
 *   Border:   0.25 pt (~0.088 mm) light grey cut guide
 */
import jsPDF from "jspdf";

const PAGE_W = 210;
const GRID_W = 58 * 3 + 2 * 2; // 178 mm
const MARGIN_X = (PAGE_W - GRID_W) / 2; // 16 mm — auto-centered
const MARGIN_Y = 15; // safe top margin
const PIECE_W = 58;
const PIECE_H = 31;
const GUTTER = 2;
const COLS = 3;
const CUT_LINE_WIDTH = 0.088; // 0.25 pt in mm

export function generatePDF(pages: string[][]): void {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });

  pages.forEach((pageImages, pageIndex) => {
    if (pageIndex > 0) {
      doc.addPage("a4", "portrait");
    }

    pageImages.forEach((imgData, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = MARGIN_X + col * (PIECE_W + GUTTER);
      const y = MARGIN_Y + row * (PIECE_H + GUTTER);

      // Render image first, then overlay the cut-guide border on top
      doc.addImage(imgData, "JPEG", x, y, PIECE_W, PIECE_H, undefined, "FAST");

      // Cut guide: 0.25 pt light-grey stroke
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(CUT_LINE_WIDTH);
      doc.rect(x, y, PIECE_W, PIECE_H, "S");
    });
  });

  doc.save("flipbook-print.pdf");
}
