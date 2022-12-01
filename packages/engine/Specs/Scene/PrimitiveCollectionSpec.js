import {
  ColorGeometryInstanceAttribute,
  defaultValue,
  defined,
  GeometryInstance,
  Rectangle,
  RectangleGeometry,
  HorizontalOrigin,
  LabelCollection,
  PerInstanceColorAppearance,
  Primitive,
  PrimitiveCollection,
  VerticalOrigin,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/PrimitiveCollection",
  function () {
    let scene;
    let context;
    let rectangle;
    let primitives;

    beforeAll(function () {
      scene = createScene();
      scene.primitives.destroyPrimitives = false;
      context = scene.context;
      rectangle = Rectangle.fromDegrees(-80.0, 20.0, -70.0, 30.0);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      primitives = new PrimitiveCollection();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      primitives =
        primitives && !primitives.isDestroyed() && primitives.destroy();
    });

    function allLabelsReady(labels) {
      // render until all labels have been updated
      return pollToPromise(function () {
        scene.renderForSpecs();
        const backgroundBillboard = labels._backgroundBillboardCollection.get(
          0
        );
        return (
          (!defined(backgroundBillboard) || backgroundBillboard.ready) &&
          labels._labelsToUpdate.length === 0
        );
      });
    }

    function createLabels(position) {
      position = defaultValue(position, {
        x: -1.0,
        y: 0.0,
        z: 0.0,
      });
      const labels = new LabelCollection();
      labels.add({
        position: position,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });
      return labels;
    }

    function createRectangle() {
      return new Primitive({
        geometryInstances: new GeometryInstance({
          geometry: new RectangleGeometry({
            rectangle: rectangle,
          }),
          attributes: {
            color: new ColorGeometryInstanceAttribute(1.0, 1.0, 0.0, 0.5),
          },
        }),
        appearance: new PerInstanceColorAppearance(),
        releaseGeometryInstances: true,
        asynchronous: false,
      });
    }

    function verifyLabelsRender(primitives, labels, color) {
      scene.primitives.removeAll();
      scene.camera.setView({ destination: rectangle });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitives);
      return allLabelsReady(labels).then(function () {
        if (defined(color)) {
          expect(scene).toRender(color);
        } else {
          expect(scene).notToRender([0, 0, 0, 255]);
        }
      });
    }

    function verifyPrimitivesRender(primitives, color) {
      scene.primitives.removeAll();
      scene.camera.setView({ destination: rectangle });

      expect(scene).toRender([0, 0, 0, 255]);

      scene.primitives.add(primitives);

      if (defined(color)) {
        expect(scene).toRender(color);
      } else {
        expect(scene).notToRender([0, 0, 0, 255]);
      }
    }

    it("constructs with options", function () {
      const collection = new PrimitiveCollection({
        show: false,
        destroyPrimitives: false,
      });
      expect(collection.show).toEqual(false);
      expect(collection.destroyPrimitives).toEqual(false);
      collection.destroy();
    });

    it("gets default show", function () {
      expect(primitives.show).toEqual(true);
    });

    it("get throws if index is undefined", function () {
      expect(function () {
        primitives.get(undefined);
      }).toThrowDeveloperError();
    });

    it("has zero primitives when constructed", function () {
      expect(primitives.length).toEqual(0);
    });

    it("adds a primitive with add()", function () {
      const p = createLabels();
      expect(primitives.add(p)).toBe(p);
      expect(primitives.length).toEqual(1);
    });

    it("add works with an index", function () {
      const p0 = createLabels();
      const p1 = createLabels();

      expect(function () {
        primitives.add(p0, 1);
      }).toThrowDeveloperError();

      expect(function () {
        primitives.add(p0, -1);
      }).toThrowDeveloperError();

      primitives.add(p0, 0);
      expect(primitives.get(0)).toBe(p0);

      expect(function () {
        primitives.add(p1, -1);
      }).toThrowDeveloperError();

      expect(function () {
        primitives.add(p1, 2);
      }).toThrowDeveloperError();

      primitives.add(p1, 0);
      expect(primitives.get(0)).toBe(p1);
    });

    it("removes the first primitive", function () {
      const p0 = createLabels();
      const p1 = createLabels();

      primitives.add(p0);
      primitives.add(p1);

      expect(primitives.length).toEqual(2);

      expect(primitives.remove(p0)).toEqual(true);
      expect(primitives.length).toEqual(1);
      expect(primitives.get(0)).toBe(p1);

      expect(primitives.remove(p1)).toEqual(true);
      expect(primitives.length).toEqual(0);
    });

    it("removes the last primitive", function () {
      const p0 = createLabels();
      const p1 = createLabels();

      primitives.add(p0);
      primitives.add(p1);

      expect(primitives.length).toEqual(2);

      expect(primitives.remove(p1)).toEqual(true);
      expect(primitives.length).toEqual(1);
      expect(primitives.get(0)).toBe(p0);

      expect(primitives.remove(p0)).toEqual(true);
      expect(primitives.length).toEqual(0);
    });

    it("removes a primitive twice", function () {
      const p0 = createLabels();
      primitives.add(p0);

      expect(primitives.remove(p0)).toEqual(true);
      expect(primitives.remove(p0)).toEqual(false);
    });

    it("removes null", function () {
      expect(primitives.remove()).toEqual(false);
    });

    it("removes all primitives", function () {
      primitives.add(createLabels());
      primitives.add(createLabels());
      primitives.add(createLabels());

      expect(primitives.length).toEqual(3);

      primitives.removeAll();
      expect(primitives.length).toEqual(0);
    });

    it("contains a primitive", function () {
      const labels = createLabels();
      primitives.add(labels);

      expect(primitives.contains(labels)).toEqual(true);
    });

    it("does not contain a primitive", function () {
      const labels0 = createLabels();
      const labels1 = createLabels();
      primitives.add(labels0);

      expect(primitives.contains(labels1)).toEqual(false);
    });

    it("does not contain removed primitive", function () {
      const labels0 = createLabels();
      primitives.add(labels0);
      primitives.remove(labels0);

      expect(primitives.contains(labels0)).toEqual(false);
    });

    it("does not contain all removed primitives", function () {
      const labels0 = createLabels();
      primitives.add(labels0);
      primitives.removeAll();

      expect(primitives.contains(labels0)).toEqual(false);
    });

    it("does not contain undefined", function () {
      expect(primitives.contains()).toEqual(false);
    });

    it("adds and removes a primitive in two composites", function () {
      const p = createLabels();

      primitives.add(p);
      primitives.destroyPrimitives = false;

      const otherPrimitives = new PrimitiveCollection();
      otherPrimitives.add(p);
      otherPrimitives.destroyPrimitives = false;

      // In both composites
      expect(primitives.contains(p)).toEqual(true);
      expect(otherPrimitives.contains(p)).toEqual(true);

      // In one composite
      expect(primitives.remove(p)).toEqual(true);
      expect(primitives.contains(p)).toEqual(false);
      expect(otherPrimitives.contains(p)).toEqual(true);

      // In neither composite
      expect(otherPrimitives.remove(p)).toEqual(true);
      expect(primitives.contains(p)).toEqual(false);
      expect(otherPrimitives.contains(p)).toEqual(false);
      expect(primitives.remove(p)).toEqual(false);
      expect(otherPrimitives.remove(p)).toEqual(false);

      p.destroy();
      otherPrimitives.destroy();
    });

    it("does not remove from a second composite", function () {
      const p = createLabels();
      primitives.add(p);

      const otherPrimitives = new PrimitiveCollection();

      expect(otherPrimitives.contains(p)).toEqual(false);
      expect(otherPrimitives.remove(p)).toEqual(false);

      otherPrimitives.destroy();
    });

    it("gets default destroyPrimitives", function () {
      expect(primitives.destroyPrimitives).toEqual(true);
    });

    it("renders a primitive added with add()", function () {
      const labels = createLabels();
      primitives.add(labels);
      return verifyLabelsRender(primitives, labels);
    });

    it("does not render", function () {
      primitives.show = false;
      const labels = createLabels();
      primitives.add(labels);
      verifyPrimitivesRender(primitives, [0, 0, 0, 255]);
    });

    it("renders a primitive in more than one composite", function () {
      const p = createLabels();
      primitives.add(p);

      const otherPrimitives = new PrimitiveCollection();
      otherPrimitives.destroyPrimitives = false;
      otherPrimitives.add(p);

      return verifyLabelsRender(primitives, p).then(function () {
        verifyPrimitivesRender(otherPrimitives);

        otherPrimitives.destroy();
      });
    });

    it("renders child composites", function () {
      const children = new PrimitiveCollection();
      const labels = createLabels();
      children.add(labels);
      primitives.add(children);

      return verifyLabelsRender(primitives, labels);
    });

    it("picks a primitive added with add()", function () {
      const labels = createLabels();
      const l = labels.get(0);
      primitives.add(labels);

      return verifyLabelsRender(primitives, labels).then(function () {
        expect(scene).toPickPrimitive(l);
      });
    });

    it("does not pick", function () {
      const labels = createLabels();

      primitives.show = false;
      primitives.add(labels);

      verifyPrimitivesRender(primitives, [0, 0, 0, 255]);

      expect(scene).notToPick();
    });

    it("picks child composites", function () {
      const labels = createLabels();
      const l = labels.get(0);

      const children = new PrimitiveCollection();
      children.add(labels);
      primitives.add(children);

      return verifyLabelsRender(primitives, labels).then(function () {
        expect(scene).toPickPrimitive(l);
      });
    });

    it("picks a primitive added with render order (0)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p1);
    });

    it("picks a primitive added with render order (1)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p1);
      primitives.add(p0);

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p0);
    });

    it("picks a primitive added with raise (0)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);
      primitives.raise(p1); // Already on top

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p1);
    });

    it("picks a primitive added with raise (1)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);
      primitives.raise(p0); // Moved to top

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p0);
    });

    it("picks a primitive added with raiseToTop (0)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);
      primitives.raiseToTop(p1); // Already on top

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p1);
    });

    it("picks a primitive added with raiseToTop (1)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);
      primitives.raiseToTop(p0); // Moved to top

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p0);
    });

    it("picks a primitive added with lower (0)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);
      primitives.lower(p1); // Moved back

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p0);
    });

    it("picks a primitive added with lower (1)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);
      primitives.lower(p0); // Already on bottom

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p1);
    });

    it("picks a primitive added with lowerToBottom (0)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);
      primitives.lowerToBottom(p1); // Moved back

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p0);
    });

    it("picks a primitive added with lowerToBottom (1)", function () {
      const p0 = createRectangle();
      const p1 = createRectangle();

      primitives.add(p0);
      primitives.add(p1);
      primitives.lowerToBottom(p0); // Already on bottom

      verifyPrimitivesRender(primitives);

      expect(scene).toPickPrimitive(p1);
    });

    it("is not destroyed when first constructed", function () {
      expect(primitives.isDestroyed()).toEqual(false);
    });

    it("is destroyed after calling destroy()", function () {
      primitives.destroy();
      expect(primitives.isDestroyed()).toEqual(true);
    });

    it("destroys its primitives", function () {
      const labels = new LabelCollection(context);

      primitives.add(labels);
      expect(labels.isDestroyed()).toEqual(false);

      primitives.destroy();
      expect(labels.isDestroyed()).toEqual(true);
    });

    it("destroys children", function () {
      const labels = new LabelCollection(context);

      const children = new PrimitiveCollection();
      children.add(labels);

      primitives.add(children);
      expect(children.isDestroyed()).toEqual(false);
      expect(labels.isDestroyed()).toEqual(false);

      primitives.destroy();
      expect(children.isDestroyed()).toEqual(true);
      expect(labels.isDestroyed()).toEqual(true);
    });

    it("destroys primitive on remove", function () {
      const labels = new LabelCollection(context);

      primitives.add(labels);
      expect(labels.isDestroyed()).toEqual(false);

      primitives.remove(labels);
      expect(labels.isDestroyed()).toEqual(true);
    });

    it("destroys primitive on removeAll", function () {
      const labels = new LabelCollection(context);

      primitives.add(labels);
      expect(labels.isDestroyed()).toEqual(false);

      primitives.removeAll();
      expect(labels.isDestroyed()).toEqual(true);
    });

    it("does not destroy its primitives", function () {
      const labels = new LabelCollection(context);

      primitives.destroyPrimitives = false;
      primitives.add(labels);
      expect(labels.isDestroyed()).toEqual(false);

      primitives.destroy();
      expect(labels.isDestroyed()).toEqual(false);

      labels.destroy();
      expect(labels.isDestroyed()).toEqual(true);
    });

    it("does not destroy primitive on remove", function () {
      const labels = new LabelCollection(context);

      primitives.destroyPrimitives = false;
      primitives.add(labels);
      expect(labels.isDestroyed()).toEqual(false);

      primitives.remove(labels);
      expect(labels.isDestroyed()).toEqual(false);

      labels.destroy();
      expect(labels.isDestroyed()).toEqual(true);
    });

    it("does not destroy primitive on removeAll", function () {
      const labels = new LabelCollection(context);

      primitives.destroyPrimitives = false;
      primitives.add(labels);
      expect(labels.isDestroyed()).toEqual(false);

      primitives.removeAll();
      expect(labels.isDestroyed()).toEqual(false);

      labels.destroy();
      expect(labels.isDestroyed()).toEqual(true);
    });

    it("throws when add() without an primitive", function () {
      expect(function () {
        primitives.add();
      }).toThrowDeveloperError();
    });

    it("raise throws when primitive is not in composite", function () {
      const p = createLabels();

      expect(function () {
        primitives.raise(p);
      }).toThrowDeveloperError();
    });

    it("raiseToTop throws when primitive is not in composite", function () {
      const p = createLabels();

      expect(function () {
        primitives.raiseToTop(p);
      }).toThrowDeveloperError();
    });

    it("lower throws when primitive is not in composite", function () {
      const p = createLabels();

      expect(function () {
        primitives.lower(p);
      }).toThrowDeveloperError();
    });

    it("lowerToBottom throws when primitive is not in composite", function () {
      const p = createLabels();

      expect(function () {
        primitives.lowerToBottom(p);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
