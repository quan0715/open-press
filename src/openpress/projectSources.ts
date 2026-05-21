// Source directory paths come from vite.config.ts build-time defines, which
// in turn read openpress.config.mjs. The React app does not hardcode `document/`.

export const PROJECT_SOURCES = {
  content: {
    key: "content",
    directory: __OPENPRESS_CONTENT_PATH__,
    label: "Content",
  },
  media: {
    key: "media",
    directory: __OPENPRESS_MEDIA_PATH__,
    label: "Image Gallery",
  },
  components: {
    key: "components",
    directory: __OPENPRESS_COMPONENTS_PATH__,
    label: "內容區塊",
  },
} as const;

export function projectSourceDirectoryPath(source: keyof typeof PROJECT_SOURCES) {
  return `${PROJECT_SOURCES[source].directory}/`;
}
