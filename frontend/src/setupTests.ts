import '@testing-library/jest-dom';

window.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;
