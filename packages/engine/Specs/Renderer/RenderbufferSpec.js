import {
  ContextLimits,
  Renderbuffer,
  RenderbufferFormat,
} from "../../index.js";;

import createContext from "../../../../Specs/createContext.js";;

describe(
  "Renderer/Renderbuffer",
  function () {
    let context;
    let renderbuffer;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    afterEach(function () {
      renderbuffer = renderbuffer && renderbuffer.destroy();
    });

    it("creates", function () {
      renderbuffer = new Renderbuffer({
        context: context,
        format: RenderbufferFormat.DEPTH_COMPONENT16,
        width: 64,
        height: 32,
      });

      expect(renderbuffer.format).toEqual(RenderbufferFormat.DEPTH_COMPONENT16);
      expect(renderbuffer.width).toEqual(64);
      expect(renderbuffer.height).toEqual(32);
    });

    it("creates with defaults", function () {
      renderbuffer = new Renderbuffer({
        context: context,
      });

      expect(renderbuffer.format).toEqual(RenderbufferFormat.RGBA4);
      expect(renderbuffer.width).toEqual(context.canvas.clientWidth);
      expect(renderbuffer.height).toEqual(context.canvas.clientHeight);
    });

    it("destroys", function () {
      const r = new Renderbuffer({
        context: context,
      });
      expect(r.isDestroyed()).toEqual(false);
      r.destroy();
      expect(r.isDestroyed()).toEqual(true);
    });

    it("throws when created with invalid format", function () {
      expect(function () {
        renderbuffer = new Renderbuffer({
          context: context,
          format: "invalid format",
        });
      }).toThrowDeveloperError();
    });

    it("throws when created with small width", function () {
      expect(function () {
        renderbuffer = new Renderbuffer({
          context: context,
          width: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws when created with large width", function () {
      expect(function () {
        renderbuffer = new Renderbuffer({
          context: context,
          width: ContextLimits.maximumRenderbufferSize + 1,
        });
      }).toThrowDeveloperError();
    });

    it("throws when created with small height", function () {
      expect(function () {
        renderbuffer = new Renderbuffer({
          context: context,
          height: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws when created with large height", function () {
      expect(function () {
        renderbuffer = new Renderbuffer({
          context: context,
          height: ContextLimits.maximumRenderbufferSize + 1,
        });
      }).toThrowDeveloperError();
    });

    it("throws when fails to destroy", function () {
      const r = new Renderbuffer({
        context: context,
      });
      r.destroy();

      expect(function () {
        r.destroy();
      }).toThrowDeveloperError();
    });

    it("throws when there is no context", function () {
      expect(function () {
        return new Renderbuffer();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
