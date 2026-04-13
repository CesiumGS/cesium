import { Sync, WebGLConstants } from "../../index.js";

import createContext from "../../../../Specs/createContext.js";
import createWebglVersionHelper from "../createWebglVersionHelper.js";
import { RuntimeError } from "@cesium/engine";

describe(
  "Renderer/Sync",
  function () {
    createWebglVersionHelper(createBufferSpecs);

    function createBufferSpecs(contextOptions) {
      let context;
      let sync;

      beforeAll(function () {
        context = createContext(contextOptions);
      });

      afterAll(function () {
        context.destroyForSpecs();
      });

      afterEach(function () {
        sync = sync && sync.destroy();
      });

      it(`throws when creating a sync with no context`, function () {
        if (!context.webgl2) {
          return;
        }
        expect(function () {
          sync = Sync.create({});
        }).toThrowDeveloperError();
      });

      it("creates", function () {
        if (!context.webgl2) {
          return;
        }
        sync = Sync.create({
          context: context,
        });
        expect(sync).toBeDefined();
      });

      it("destroys", function () {
        if (!context.webgl2) {
          return;
        }
        const sync = Sync.create({
          context: context,
        });
        expect(sync.isDestroyed()).toEqual(false);
        sync.destroy();
        expect(sync.isDestroyed()).toEqual(true);
      });

      it("throws when fails to destroy", function () {
        if (!context.webgl2) {
          return;
        }
        const sync = Sync.create({
          context: context,
        });
        sync.destroy();

        expect(function () {
          sync.destroy();
        }).toThrowDeveloperError();
      });

      it(`throws without WebGL 2`, function () {
        if (context.webgl2) {
          return;
        }
        expect(function () {
          sync = Sync.create({
            context: context,
          });
        }).toThrowDeveloperError();
      });

      it(`returns status unsignaled after create`, function () {
        if (!context.webgl2) {
          return;
        }
        sync = Sync.create({
          context: context,
        });
        const status = sync.getStatus();
        expect(status).toEqual(WebGLConstants.UNSIGNALED);
      });

      it(`waitForSignal to resolve`, async function () {
        if (!context.webgl2) {
          return;
        }
        let i = 0;
        spyOn(Sync.prototype, "getStatus").and.callFake(function () {
          if (i++ < 3) {
            return WebGLConstants.UNSIGNALED;
          }
          return WebGLConstants.SIGNALED;
        });
        sync = Sync.create({
          context: context,
        });
        await expectAsync(
          sync.waitForSignal(function (next) {
            setTimeout(next, 100);
          }),
        ).toBeResolved();
      });

      it(`waitForSignal throws on timeout`, async function () {
        if (!context.webgl2) {
          return;
        }
        spyOn(Sync.prototype, "getStatus").and.callFake(function () {
          return WebGLConstants.UNSIGNALED; // simulate never being signaled
        });
        sync = Sync.create({
          context: context,
        });
        await expectAsync(
          sync.waitForSignal(function (next) {
            setTimeout(next, 100);
          }),
        ).toBeRejectedWithError(RuntimeError, "Wait for signal timeout");
      });

      it(`waitForSignal throws on custom timeout`, async function () {
        if (!context.webgl2) {
          return;
        }
        let i = 0;
        spyOn(Sync.prototype, "getStatus").and.callFake(function () {
          if (i++ < 6) {
            return WebGLConstants.UNSIGNALED;
          }
          return WebGLConstants.SIGNALED;
        });
        sync = Sync.create({
          context: context,
        });
        await expectAsync(
          sync.waitForSignal(function (next) {
            setTimeout(next, 100);
          }, 5),
        ).toBeRejectedWithError(RuntimeError, "Wait for signal timeout");
      });
    }
  },
  "WebGL",
);
