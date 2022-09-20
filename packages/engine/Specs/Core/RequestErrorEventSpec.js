import { RequestErrorEvent } from "../../Source/Cesium.js";

describe("Core/RequestErrorEvent", function () {
  it("parses response headers provided as a string", function () {
    const event = new RequestErrorEvent(
      404,
      "foo",
      "This-is-a-test: first\r\nAnother: second value!"
    );
    expect(event.responseHeaders).toEqual({
      "This-is-a-test": "first",
      Another: "second value!",
    });
  });

  it("leaves the response headers alone if they're already specified as an object literal", function () {
    const event = new RequestErrorEvent(404, "foo", {
      "This-is-a-test": "first",
      Another: "second value!",
    });
    expect(event.responseHeaders).toEqual({
      "This-is-a-test": "first",
      Another: "second value!",
    });
  });
});
