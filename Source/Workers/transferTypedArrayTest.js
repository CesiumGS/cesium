// make sure self is defined so that the Dojo build can evaluate this file without crashing.
if (typeof self === "undefined") {
  //eslint-disable-next-line no-implicit-globals, no-global-assign
  self = {};
}

self.onmessage = function (event) {
  const array = event.data.array;
  const postMessage = self.webkitPostMessage || self.postMessage;

  try {
    // transfer the test array back to the caller
    postMessage(
      {
        array: array,
      },
      [array.buffer]
    );
  } catch (e) {
    postMessage({});
  }
};
