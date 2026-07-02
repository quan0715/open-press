export function exportReactDocument(
  root?: string,
  options?: {
    syncAssets?: boolean;
    sourceTextOverrides?: Record<string, string> | Map<string, string>;
    writeOutput?: boolean;
  },
): Promise<unknown>;
