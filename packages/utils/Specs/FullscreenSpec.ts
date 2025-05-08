import { FeatureDetection, Fullscreen } from "../Source/index";

describe("Core/Fullscreen", function () {
  it("can tell if fullscreen is supported", function () {
    // just make sure the function runs, the test can't expect a particular result.
    expect(Fullscreen.supportsFullscreen()).toBeDefined();
  });

  it("can tell if fullscreen is enabled", function () {
    if (Fullscreen.supportsFullscreen()) {
      // just make sure the function runs, the test can't expect a particular result.
      expect(Fullscreen.enabled).toBeDefined();
    } else {
      expect(Fullscreen.enabled).toBeUndefined();
    }
  });

  it("can get fullscreen element", function () {
    if (Fullscreen.supportsFullscreen()) {
      expect(Fullscreen.element).toBeNull();
    } else {
      expect(Fullscreen.element).toBeUndefined();
    }
  });

  it("can tell if the browser is in fullscreen", function () {
    if (Fullscreen.supportsFullscreen()) {
      expect(Fullscreen.fullscreen).toEqual(false);
    } else {
      expect(Fullscreen.fullscreen).toBeUndefined();
    }
  });

  it("can request fullscreen", function () {
    if (Fullscreen.supportsFullscreen()) {
      const request = Fullscreen._names.requestFullscreen as keyof HTMLElement;
      const exit = Fullscreen._names.exitFullscreen as keyof Document;

      spyOn(document.body, request);
      spyOn(document, exit);

      Fullscreen.requestFullscreen(document.body);
      expect(document.body[request]).toHaveBeenCalled();

      Fullscreen.exitFullscreen();
      expect(document[exit]).toHaveBeenCalled();
    } else {
      // These are no-ops if supportsFullscreen is false.
      Fullscreen.requestFullscreen(document.body);
      Fullscreen.exitFullscreen();
    }
  });

  if (!FeatureDetection.isInternetExplorer()) {
    it("can get the fullscreen change event name", function () {
      if (Fullscreen.supportsFullscreen()) {
        // the property on the document is the event name, prefixed with 'on'.
        const eventName = `on${Fullscreen.changeEventName as string}`;
        expect((document as any)[eventName]).toBeDefined();
      } else {
        expect(Fullscreen.changeEventName).toBeUndefined();
      }
    });

    it("can get the fullscreen error event name", function () {
      if (Fullscreen.supportsFullscreen()) {
        // the property on the document is the event name, prefixed with 'on'.
        const eventName = `on${Fullscreen.errorEventName as string}`;
        expect((document as any)[eventName]).toBeDefined();
      } else {
        expect(Fullscreen.errorEventName).toBeUndefined();
      }
    });
  }
});
