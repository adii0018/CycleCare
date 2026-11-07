import '@testing-library/jest-dom';

// Polyfill window.scrollTo if missing in jsdom
if (typeof window.scrollTo !== 'function') {
  window.scrollTo = () => {};
}

// Polyfill URL.createObjectURL and URL.revokeObjectURL
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = (file) => `blob:mock-url-${file.name || 'file'}`;
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
