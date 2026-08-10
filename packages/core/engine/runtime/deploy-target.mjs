export function normalizeDeployPressSlug(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^\/+|\/+$/g, "");
}

export function resolveDeployTarget(config, press) {
  const slug = normalizeDeployPressSlug(press);
  if (!slug) {
    return {
      kind: "workspace",
      pressSlug: "",
      source: config.deploy.source,
      projectName: config.deploy.projectName,
      commitDirty: config.deploy.commitDirty,
    };
  }

  const pressTarget = config.deploy.presses?.[slug];
  if (!pressTarget) {
    throw new Error(
      `Independent deployment for --press ${JSON.stringify(slug)} requires deploy.presses.${slug} in openpress/settings.json.`,
    );
  }

  return {
    kind: "press",
    pressSlug: slug,
    source: pressTarget.source,
    projectName: pressTarget.projectName,
    commitDirty: config.deploy.commitDirty,
  };
}
