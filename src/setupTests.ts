import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// testing-library/jest-domの型宣言を明示的に追加
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeVisible(): R;
      toBeEmptyDOMElement(): R;
      toHaveAttribute(attr: string, value?: any): R;
      toHaveClass(...classNames: string[]): R;
      toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): R;
      toHaveFocus(): R;
      toHaveFormValues(expectedValues: Record<string, any>): R;
      toHaveStyle(css: string | Record<string, any>): R;
      toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
      toHaveValue(value?: string | string[] | number): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
      toHaveDescription(text?: string | RegExp): R;
      toBeGreaterThan(expected: number): R;
      toHaveBeenCalledWith(...params: any[]): R;
      toBe(expected: any): R;
      toBeDefined(): R;
      toBeNull(): R;
      toMatch(expected: string | RegExp): R;
    }
  }
}

// Testing Libraryの設定
configure({
  asyncUtilTimeout: 2000,
  getElementError: (message: string | null) => {
    const error = new Error(message || '');
    error.name = 'TestingLibraryElementError';
    return error;
  },
});

// act() warnings: https://github.com/radix-ui/primitives/issues/1207#issuecomment-1820797668
// TestingLibraryElementError: https://github.com/testing-library/react-testing-library/issues/1196

// src/setupTests.ts
// コンソールエラーを抑制するためのコード (必要に応じて調整)
const originalConsoleError = console.error;
console.error = (message, ...args) => {
  // 特定のact()警告を無視する
  if (
    typeof message === 'string' &&
    (message.includes('`ReactDOMTestUtils.act` is deprecated') ||
      message.includes('The current testing environment is not configured to support act'))
  ) {
    return;
  }
  // Radix UI select related warning
  if (
    typeof message === 'string' &&
    message.includes("The provided value is not of type 'Element'")
  ) {
    return;
  }
  originalConsoleError(message, ...args);
};

// JSDOM環境でRadix UIコンポーネントをテストするためのワークアラウンド
// https://github.com/radix-ui/primitives/issues/1822
// https://github.com/jsdom/jsdom/pull/2666
class MockPointerEvent extends Event {
  button: number;
  ctrlKey: boolean;
  pointerType: string;

  constructor(type: string, props: PointerEventInit) {
    super(type, props);
    this.button = props.button || 0;
    this.ctrlKey = props.ctrlKey || false;
    this.pointerType = props.pointerType || 'mouse';
  }
}

window.PointerEvent = MockPointerEvent as any;
window.HTMLElement.prototype.scrollIntoView = jest.fn();
window.HTMLElement.prototype.releasePointerCapture = jest.fn();
window.HTMLElement.prototype.hasPointerCapture = jest.fn();

// ResizeObserver mock (Radix UIや他のライブラリで使われることがある)
// https://github.com/testing-library/react-testing-library/issues/1196
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = MockResizeObserver as any;

// DOMRect mock (Radix UIや他のライブラリで使われることがある)
// https://github.com/radix-ui/primitives/issues/856#issuecomment-928704064
window.DOMRect = {
  fromRect: () => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
  }),
} as any;
