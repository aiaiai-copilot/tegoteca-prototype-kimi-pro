import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

afterEach(cleanup);

// Node 25 предоставляет собственный неполный global localStorage. В тестах
// используем настоящую реализацию Storage из jsdom, как и в браузере.
const storageWindow = new JSDOM('', { url: 'http://localhost:3000' });
Object.defineProperty(globalThis, 'localStorage', {
  value: storageWindow.window.localStorage,
  configurable: true,
});
Object.defineProperty(window, 'localStorage', {
  value: storageWindow.window.localStorage,
  configurable: true,
});
