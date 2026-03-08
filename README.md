# Photo Cutter — Wooden Flipbook Print Tool

An internal web tool built with **Next.js 16**, **Tailwind CSS v4**, and **shadcn/ui** that prepares photos for printing on wooden flipbook adhesive sheets.

## What it does

Upload any number of photos. The tool automatically:

1. **Center-crops** each photo to the exact 58 × 62 mm aspect ratio (object-fit: cover).
2. **Splits** the cropped image horizontally into two physical pieces:
   - **Part A — Top** (58 × 31 mm)
   - **Part B — Bottom** (58 × 31 mm)
3. **Packs** pieces sequentially onto A4 sheets in a **3 × 8 grid (24 pieces / page)**, so each photo's Top and Bottom always land side by side for easy manual assembly.
4. **Exports** a print-ready PDF or Word document with exact physical dimensions.

## Print specifications

| Parameter         | Value                                      |
| ----------------- | ------------------------------------------ |
| Page              | A4 — 210 × 297 mm                          |
| Piece size        | 58 × 31 mm                                 |
| Grid              | 3 columns × 8 rows = **24 pieces / sheet** |
| Horizontal margin | 16 mm _(auto-centered: `(210 − 178) / 2`)_ |
| Top margin        | 15 mm                                      |
| Gutter            | 2 mm between pieces                        |
| Resolution        | 300 DPI                                    |
| Cut guide         | 0.25 pt light-grey border on every piece   |

## Tech stack

| Layer            | Library                                        |
| ---------------- | ---------------------------------------------- |
| Framework        | Next.js 16 (App Router) + React 19             |
| Styling          | Tailwind CSS v4 + shadcn/ui (radix-nova)       |
| PDF export       | jsPDF 4 — exact mm units                       |
| Word export      | docx 9 — spacer-row/column gutter model        |
| File input       | react-dropzone                                 |
| Image processing | Canvas API (300 DPI crop + split, client-side) |

## Getting started

```bash
pnpm install
pnpm dev
```

Navigate to `http://localhost:3000/photo-cutter`.

## Project structure

```
app/
  photo-cutter/page.tsx     Main page (orchestrator, state, export buttons)
components/
  ImageUploader.tsx          Drag-and-drop upload with progress bar
  PrintPreview.tsx           Scaled A4 preview (CSS zoom, synced to PDF margins)
  providers.tsx              ThemeProvider + Sonner Toaster wrapper
lib/
  image-processor.ts         Canvas: center-crop to 58×62 mm, split at midpoint
  generate-pdf.ts            jsPDF: exact mm coordinates, cut-guide borders
  generate-docx.ts           docx: 5-col × 15-row spacer table, A4 page setup
```

## How the export models work

### PDF (`lib/generate-pdf.ts`)

Places each image at `(MARGIN_X + col × 60, MARGIN_Y + row × 33)` in mm, then draws a 0.25 pt grey rectangle on top as a cut guide. Units are native mm throughout — no DPI conversion needed at draw time.

### Word (`lib/generate-docx.ts`)

Uses a **5-column × 15-row** table to achieve exact 2 mm gutters without distorting image size:

```
Columns: [ 58 mm | 2 mm | 58 mm | 2 mm | 58 mm ]
Rows:    [ 31 mm ─ 2 mm ─ 31 mm ─ 2 mm ─ ... ]   (8 content + 7 spacer = 15 total)
```

Content cells have zero padding so images fill exactly 58 × 31 mm. Spacer cells are borderless.
