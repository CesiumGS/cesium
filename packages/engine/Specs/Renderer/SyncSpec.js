import { Sync, WebGLConstants } from "../../index.js";

import createContext from "../../../../Specs/createContext.js";
import createWebglVersionHelper from "../createWebglVersionHelper.js";

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
    }
  },
  "WebGL",
);
