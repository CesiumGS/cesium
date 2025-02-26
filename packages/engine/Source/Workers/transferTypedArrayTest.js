self.onmessage = function (event) {
  const array = event.data.array;
  const postMessage = self.webkitPostMessage || self.postMessage;

  try {
    // transfer the test array back to the caller
    postMessage(
      {
        array: array,
      },
      [array.buffer],
    );
  } catch (e) {
    postMessage({});
  }
};
