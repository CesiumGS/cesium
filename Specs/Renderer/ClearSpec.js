import { BoundingRectangle } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { ClearCommand } from "../../Source/Cesium.js";
import { Framebuffer } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import createContext from "../createContext.js";

describe(
  "Renderer/Clear",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    it("default clear", function () {
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);
    });

    it("clears to white", function () {
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new ClearCommand({
        color: Color.WHITE,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("clears with a color mask", function () {
      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new ClearCommand({
        color: Color.WHITE,
        renderState: RenderState.fromCache({
          colorMask: {
            red: true,
            green: false,
            blue: true,
            alpha: true,
          },
        }),
      });
      command.execute(context);
      expect(context).toReadPixels([255, 0, 255, 255]);
    });

    it("clears with scissor test", function () {
      const command = new ClearCommand({
        color: Color.WHITE,
      });

      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);

      command.color = Color.BLACK;
      command.renderState = RenderState.fromCache({
        scissorTest: {
          enabled: true,
          rectangle: new BoundingRectangle(),
        },
      });

      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);

      command.renderState = RenderState.fromCache({
        scissorTest: {
          enabled: true,
          rectangle: new BoundingRectangle(0, 0, 1, 1),
        },
      });

      command.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);
    });

    it("clears a framebuffer color attachment", function () {
      const colorTexture = new Texture({
        context: context,
        width: 1,
        height: 1,
      });
      let framebuffer = new Framebuffer({
        context: context,
        colorTextures: [colorTexture],
      });

      const command = new ClearCommand({
        color: new Color(0.0, 1.0, 0.0, 1.0),
        framebuffer: framebuffer,
      });
      command.execute(context);

      expect({
        context: context,
        framebuffer: framebuffer,
      }).toReadPixels([0, 255, 0, 255]);

      framebuffer = framebuffer.destroy();
    });

    it("fails to read pixels (width)", function () {
      expect(function () {
        expect(
          context.readPixels({
            width: -1,
          })
        ).toEqual([0, 0, 0, 0]);
      }).toThrowDeveloperError();
    });

    it("fails to read pixels (height)", function () {
      expect(function () {
        expect(
          context.readPixels({
            height: -1,
          })
        ).toEqual([0, 0, 0, 0]);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
