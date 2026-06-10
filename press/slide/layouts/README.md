# slide/layouts

Full-slide protocol components live here.

This dogfood deck uses compound layout wrappers such as `TitleSlide`,
`TwoColumnSlide`, `CardGridSlide`, `ProcessSlide`, `StatementSlide`, and
`BlankSlide`. Layout slots keep visible text in `children` and forward props to
`Text` so OpenPress object locators can survive the component boundary.

Use `op-*` Tailwind semantic classes. Do not add layout-local CSS files by
default.

Root `className`, `aria-*`, and `data-*` props are forwarded to the layout
`<section>`. Root `id` is reserved for the slide marker / frame identity and is
not forwarded as a DOM id; use a `data-*` prop for section hooks.
