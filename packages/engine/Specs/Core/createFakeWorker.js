export function createDeferred() {
  let resolve;

  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise: promise, resolve: resolve };
}

function createFakeWorker() {
  const listeners = new Map();

  return {
    addEventListener: function (type, listener) {
      let typeListeners = listeners.get(type);
      if (!typeListeners) {
        typeListeners = [];
        listeners.set(type, typeListeners);
      }
      typeListeners.push(listener);
    },

    removeEventListener: function (type, listener) {
      const typeListeners = listeners.get(type);
      if (!typeListeners) {
        return;
      }
      const index = typeListeners.indexOf(listener);
      if (index !== -1) {
        typeListeners.splice(index, 1);
      }
    },

    dispatchEvent: function (type, event) {
      const typeListeners = listeners.get(type);
      if (typeListeners) {
        typeListeners.slice().forEach((listener) => listener(event));
      }
    },

    postMessage: jasmine.createSpy("postMessage"),
    terminate: jasmine.createSpy("terminate"),
  };
}

export default createFakeWorker;
