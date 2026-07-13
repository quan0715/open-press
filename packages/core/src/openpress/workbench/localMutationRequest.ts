const LOCAL_MUTATION_HEADER = "X-OpenPress-Local-Request";

export function localMutationHeaders(headers: HeadersInit = {}): Headers {
  const next = new Headers(headers);
  next.set(LOCAL_MUTATION_HEADER, "1");
  return next;
}
