export function wordFilenameFromPdfFilename(pdfFilename?: string): string;

export function buildWordDocument(options: {
  document: unknown;
  createdAt?: Date;
}): Buffer;

export function buildVisualWordDocument(options: {
  document: unknown;
  images: unknown;
  createdAt?: Date;
}): Buffer;
