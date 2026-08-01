export function nextProductTabIndex(currentIndex, key, tabCount) {
  if (!Number.isInteger(tabCount) || tabCount < 1) return null;

  if (key === "ArrowRight") return (currentIndex + 1) % tabCount;
  if (key === "ArrowLeft") return (currentIndex - 1 + tabCount) % tabCount;
  if (key === "Home") return 0;
  if (key === "End") return tabCount - 1;

  return null;
}

export function initProductWorkbenchTabs(root) {
  for (const workbench of root.querySelectorAll("[data-product-workbench]")) {
    const tabs = Array.from(workbench.querySelectorAll("[data-product-tab]"));
    const panels = Array.from(workbench.querySelectorAll("[data-product-panel]"));
    const tabCount = Math.min(tabs.length, panels.length);
    if (tabCount === 0) continue;

    const activate = (activeIndex, moveFocus = false) => {
      for (let index = 0; index < tabCount; index += 1) {
        const selected = index === activeIndex;
        tabs[index].setAttribute("aria-selected", String(selected));
        tabs[index].tabIndex = selected ? 0 : -1;
        panels[index].hidden = !selected;
      }

      if (moveFocus) tabs[activeIndex].focus();
    };

    const selectedIndex = tabs.findIndex(
      (tab) => tab.getAttribute("aria-selected") === "true",
    );
    activate(selectedIndex >= 0 ? selectedIndex : 0);

    tabs.slice(0, tabCount).forEach((tab, index) => {
      tab.addEventListener("click", () => activate(index));
      tab.addEventListener("keydown", (event) => {
        const nextIndex = nextProductTabIndex(index, event.key, tabCount);
        if (nextIndex !== null) {
          event.preventDefault();
          activate(nextIndex, true);
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate(index, true);
        }
      });
    });
  }
}
