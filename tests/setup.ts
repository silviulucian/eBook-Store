import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Component tests opt in to jsdom with `// @vitest-environment jsdom`.
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});
