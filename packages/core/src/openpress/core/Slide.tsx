import { Frame } from "./Frame";
import type { SlideProps } from "./types";

export function Slide({
  id,
  role = "canvas.slide",
  chrome = false,
  ...rest
}: SlideProps) {
  return <Frame {...rest} frameKey={id} role={role} chrome={chrome} />;
}
