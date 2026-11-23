import { Clock, JulianDate } from "@cesium/core";
import { Timeline } from "../../index.js";

describe("Widgets/Timeline/Timeline", function () {
  let container;
  beforeEach(function () {
    container = document.createElement("span");
    container.id = "container";
    container.style.width = "1px";
    container.style.height = "1px";
    document.body.appendChild(container);
  });

  afterEach(function () {
    document.body.removeChild(container);
  });

  it("sanity check", function () {
    const timeline = new Timeline(container, new Clock());
    timeline.resize();
    expect(timeline.isDestroyed()).toEqual(false);
    timeline.destroy();
    expect(timeline.isDestroyed()).toEqual(true);
  });

  it("clamps a zoom range starting before year 1 instead of throwing (#13769)", function () {
    const timeline = new Timeline(container, new Clock());
    // ~200 years before the earliest representable Gregorian date.
    const start = JulianDate.addSeconds(
      JulianDate.fromIso8601("0001-01-01T00:00:00Z"),
      -31536000 * 200,
      new JulianDate(),
    );
    const stop = JulianDate.addSeconds(start, 31536000, new JulianDate());
    let event;
    container.addEventListener("setzoom", function (e) {
      event = e;
    });
    expect(function () {
      timeline.zoomTo(start, stop);
    }).not.toThrow();
    expect(
      JulianDate.equals(
        event.startJulian,
        JulianDate.fromIso8601("0001-01-01T00:00:00Z"),
      ),
    ).toEqual(true);
    expect(
      JulianDate.secondsDifference(event.endJulian, event.startJulian),
    ).toEqual(31536000);
    timeline.destroy();
  });
});
