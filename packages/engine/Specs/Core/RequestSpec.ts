import { Request, RequestState, RequestType } from "../../index.js";

describe("Core/Request", function () {
  it("sets correct properties in constructor", function () {
    const options = Object.freeze({
      url: "https://www.example.com",
      requestFunction: Promise.resolve(),
      cancelFunction: () => undefined,
      priorityFunction: () => 1,
      priority: 1,
      throttle: true,
      throttleByServer: true,
      type: RequestType.IMAGERY,
      serverKey: "customKey",
    });

    const request = new Request(options);

    expect(request.url).toBe(options.url);
    expect(request.requestFunction).toBe(options.requestFunction);
    expect(request.cancelFunction).toBe(options.cancelFunction);
    expect(request.priorityFunction).toBe(options.priorityFunction);
    expect(request.priority).toBe(options.priority);
    expect(request.throttle).toBe(options.throttle);
    expect(request.throttleByServer).toBe(options.throttleByServer);
    expect(request.type).toBe(options.type);
    expect(request.serverKey).toBe(options.serverKey);

    expect(request.state).toBe(RequestState.UNISSUED);
  });

  it("cancels", function () {
    const request = new Request();
    expect(request.cancelled).toBe(false);
    request.cancel();
    expect(request.cancelled).toBe(true);
  });

  it("cloning without options creates a request with the same properties", function () {
    const initialOptions = Object.freeze({
      url: "https://www.example.com",
      requestFunction: Promise.resolve(),
      cancelFunction: () => undefined,
      priorityFunction: () => 1,
      priority: 1,
      throttle: true,
      throttleByServer: true,
      type: RequestType.IMAGERY,
      serverKey: "customKey",
    });

    const request = new Request(initialOptions);
    const clone = request.clone();

    expect(clone.url).toBe(initialOptions.url);
    expect(clone.requestFunction).toBe(initialOptions.requestFunction);
    expect(clone.cancelFunction).toBe(initialOptions.cancelFunction);
    expect(clone.priorityFunction).toBe(initialOptions.priorityFunction);
    expect(clone.priority).toBe(initialOptions.priority);
    expect(clone.throttle).toBe(initialOptions.throttle);
    expect(clone.throttleByServer).toBe(initialOptions.throttleByServer);
    expect(clone.type).toBe(initialOptions.type);
    expect(clone.serverKey).toBe(initialOptions.serverKey);
  });

  it("cloning with a result parameter updates the properties of the result", function () {
    const options1 = Object.freeze({
      url: "https://www.example.com",
      requestFunction: Promise.resolve(),
      cancelFunction: () => undefined,
      priorityFunction: () => 1,
      priority: 1,
      throttle: true,
      throttleByServer: true,
      type: RequestType.IMAGERY,
      serverKey: "customKey",
    });

    const options2 = Object.freeze({
      url: "http://example.com",
      requestFunction: fetch,
      cancelFunction: () => "cancelled",
      priorityFunction: () => 2,
      priority: 2,
      throttle: false,
      throttleByServer: false,
      type: RequestType.TERRAIN,
      serverKey: "updatedKey",
    });

    const request1 = new Request(options1);
    const request2 = new Request(options2);
    const clone = request2.clone(request1);

    expect(clone.url).toBe(options2.url);
    expect(clone.requestFunction).toBe(options2.requestFunction);
    expect(clone.cancelFunction).toBe(options2.cancelFunction);
    expect(clone.priorityFunction).toBe(options2.priorityFunction);
    expect(clone.priority).toBe(options2.priority);
    expect(clone.throttle).toBe(options2.throttle);
    expect(clone.throttleByServer).toBe(options2.throttleByServer);
    expect(clone.type).toBe(options2.type);
    expect(clone.serverKey).toBe(options2.serverKey);
  });
});
