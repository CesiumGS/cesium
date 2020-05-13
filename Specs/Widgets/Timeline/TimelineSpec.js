import {
  TimelineHighlightRange,
  Clock,
  Timeline,
  JulianDate,
  Color,
} from "../../../Source/Cesium.js";

function getHighlightElements(root) {
  return root.getElementsByClassName("cesium-timeline-highlight");
}
describe("Widgets/Timeline/Timeline", function () {
  var container, timeline, timelineElement;
  beforeEach(function () {
    container = document.createElement("span");
    container.id = "container";
    container.style.width = "1px";
    container.style.height = "1px";
    document.body.appendChild(container);
    timeline = new Timeline(container, new Clock());
    timeline.render(); // TODO::resize will now use render under the hood "resize"
    timelineElement = container.getElementsByClassName(
      "cesium-timeline-main"
    )[0];
    // TODO::make _makeTics static and private
  });

  afterEach(function () {
    document.body.removeChild(container);
  });

  it("sanity check", function () {
    expect(timeline.isDestroyed()).toEqual(false);
    timeline.destroy();
    expect(timeline.isDestroyed()).toEqual(true);
  });

  describe("highlight range", function () {
    describe("addHighlightRange", function () {
      it("should return a TimelineHighlightRange object in legacy mode", function () {
        const timelineHighlightRange = timeline.addHighlightRange("red", 15);
        expect(timelineHighlightRange instanceof TimelineHighlightRange).toBe(
          true
        );
      });

      it("should return an ID of a highlight range", function () {
        const highlightRangeConfig = {
          color: "red",
          height: 15,
          base: 0,
          startTime: timeline._startJulian,
          endTime: timeline._endJulian,
        };

        const timelineHighlightRangeId = timeline.addHighlightRange(
          highlightRangeConfig
        );

        expect(timelineHighlightRangeId).toEqual(
          timeline._highlightRanges[0].id
        );
      });

      it("should add an highlightRange to the timeline", function () {
        const diff = JulianDate.secondsDifference(
          timeline._endJulian,
          timeline._startJulian
        );
        var tStartRed = timeline._startJulian;
        var tEndRed = new JulianDate();
        var tStartGreen = JulianDate.addSeconds(tStartRed, diff / 2, tEndRed);
        var tEndGreen = timeline._endJulian;

        const redHighlightRangeConfig = {
          color: "red",
          height: 15,
          base: 0,
          startTime: tStartRed,
          endTime: tEndRed,
        };
        const greenHighlightRangeConfig = {
          color: "green",
          height: 15,
          base: 0,
          startTime: tStartGreen,
          endTime: tEndGreen,
        };

        timeline.addHighlightRange(redHighlightRangeConfig);
        timeline.addHighlightRange(greenHighlightRangeConfig);

        const highlightElements = getHighlightElements(timelineElement);

        expect(highlightElements.length).toEqual(2);
        // TODO::add more expectations for visibility (much like jest snapshots)
      });

      it("should add an highlightRange to the timeline with given Cesium.Color", function () {
        const highlightRangeConfig = {
          color: Color.RED,
          height: 15,
          base: 0,
          startTime: timeline._startJulian,
          endTime: timeline._endJulian,
        };

        timeline.addHighlightRange(highlightRangeConfig);

        const highlightElement = getHighlightElements(timelineElement)[0];

        expect(
          Color.fromCssColorString(highlightElement.style.backgroundColor)
        ).toEqual(highlightRangeConfig.color);
      });

      it("should add an highlightRange to the timeline with given css color string", function () {
        const highlightRangeConfig = {
          color: "red",
          height: 15,
          base: 0,
          startTime: timeline._startJulian,
          endTime: timeline._endJulian,
        };

        timeline.addHighlightRange(highlightRangeConfig);

        const highlightElement = getHighlightElements(timelineElement)[0];

        expect(highlightElement.style.backgroundColor).toEqual(
          highlightRangeConfig.color
        );
      });
    });

    describe("removeHighlightRange", function () {
      xit("should remove highlightrange from the timeline", function () {
        const highlightRangeConfig = {
          color: "red",
          height: 15,
          base: 0,
          startTime: timeline._startJulian,
          endTime: timeline._endJulian,
        };

        const highlightId = timeline.addHighlightRange(highlightRangeConfig);

        timeline.removeHighlightRange(highlightId);
        const highlightElement = getHighlightElements(timelineElement)[0];

        expect(highlightElements.length).toEqual(0);
      });
    });
  });
});
