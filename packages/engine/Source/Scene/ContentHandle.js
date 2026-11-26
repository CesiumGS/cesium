// @ts-check

/*
 * This file is an implementation detail of Conditional3DTileContent.
 * It should not be used by other classes.
 */

import { defined } from "@cesium/core";
import RequestState from "../Core/RequestState.js";
import preprocess3DTileContent from "./preprocess3DTileContent.js";
import finishContent from "./finishContent.js";
import defer from "../Core/defer.js";
import RequestHandle from "./RequestHandle.js";

/** @import { RequestListener }  from "./RequestHandle.js"; */
/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import Cesium3DTileStyle from "./Cesium3DTileStyle.js"; */
/** @import Cesium3DTileContent from "./Cesium3DTileContent.js"; */
/** @import Resource from "../Core/Resource.js"; */

/**
 * A compile time flag for excessive logging, as long as there is
 * active development and testing.
 *
 * @private
 */
const CONTENT_HANDLE_LOGGING = false;

/**
 * Interface for all classes that want to be informed about the
 * state of a content.
 *
 * Note: The functions in this interface should be documented
 * more extensively. But their structure and calling patterns
 * had to be reverse engineered from existing Cesium3DTIleContent
 * implementations.
 *
 * @ignore
 */
class ContentListener {
  /**
   * Will be called when the given content was loaded
   * and became 'ready'
   *
   * @param {Cesium3DTileContent} content The content
   */
  contentLoadedAndReady(content) {}

  /**
   * Will be called when the given content is unloaded,
   * immediately before calling its 'destroy' method.
   *
   * @param {Cesium3DTileContent} content The content
   */
  contentUnloaded(content) {}
}

/**
 * Implementation of a ContentListener that just logs the
 * states to the console.
 *
 * @ignore
 * @extends {ContentListener}
 */
class LoggingContentListener extends ContentListener {
  /**
   * @param {Cesium3DTileContent} content The content
   */
  contentLoadedAndReady(content) {
    console.log(`contentLoadedAndReady for `, content);
  }
  /**
   * @param {Cesium3DTileContent} content The content
   */
  contentUnloaded(content) {
    console.log(`contentUnloaded       for `, content);
  }
}

/**
 * A class summarizing what is necessary to request tile content.
 *
 * Its main functionality is offered via the 'tryGetContent' function.
 * It handles the "laziness" of the content request, and simply
 * returns the content when it's done, and otherwise, it returns
 * 'undefined', but ensures that there is a pending request and the
 * content will eventually be available. When the content request
 * or creation fails, then this will be indicated by the 'failed'
 * flag becoming 'true'.
 *
 * The purpose of this class is to encapuslate the lifecycle
 * and asynchronicity of content creation. Users should always
 * and only use this content handle, and not rely on the presence
 * of the content object, and not store the content object once
 * it is created.
 *
 * @example
 * // Pseudocode:
 * const contentHandle = new ContentHandle(...);
 * inEachFrame() {
 *   if (contentHandle.failed) {
 *     console.log("Error!");
 *     return;
 *   }
 *   const content = contentHandle.tryGetContent();
 *   if (!defined(content)) {
 *      console.log("Still waiting for content");
 *      return;
 *   }
 *   console.log("Got content: ", content);
 * }
 *
 * @ignore
 */
class ContentHandle {
  /**
   * Creates a new instance for the specified content of the given tile.
   *
   * @param {Cesium3DTile} tile The tile that the content belongs to
   * @param {Resource} baseResource The base resource that the URLs
   * will be resolved against.
   * @param {object} contentHeader The content header, which is just the
   * JSON representation of the 'content' from the tileset JSON.
   */
  constructor(tile, baseResource, contentHeader) {
    /**
     * The tile that the content belongs to.
     *
     * This is only required for passing it through to 'finishContent'.
     *
     * @type {Cesium3DTile}
     * @readonly
     */
    this._tile = tile;

    /**
     * The base resource. The content resource will be created by
     * calling getDerivedResource with the content URI in this.
     *
     * @type {Resource}
     * @readonly
     */
    this._baseResource = baseResource;

    /**
     * The JSON representation of the 'content' from the tileset JSON.
     *
     * @type {any}
     * @readonly
     */
    this._contentHeader = contentHeader;

    /**
     * The request handle that will be used for issuing the actual
     * request.
     *
     * This will be created when 'tryGetContent' is called. When
     * its associated promise is fulfilled, then the actual
     * content is created from the response.
     *
     * @type {RequestHandle|undefined}
     */
    this._requestHandle = undefined;

    /**
     * The actual content that was created.
     *
     * Calling 'tryGetContent' will initiate the creation of the
     * content. When the underlying request succeeds and the
     * content can be created, this will store the resulting
     * content.
     *
     * @type {Cesium3DTileContent|undefined}
     */
    this._content = undefined;

    /**
     * The last style that was applied to the _content.
     *
     * This is tracked here, because the 'Cesium3DTileContent'
     * implementations are generally not handling the case of
     * the same style being applied multiple times. Calling
     * 'applyStyle', e.g. on the 'Model3DTileContent', will
     * cause the draw commands of the model to be rebuilt,
     * even when the style is identical to the previous one.
     * (We could argue about a concept for "equality" of
     * styles, but a check for identity should be a baseline).
     *
     * @type {Cesium3DTileStyle|undefined}
     */
    this._lastStyle = undefined;

    /**
     * Whether the content creation failed.
     *
     * See 'get failed()' for details.
     *
     * @type {boolean}
     */
    this._failed = false;

    /**
     * Only used for testing. See waitForSpecs.
     * @type {any}
     */
    this._deferred = defer();

    /**
     * The listeners that will be informed about the state of the
     * request that is created and handled by this instance.
     *
     * @type {Set<RequestListener>}
     * @readonly
     */
    this._requestListeners = new Set();

    /**
     * The listeners that will be informed about the state of the
     * content that is handled by this instance.
     *
     * @type {Set<ContentListener>}
     * @readonly
     */
    this._contentListeners = new Set();
  }

  /**
   * Only intended for testing:
   *
   * If there is a pending request for the content, then wait until
   * the content is created, or the content creation failed.
   *
   * This is here because all the request handling is in the content
   * classes, without abstractions and clear lifecycle definitions.
   */
  async waitForSpecs() {
    if (defined(this._requestHandle)) {
      try {
        await this._deferred.promise;
      } catch (error) {
        // Ignored
        console.log(error);
      }
    }
  }

  /**
   * Add the given listener to be informed about the state of the
   * underlying request.
   *
   * @param {RequestListener} requestListener The listener
   */
  addRequestListener(requestListener) {
    this._requestListeners.add(requestListener);
  }

  /**
   * Remove the given listener
   *
   * @param {RequestListener} requestListener The listener
   */
  removeRequestListener(requestListener) {
    this._requestListeners.delete(requestListener);
  }

  /**
   * Add the given listener to be informed about the state of the
   * content.
   *
   * @param {ContentListener} contentListener The listener
   */
  addContentListener(contentListener) {
    this._contentListeners.add(contentListener);
  }

  /**
   * Remove the given listener
   *
   * @param {ContentListener} contentListener The listener
   */
  removeContentListener(contentListener) {
    this._contentListeners.delete(contentListener);
  }

  /**
   * Returns whether the content creation ultimately failed.
   *
   * This will be 'true' if the underlying request was attempted
   * and really failed (meaning that it was not just cancelled
   * or deferred, but really failed, e.g. due to an invalid
   * URL), OR when the creation of the content from the request
   * response failed.
   *
   * The state of this flag will be reset to 'false' when calling
   * the 'reset()' method.
   *
   * @returns {boolean} Whether the request or content creation failed
   */
  get failed() {
    return this._failed;
  }

  /**
   * Returns the content if it was already requested, received and created.
   *
   * This will not attempt to request or create the content. It will only
   * return the content if it already exists. When this returns 'undefined',
   * then the content was not requested yet, or the content creation
   * actually failed. The latter can be checked with the 'failed()' getter.
   *
   * @returns {Cesium3DTileContent|undefined} The content
   */
  getContentOptional() {
    if (this.failed) {
      if (CONTENT_HANDLE_LOGGING) {
        console.log(`ContentHandle: Failed for ${this._contentHeader.uri}`);
      }
      return undefined;
    }
    if (defined(this._content)) {
      if (CONTENT_HANDLE_LOGGING) {
        console.log(
          `ContentHandle: Content exists for ${this._contentHeader.uri}`,
        );
      }
      return this._content;
    }
    return undefined;
  }

  /**
   * Tries to obtain the content.
   *
   * If the content was already requested, received, and created, then
   * this will return the content.
   *
   * Otherwise, this will return 'undefined'.
   *
   * If the request did not already fail, it will trigger the request
   * and content creation if necessary, so that this method
   * (or 'getContentOptional') will eventually return the content if
   * its creation succeeds.
   *
   * @returns {Cesium3DTileContent|undefined} The content
   */
  tryGetContent() {
    const content = this.getContentOptional();
    if (defined(content)) {
      return content;
    }
    // Don't retry a failed request
    if (this.failed) {
      return undefined;
    }
    this._ensureRequestPending();
    return undefined;
  }

  /**
   * Apply the given style to the content of this handle.
   *
   * This is a workaround the fact that calling 'applyStyle' on
   * Cesium3DTileContent implementations may invalidate the
   * draw commands, EVEN IF the style did not change: It will
   * only forward the 'applyStyle' call to the content if it
   * actually changed since the previous call.
   *
   * @param {Cesium3DTileStyle|undefined} style The style
   */
  applyStyle(style) {
    const content = this._content;
    if (!defined(content)) {
      return;
    }
    if (this._lastStyle === style) {
      return;
    }
    this._lastStyle = style;
    // @ts-expect-error The 'applyStyle' function is private
    content.applyStyle(style);
  }

  /**
   * Ensures that there is a pending request for the content.
   *
   * If there already is a request handle, then its 'ensureRequested'
   * function will be called
   *
   * Otherwise, this will create a request handle for the content request.
   * When the request succeeds, then the content will be created from
   * the response. When the request or the content creation fails, then
   * this content handle will turn into the 'failed()' state.
   */
  _ensureRequestPending() {
    if (defined(this._requestHandle)) {
      this._requestHandle.ensureRequested();
      return;
    }

    // Create the actual request handle
    const uri = this._contentHeader.uri;
    const baseResource = this._baseResource;
    const resource = baseResource.getDerivedResource({
      url: uri,
    });
    const priorityFunction = () => {
      return this._tile._priority;
    };
    const requestHandle = new RequestHandle(resource, priorityFunction);
    this._requestHandle = requestHandle;

    // Attach any request listeners that have already been added
    // to this content handle to the newly created request handle
    for (const requestListener of this._requestListeners) {
      requestHandle.addRequestListener(requestListener);
    }

    // When the request succeeds, try to create the content
    // and store it as 'this._content'. If the content
    // creation fails, store this as 'this._failed'.
    const onRequestFulfilled = async (
      /** @type {ArrayBuffer} */ arrayBuffer,
    ) => {
      if (CONTENT_HANDLE_LOGGING) {
        console.log(`ContentHandle: Request was fulfilled for ${uri}`);
      }
      try {
        const content = await this._createContent(resource, arrayBuffer);
        if (CONTENT_HANDLE_LOGGING) {
          console.log(`ContentHandle: Content was created for ${uri}`);
        }
        this._content = content;
        this._deferred.resolve(content);
      } catch (error) {
        if (CONTENT_HANDLE_LOGGING) {
          console.log(
            `ContentHandle: Content creation for ${uri} caused error ${error}`,
          );
        }
        this._failed = true;

        // The promise is only intended for testing, and may not be awaited,
        // so it cannot be rejected without causing an uncaught error.
        this._deferred.resolve(error);
      }
    };

    // The request being rejected may have different reasons.
    // It might really have failed. It may just have been
    // cancelled. It may count as cancelled because it was
    // not scheduled at all. Try to handle each case here:
    const onRequestRejected = (/** @type {any} */ error) => {
      if (CONTENT_HANDLE_LOGGING) {
        console.log(
          `ContentHandle: Request was rejected for ${uri} with error ${error}`,
        );
      }
      // Apparently, cancelling causes a rejection.
      // This should not count as "failed". Instead,
      // the request handle is discarded, so that it
      // will be re-created during the next call to
      // _ensureRequestPending
      // Note: The nonstandard "_code" property is added
      // by the RequestHandle
      if (defined(error) && error._code === RequestState.CANCELLED) {
        if (CONTENT_HANDLE_LOGGING) {
          console.log(
            `ContentHandle: Request was rejected for ${uri}, but actually only cancelled. Better luck next time!`,
          );
        }
        this._requestHandle = undefined;

        // The promise is only intended for testing, and may not be awaited,
        // so it cannot be rejected without causing an uncaught error.
        this._deferred.resolve(error);
        return;
      }

      // Other errors should indeed cause this handle
      // to be marked as "failed"
      this._failed = true;

      // The promise is only intended for testing, and may not be awaited,
      // so it cannot be rejected without causing an uncaught error.
      this._deferred.resolve(error);
    };

    // Wire up the fulfilled- and rejected handling with
    // the request handle, and ensure that the request
    // is pending
    const requestHandleResultPromise = requestHandle.getResultPromise();
    requestHandleResultPromise.then(onRequestFulfilled, onRequestRejected);
    requestHandle.ensureRequested();
  }

  /**
   * Creates and returns the content for the given array buffer that was obtained
   * as the response data for the given resource.
   *
   * @param {Resource} resource The content resource
   * @param {ArrayBuffer} arrayBuffer The array buffer that was
   * obtained as the response to the request.
   * @returns {Cesium3DTileContent} The content
   * @throws If the content creation fails for whatever reason
   */
  _createContent(resource, arrayBuffer) {
    const preprocessed = preprocess3DTileContent(arrayBuffer);
    const contentHeader = this._contentHeader;
    const tile = this._tile;
    return finishContent(tile, resource, preprocessed, contentHeader, 0);
  }

  /**
   * Reset this handle to its initial state.
   *
   * This will cancel any pending requests, destroy any content that may
   * already have been created, and prepare the handle to retry the
   * requests and content creation when 'tryGetContent' is called.
   */
  reset() {
    if (defined(this._requestHandle)) {
      if (CONTENT_HANDLE_LOGGING) {
        console.log(
          `ContentHandle: Cancelling request for ${this._contentHeader.uri}`,
        );
      }
      this._requestHandle.cancel();
    }
    this._requestHandle = undefined;
    if (defined(this._content)) {
      this._fireContentUnloaded(this._content);
      // @ts-expect-error The 'destroy' function is private
      this._content.destroy();
    }
    this._content = undefined;
    this._failed = false;
    this._deferred = defer();
  }

  /**
   * Wrapper around content.update, for implementing the
   * Cesium3DTileContent interface...
   *
   * @param {Cesium3DTileset} tileset The tileset
   * @param {any} frameState The frame state
   */
  updateContent(tileset, frameState) {
    const content = this._content;
    if (!defined(content)) {
      return;
    }
    const oldReady = content.ready;
    // @ts-expect-error The 'update' function is private
    content.update(tileset, frameState);
    const newReady = content.ready;
    if (!oldReady && newReady) {
      this._fireContentLoadedAndReady(content);
    }
  }

  /**
   * Inform all registered listeners that the content was loaded
   * and became 'ready' (meaning that it was really loaded...)
   *
   * @param {Cesium3DTileContent} content The content
   */
  _fireContentLoadedAndReady(content) {
    for (const contentListener of this._contentListeners) {
      contentListener.contentLoadedAndReady(content);
    }
  }

  /**
   * Inform all registered listeners that the content was unloaded,
   * just before it is destroyed
   *
   * @param {Cesium3DTileContent} content The content
   */
  _fireContentUnloaded(content) {
    for (const contentListener of this._contentListeners) {
      contentListener.contentUnloaded(content);
    }
  }
}

export default ContentHandle;

// Exposed for testing
export { ContentListener, LoggingContentListener };
