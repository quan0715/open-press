/// <reference types="vite/client" />

// Workspace path constants injected by vite.config.ts at build time.
// These come from qdoc.config.mjs so the React app reflects the user's
// configured documentDir / sourceDir / mediaDir / componentsDir / designSystemDir.
declare const __QDOC_CONTENT_PATH__: string;
declare const __QDOC_MEDIA_PATH__: string;
declare const __QDOC_COMPONENTS_PATH__: string;
declare const __QDOC_DESIGN_SYSTEM_PATH__: string;
declare const __QDOC_PDF_HREF__: string;
