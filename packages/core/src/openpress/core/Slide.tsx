import { Frame } from "./Frame";
import type { SlideProps } from "./types";

export function Slide({
  id,
  title,
  role = "canvas.slide",
  chrome = false,
  ...rest
}: SlideProps) {
  const frameProps = title === undefined ? rest : { ...rest, "data-page-title": title };

  return <Frame {...frameProps} frameKey={id} role={role} chrome={chrome} />;
}
