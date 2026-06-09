import { Frame } from "./Frame";
import type { SlideIndexProps, SlideProps } from "./types";

export const SLIDE_MARKER = Symbol.for("openpress.slide");

type RuntimeSlideProps = SlideProps & Pick<SlideIndexProps, "skip" | "transition">;

export const Slide = Object.assign(function Slide({
  id,
  role = "canvas.slide",
  chrome = false,
  skip: _skip,
  transition: _transition,
  ...rest
}: RuntimeSlideProps) {
  return <Frame {...rest} frameKey={id} role={role} chrome={chrome} />;
}, {
  openpressMarker: SLIDE_MARKER,
});
