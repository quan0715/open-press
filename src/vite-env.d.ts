/// <reference types="vite/client" />

// Workspace path constants injected by vite.config.ts at build time.
// These come from openpress.config.mjs so the React app reflects the user's
// configured documentDir / sourceDir / mediaDir / componentsDir.
declare const __OPENPRESS_CONTENT_PATH__: string;
declare const __OPENPRESS_MEDIA_PATH__: string;
declare const __OPENPRESS_COMPONENTS_PATH__: string;
declare const __OPENPRESS_PDF_HREF__: string;
