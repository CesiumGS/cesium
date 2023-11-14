import { defined } from "../../../Source/Cesium.js";
import { TimeInterval } from "../../../Source/Cesium.js";
import createViewer from "../../createViewer.js";
import DomEventSimulator from "../../DomEventSimulator.js";
import pollToPromise from "../../pollToPromise.js";
import { viewerDragDropMixin } from "../../../Source/Cesium.js";

describe(
  "Widgets/Viewer/viewerDragDropMixin",
  function () {
    let container;
    let viewer;
    beforeEach(function () {
      container = document.createElement("div");
      container.id = "container";
      container.style.display = "none";
      document.body.appendChild(container);

      //Impersonate FileReader for drag and drop tests
      const fakeFileReader = jasmine.createSpyObj("FileReader", ["readAsText"]);
      fakeFileReader.readAsText = function (file) {
        if (defined(file.czmlString)) {
          this.onload({
            target: {
              result: file.czmlString,
            },
          });
        } else {
          this.onerror({
            target: {
              error: file.errorMessage,
            },
          });
        }
      };
      spyOn(window, "FileReader").and.returnValue(fakeFileReader);
    });

    afterEach(function () {
      if (viewer && !viewer.isDestroyed()) {
        viewer = viewer.destroy();
      }

      document.body.removeChild(container);
    });

    it("mixin sets default values", function () {
      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin);
      expect(viewer.dropTarget).toBe(viewer.container);
      expect(viewer.dropEnabled).toEqual(true);
      expect(viewer.clearOnDrop).toEqual(true);
      expect(viewer.clampToGround).toEqual(true);
      expect(viewer.flyToOnDrop).toEqual(true);
    });

    it("clearOnDrop defaults to true when dataSourceBrowser is not used", function () {
      viewer = createViewer(container, {
        dataSourceBrowser: false,
      });
      viewer.extend(viewerDragDropMixin);
      expect(viewer.clearOnDrop).toEqual(true);
    });

    it("mixin sets option values", function () {
      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin, {
        dropTarget: document.body,
        clearOnDrop: false,
        clampToGround: false,
        flyToOnDrop: false,
      });
      expect(viewer.dropTarget).toBe(document.body);
      expect(viewer.dropEnabled).toEqual(true);
      expect(viewer.clearOnDrop).toEqual(false);
      expect(viewer.clampToGround).toEqual(false);
      expect(viewer.flyToOnDrop).toEqual(false);
    });

    it("mixin works with dropTarget id string", function () {
      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin, {
        dropTarget: "container",
      });
      expect(viewer.dropTarget).toBe(container);
    });

    const czml1 = [
      {
        id: "document",
        version: "1.0",
        clock: {
          interval: "2000-01-01/2001-01-01",
        },
      },
      {
        id: "test",
      },
    ];

    const czml2 = [
      {
        id: "document",
        version: "1.0",
        clock: {
          interval: "2000-01-02/2001-01-02",
        },
      },
      {
        id: "test2",
      },
    ];

    it("handleDrop processes drop event", function () {
      const mockEvent = {
        dataTransfer: {
          files: [
            {
              name: "czml1.czml",
              czmlString: JSON.stringify(czml1),
            },
          ],
        },
        stopPropagation: function () {},
        preventDefault: function () {},
      };

      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin);

      DomEventSimulator.fireMockEvent(viewer._handleDrop, mockEvent);

      return pollToPromise(function () {
        return viewer.dataSources.length === 1;
      }).then(function () {
        const dataSource = viewer.dataSources.get(0);
        const interval = TimeInterval.fromIso8601({
          iso8601: czml1[0].clock.interval,
        });
        expect(dataSource.entities.getById("test")).toBeDefined();
        expect(dataSource.clock.startTime).toEqual(interval.start);
        expect(dataSource.clock.stopTime).toEqual(interval.stop);
      });
    });

    it("handleDrop processes drop event with multiple files", function () {
      const mockEvent = {
        dataTransfer: {
          files: [
            {
              name: "czml1.czml",
              czmlString: JSON.stringify(czml1),
            },
            {
              name: "czml2.czml",
              czmlString: JSON.stringify(czml2),
            },
          ],
        },
        stopPropagation: function () {},
        preventDefault: function () {},
      };

      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin);

      DomEventSimulator.fireMockEvent(viewer._handleDrop, mockEvent);

      return pollToPromise(function () {
        return viewer.dataSources.length === 2;
      }).then(function () {
        const source1 = viewer.dataSources.get(0);
        const source2 = viewer.dataSources.get(1);
        expect(source1.entities.getById("test")).toBeDefined();
        expect(source2.entities.getById("test2")).toBeDefined();
        //Interval of first file should be used.
        const interval = TimeInterval.fromIso8601({
          iso8601: czml1[0].clock.interval,
        });
        expect(source1.clock.startTime).toEqual(interval.start);
        expect(source1.clock.stopTime).toEqual(interval.stop);
      });
    });

    it("handleDrop obeys clearOnDrop", function () {
      const mockEvent = {
        dataTransfer: {
          files: [
            {
              name: "czml1.czml",
              czmlString: JSON.stringify(czml1),
            },
            {
              name: "czml2.czml",
              czmlString: JSON.stringify(czml2),
            },
          ],
        },
        stopPropagation: function () {},
        preventDefault: function () {},
      };

      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin);

      DomEventSimulator.fireMockEvent(viewer._handleDrop, mockEvent);

      return pollToPromise(function () {
        return viewer.dataSources.length === 2;
      }).then(function () {
        const source1 = viewer.dataSources.get(0);
        const source2 = viewer.dataSources.get(1);
        expect(source1.entities.getById("test")).toBeDefined();
        expect(source2.entities.getById("test2")).toBeDefined();
        //Interval of first file should be used.
        const interval = TimeInterval.fromIso8601({
          iso8601: czml1[0].clock.interval,
        });
        expect(source1.clock.startTime).toEqual(interval.start);
        expect(source1.clock.stopTime).toEqual(interval.stop);

        viewer.clearOnDrop = false;
        DomEventSimulator.fireMockEvent(viewer._handleDrop, mockEvent);

        return pollToPromise(function () {
          return viewer.dataSources.length === 4;
        }).then(function () {
          const source1 = viewer.dataSources.get(0);
          const source2 = viewer.dataSources.get(1);
          const source3 = viewer.dataSources.get(2);
          const source4 = viewer.dataSources.get(3);

          expect(source1.entities.getById("test")).toBeDefined();
          expect(source2.entities.getById("test2")).toBeDefined();
          expect(source3.entities.getById("test")).toBeDefined();
          expect(source4.entities.getById("test2")).toBeDefined();

          viewer.clearOnDrop = true;
          DomEventSimulator.fireMockEvent(viewer._handleDrop, mockEvent);

          return pollToPromise(function () {
            return viewer.dataSources.length === 2;
          }).then(function () {
            const source1 = viewer.dataSources.get(0);
            const source2 = viewer.dataSources.get(1);
            expect(source1.entities.getById("test")).toBeDefined();
            expect(source2.entities.getById("test2")).toBeDefined();
            //Interval of first file should be used.
            const interval = TimeInterval.fromIso8601({
              iso8601: czml1[0].clock.interval,
            });
            expect(source1.clock.startTime).toEqual(interval.start);
            expect(source1.clock.stopTime).toEqual(interval.stop);
          });
        });
      });
    });

    it("dropError is raised on exception", function () {
      const mockEvent = {
        dataTransfer: {
          files: [
            {
              name: "czml1.czml",
              czmlString: "bad JSON",
            },
          ],
        },
        stopPropagation: function () {},
        preventDefault: function () {},
      };

      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin);

      const spyListener = jasmine.createSpy("listener");

      viewer.dropError.addEventListener(spyListener);
      DomEventSimulator.fireMockEvent(viewer._handleDrop, mockEvent);

      return pollToPromise(function () {
        return spyListener.calls.any();
      }).then(function () {
        expect(spyListener).toHaveBeenCalledWith(
          viewer,
          "czml1.czml",
          jasmine.any(SyntaxError)
        );

        viewer.dropError.removeEventListener(spyListener);
      });
    });

    it("dropError is raised FileReader error", function () {
      const mockEvent = {
        dataTransfer: {
          files: [
            {
              name: "czml1.czml",
              errorMessage: "bad JSON",
            },
          ],
        },
        stopPropagation: function () {},
        preventDefault: function () {},
      };

      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin);

      const spyListener = jasmine.createSpy("listener");

      viewer.dropError.addEventListener(spyListener);
      DomEventSimulator.fireMockEvent(viewer._handleDrop, mockEvent);

      return pollToPromise(function () {
        return spyListener.calls.any();
      }).then(function () {
        expect(spyListener).toHaveBeenCalledWith(
          viewer,
          mockEvent.dataTransfer.files[0].name,
          mockEvent.dataTransfer.files[0].errorMessage
        );

        viewer.dropError.removeEventListener(spyListener);
      });
    });

    function MockContainer() {
      const events = {};
      this.events = events;

      this.addEventListener = function (name, func, bubble) {
        events[name] = {
          func: func,
          bubble: bubble,
        };
      };

      this.removeEventListener = function (name, func, bubble) {
        const subscribed = events[name];
        expect(subscribed.func).toBe(func);
        expect(subscribed.bubble).toEqual(bubble);
        delete events[name];
      };
    }

    it("enable/disable subscribes to provided dropTarget.", function () {
      const dropTarget = new MockContainer();

      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin, {
        dropTarget: dropTarget,
      });

      expect(dropTarget.events.drop).toBeDefined();
      expect(dropTarget.events.dragenter).toBeDefined();
      expect(dropTarget.events.dragover).toBeDefined();
      expect(dropTarget.events.dragexit).toBeDefined();

      viewer.dropEnabled = false;
      expect(dropTarget.events.drop).toBeUndefined();
      expect(dropTarget.events.dragenter).toBeUndefined();
      expect(dropTarget.events.dragover).toBeUndefined();
      expect(dropTarget.events.dragexit).toBeUndefined();

      viewer.dropEnabled = true;
      expect(dropTarget.events.drop).toBeDefined();
      expect(dropTarget.events.dragenter).toBeDefined();
      expect(dropTarget.events.dragover).toBeDefined();
      expect(dropTarget.events.dragexit).toBeDefined();
    });

    it("can set new dropTarget.", function () {
      const dropTarget1 = new MockContainer();
      const dropTarget2 = new MockContainer();

      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin, {
        dropTarget: dropTarget1,
      });

      expect(dropTarget1.events.drop).toBeDefined();
      expect(dropTarget1.events.dragenter).toBeDefined();
      expect(dropTarget1.events.dragover).toBeDefined();
      expect(dropTarget1.events.dragexit).toBeDefined();

      viewer.dropTarget = dropTarget2;
      expect(dropTarget1.events.drop).toBeUndefined();
      expect(dropTarget1.events.dragenter).toBeUndefined();
      expect(dropTarget1.events.dragover).toBeUndefined();
      expect(dropTarget1.events.dragexit).toBeUndefined();

      expect(dropTarget2.events.drop).toBeDefined();
      expect(dropTarget2.events.dragenter).toBeDefined();
      expect(dropTarget2.events.dragover).toBeDefined();
      expect(dropTarget2.events.dragexit).toBeDefined();
    });

    it("can set proxy.", function () {
      const proxy = {};

      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin, {
        proxy: proxy,
      });
      expect(viewer.proxy).toBe(proxy);
    });

    it("throws with undefined viewer", function () {
      expect(function () {
        viewerDragDropMixin(undefined);
      }).toThrowDeveloperError();
    });

    it("throws with non-existant string container", function () {
      viewer = createViewer(container);
      expect(function () {
        viewer.extend(viewerDragDropMixin, {
          dropTarget: "doesNotExist",
        });
      }).toThrowDeveloperError();
    });

    it("throws if dropTarget property already added by another mixin.", function () {
      viewer = createViewer(container);
      viewer.dropTarget = true;
      expect(function () {
        viewer.extend(viewerDragDropMixin);
      }).toThrowDeveloperError();
    });

    it("throws if dropEnabled property already added by another mixin.", function () {
      viewer = createViewer(container);
      viewer.dropEnabled = true;
      expect(function () {
        viewer.extend(viewerDragDropMixin);
      }).toThrowDeveloperError();
    });

    it("throws if dropError property already added by another mixin.", function () {
      viewer = createViewer(container);
      viewer.dropError = true;
      expect(function () {
        viewer.extend(viewerDragDropMixin);
      }).toThrowDeveloperError();
    });

    it("throws if clearOnDrop property already added by another mixin.", function () {
      viewer = createViewer(container);
      viewer.clearOnDrop = true;
      expect(function () {
        viewer.extend(viewerDragDropMixin);
      }).toThrowDeveloperError();
    });

    it("throws if flyToOnDrop property already added by another mixin.", function () {
      viewer = createViewer(container);
      viewer.flyToOnDrop = true;
      expect(function () {
        viewer.extend(viewerDragDropMixin);
      }).toThrowDeveloperError();
    });

    it("setting dropTarget to undefined throws exception", function () {
      viewer = createViewer(container);
      viewer.extend(viewerDragDropMixin);
      expect(function () {
        viewer.dropTarget = undefined;
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
