"use client";

/**
 * PrintPreview — mirrors the PDF generator pixel-for-pixel.
 *
 * Physical layout (all constants match lib/generate-pdf.ts exactly):
 *   A4:        210 × 297 mm
 *   Grid W:    3×58 + 2×2 = 178 mm
 *   Margin X:  (210 - 178) / 2 = 16 mm   ← same formula as PDF
 *   Margin Y:  15 mm                      ← same as PDF
 *   Piece:     58 × 31 mm
 *   Gutter:    2 mm
 *   Grid:      3 cols × 8 rows = 24 pieces
 *
 * Responsive: CSS `zoom` scales the sheet down to fit any container width
 * while keeping all proportions and margins intact. No custom DPI math needed —
 * the zoom factor is applied to every pixel uniformly.
 */

import { useEffect, useRef, useState } from "react";

// ── Physical constants (2 px per mm base scale) ───────────────────────────────
const MM = 2; // px per mm at 100% zoom

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const PAGE_W = PAGE_W_MM * MM; // 420 px
const PAGE_H = PAGE_H_MM * MM; // 594 px

const GRID_W_MM = 58 * 3 + 2 * 2; // 178 mm  (matches PDF: 3 cols + 2 gutters)
const MARGIN_X = ((PAGE_W_MM - GRID_W_MM) / 2) * MM; // 16 mm → 32 px
const MARGIN_Y = 15 * MM; // 15 mm → 30 px

const PIECE_W = 58 * MM; // 116 px
const PIECE_H = 31 * MM; //  62 px
const GUTTER = 2 * MM;   //   4 px
const COLS = 3;
const PIECES_PER_PAGE = 24;

// Bounding-box of the entire grid (for the margin guide overlay)
const GRID_W = GRID_W_MM * MM; // 356 px
const GRID_H = (31 * 8 + 2 * 7) * MM; // 262 mm → 524 px

// ─────────────────────────────────────────────────────────────────────────────

interface PrintPreviewProps {
  images: string[];
  pageNumber: number;
}

export function PrintPreview({ images, pageNumber }: PrintPreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  // Measure the available column width and scale the sheet to fit.
  // CSS `zoom` is used (not `transform`) so that the element's layout footprint
  // shrinks correctly and `margin: auto` keeps it centered.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const measure = () => {
      const available = el.clientWidth;
      setZoom(Math.min(1, available / PAGE_W));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="space-y-2">
      {/* Page label */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide select-none">
        Página {pageNumber}
      </p>

      {/* Measure container — full column width, clips if somehow the sheet is still too large */}
      <div ref={wrapperRef} className="w-full overflow-hidden">
        {/* ── A4 sheet ───────────────────────────────────────────────────────── */}
        <div
          style={{
            // Responsive scaling: CSS zoom preserves layout flow
            zoom: zoom < 1 ? zoom : undefined,
            // Fixed A4 dimensions at base scale
            width: PAGE_W,
            height: PAGE_H,
            // Center within the wrapper when zoom = 1
            margin: "0 auto",
            position: "relative",
            backgroundColor: "#ffffff",
            // Elevated shadow so the sheet "lifts" off the background
            boxShadow:
              "0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)",
            borderRadius: 3,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {/* ── Margin / grid bounding-box guide ─────────────────────────── */}
          {/* Outer A4 border */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: "1px solid #f0f0f0",
              pointerEvents: "none",
            }}
          />
          {/* Exact grid bounding-box — matches PDF margins precisely */}
          <div
            style={{
              position: "absolute",
              left: MARGIN_X,
              top: MARGIN_Y,
              width: GRID_W,
              height: GRID_H,
              border: "1px dashed #d1d5db",
              borderRadius: 1,
              pointerEvents: "none",
            }}
          />

          {/* ── Image pieces ──────────────────────────────────────────────── */}
          {images.map((src, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const x = MARGIN_X + col * (PIECE_W + GUTTER);
            const y = MARGIN_Y + row * (PIECE_H + GUTTER);

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: PIECE_W,
                  height: PIECE_H,
                  // 0.25 pt cut guide — same weight as in PDF
                  outline: "1px solid #c8c8c8",
                  overflow: "hidden",
                }}
                title={`Foto ${Math.floor(i / 2) + 1} · ${
                  i % 2 === 0 ? "Top ▲" : "Bottom ▼"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Foto ${Math.floor(i / 2) + 1} ${
                    i % 2 === 0 ? "Top" : "Bottom"
                  }`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                {/* Piece label overlay */}
                <span
                  style={{
                    position: "absolute",
                    bottom: 1,
                    right: 2,
                    fontSize: 7,
                    lineHeight: 1,
                    color: "rgba(255,255,255,0.9)",
                    textShadow: "0 0 3px rgba(0,0,0,0.75)",
                    pointerEvents: "none",
                    userSelect: "none",
                    fontFamily: "monospace",
                  }}
                >
                  {Math.floor(i / 2) + 1}
                  {i % 2 === 0 ? "▲" : "▼"}
                </span>
              </div>
            );
          })}

          {/* ── Empty placeholders (partial last page) ────────────────────── */}
          {Array.from({ length: PIECES_PER_PAGE - images.length }).map(
            (_, i) => {
              const idx = images.length + i;
              const col = idx % COLS;
              const row = Math.floor(idx / COLS);
              const x = MARGIN_X + col * (PIECE_W + GUTTER);
              const y = MARGIN_Y + row * (PIECE_H + GUTTER);

              return (
                <div
                  key={`empty-${i}`}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: PIECE_W,
                    height: PIECE_H,
                    border: "1px dashed #e5e7eb",
                    backgroundColor: "#fafafa",
                  }}
                />
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
