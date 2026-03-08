/**
 * DOCX Generator — Flipbook de Madera
 *
 * Mirrors lib/generate-pdf.ts exactly:
 *   Page:      A4 210 × 297 mm
 *   Grid W:    3×58 + 2×2 = 178 mm
 *   Margin X:  (210 − 178) / 2 = 16 mm   ← same formula as PDF
 *   Margin Y:  15 mm                      ← same as PDF
 *   Bottom:    297 − 15 − 262 = 20 mm
 *
 * Gutter strategy — spacer rows/columns in the table:
 *   Columns: [58mm | 2mm | 58mm | 2mm | 58mm]  (3 content + 2 spacer)
 *   Rows:    [31mm − 2mm − 31mm − ...]          (8 content + 7 spacer = 15 total)
 *
 * This keeps every content cell at exactly 58×31 mm (cell margins = 0),
 * so image dimensions are never distorted. Cut guides are drawn only on
 * content cells; spacer cells are fully transparent/borderless.
 */
import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  HeightRule,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  WidthType,
} from "docx";

// ── Physical constants (match PDF generator exactly) ─────────────────────────
const PIECE_W_MM = 58;
const PIECE_H_MM = 31;
const GUTTER_MM = 2;
const COLS = 3;
const ROWS = 8;

const PAGE_W_MM = 210;
const GRID_W_MM = PIECE_W_MM * COLS + GUTTER_MM * (COLS - 1); // 178 mm
const MARGIN_X_MM = (PAGE_W_MM - GRID_W_MM) / 2; // 16 mm — auto-centered
const MARGIN_Y_MM = 15; // matches PDF
const GRID_H_MM = PIECE_H_MM * ROWS + GUTTER_MM * (ROWS - 1); // 262 mm
const MARGIN_BOTTOM_MM = 297 - MARGIN_Y_MM - GRID_H_MM; // 20 mm

// ── Image pixel dimensions at 96 DPI (docx screen-pixel standard) ────────────
// 1 px = 25.4/96 mm ≈ 0.2646 mm → 58 mm ≈ 219 px, 31 mm ≈ 117 px
const IMG_W_PX = Math.round((PIECE_W_MM * 96) / 25.4); // 219
const IMG_H_PX = Math.round((PIECE_H_MM * 96) / 25.4); // 117

// ── Column widths: content, spacer, content, spacer, content ─────────────────
const COL_WIDTHS_TWP = [0, 1, 2, 3, 4].map((i) =>
  convertMillimetersToTwip(i % 2 === 0 ? PIECE_W_MM : GUTTER_MM)
); // [58mm, 2mm, 58mm, 2mm, 58mm] in twips

// ── Borders ──────────────────────────────────────────────────────────────────
const CUT_GUIDE = {
  top: { style: BorderStyle.SINGLE, size: 2, color: "C0C0C0" },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: "C0C0C0" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "C0C0C0" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "C0C0C0" },
};

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function base64ToUint8Array(dataUrl: string): Uint8Array {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function emptyCell(widthTwp: number, heightTwp: number): TableCell {
  return new TableCell({
    width: { size: widthTwp, type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    borders: NO_BORDER,
    children: [new Paragraph({ children: [] })],
  });
}

// ── Table builder ─────────────────────────────────────────────────────────────
function buildTable(pageImages: string[]): Table {
  const MM = convertMillimetersToTwip;
  const tableRows: TableRow[] = [];

  // Total grid rows: 8 content rows + 7 spacer rows = 15
  const totalGridRows = ROWS + (ROWS - 1); // 15

  for (let gr = 0; gr < totalGridRows; gr++) {
    const isSpacerRow = gr % 2 === 1;
    const contentRow = Math.floor(gr / 2); // 0-7

    const rowHeightTwp = MM(isSpacerRow ? GUTTER_MM : PIECE_H_MM);
    const cells: TableCell[] = [];

    // Total grid columns: 3 content + 2 spacer = 5
    const totalGridCols = COLS + (COLS - 1); // 5

    for (let gc = 0; gc < totalGridCols; gc++) {
      const isSpacerCol = gc % 2 === 1;
      const contentCol = Math.floor(gc / 2); // 0-2
      const cellWidthTwp = COL_WIDTHS_TWP[gc];

      if (isSpacerRow || isSpacerCol) {
        cells.push(emptyCell(cellWidthTwp, rowHeightTwp));
        continue;
      }

      // Content cell
      const idx = contentRow * COLS + contentCol;
      const imgData = pageImages[idx];

      const cellChildren = imgData
        ? [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              spacing: { before: 0, after: 0, line: 240 },
              children: [
                new ImageRun({
                  data: base64ToUint8Array(imgData),
                  transformation: { width: IMG_W_PX, height: IMG_H_PX },
                  type: "jpg",
                }),
              ],
            }),
          ]
        : [new Paragraph({ children: [] })];

      cells.push(
        new TableCell({
          width: { size: cellWidthTwp, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          borders: CUT_GUIDE,
          children: cellChildren,
        })
      );
    }

    tableRows.push(
      new TableRow({
        children: cells,
        height: { value: rowHeightTwp, rule: HeightRule.EXACT },
        cantSplit: true,
      })
    );
  }

  return new Table({
    rows: tableRows,
    width: { size: MM(GRID_W_MM), type: WidthType.DXA },
    columnWidths: COL_WIDTHS_TWP,
    layout: TableLayoutType.FIXED,
    alignment: AlignmentType.CENTER,
    // Remove all outer table borders — only cell-level cut guides remain
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideH: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  });
}

// ── Public export ─────────────────────────────────────────────────────────────
export async function generateDocx(pages: string[][]): Promise<void> {
  const MM = convertMillimetersToTwip;

  const sections = pages.map((pageImages) => ({
    properties: {
      page: {
        size: { width: MM(PAGE_W_MM), height: MM(297) },
        margin: {
          top: MM(MARGIN_Y_MM),       // 15 mm — matches PDF
          left: MM(MARGIN_X_MM),      // 16 mm — auto-centered
          right: MM(MARGIN_X_MM),     // 16 mm — symmetric
          bottom: MM(MARGIN_BOTTOM_MM), // 20 mm
        },
      },
    },
    children: [buildTable(pageImages)],
  }));

  const doc = new Document({ sections });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "flipbook-print.docx";
  anchor.click();
  URL.revokeObjectURL(url);
}
