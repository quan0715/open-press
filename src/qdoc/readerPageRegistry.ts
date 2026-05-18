export interface ReaderPageRegistry<TNode> {
  refs: Array<TNode | null>;
  registerPage: (pageIndex: number) => (node: TNode | null) => void;
  trim: (pageCount: number) => void;
}

export function createReaderPageRegistry<TNode = HTMLElement>(
  onChange: (version: number) => void,
): ReaderPageRegistry<TNode> {
  const refs: Array<TNode | null> = [];
  const callbacks = new Map<number, (node: TNode | null) => void>();
  let version = 0;

  const bump = () => {
    version += 1;
    onChange(version);
  };

  return {
    refs,
    registerPage(pageIndex: number) {
      const existing = callbacks.get(pageIndex);
      if (existing) return existing;

      const callback = (node: TNode | null) => {
        if (refs[pageIndex] === node) return;
        refs[pageIndex] = node;
        bump();
      };

      callbacks.set(pageIndex, callback);
      return callback;
    },
    trim(pageCount: number) {
      refs.length = Math.max(pageCount, 0);
      for (const pageIndex of callbacks.keys()) {
        if (pageIndex >= pageCount) callbacks.delete(pageIndex);
      }
    },
  };
}
