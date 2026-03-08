"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Scissors, Download, FileText, Trash2, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/ImageUploader";
import { PrintPreview } from "@/components/PrintPreview";
import { processAndSplitImage, chunkArray, PIECES_PER_PAGE } from "@/lib/image-processor";
import { generatePDF } from "@/lib/generate-pdf";
import { generateDocx } from "@/lib/generate-docx";

type ExportFormat = "pdf" | "docx" | null;

export default function PhotoCutterPage() {
  const [images, setImages] = useState<string[]>([]); // processed base64 crops
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState<ExportFormat>(null);

  const pages = chunkArray(images, PIECES_PER_PAGE);

  // ── File handling ──────────────────────────────────────────────
  const handleFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    setProgress(0);

    const pieces: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        // Each photo → [Top piece, Bottom piece]
        const [top, bottom] = await processAndSplitImage(files[i]);
        pieces.push(top, bottom);
      } catch {
        toast.error(`No se pudo procesar "${files[i].name}"`);
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    const photosProcessed = pieces.length / 2;
    setImages((prev) => [...prev, ...pieces]);
    setIsProcessing(false);
    if (photosProcessed > 0) {
      toast.success(
        `${photosProcessed} foto${photosProcessed !== 1 ? "s" : ""} → ${pieces.length} piezas listas`
      );
    }
  }, []);

  // ── Clear ───────────────────────────────────────────────────────
  const handleClear = () => {
    setImages([]);
    setProgress(0);
    toast.success("Lista limpiada");
  };

  // ── PDF export ──────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (images.length === 0) return toast.error("No hay imágenes cargadas");
    setExporting("pdf");
    try {
      generatePDF(pages);
      toast.success("PDF generado correctamente");
    } catch {
      toast.error("Error al generar el PDF");
    } finally {
      setExporting(null);
    }
  };

  // ── DOCX export ─────────────────────────────────────────────────
  const handleDownloadDocx = async () => {
    if (images.length === 0) return toast.error("No hay imágenes cargadas");
    setExporting("docx");
    try {
      await generateDocx(pages);
      toast.success("Archivo Word generado correctamente");
    } catch {
      toast.error("Error al generar el archivo Word");
    } finally {
      setExporting(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center gap-3">
          <Scissors className="h-5 w-5 text-primary flex-shrink-0" />
          <h1 className="text-base font-semibold tracking-tight">
            Photo Cutter
          </h1>
          <span className="text-muted-foreground text-sm hidden sm:inline">
            — Flipbook de Madera
          </span>

          {images.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary">
                {images.length / 2} foto{images.length / 2 !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline">
                {images.length} piezas
              </Badge>
              <Badge variant="outline">
                {pages.length} pág.
              </Badge>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">

          {/* ── Left panel: uploader + controls ── */}
          <div className="space-y-4 lg:sticky lg:top-22">
            {/* Spec summary */}
            <div className="rounded-lg border bg-card p-6">
              <p className="font-bold text-sm text-foreground mb-4 flex items-center gap-2">
                <Printer className="h-4 w-4 text-primary flex-shrink-0" />
                Especificaciones de Impresión
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <span className="font-bold text-foreground">Hoja</span>
                <span className="text-muted-foreground">A4 · 210 × 297 mm</span>
                <span className="font-bold text-foreground">Pieza</span>
                <span className="text-muted-foreground">58 × 31 mm</span>
                <span className="font-bold text-foreground">Cuadrícula</span>
                <span className="text-muted-foreground font-medium">3 col × 8 filas (24/hoja)</span>
                <span className="font-bold text-foreground">Corte por foto</span>
                <span className="text-muted-foreground">Top + Bottom</span>
                <span className="font-bold text-foreground">Margen horizontal</span>
                <span className="text-muted-foreground">16 mm (centrado)</span>
                <span className="font-bold text-foreground">Margen superior</span>
                <span className="text-muted-foreground">15 mm</span>
                <span className="font-bold text-foreground">Sangría</span>
                <span className="text-muted-foreground">2 mm</span>
                <span className="font-bold text-foreground">Resolución</span>
                <span className="text-muted-foreground">300 DPI</span>
              </div>
            </div>

            <ImageUploader
              onFiles={handleFiles}
              isProcessing={isProcessing}
              progress={progress}
              imageCount={images.length}
              photoCount={Math.floor(images.length / 2)}
            />

            {/* Action buttons */}
            {images.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={exporting !== null}
                    className="w-full gap-2"
                  >
                    {exporting === "pdf" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Descargar PDF
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleDownloadDocx}
                    disabled={exporting !== null}
                    className="w-full gap-2"
                  >
                    {exporting === "docx" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Descargar Word (.docx)
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleClear}
                    disabled={exporting !== null}
                    className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Limpiar todo
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* ── Right panel: preview ── */}
          <div>
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed h-96 text-center px-8">
                <Scissors className="h-10 w-10 text-muted-foreground/40" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Sin imágenes aún
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Sube imágenes para ver la previsualización de impresión
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-8 pb-4 min-w-0">
                {pages.map((pageImages, i) => (
                  <PrintPreview
                    key={i}
                    images={pageImages}
                    pageNumber={i + 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
