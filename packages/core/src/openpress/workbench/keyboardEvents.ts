type KeyboardEventLike = {
  isComposing?: boolean;
  keyCode?: number;
  nativeEvent?: {
    isComposing?: boolean;
    keyCode?: number;
  };
};

export function isKeyboardEventComposing(event: KeyboardEventLike) {
  return event.isComposing === true
    || event.keyCode === 229
    || event.nativeEvent?.isComposing === true
    || event.nativeEvent?.keyCode === 229;
}
