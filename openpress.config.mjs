// Framework dogfood workspace pointer.
// The real document config lives at press/openpress.config.mjs.
// (Pointer file is transitional — v1.0 drops it entirely and reads
// metadata from <Press> props + package.json "openpress" instead.)

export default {
  documentDir: "press",
  config: "press/openpress.config.mjs",
};
