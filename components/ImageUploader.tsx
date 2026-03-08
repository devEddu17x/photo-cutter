"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ImageIcon, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onFiles: (files: File[]) => void;
  isProcessing: boolean;
  progress: number;
  imageCount: number; // total pieces (2× photos)
  photoCount: number; // original photos uploaded
}

export function ImageUploader({
  onFiles,
  isProcessing,
  progress,
  imageCount,
  photoCount,
}: ImageUploaderProps) {
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        // Caller handles toast notifications
      }
      if (accepted.length > 0) {
        onFiles(accepted);
      }
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    multiple: true,
    disabled: isProcessing,
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={cn(
            "relative border-2 border-dashed rounded-lg px-6 py-10 text-center",
            "transition-all duration-200 cursor-pointer select-none",
            isDragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/40 hover:bg-accent/30",
            isProcessing && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                "rounded-full p-3 transition-colors",
                isDragActive ? "bg-primary/10" : "bg-muted"
              )}
            >
              {isDragActive ? (
                <ImageIcon className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragActive
                  ? "Suelta las imágenes aquí"
                  : "Arrastra imágenes o haz clic"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP · Múltiples archivos permitidos
              </p>
            </div>
          </div>
        </div>

        {/* Processing progress */}
        {isProcessing && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Recortando y dividiendo piezas…</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Count summary */}
        {!isProcessing && imageCount > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            <span className="font-semibold text-foreground">{photoCount}</span>{" "}
            foto{photoCount !== 1 ? "s" : ""} →{" "}
            <span className="font-semibold text-foreground">{imageCount}</span>{" "}
            piezas ·{" "}
            <span className="font-semibold text-foreground">
              {Math.ceil(imageCount / 24)}
            </span>{" "}
            página{Math.ceil(imageCount / 24) !== 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
