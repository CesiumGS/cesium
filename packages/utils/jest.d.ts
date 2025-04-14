import "jest";

declare global {
  namespace jest {
    interface Matchers<R> {
      toThrowDeveloperError(): R;
    }
  }

  namespace NodeJS {
    interface Global {}
  }
}

export {};
