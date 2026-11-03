// Setup for component tests (jsdom). Adds Testing Library's matchers and the
// browser APIs jsdom lacks that Motion and our components use.
import "@testing-library/jest-dom";

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}

if (!("IntersectionObserver" in window)) {
  Object.assign(window, { IntersectionObserver: NoopObserver });
}
if (!("ResizeObserver" in window)) {
  Object.assign(window, { ResizeObserver: NoopObserver });
}
