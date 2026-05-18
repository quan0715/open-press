// Source directory paths come from vite.config.ts build-time defines, which
// in turn read qdoc.config.mjs. The React app does not hardcode `document/`.

export const QDOC_PROJECT_SOURCES = {
  content: {
    key: "content",
    directory: __QDOC_CONTENT_PATH__,
    label: "Content",
  },
  media: {
    key: "media",
    directory: __QDOC_MEDIA_PATH__,
    label: "Image Gallery",
  },
  data: {
    key: "data",
    directory: __QDOC_COMPONENTS_PATH__,
    label: "Data Sources",
  },
} as const;

export function projectSourceDirectoryPath(source: keyof typeof QDOC_PROJECT_SOURCES) {
  return `${QDOC_PROJECT_SOURCES[source].directory}/`;
}
