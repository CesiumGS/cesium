import { BoundingRectangle } from "../../Source/Cesium.js";
import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { NearFarScalar } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { BlendOption } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import { HeightReference } from "../../Source/Cesium.js";
import { HorizontalOrigin } from "../../Source/Cesium.js";
import { Label } from "../../Source/Cesium.js";
import { LabelCollection } from "../../Source/Cesium.js";
import { LabelStyle } from "../../Source/Cesium.js";
import { VerticalOrigin } from "../../Source/Cesium.js";
import createGlobe from "../createGlobe.js";
import createScene from "../createScene.js";

describe(
  "Scene/LabelCollection",
  function () {
    // TODO: rendering tests for pixel offset, eye offset, horizontal origin, vertical origin, font, style, outlineColor, outlineWidth, and fillColor properties

    let scene;
    let camera;
    let labels;
    let labelsWithHeight;

    // This Unicode square block will more reliably cover the center pixel than an 'x' or a 'w' char.
    const solidBox = "\u25a0";

    beforeAll(function () {
      scene = createScene();
      camera = scene.camera;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.morphTo3D(0);

      camera.position = new Cartesian3(10.0, 0.0, 0.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);

      labels = new LabelCollection();
      scene.primitives.add(labels);
    });

    afterEach(function () {
      // labels are destroyed by removeAll().
      scene.primitives.removeAll();
    });

    it("has default values when adding a label", function () {
      const label = labels.add();
      expect(label.show).toEqual(true);
      expect(label.position).toEqual(Cartesian3.ZERO);
      expect(label.text).toEqual("");
      expect(label.font).toEqual("30px sans-serif");
      expect(label.fillColor).toEqual(Color.WHITE);
      expect(label.outlineColor).toEqual(Color.BLACK);
      expect(label.outlineWidth).toEqual(1);
      expect(label.showBackground).toEqual(false);
      expect(label.backgroundColor).toEqual(
        new Color(0.165, 0.165, 0.165, 0.8)
      );
      expect(label.backgroundPadding).toEqual(new Cartesian2(7, 5));
      expect(label.style).toEqual(LabelStyle.FILL);
      expect(label.pixelOffset).toEqual(Cartesian2.ZERO);
      expect(label.eyeOffset).toEqual(Cartesian3.ZERO);
      expect(label.heightReference).toEqual(HeightReference.NONE);
      expect(label.horizontalOrigin).toEqual(HorizontalOrigin.LEFT);
      expect(label.verticalOrigin).toEqual(VerticalOrigin.BASELINE);
      expect(label.scale).toEqual(1.0);
      expect(label.id).toBeUndefined();
      expect(label.translucencyByDistance).toBeUndefined();
      expect(label.pixelOffsetScaleByDistance).toBeUndefined();
      expect(label.scaleByDistance).toBeUndefined();
      expect(label.distanceDisplayCondition).toBeUndefined();
      expect(label.disableDepthTestDistance).toBeUndefined();
    });

    it("can add a label with specified values", function () {
      const show = false;
      const position = new Cartesian3(1.0, 2.0, 3.0);
      const text = "abc";
      const font = '24px "Open Sans"';
      const fillColor = {
        red: 2.0,
        green: 3.0,
        blue: 4.0,
        alpha: 1.0,
      };
      const outlineColor = {
        red: 3.0,
        green: 4.0,
        blue: 2.0,
        alpha: 1.0,
      };
      const outlineWidth = 2;

      const style = LabelStyle.FILL_AND_OUTLINE;
      const pixelOffset = new Cartesian2(4.0, 5.0);
      const eyeOffset = new Cartesian3(6.0, 7.0, 8.0);
      const horizontalOrigin = HorizontalOrigin.LEFT;
      const verticalOrigin = VerticalOrigin.BOTTOM;
      const scale = 2.0;
      const showBackground = true;
      const backgroundColor = Color.BLUE;
      const backgroundPadding = new Cartesian2(11, 12);
      const translucency = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
      const pixelOffsetScale = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
      const scaleByDistance = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
      const distanceDisplayCondition = new DistanceDisplayCondition(
        10.0,
        100.0
      );
      const disableDepthTestDistance = 10.0;
      const label = labels.add({
        show: show,
        position: position,
        text: text,
        font: font,
        fillColor: fillColor,
        outlineColor: outlineColor,
        outlineWidth: outlineWidth,
        style: style,
        showBackground: showBackground,
        backgroundColor: backgroundColor,
        backgroundPadding: backgroundPadding,
        pixelOffset: pixelOffset,
        eyeOffset: eyeOffset,
        horizontalOrigin: horizontalOrigin,
        verticalOrigin: verticalOrigin,
        scale: scale,
        id: "id",
        translucencyByDistance: translucency,
        pixelOffsetScaleByDistance: pixelOffsetScale,
        scaleByDistance: scaleByDistance,
        distanceDisplayCondition: distanceDisplayCondition,
        disableDepthTestDistance: disableDepthTestDistance,
      });

      expect(label.show).toEqual(show);
      expect(label.position).toEqual(position);
      expect(label.text).toEqual(text);
      expect(label.font).toEqual(font);
      expect(label.fillColor).toEqual(fillColor);
      expect(label.outlineColor).toEqual(outlineColor);
      expect(label.outlineWidth).toEqual(outlineWidth);
      expect(label.style).toEqual(style);
      expect(label.showBackground).toEqual(showBackground);
      expect(label.backgroundColor).toEqual(backgroundColor);
      expect(label.backgroundPadding).toEqual(backgroundPadding);
      expect(label.pixelOffset).toEqual(pixelOffset);
      expect(label.eyeOffset).toEqual(eyeOffset);
      expect(label.horizontalOrigin).toEqual(horizontalOrigin);
      expect(label.verticalOrigin).toEqual(verticalOrigin);
      expect(label.scale).toEqual(scale);
      expect(label.id).toEqual("id");
      expect(label.translucencyByDistance).toEqual(translucency);
      expect(label.pixelOffsetScaleByDistance).toEqual(pixelOffsetScale);
      expect(label.scaleByDistance).toEqual(scaleByDistance);
      expect(label.distanceDisplayCondition).toEqual(distanceDisplayCondition);
      expect(label.disableDepthTestDistance).toEqual(disableDepthTestDistance);
    });

    it("can specify font using units other than pixels", function () {
      const label = labels.add({
        font: '12pt "Open Sans"',
        text: "Hello there",
      });
      scene.renderForSpecs();

      const dimensions = label._glyphs[0].dimensions;
      expect(dimensions.height).toBeGreaterThan(0);
    });

    it("has zero labels when constructed", function () {
      expect(labels.length).toEqual(0);
    });

    it("can add a label", function () {
      const label = labels.add();

      expect(labels.length).toEqual(1);
      expect(labels.get(0)).toBe(label);
    });

    it("can remove the first label", function () {
      const one = labels.add();
      const two = labels.add();

      expect(labels.contains(one)).toEqual(true);
      expect(labels.contains(two)).toEqual(true);

      expect(labels.remove(one)).toEqual(true);

      expect(labels.contains(one)).toEqual(false);
      expect(labels.contains(two)).toEqual(true);
    });

    it("can remove the last label", function () {
      const one = labels.add();
      const two = labels.add();

      expect(labels.contains(one)).toEqual(true);
      expect(labels.contains(two)).toEqual(true);

      expect(labels.remove(two)).toEqual(true);

      expect(labels.contains(one)).toEqual(true);
      expect(labels.contains(two)).toEqual(false);
    });

    it("returns false when removing undefined", function () {
      labels.add();
      expect(labels.length).toEqual(1);
      expect(labels.remove(undefined)).toEqual(false);
      expect(labels.length).toEqual(1);
    });

    it("returns false when removing a previously removed label", function () {
      const label = labels.add();
      expect(labels.length).toEqual(1);
      expect(labels.remove(label)).toEqual(true);
      expect(labels.remove(label)).toEqual(false);
      expect(labels.length).toEqual(0);
    });

    it("is not destroyed", function () {
      expect(labels.isDestroyed()).toEqual(false);
    });

    it("can add and remove multiple labels", function () {
      const one = labels.add();
      const two = labels.add();
      const three = labels.add();

      expect(labels.remove(one)).toEqual(true);
      expect(labels.remove(two)).toEqual(true);

      expect(one.isDestroyed()).toEqual(true);
      expect(two.isDestroyed()).toEqual(true);
      expect(three.isDestroyed()).toEqual(false);

      expect(labels.contains(one)).toEqual(false);
      expect(labels.contains(two)).toEqual(false);
      expect(labels.contains(three)).toEqual(true);

      expect(labels.length).toEqual(1);
      expect(labels.get(0)).toBe(three);

      const four = labels.add();
      expect(labels.length).toEqual(2);
      expect(labels.get(0)).toBe(three);
      expect(labels.get(1)).toBe(four);
      expect(labels.contains(three)).toEqual(true);
      expect(labels.contains(four)).toEqual(true);
    });

    it("can remove all labels", function () {
      labels.add({
        position: new Cartesian3(1.0, 2.0, 3.0),
      });
      labels.add({
        position: new Cartesian3(4.0, 5.0, 6.0),
      });
      expect(labels.length).toEqual(2);

      labels.removeAll();
      expect(labels.length).toEqual(0);
    });

    it("can check if it contains a label", function () {
      const label = labels.add();

      expect(labels.contains(label)).toEqual(true);
    });

    it("returns false when checking if it contains a label it does not contain", function () {
      const label = labels.add();
      labels.remove(label);

      expect(labels.contains(label)).toEqual(false);
    });

    it("does not contain undefined", function () {
      expect(labels.contains(undefined)).toEqual(false);
    });

    it("does not contain random other objects", function () {
      expect(labels.contains({})).toEqual(false);
      expect(labels.contains(new Cartesian2())).toEqual(false);
    });

    it("does not render when constructed", function () {
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("can render after modifying and removing a label", function () {
      const labelOne = labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });
      labels.add({
        position: Cartesian3.ZERO,
        text: "o",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      labelOne.scale = 2.0;
      labels.remove(labelOne);

      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("can render a label", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });
    });

    it("renders in multiple passes", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });
      camera.position = new Cartesian3(2.0, 0.0, 0.0);

      const frameState = scene.frameState;
      frameState.commandList.length = 0;
      labels.blendOption = BlendOption.OPAQUE_AND_TRANSLUCENT;
      labels.update(frameState);
      expect(frameState.commandList.length).toEqual(2);

      frameState.commandList.length = 0;
      labels.blendOption = BlendOption.OPAQUE;
      labels.update(frameState);
      expect(frameState.commandList.length).toEqual(1);

      frameState.commandList.length = 0;
      labels.blendOption = BlendOption.TRANSLUCENT;
      labels.update(frameState);
      expect(frameState.commandList.length).toEqual(1);
    });

    it("can render after adding a label", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(200);
        expect(rgba[1]).toBeGreaterThan(200);
        expect(rgba[2]).toBeGreaterThan(200);
      });

      labels.add({
        position: new Cartesian3(1.0, 0.0, 0.0), // Closer to camera
        text: solidBox,
        fillColor: {
          red: 1.0,
          green: 0.0,
          blue: 0.0,
          alpha: 1.0,
        },
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(200);
        expect(rgba[1]).toBeLessThan(10);
        expect(rgba[2]).toBeLessThan(10);
      });
    });

    it("can render after removing a label", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      labels.remove(label);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("can render after removing and adding a label", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      labels.remove(label);
      labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });
    });

    it("can render after removing all labels", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      labels.removeAll();
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("can render after removing all labels and adding a label", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      labels.removeAll();
      labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });
    });

    it("can render a label background", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: "_",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        showBackground: true,
        backgroundColor: Color.BLUE,
      });

      expect(scene).toRender([0, 0, 255, 255]);

      labels.remove(label);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render labels with show set to false", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      label.show = false;
      expect(scene).toRender([0, 0, 0, 255]);

      label.show = true;
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });
    });

    it("does not render label background with show set to false", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: "_",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        showBackground: true,
        backgroundColor: Color.BLUE,
      });

      expect(scene).toRender([0, 0, 255, 255]);

      label.show = false;
      expect(scene).toRender([0, 0, 0, 255]);

      label.show = true;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("does not render labels that are behind the viewer", function () {
      const label = labels.add({
        position: Cartesian3.ZERO, // in front of the camera
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      label.position = new Cartesian3(20.0, 0.0, 0.0); // Behind camera
      expect(scene).toRender([0, 0, 0, 255]);

      label.position = new Cartesian3(1.0, 0.0, 0.0); // Back in front of camera
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });
    });

    it("does not render labels with a scale of zero", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      label.scale = 0.0;
      expect(scene).toRender([0, 0, 0, 255]);

      label.scale = 2.0;
      scene.render();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });
    });

    it("renders label with translucencyByDistance", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: "x",
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        translucencyByDistance: new NearFarScalar(2.0, 1.0, 4.0, 0.0),
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      camera.position = new Cartesian3(4.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders label with pixelOffsetScaleByDistance", function () {
      labels.add({
        position: Cartesian3.ZERO,
        pixelOffset: new Cartesian2(1.0, 0.0),
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        pixelOffsetScaleByDistance: new NearFarScalar(2.0, 0.0, 4.0, 1000.0),
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(10);
      });

      camera.position = new Cartesian3(4.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders label with scaleByDistance", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        scaleByDistance: new NearFarScalar(2.0, 1.0, 4.0, 0.0),
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRender([255, 255, 255, 255]);

      camera.position = new Cartesian3(4.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("renders label with distanceDisplayCondition", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: solidBox,
        distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      camera.position = new Cartesian3(200.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);

      camera.position = new Cartesian3(50.0, 0.0, 0.0);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(200);
        expect(rgba[1]).toBeGreaterThan(200);
        expect(rgba[2]).toBeGreaterThan(200);
      });

      camera.position = new Cartesian3(5.0, 0.0, 0.0);
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("does not render label if show is false", function () {
      labels.add({
        position: Cartesian3.ZERO,
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        scaleByDistance: new NearFarScalar(2.0, 1.0, 4.0, 0.0),
      });

      camera.position = new Cartesian3(2.0, 0.0, 0.0);
      expect(scene).toRender([255, 255, 255, 255]);

      labels.show = false;
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("throws new label with invalid distanceDisplayCondition (near >= far)", function () {
      const dc = new DistanceDisplayCondition(100.0, 10.0);
      expect(function () {
        labels.add({
          distanceDisplayCondition: dc,
        });
      }).toThrowDeveloperError();
    });

    it("throws distanceDisplayCondition with near >= far", function () {
      const l = labels.add();
      const dc = new DistanceDisplayCondition(100.0, 10.0);
      expect(function () {
        l.distanceDisplayCondition = dc;
      }).toThrowDeveloperError();
    });

    it("renders with disableDepthTestDistance", function () {
      const l = labels.add({
        position: new Cartesian3(-1.0, 0.0, 0.0),
        text: solidBox,
        fillColor: Color.LIME,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });
      labels.add({
        position: Cartesian3.ZERO,
        text: solidBox,
        fillColor: Color.BLUE,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).toRender([0, 0, 255, 255]);

      l.disableDepthTestDistance = Number.POSITIVE_INFINITY;
      expect(scene).toRender([0, 255, 0, 255]);
    });

    it("throws with new label with disableDepthTestDistance less than 0.0", function () {
      expect(function () {
        labels.add({
          disableDepthTestDistance: -1.0,
        });
      }).toThrowDeveloperError();
    });

    it("throws with disableDepthTestDistance set less than 0.0", function () {
      const l = labels.add();
      expect(function () {
        l.disableDepthTestDistance = -1.0;
      }).toThrowDeveloperError();
    });

    it("can pick a label", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        id: "id",
      });

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(label);
        expect(result.id).toEqual("id");
      });
    });

    it("can change pick id", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
        id: "id",
      });

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(label);
        expect(result.id).toEqual("id");
      });

      label.id = "id2";

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(label);
        expect(result.id).toEqual("id2");
      });
    });

    it("does not pick a label with show set to false", function () {
      labels.add({
        show: false,
        position: Cartesian3.ZERO,
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      expect(scene).notToPick();
    });

    it("picks a label using translucencyByDistance", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      const translucency = new NearFarScalar(1.0, 0.9, 3.0e9, 0.8);
      label.translucencyByDistance = translucency;

      expect(scene).toPickPrimitive(label);

      translucency.nearValue = 0.0;
      translucency.farValue = 0.0;
      label.translucencyByDistance = translucency;

      expect(scene).notToPick();
    });

    it("picks a label using pixelOffsetScaleByDistance", function () {
      const label = labels.add({
        position: Cartesian3.ZERO,
        pixelOffset: new Cartesian2(0.0, 100.0),
        text: solidBox,
        horizontalOrigin: HorizontalOrigin.CENTER,
        verticalOrigin: VerticalOrigin.CENTER,
      });

      const pixelOffsetScale = new NearFarScalar(1.0, 0.0, 3.0e9, 0.0);
      label.pixelOffsetScaleByDistance = pixelOffsetScale;

      expect(scene).toPickPrimitive(label);

      pixelOffsetScale.nearValue = 10.0;
      pixelOffsetScale.farValue = 10.0;
      label.pixelOffsetScaleByDistance = pixelOffsetScale;

      expect(scene).notToPick();
    });

    it("throws when calling get without an index", function () {
      expect(function () {
        labels.get();
      }).toThrowDeveloperError();
    });

    it("should reuse canvases for letters, but only if other settings are the same", function () {
      labels.add({
        text: "a",
      });
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(1);

      labels.add({
        text: "a",
      });
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(1);

      labels.add({
        text: "abcd",
      });
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(4);

      labels.add({
        text: "abc",
      });
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(4);

      const label = labels.add({
        text: "de",
      });
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(5);

      const originalFont = label.font;
      label.font = '30px "Open Sans"';
      expect(label.font).not.toEqual(originalFont); // otherwise this test needs fixing.
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(7);

      // Changing the outline doesn't cause new glyphs to be generated.
      label.style = LabelStyle.OUTLINE;
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(7);

      // Changing fill color doesn't cause new glyphs to be generated.
      label.fillColor = new Color(1.0, 165.0 / 255.0, 0.0, 1.0);
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(7);

      // Changing outline color doesn't cause new glyphs to be generated.
      label.outlineColor = new Color(1.0, 1.0, 1.0, 1.0);
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(7);

      // vertical origin only affects glyph positions, not glyphs themselves.
      label.verticalOrigin = VerticalOrigin.CENTER;
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(7);
      label.verticalOrigin = VerticalOrigin.TOP;
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(7);

      //even though we're resetting to the original font, other properties used to create the id have changed
      label.font = originalFont;
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(9);

      //Changing thickness doesn't requires new glyphs
      label.outlineWidth = 3;
      scene.renderForSpecs();
      expect(Object.keys(labels._glyphTextureCache).length).toEqual(9);
    });

    it("should reuse billboards that are not needed any more", function () {
      const label = labels.add({
        text: "abc",
      });
      scene.renderForSpecs();
      expect(labels._billboardCollection.length).toEqual(3);
      expect(labels._spareBillboards.length).toEqual(0);

      label.text = "a";
      scene.renderForSpecs();
      expect(labels._billboardCollection.length).toEqual(3);
      expect(labels._spareBillboards.length).toEqual(2);

      label.text = "def";
      scene.renderForSpecs();
      expect(labels._billboardCollection.length).toEqual(3);
      expect(labels._spareBillboards.length).toEqual(0);
    });

    it("should not reuse background billboards that are not needed any more", function () {
      const label = labels.add({
        text: "abc",
        showBackground: true,
      });
      scene.renderForSpecs();
      expect(labels._backgroundBillboardCollection.length).toEqual(1);

      label.showBackground = false;
      scene.renderForSpecs();
      expect(labels._backgroundBillboardCollection.length).toEqual(0);

      label.showBackground = true;
      scene.renderForSpecs();
      expect(labels._backgroundBillboardCollection.length).toEqual(1);
    });

    describe(
      "Label",
      function () {
        it("can set properties after being added", function () {
          const label = labels.add();

          const show = false;
          const position = new Cartesian3(1.0, 2.0, 3.0);
          const text = "abc";
          const font = '24px "Open Sans"';
          const fillColor = {
            red: 2.0,
            green: 3.0,
            blue: 4.0,
            alpha: 1.0,
          };
          const outlineColor = {
            red: 3.0,
            green: 4.0,
            blue: 2.0,
            alpha: 1.0,
          };
          const outlineWidth = 2;
          const style = LabelStyle.FILL_AND_OUTLINE;
          const pixelOffset = new Cartesian2(4.0, 5.0);
          const eyeOffset = new Cartesian3(6.0, 7.0, 8.0);
          const horizontalOrigin = HorizontalOrigin.LEFT;
          const verticalOrigin = VerticalOrigin.BOTTOM;
          const scale = 2.0;
          const translucency = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
          const pixelOffsetScale = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
          const scaleByDistance = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);

          label.show = show;
          label.position = position;
          label.text = text;
          label.font = font;
          label.fillColor = fillColor;
          label.outlineColor = outlineColor;
          label.outlineWidth = outlineWidth;
          label.style = style;
          label.pixelOffset = pixelOffset;
          label.eyeOffset = eyeOffset;
          label.horizontalOrigin = horizontalOrigin;
          label.verticalOrigin = verticalOrigin;
          label.scale = scale;
          label.translucencyByDistance = translucency;
          label.pixelOffsetScaleByDistance = pixelOffsetScale;
          label.scaleByDistance = scaleByDistance;

          expect(label.show).toEqual(show);
          expect(label.position).toEqual(position);
          expect(label.text).toEqual(text);
          expect(label.font).toEqual(font);
          expect(label.fillColor).toEqual(fillColor);
          expect(label.outlineColor).toEqual(outlineColor);
          expect(label.outlineWidth).toEqual(outlineWidth);
          expect(label.style).toEqual(style);
          expect(label.pixelOffset).toEqual(pixelOffset);
          expect(label.eyeOffset).toEqual(eyeOffset);
          expect(label.horizontalOrigin).toEqual(horizontalOrigin);
          expect(label.verticalOrigin).toEqual(verticalOrigin);
          expect(label.scale).toEqual(scale);
          expect(label.translucencyByDistance).toEqual(translucency);
          expect(label.pixelOffsetScaleByDistance).toEqual(pixelOffsetScale);
          expect(label.scaleByDistance).toEqual(scaleByDistance);
        });

        it("is destroyed after being removed", function () {
          const label = labels.add();

          expect(label.isDestroyed()).toEqual(false);

          labels.remove(label);

          expect(label.isDestroyed()).toEqual(true);
        });

        it("throws after being removed", function () {
          const label = labels.add();
          labels.remove(label);
          expect(function () {
            label.equals(label);
          }).toThrowDeveloperError();
        });

        it("can compute screen space position", function () {
          labels.clampToPixel = false;
          const label = labels.add({
            text: "abc",
            position: Cartesian3.ZERO,
          });
          scene.renderForSpecs();
          expect(label.computeScreenSpacePosition(scene)).toEqualEpsilon(
            new Cartesian2(0.5, 0.5),
            CesiumMath.EPSILON1
          );
        });

        it("stores screen space position in a result", function () {
          labels.clampToPixel = false;
          const label = labels.add({
            text: "abc",
            position: Cartesian3.ZERO,
          });
          const result = new Cartesian2();
          scene.renderForSpecs();
          const actual = label.computeScreenSpacePosition(scene, result);
          expect(actual).toEqual(result);
          expect(result).toEqualEpsilon(
            new Cartesian2(0.5, 0.5),
            CesiumMath.EPSILON1
          );
        });

        it("can compute screen space position with pixelOffset", function () {
          labels.clampToPixel = false;
          const label = labels.add({
            text: "abc",
            position: Cartesian3.ZERO,
            pixelOffset: new Cartesian2(0.5, 0.5),
          });
          scene.renderForSpecs();
          expect(label.computeScreenSpacePosition(scene)).toEqualEpsilon(
            new Cartesian2(1.0, 1.0),
            CesiumMath.EPSILON1
          );
        });

        it("can compute screen space position with eyeOffset", function () {
          labels.clampToPixel = false;
          const label = labels.add({
            text: "abc",
            position: Cartesian3.ZERO,
            eyeOffset: new Cartesian3(1.0, 1.0, 0.0),
          });
          scene.renderForSpecs();
          expect(label.computeScreenSpacePosition(scene)).toEqualEpsilon(
            new Cartesian2(0.5, 0.5),
            CesiumMath.EPSILON1
          );
        });

        it("computes screen space bounding box", function () {
          const scale = 1.5;

          const label = labels.add({
            text: "abc",
            scale: scale,
          });
          scene.renderForSpecs();

          const bbox = Label.getScreenSpaceBoundingBox(label, Cartesian2.ZERO);
          expect(bbox.x).toBeDefined();
          expect(bbox.y).toBeDefined();
          expect(bbox.width).toBeGreaterThan(30);
          expect(bbox.width).toBeLessThan(200);
          expect(bbox.height).toBeGreaterThan(10);
          expect(bbox.height).toBeLessThan(50);
        });

        it("computes screen space bounding box with result", function () {
          const scale = 1.5;

          const label = labels.add({
            text: "abc",
            scale: scale,
          });
          scene.renderForSpecs();

          const result = new BoundingRectangle();
          const bbox = Label.getScreenSpaceBoundingBox(
            label,
            Cartesian2.ZERO,
            result
          );
          expect(bbox.x).toBeDefined();
          expect(bbox.y).toBeDefined();
          expect(bbox.width).toBeGreaterThan(30);
          expect(bbox.width).toBeLessThan(200);
          expect(bbox.height).toBeGreaterThan(10);
          expect(bbox.height).toBeLessThan(50);
          expect(bbox).toBe(result);
        });

        it("computes screen space bounding box with vertical origin center", function () {
          const scale = 1.5;

          const label = labels.add({
            text: "abc",
            scale: scale,
            verticalOrigin: VerticalOrigin.CENTER,
          });
          scene.renderForSpecs();

          const bbox = Label.getScreenSpaceBoundingBox(label, Cartesian2.ZERO);
          expect(bbox.y).toBeGreaterThan(bbox.height * -0.9);
          expect(bbox.y).toBeLessThan(bbox.height * -0.3);
        });

        it("computes screen space bounding box with vertical origin top", function () {
          const scale = 1.5;

          const label = labels.add({
            text: "abc",
            scale: scale,
            verticalOrigin: VerticalOrigin.TOP,
          });
          scene.renderForSpecs();

          const bbox = Label.getScreenSpaceBoundingBox(label, Cartesian2.ZERO);
          expect(bbox.y).toBeLessThan(5);
          expect(bbox.y).toBeGreaterThan(-5);
        });

        it("computes screen space bounding box with vertical origin baseline", function () {
          const scale = 1.5;

          const label = labels.add({
            text: "abc",
            scale: scale,
            verticalOrigin: VerticalOrigin.BASELINE,
          });
          scene.renderForSpecs();

          const bbox = Label.getScreenSpaceBoundingBox(label, Cartesian2.ZERO);
          expect(bbox.y).toBeLessThan(bbox.height * -0.8);
          expect(bbox.y).toBeGreaterThan(bbox.height * -1.2);
        });

        it("computes screen space bounding box with horizontal origin", function () {
          const scale = 1.5;

          const label = labels.add({
            text: "abc",
            scale: scale,
            horizontalOrigin: HorizontalOrigin.CENTER,
          });
          scene.renderForSpecs();

          let bbox = Label.getScreenSpaceBoundingBox(label, Cartesian2.ZERO);
          expect(bbox.x).toBeLessThan(bbox.width * -0.3);
          expect(bbox.x).toBeGreaterThan(bbox.width * -0.7);

          label.horizontalOrigin = HorizontalOrigin.RIGHT;
          scene.renderForSpecs();
          bbox = Label.getScreenSpaceBoundingBox(label, Cartesian2.ZERO);
          expect(bbox.x).toBeLessThan(bbox.width * -0.8);
          expect(bbox.x).toBeGreaterThan(bbox.width * -1.2);
        });

        it("computes screen space bounding box with padded background", function () {
          const scale = 1.5;

          const label = labels.add({
            text: "abc",
            scale: scale,
            showBackground: true,
            backgroundPadding: new Cartesian2(15, 10),
          });
          scene.renderForSpecs();

          const totalScale = label.scale * label._relativeSize;

          const backgroundBillboard = label._backgroundBillboard;
          const width = backgroundBillboard.width * totalScale;
          const height = backgroundBillboard.height * totalScale;
          const x = backgroundBillboard._translate.x;
          let y = -(backgroundBillboard._translate.y + height);

          let bbox = Label.getScreenSpaceBoundingBox(label, Cartesian2.ZERO);
          expect(bbox.x).toEqual(x);
          expect(bbox.y).toEqual(y);
          expect(bbox.width).toEqual(width);
          expect(bbox.height).toEqual(height);

          label.verticalOrigin = VerticalOrigin.CENTER;
          scene.renderForSpecs();
          y = -(backgroundBillboard._translate.y + height * 0.5);

          bbox = Label.getScreenSpaceBoundingBox(label, Cartesian2.ZERO);
          expect(bbox.x).toEqual(x);
          expect(bbox.y).toEqual(y);
          expect(bbox.width).toEqual(width);
          expect(bbox.height).toEqual(height);
        });

        it("can equal another label", function () {
          const label = labels.add({
            position: new Cartesian3(1.0, 2.0, 3.0),
            text: "equals",
          });
          const otherLabel = labels.add({
            position: new Cartesian3(1.0, 2.0, 3.0),
            text: "equals",
          });

          // This tests the `LabelCollection.equals` function itself, not simple equality.
          expect(label.equals(otherLabel)).toEqual(true);
        });

        it("can differ from another label", function () {
          const label = labels.add({
            position: new Cartesian3(1.0, 2.0, 3.0),
          });
          const otherLabel = labels.add({
            position: new Cartesian3(4.0, 5.0, 6.0),
          });

          // This tests the `LabelCollection.equals` function itself, not simple equality.
          expect(label.equals(otherLabel)).toEqual(false);
        });

        it("does not equal undefined", function () {
          // This tests the `LabelCollection.equals` function itself, not simple equality.
          const label = labels.add();
          expect(label.equals(undefined)).toEqual(false);
        });

        it("should have a number of glyphs equal to the number of characters", function () {
          let label = labels.add({
            text: "abc",
          });
          scene.renderForSpecs();
          expect(label._glyphs.length).toEqual(3);

          label.text = "abcd";
          scene.renderForSpecs();
          expect(label._glyphs.length).toEqual(4);

          label.text = "";
          scene.renderForSpecs();
          expect(label._glyphs.length).toEqual(0);

          label = labels.add();
          scene.renderForSpecs();
          expect(label._glyphs.length).toEqual(0);
        });

        it("does not create billboards for spaces", function () {
          const label = labels.add({
            text: "abc",
          });
          scene.renderForSpecs();
          expect(label._glyphs.length).toEqual(3);
          expect(labels._billboardCollection.length).toEqual(3);

          label.text = " ab c";
          scene.renderForSpecs();
          expect(label._glyphs.length).toEqual(5);
          expect(labels._billboardCollection.length).toEqual(3);
        });

        function getGlyphBillboardVertexTranslate(label, index) {
          return Cartesian2.clone(
            label._glyphs[index].billboard._translate,
            new Cartesian2()
          );
        }

        function getBackgroundBillboardVertexTranslate(label) {
          return Cartesian2.clone(
            label._backgroundBillboard._translate,
            new Cartesian2()
          );
        }

        it("sets billboard properties properly when they change on the label", function () {
          const position1 = new Cartesian3(1.0, 2.0, 3.0);
          const position2 = new Cartesian3(4.0, 5.0, 6.0);
          const pixelOffset1 = new Cartesian2(4.0, 5.0);
          const pixelOffset2 = new Cartesian2(6.0, 7.0);
          const eyeOffset1 = new Cartesian3(6.0, 7.0, 8.0);
          const eyeOffset2 = new Cartesian3(16.0, 17.0, 18.0);
          const verticalOrigin1 = VerticalOrigin.TOP;
          const verticalOrigin2 = VerticalOrigin.BASELINE;
          const scale1 = 2.0;
          const scale2 = 3.0;
          const id1 = "id1";
          const id2 = "id2";
          const translucency1 = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
          const translucency2 = new NearFarScalar(1.1e4, 1.2, 1.3e6, 4.0);
          const pixelOffsetScale1 = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
          const pixelOffsetScale2 = new NearFarScalar(1.5e4, 1.6, 1.7e6, 8.0);
          const scaleByDistance1 = new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0);
          const scaleByDistance2 = new NearFarScalar(1.5e4, 1.6, 1.7e6, 8.0);

          const label = labels.add({
            position: position1,
            text: "abc",
            pixelOffset: pixelOffset1,
            eyeOffset: eyeOffset1,
            verticalOrigin: verticalOrigin1,
            scale: scale1,
            id: id1,
            translucencyByDistance: translucency1,
            pixelOffsetScaleByDistance: pixelOffsetScale1,
            scaleByDistance: scaleByDistance1,
            showBackground: true,
          });

          scene.renderForSpecs();

          label.position = position2;
          label.text = "def";
          label.pixelOffset = pixelOffset2;
          label.eyeOffset = eyeOffset2;
          label.verticalOrigin = verticalOrigin2;
          label.scale = scale2;
          label.id = id2;
          label.translucencyByDistance = translucency2;
          label.pixelOffsetScaleByDistance = pixelOffsetScale2;
          label.scaleByDistance = scaleByDistance2;

          scene.renderForSpecs();

          for (let i = 0; i < label._glyphs.length; ++i) {
            const glyph = label._glyphs[i];
            const billboard = glyph.billboard;
            expect(billboard.show).toEqual(label.show);
            expect(billboard.position).toEqual(label.position);
            expect(billboard.eyeOffset).toEqual(label.eyeOffset);
            expect(billboard.pixelOffset).toEqual(label.pixelOffset);
            expect(billboard.verticalOrigin).toEqual(label.verticalOrigin);
            // glyph horizontal origin is always LEFT
            expect(billboard.scale).toEqual(label.scale * label._relativeSize);
            expect(billboard.id).toEqual(label.id);
            expect(billboard.translucencyByDistance).toEqual(
              label.translucencyByDistance
            );
            expect(billboard.pixelOffsetScaleByDistance).toEqual(
              label.pixelOffsetScaleByDistance
            );
            expect(billboard.scaleByDistance).toEqual(label.scaleByDistance);

            expect(billboard.pickPrimitive).toEqual(label);
          }
        });

        describe("sets individual billboard properties properly when they change on the label", function () {
          let label;
          beforeEach(function () {
            label = labels.add({
              position: new Cartesian3(1.0, 2.0, 3.0),
              text: "abc",
              pixelOffset: new Cartesian2(4.0, 5.0),
              eyeOffset: new Cartesian3(6.0, 7.0, 8.0),
              verticalOrigin: VerticalOrigin.TOP,
              scale: 2.0,
              id: "id1",
              translucencyByDistance: new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0),
              pixelOffsetScaleByDistance: new NearFarScalar(
                1.0e4,
                1.0,
                1.0e6,
                0.0
              ),
              scaleByDistance: new NearFarScalar(1.0e4, 1.0, 1.0e6, 0.0),
              showBackground: true,
            });
            scene.renderForSpecs();
          });

          function getGlyphBillboards() {
            return label._glyphs.map(function (glyph) {
              return glyph.billboard;
            });
          }

          it("position", function () {
            const newValue = new Cartesian3(4.0, 5.0, 6.0);
            expect(label.position).not.toEqual(newValue);
            label.position = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.position).toEqual(label.position);
            });
          });

          it("eyeOffset", function () {
            const newValue = new Cartesian3(16.0, 17.0, 18.0);
            expect(label.eyeOffset).not.toEqual(newValue);
            label.eyeOffset = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.eyeOffset).toEqual(label.eyeOffset);
            });
          });

          it("pixelOffset", function () {
            const newValue = new Cartesian3(16.0, 17.0, 18.0);
            expect(label.pixelOffset).not.toEqual(newValue);
            label.pixelOffset = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.pixelOffset).toEqual(label.pixelOffset);
            });
          });

          it("verticalOrigin", function () {
            const newValue = VerticalOrigin.BOTTOM;
            expect(label.verticalOrigin).not.toEqual(newValue);
            label.verticalOrigin = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.verticalOrigin).toEqual(label.verticalOrigin);
            });
          });

          // glyph horizontal origin is always LEFT

          it("scale", function () {
            const newValue = 3.0;
            expect(label.scale).not.toEqual(newValue);
            label.scale = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.scale).toEqual(label.totalScale);
            });
          });

          it("showBackground", function () {
            expect(label.showBackground).toEqual(true);
            label.showBackground = false;
            expect(label.showBackground).toEqual(false);
          });

          it("backgroundColor", function () {
            const newValue = Color.RED;
            expect(label.backgroundColor).not.toEqual(newValue);
            label.backgroundColor = newValue;
            expect(label.backgroundColor).toEqual(newValue);
          });

          it("backgroundPadding", function () {
            const newValue = new Cartesian2(8, 5);
            expect(label.backgroundPadding).not.toEqual(newValue);
            label.backgroundPadding = newValue;
            expect(label.backgroundPadding).toEqual(newValue);
          });

          it("id", function () {
            const newValue = "id2";
            expect(label.id).not.toEqual(newValue);
            label.id = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.id).toEqual(label.id);
            });
          });

          it("translucencyByDistance", function () {
            const newValue = new NearFarScalar(1.1e4, 1.2, 1.3e6, 4.0);
            expect(label.translucencyByDistance).not.toEqual(newValue);
            label.translucencyByDistance = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.translucencyByDistance).toEqual(
                label.translucencyByDistance
              );
            });
          });

          it("pixelOffsetScaleByDistance", function () {
            const newValue = new NearFarScalar(1.5e4, 1.6, 1.7e6, 8.0);
            expect(label.pixelOffsetScaleByDistance).not.toEqual(newValue);
            label.pixelOffsetScaleByDistance = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.pixelOffsetScaleByDistance).toEqual(
                label.pixelOffsetScaleByDistance
              );
            });
          });

          it("scaleByDistance", function () {
            const newValue = new NearFarScalar(1.5e4, 1.6, 1.7e6, 8.0);
            expect(label.scaleByDistance).not.toEqual(newValue);
            label.scaleByDistance = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.scaleByDistance).toEqual(label.scaleByDistance);
            });
          });

          it("translucencyByDistance to undefined", function () {
            let newValue;
            expect(label.translucencyByDistance).not.toEqual(newValue);
            label.translucencyByDistance = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.translucencyByDistance).toEqual(
                label.translucencyByDistance
              );
            });
          });

          it("pixelOffsetScaleByDistance to undefined", function () {
            let newValue;
            expect(label.pixelOffsetScaleByDistance).not.toEqual(newValue);
            label.pixelOffsetScaleByDistance = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.pixelOffsetScaleByDistance).toEqual(
                label.pixelOffsetScaleByDistance
              );
            });
          });

          it("scaleByDistance to undefined", function () {
            let newValue;
            expect(label.scaleByDistance).not.toEqual(newValue);
            label.scaleByDistance = newValue;
            scene.renderForSpecs();

            getGlyphBillboards().forEach(function (billboard) {
              expect(billboard.scaleByDistance).toEqual(label.scaleByDistance);
            });
          });

          it("clusterShow", function () {
            expect(label.clusterShow).toEqual(true);
            label.clusterShow = false;
            expect(label.clusterShow).toEqual(false);
          });
        });

        it("should set vertexTranslate of billboards correctly when vertical origin is changed", function () {
          const label = labels.add({
            text: "apl",
            font: '90px "Open Sans"',
            verticalOrigin: VerticalOrigin.CENTER,
          });
          scene.renderForSpecs();

          // store the offsets when vertically centered
          const offset0 = getGlyphBillboardVertexTranslate(label, 0);
          const offset1 = getGlyphBillboardVertexTranslate(label, 1);
          const offset2 = getGlyphBillboardVertexTranslate(label, 2);

          label.verticalOrigin = VerticalOrigin.TOP;
          scene.renderForSpecs();

          // Because changing the label's vertical origin also changes the vertical origin of each
          // individual glyph, it is not safe to assume anything about Y offsets being more or less.

          // X offset should be unchanged
          expect(getGlyphBillboardVertexTranslate(label, 0).x).toEqual(
            offset0.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).x).toEqual(
            offset1.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).x).toEqual(
            offset2.x
          );

          label.verticalOrigin = VerticalOrigin.BOTTOM;
          scene.renderForSpecs();

          // X offset should be unchanged
          expect(getGlyphBillboardVertexTranslate(label, 0).x).toEqual(
            offset0.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).x).toEqual(
            offset1.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).x).toEqual(
            offset2.x
          );
        });

        it("should set vertexTranslate of billboards correctly when horizontal origin is changed", function () {
          const label = labels.add({
            text: "apl",
            font: '90px "Open Sans"',
            horizontalOrigin: HorizontalOrigin.CENTER,
            showBackground: true,
          });
          scene.renderForSpecs();

          // store the offsets when horizontally centered
          const offset0 = getGlyphBillboardVertexTranslate(label, 0);
          const offset1 = getGlyphBillboardVertexTranslate(label, 1);
          const offset2 = getGlyphBillboardVertexTranslate(label, 2);
          const offsetBack = getBackgroundBillboardVertexTranslate(label);

          label.horizontalOrigin = HorizontalOrigin.LEFT;
          scene.renderForSpecs();

          // horizontal origin LEFT should increase X offset compared to CENTER
          expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeGreaterThan(
            offset0.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeGreaterThan(
            offset1.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeGreaterThan(
            offset2.x
          );
          expect(
            getBackgroundBillboardVertexTranslate(label).x
          ).toBeGreaterThan(offsetBack.x);

          // Y offset should be unchanged
          expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(
            offset0.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(
            offset1.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(
            offset2.y
          );
          expect(getBackgroundBillboardVertexTranslate(label).y).toEqual(
            offsetBack.y
          );

          label.horizontalOrigin = HorizontalOrigin.RIGHT;
          scene.renderForSpecs();

          // horizontal origin RIGHT should decrease X offset compared to CENTER
          expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeLessThan(
            offset0.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeLessThan(
            offset1.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeLessThan(
            offset2.x
          );
          expect(getBackgroundBillboardVertexTranslate(label).x).toBeLessThan(
            offsetBack.x
          );

          // Y offset should be unchanged
          expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(
            offset0.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(
            offset1.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(
            offset2.y
          );
          expect(getBackgroundBillboardVertexTranslate(label).y).toEqual(
            offsetBack.y
          );
        });

        it("should set vertexTranslate of billboards correctly when scale is changed", function () {
          const label = labels.add({
            text: "apl",
            font: '90px "Open Sans"',
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
          });
          scene.renderForSpecs();

          // store the offsets when vertically centered at scale 1
          let offset0 = getGlyphBillboardVertexTranslate(label, 0);
          let offset1 = getGlyphBillboardVertexTranslate(label, 1);
          let offset2 = getGlyphBillboardVertexTranslate(label, 2);

          label.scale = 2;
          scene.renderForSpecs();

          // scaling by 2 should double X and Y offset
          expect(getGlyphBillboardVertexTranslate(label, 0).x).toEqual(
            2 * offset0.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(
            2 * offset0.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).x).toEqual(
            2 * offset1.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(
            2 * offset1.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).x).toEqual(
            2 * offset2.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(
            2 * offset2.y
          );

          // store the offsets when vertically centered at scale 2
          offset0 = getGlyphBillboardVertexTranslate(label, 0);
          offset1 = getGlyphBillboardVertexTranslate(label, 1);
          offset2 = getGlyphBillboardVertexTranslate(label, 2);

          // Because changing the label's vertical origin also changes the vertical origin of each
          // individual glyph, it is not safe to assume anything about Y offsets being more or less.

          label.horizontalOrigin = HorizontalOrigin.LEFT;
          scene.renderForSpecs();

          // horizontal origin LEFT should increase X offset compared to CENTER
          expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeGreaterThan(
            offset0.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeGreaterThan(
            offset1.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeGreaterThan(
            offset2.x
          );

          // Y offset should be unchanged
          expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(
            offset0.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(
            offset1.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(
            offset2.y
          );

          label.horizontalOrigin = HorizontalOrigin.RIGHT;
          scene.renderForSpecs();

          // horizontal origin RIGHT should decrease X offset compared to CENTER
          expect(getGlyphBillboardVertexTranslate(label, 0).x).toBeLessThan(
            offset0.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).x).toBeLessThan(
            offset1.x
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).x).toBeLessThan(
            offset2.x
          );

          // Y offset should be unchanged
          expect(getGlyphBillboardVertexTranslate(label, 0).y).toEqual(
            offset0.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 1).y).toEqual(
            offset1.y
          );
          expect(getGlyphBillboardVertexTranslate(label, 2).y).toEqual(
            offset2.y
          );
        });

        it("label vertex translate should remain the same when pixel offset is changed", function () {
          const label = labels.add({
            text: "apl",
            font: '90px "Open Sans"',
          });
          scene.renderForSpecs();

          const offset0 = getGlyphBillboardVertexTranslate(label, 0);
          const offset1 = getGlyphBillboardVertexTranslate(label, 1);
          const offset2 = getGlyphBillboardVertexTranslate(label, 2);

          const xOffset = 20;
          const yOffset = -10;
          label.pixelOffset = new Cartesian2(xOffset, yOffset);
          scene.renderForSpecs();

          expect(getGlyphBillboardVertexTranslate(label, 0)).toEqual(offset0);
          expect(getGlyphBillboardVertexTranslate(label, 1)).toEqual(offset1);
          expect(getGlyphBillboardVertexTranslate(label, 2)).toEqual(offset2);

          expect(label.pixelOffset.x).toEqual(xOffset);
          expect(label.pixelOffset.y).toEqual(yOffset);
        });

        it("Correctly updates billboard position when height reference changes", function () {
          scene.globe = new Globe();
          const labelsWithScene = new LabelCollection({ scene: scene });
          scene.primitives.add(labelsWithScene);

          const position1 = new Cartesian3(1.0, 2.0, 3.0);
          const label = labelsWithScene.add({
            position: position1,
            text: "abc",
            heightReference: HeightReference.CLAMP_TO_GROUND,
          });

          scene.renderForSpecs();
          const glyph = label._glyphs[0];
          const billboard = glyph.billboard;
          expect(billboard.position).toEqual(label.position);

          label.heightReference = HeightReference.NONE;
          scene.renderForSpecs();

          expect(billboard.position).toEqual(label.position);
          scene.primitives.remove(labelsWithScene);
        });

        it("should set vertexTranslate of billboards correctly when font size changes", function () {
          const label = labels.add({
            text: "apl",
            font: '80px "Open Sans"',
            verticalOrigin: VerticalOrigin.TOP,
            horizontalOrigin: HorizontalOrigin.LEFT,
          });
          scene.renderForSpecs();

          const offset0 = getGlyphBillboardVertexTranslate(label, 0);
          const offset1 = getGlyphBillboardVertexTranslate(label, 1);
          const offset2 = getGlyphBillboardVertexTranslate(label, 2);

          label.font = '20px "Open Sans"';
          scene.renderForSpecs();

          // reducing font size should reduce absolute value of both X and Y offset

          expect(
            Math.abs(getGlyphBillboardVertexTranslate(label, 0).x)
          ).toBeLessThanOrEqualTo(Math.abs(offset0.x));
          expect(
            Math.abs(getGlyphBillboardVertexTranslate(label, 0).y)
          ).toBeLessThanOrEqualTo(Math.abs(offset0.y));
          expect(
            Math.abs(getGlyphBillboardVertexTranslate(label, 1).x)
          ).toBeLessThanOrEqualTo(Math.abs(offset1.x));
          expect(
            Math.abs(getGlyphBillboardVertexTranslate(label, 1).y)
          ).toBeLessThanOrEqualTo(Math.abs(offset1.y));
          expect(
            Math.abs(getGlyphBillboardVertexTranslate(label, 2).x)
          ).toBeLessThanOrEqualTo(Math.abs(offset2.x));
          expect(
            Math.abs(getGlyphBillboardVertexTranslate(label, 2).y)
          ).toBeLessThanOrEqualTo(Math.abs(offset2.y));
        });

        it("should have the same vertexTranslate of billboards whether values are set at construction or afterwards", function () {
          const text = "apl";
          const scale = 2.0;
          const font = '20px "Open Sans"';
          const verticalOrigin = VerticalOrigin.CENTER;
          const pixelOffset = new Cartesian2(10.0, 15.0);

          const one = labels.add({
            text: text,
            scale: scale,
            font: font,
            verticalOrigin: verticalOrigin,
            pixelOffset: pixelOffset,
          });
          scene.renderForSpecs();

          const two = labels.add();
          two.text = text;
          two.scale = scale;
          two.font = font;
          two.verticalOrigin = verticalOrigin;
          two.pixelOffset = pixelOffset;

          scene.renderForSpecs();

          expect(getGlyphBillboardVertexTranslate(one, 0)).toEqual(
            getGlyphBillboardVertexTranslate(two, 0)
          );
          expect(getGlyphBillboardVertexTranslate(one, 1)).toEqual(
            getGlyphBillboardVertexTranslate(two, 1)
          );
          expect(getGlyphBillboardVertexTranslate(one, 2)).toEqual(
            getGlyphBillboardVertexTranslate(two, 2)
          );
        });

        it("should not change vertexTranslate of billboards when position changes", function () {
          const label = labels.add({
            text: "apl",
          });
          scene.renderForSpecs();

          const offset0 = getGlyphBillboardVertexTranslate(label, 0);
          const offset1 = getGlyphBillboardVertexTranslate(label, 1);
          const offset2 = getGlyphBillboardVertexTranslate(label, 2);

          label.position = new Cartesian3(1.0, 1.0, 1.0);
          scene.renderForSpecs();

          expect(getGlyphBillboardVertexTranslate(label, 0)).toEqual(offset0);
          expect(getGlyphBillboardVertexTranslate(label, 1)).toEqual(offset1);
          expect(getGlyphBillboardVertexTranslate(label, 2)).toEqual(offset2);
        });

        it("should not change vertexTranslate of billboards when eye offset changes", function () {
          const label = labels.add({
            text: "apl",
          });
          scene.renderForSpecs();

          const offset0 = getGlyphBillboardVertexTranslate(label, 0);
          const offset1 = getGlyphBillboardVertexTranslate(label, 1);
          const offset2 = getGlyphBillboardVertexTranslate(label, 2);

          label.eyeOffset = new Cartesian3(10.0, 10.0, -10.0);
          scene.renderForSpecs();

          expect(getGlyphBillboardVertexTranslate(label, 0)).toEqual(offset0);
          expect(getGlyphBillboardVertexTranslate(label, 1)).toEqual(offset1);
          expect(getGlyphBillboardVertexTranslate(label, 2)).toEqual(offset2);
        });

        it("should not change label dimensions when scale changes", function () {
          const label = labels.add({
            text: "apl",
          });
          scene.renderForSpecs();

          const originalDimensions = label._glyphs[0].dimensions;

          label.scale = 3;
          scene.renderForSpecs();

          const dimensions = label._glyphs[0].dimensions;
          expect(dimensions.width).toEqual(originalDimensions.width);
          expect(dimensions.height).toEqual(originalDimensions.height);
          expect(dimensions.descent).toEqual(originalDimensions.descent);
        });

        it("should not change label dimensions when font size changes", function () {
          const label = labels.add({
            text: "apl",
            font: '90px "Open Sans"',
          });
          scene.renderForSpecs();

          const originalDimensions = label._glyphs[0].dimensions;

          label.font = '20px "Open Sans"';
          scene.renderForSpecs();

          const dimensions = label._glyphs[0].dimensions;
          expect(dimensions.width).toEqual(originalDimensions.width);
          expect(dimensions.height).toEqual(originalDimensions.height);
          expect(dimensions.descent).toEqual(originalDimensions.descent);
        });

        it("should increase label height and decrease width when adding newlines", function () {
          const label = labels.add({
            text: "apl apl apl",
          });
          scene.renderForSpecs();

          const originalBbox = Label.getScreenSpaceBoundingBox(
            label,
            Cartesian2.ZERO
          );

          label.text = "apl\napl\napl";
          scene.renderForSpecs();
          const newlinesBbox = Label.getScreenSpaceBoundingBox(
            label,
            Cartesian2.ZERO
          );

          expect(newlinesBbox.width).toBeLessThan(originalBbox.width);
          expect(newlinesBbox.height).toBeGreaterThan(originalBbox.height);
        });

        it("should not modify text when rightToLeft is false", function () {
          const text = "bla bla bla";
          const label = labels.add({
            text: text,
          });
          scene.renderForSpecs();

          expect(label.text).toEqual(text);
        });

        it("filters out soft hyphens from input strings", function () {
          const softHyphen = String.fromCharCode(0xad);
          const text = `test string${softHyphen}`;
          const label = labels.add({
            text: text,
          });
          scene.renderForSpecs();

          expect(label.text).toEqual(text);
          expect(label._renderedText).toEqual("test string");
        });
      },
      "WebGL"
    );

    describe("right to left detection", function () {
      beforeAll(function () {
        Label.enableRightToLeftDetection = true;
      });

      afterAll(function () {
        Label.enableRightToLeftDetection = false;
      });

      it("should not modify text when rightToLeft is true and there are no RTL characters", function () {
        const text = "bla bla bla";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
      });

      it("should reverse text when there are only hebrew characters and rightToLeft is true", function () {
        const text = "שלום";
        const expectedText = "םולש";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("should reverse text when there are only arabic characters and rightToLeft is true", function () {
        const text = "مرحبا";
        const expectedText = "ابحرم";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("should reverse part of text when there is mix of right-to-left and other kind of characters and rightToLeft is true", function () {
        const text = 'Master (אדון): "Hello"\nתלמיד (student): "שלום"';
        const expectedText = 'Master (ןודא): "Hello"\n"םולש" :(student) דימלת';
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("should reverse all text and replace brackets when there is right-to-left characters and rightToLeft is true", function () {
        const text = "משפט [מורכב] {עם} תווים <מיוחדים special>";
        const expectedText = "<special םידחוימ> םיוות {םע} [בכרומ] טפשמ";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("should reverse only text that detected as rtl text when it begin with non rtl characters when rightToLeft is true", function () {
        const text =
          "(interesting sentence with hebrew characters) שלום(עליך)חביבי.";
        const expectedText =
          "(interesting sentence with hebrew characters) יביבח(ךילע)םולש.";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("should not change nothing if it only non alphanumeric characters when rightToLeft is true", function () {
        const text = "([{- -}])";
        const expectedText = "([{- -}])";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(expectedText);
      });

      it("detects characters in the range \\u05D0-\\u05EA", function () {
        const text = "\u05D1\u05D2";
        const expectedText = "\u05D2\u05D1";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("detects characters in the range \\u0600-\\u06FF", function () {
        const text = "\u0601\u0602";
        const expectedText = "\u0602\u0601";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("detects characters in the range \\u0750-\\u077F", function () {
        const text = "\u0751\u0752";
        const expectedText = "\u0752\u0751";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("detects characters in the range \\u08A0-\\u08FF", function () {
        const text = "\u08A1\u08A2";
        const expectedText = "\u08A2\u08A1";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });

      it("should reversing correctly non alphabetic characters", function () {
        const text = "A אב: ג\nאב: ג";
        const expectedText = "A ג :בא\nג :בא";
        const label = labels.add({
          text: text,
        });

        expect(label.text).toEqual(text);
        expect(label._renderedText).toEqual(expectedText);
      });
    });

    it("computes bounding sphere in 3D", function () {
      const one = labels.add({
        position: Cartesian3.fromDegrees(-50.0, -50.0, 0.0),
        text: "one",
      });
      const two = labels.add({
        position: Cartesian3.fromDegrees(-50.0, 50.0, 0.0),
        text: "two",
      });

      scene.renderForSpecs();
      const actual = scene.frameState.commandList[0].boundingVolume;

      const positions = [one.position, two.position];
      const expected = BoundingSphere.fromPoints(positions);
      expect(actual.center).toEqual(expected.center);
      expect(actual.radius).toEqual(expected.radius);
    });

    it("computes bounding sphere in Columbus view", function () {
      // Disable collision detection to allow controlled camera position,
      // hence predictable bounding sphere size
      const originalEnableCollisionDetection =
        scene.screenSpaceCameraController.enableCollisionDetection;
      scene.screenSpaceCameraController.enableCollisionDetection = false;

      const projection = scene.mapProjection;
      const ellipsoid = projection.ellipsoid;

      const one = labels.add({
        position: Cartesian3.fromDegrees(-50.0, -50.0, 0.0),
        text: "one",
      });
      const two = labels.add({
        position: Cartesian3.fromDegrees(-50.0, 50.0, 0.0),
        text: "two",
      });

      // Update scene state
      scene.morphToColumbusView(0);
      scene.renderForSpecs();
      const actual = scene.frameState.commandList[0].boundingVolume;

      const projectedPositions = [
        projection.project(ellipsoid.cartesianToCartographic(one.position)),
        projection.project(ellipsoid.cartesianToCartographic(two.position)),
      ];
      const expected = BoundingSphere.fromPoints(projectedPositions);
      expected.center = new Cartesian3(
        0.0,
        expected.center.x,
        expected.center.y
      );
      expect(actual.center).toEqualEpsilon(
        expected.center,
        CesiumMath.EPSILON8
      );
      expect(actual.radius).toBeGreaterThanOrEqualTo(expected.radius);
      scene.screenSpaceCameraController.enableCollisionDetection = originalEnableCollisionDetection;
    });

    it("computes bounding sphere in 2D", function () {
      const projection = scene.mapProjection;
      const ellipsoid = projection.ellipsoid;

      const one = labels.add({
        position: Cartesian3.fromDegrees(-50.0, -50.0),
        text: "one",
      });
      const two = labels.add({
        position: Cartesian3.fromDegrees(-50.0, 50.0),
        text: "two",
      });

      camera.setView({
        destination: Rectangle.fromDegrees(-60.0, -60.0, -40.0, 60.0),
      });

      scene.morphTo2D(0);
      scene.renderForSpecs();

      scene.renderForSpecs();
      const actual = scene.frameState.commandList[0].boundingVolume;

      const projectedPositions = [
        projection.project(ellipsoid.cartesianToCartographic(one.position)),
        projection.project(ellipsoid.cartesianToCartographic(two.position)),
      ];
      const expected = BoundingSphere.fromPoints(projectedPositions);
      expected.center = new Cartesian3(
        0.0,
        expected.center.x,
        expected.center.y
      );
      expect(actual.center).toEqualEpsilon(
        expected.center,
        CesiumMath.EPSILON8
      );
      expect(actual.radius).toBeGreaterThan(expected.radius);
    });

    it("Label.show throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.show = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.position throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.position = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.text throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.text = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.font throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.font = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.fillColor throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.fillColor = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.outlineColor throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.outlineColor = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.outlineWidth throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.outlineWidth = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.style throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.style = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.pixelOffset throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.pixelOffset = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.eyeOffset throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.eyeOffset = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.horizontalOrigin throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.horizontalOrigin = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.verticalOrigin throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.verticalOrigin = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.scale throws with undefined", function () {
      const label = labels.add();
      expect(function () {
        label.scale = undefined;
      }).toThrowDeveloperError();
    });

    it("Label.computeScreenSpacePosition throws with undefined scene", function () {
      const label = labels.add();
      expect(function () {
        label.computeScreenSpacePosition();
      }).toThrowDeveloperError();
    });

    it("Label.translucencyByDistance throws with nearDistance === farDistance", function () {
      const label = labels.add();
      const translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        label.translucencyByDistance = translucency;
      }).toThrowDeveloperError();
    });

    it("Label.pixelOffsetScaleByDistance throws with nearDistance === farDistance", function () {
      const label = labels.add();
      const pixelOffsetScale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        label.pixelOffsetScaleByDistance = pixelOffsetScale;
      }).toThrowDeveloperError();
    });

    it("Label.scaleByDistance throws with nearDistance === farDistance", function () {
      const label = labels.add();
      const scaleByDistance = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        label.scaleByDistance = scaleByDistance;
      }).toThrowDeveloperError();
    });

    it("new label throws with invalid translucencyByDistance (nearDistance === farDistance)", function () {
      const translucency = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        labels.add({
          translucencyByDistance: translucency,
        });
      }).toThrowDeveloperError();
    });

    it("new label throws with invalid pixelOffsetScaleByDistance (nearDistance === farDistance)", function () {
      const pixelOffsetScale = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        labels.add({
          pixelOffsetScaleByDistance: pixelOffsetScale,
        });
      }).toThrowDeveloperError();
    });

    it("new label throws with invalid scaleByDistance (nearDistance === farDistance)", function () {
      const scaleByDistance = new NearFarScalar(2.0e5, 1.0, 2.0e5, 0.0);
      expect(function () {
        labels.add({
          scaleByDistance: scaleByDistance,
        });
      }).toThrowDeveloperError();
    });

    it("Label.translucencyByDistance throws with nearDistance > farDistance", function () {
      const label = labels.add();
      const translucency = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
      expect(function () {
        label.translucencyByDistance = translucency;
      }).toThrowDeveloperError();
    });

    it("Label.pixelOffsetScaleByDistance throws with nearDistance > farDistance", function () {
      const label = labels.add();
      const pixelOffsetScale = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
      expect(function () {
        label.pixelOffsetScaleByDistance = pixelOffsetScale;
      }).toThrowDeveloperError();
    });

    it("Label.scaleByDistance throws with nearDistance > farDistance", function () {
      const label = labels.add();
      const scaleByDistance = new NearFarScalar(1.0e9, 1.0, 1.0e5, 1.0);
      expect(function () {
        label.scaleByDistance = scaleByDistance;
      }).toThrowDeveloperError();
    });

    it("destroys texture atlas when destroying", function () {
      labels.add({
        text: "a",
      });
      scene.renderForSpecs();

      const textureAtlas = labels._textureAtlas;
      expect(textureAtlas.isDestroyed()).toBe(false);

      scene.primitives.removeAll();

      expect(textureAtlas.isDestroyed()).toBe(true);
    });

    describe("height referenced labels", function () {
      beforeEach(function () {
        scene.globe = createGlobe();

        labelsWithHeight = new LabelCollection({
          scene: scene,
        });
        scene.primitives.add(labelsWithHeight);
      });

      it("explicitly constructs a label with height reference", function () {
        scene.globe = createGlobe();
        const l = labelsWithHeight.add({
          text: "test",
          heightReference: HeightReference.CLAMP_TO_GROUND,
        });

        expect(l.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
      });

      it("set label height reference property", function () {
        scene.globe = createGlobe();
        const l = labelsWithHeight.add({
          text: "test",
        });
        l.heightReference = HeightReference.CLAMP_TO_GROUND;

        expect(l.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
      });

      it("creating with a height reference creates a height update callback", function () {
        scene.globe = createGlobe();
        labelsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();
      });

      it("set height reference property creates a height update callback", function () {
        scene.globe = createGlobe();
        const l = labelsWithHeight.add({
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        l.heightReference = HeightReference.CLAMP_TO_GROUND;
        expect(scene.globe.callback).toBeDefined();
      });

      it("updates the callback when the height reference changes", function () {
        scene.globe = createGlobe();
        const l = labelsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();

        l.heightReference = HeightReference.RELATIVE_TO_GROUND;
        expect(scene.globe.removedCallback).toEqual(true);
        expect(scene.globe.callback).toBeDefined();

        scene.globe.removedCallback = false;
        l.heightReference = HeightReference.NONE;
        expect(scene.globe.removedCallback).toEqual(true);
        expect(scene.globe.callback).toBeUndefined();
      });

      it("changing the position updates the callback", function () {
        scene.globe = createGlobe();
        const l = labelsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();

        l.position = Cartesian3.fromDegrees(-73.0, 40.0);
        expect(scene.globe.removedCallback).toEqual(true);
        expect(scene.globe.callback).toBeDefined();
      });

      it("callback updates the position", function () {
        scene.globe = createGlobe();
        const l = labelsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        expect(scene.globe.callback).toBeDefined();

        let cartographic = scene.globe.ellipsoid.cartesianToCartographic(
          l._clampedPosition
        );
        expect(cartographic.height).toEqual(0.0);

        scene.globe.callback(Cartesian3.fromDegrees(-72.0, 40.0, 100.0));
        cartographic = scene.globe.ellipsoid.cartesianToCartographic(
          l._clampedPosition
        );
        expect(cartographic.height).toEqualEpsilon(100.0, CesiumMath.EPSILON9);
      });

      it("resets the clamped position when HeightReference.NONE", function () {
        scene.globe = createGlobe();
        spyOn(scene.camera, "update");
        const l = labelsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          text: "t",
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        scene.renderForSpecs();
        expect(l._clampedPosition).toBeDefined();
        expect(l._glyphs[0].billboard._clampedPosition).toBeDefined();

        l.heightReference = HeightReference.NONE;
        expect(l._clampedPosition).toBeUndefined();
        expect(l._glyphs[0].billboard._clampedPosition).toBeUndefined();
      });

      it("clears the billboard height reference callback when the label is removed", function () {
        scene.globe = createGlobe();
        spyOn(scene.camera, "update");
        const l = labelsWithHeight.add({
          heightReference: HeightReference.CLAMP_TO_GROUND,
          text: "t",
          position: Cartesian3.fromDegrees(-72.0, 40.0),
        });
        scene.renderForSpecs();
        const billboard = l._glyphs[0].billboard;
        expect(billboard._removeCallbackFunc).toBeDefined();
        const spy = spyOn(billboard, "_removeCallbackFunc");
        labelsWithHeight.remove(l);
        expect(spy).toHaveBeenCalled();
        expect(
          labelsWithHeight._spareBillboards[0]._removeCallbackFunc
        ).toBeUndefined();
      });
    });
  },
  "WebGL"
);
