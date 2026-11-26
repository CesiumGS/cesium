import {
  Cartesian3,
  DeveloperError,
  defined,
  destroyObject,
} from "@cesium/core";
import LRUCache from "./LRUCache.js";
import ContentHandle, { LoggingContentListener } from "./ContentHandle.js";
import { LoggingRequestListener } from "./RequestHandle.js";

/** @import { Ray, Color } from "@cesium/core"; */
/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import Cesium3DTileFeature from "./Cesium3DTileFeature.js"; */
/** @import Cesium3DTileStyle from "./Cesium3DTileStyle.js"; */
/** @import Cesium3DContentGroup from "./Cesium3DContentGroup.js"; */
/** @import Cesium3DTileContent from "./Cesium3DTileContent.js"; */
/** @import ImplicitMetadataView from "./ImplicitMetadataView.js"; */
/** @import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js"; */
/** @import Resource from "../Core/Resource.js"; */

/**
 * A compile time flag for excessive logging, as long as there is
 * active development and testing.
 *
 * @private
 */
const CONDITIONAL_CONTENT_LOGGING = false;

/**
 * A compile-time flag to govern the behavior of the implementation of the
 * Cesium3DTileContent interface, by the Conditional3DTileContent class.
 *
 * This flag determines whether the
 *
 * - geometryByteLength
 * - texturesByteLength
 * - batchTableByteLength
 *
 * getters return an aggregated value from all the inner contents, or
 * a constant 0 (requiring the caller to iterate over the inner contents
 * and aggregate the value).
 *
 * The Cesium3DTileContent interface does not really make sense.
 * It is underspecified, the functions/properties that it contains have no
 * coherence, and most of them do not make sense for most implementations.
 * The way how that interface and its functions are used shows that
 * ambiguity and vagueness, even without the corner case of conditional
 * content. For example, the "tile debug labels" show a geometry- and
 * memory size of 0 for composite content, because the function that
 * creates these labels is not aware that Composite3DTileContent and
 * Multiple3DTileContent require it to iterate over the "innerContents".
 *
 * Some of the functions are called at places where the state of
 * the content is not clear, including Cesium3DTile.process, in the
 * block with that "if (...!this.contentReady && this._content.ready)"
 * statement that does not make sense for conditional content (this could
 * be avoided by proper state management).
 *
 * At the time of writing this, it seems that the main use of these
 * properties is in the Cesium3DTilesetStatistics, which does iterate
 * over the inner contents.
 *
 * Note that a content could have the respective property AND innerContents.
 * In this case, the getters should return the value from the content itself,
 * AND ADD the values from the inner contents. But if, at any point in time,
 * the implementation of the composite- and multiple content are fixed by
 * computing this sum on their own, such an implementation would break.
 *
 * @private
 */
const CONDITIONAL_CONTENT_AGGREGATE_LOADED_VALUES = true;

/**
 * This serves the same purpose as the CONDITIONAL_CONTENT_AGGREGATE_LOADED_VALUES
 * flag (see this for details), but this flag affects the
 *
 * - featuresLength
 * - pointsLength
 * - trianglesLength
 *
 * getters instead, meaning that it aggregates the values for the
 * contents that are "rendered"
 *
 * @private
 */
const CONDITIONAL_CONTENT_AGGREGATE_RENDERED_VALUES = false;

/**
 * A class that represents 3D Tile content that may change based on
 * user-selected conditions.
 *
 * It implements the Cesium3DTileContent interface, as far as reasonably
 * possible, with some caveats.
 *
 * The class maintains all contents that are found in the conditional
 * content JSON, using ContentHandle objects. These are created once,
 * and never change, in the _contentHandles that map the URI to the
 * ContentHandle object.
 *
 * Beyond that, the class maintains (or offers as getters for) different
 * subsets of the contents or their URIs
 *
 * - _activeContentUris: The URIs of contents that are currently "active",
 *   meaning that the condition for diplaying them is met. This does
 *   only reflect the desired state, and does not mean that these
 *   contents are actually loaded and renderable
 * - _activeLoadedContents: The subset of contents that are "active"
 *   and that have already been loaded into memory.
 * - _renderedContentUris: These are the URIs of contents that are
 *   currently active AND that have been loaded and preprocessed
 *   so that they became "ready", meaning that these are the contents
 *   for which draw commands are scheduled
 *
 * Each time the "update" function of this content is called, the
 * 'tileset.conditionalContentUriCondition' of the tileset that this
 * content belongs to determines which inner contents will become
 * "active". If all active contents are loaded and "ready", then they
 * become the "rendered" contents. (Otherwise, their "update" functions
 * will still be called, until they become "ready").
 *
 * Styling and picking are executed on the "rendered" contents.
 *
 * @extends Cesium3DTileContent
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Conditional3DTileContent {
  /**
   * Creates an instance of Conditional3DTileContent from a parsed JSON object
   * @param {Cesium3DTileset} tileset The tileset that the content belongs to
   * @param {Cesium3DTile} tile The tile that contained the content
   * @param {Resource} tilesetResource The tileset Resource
   * @param {object} contentJson The content JSON that contains the 'conditionalContents' array
   * @returns {Conditional3DTileContent}
   * @throws {DeveloperError} If the tileset does not contain the
   * top-level conditional content extension object.
   */
  static fromJson(tileset, tile, tilesetResource, contentJson) {
    const content = new Conditional3DTileContent(
      tileset,
      tile,
      tilesetResource,
      contentJson,
    );
    return content;
  }

  /**
   * Creates a new instance.
   *
   * This should only be called from 'fromJson'.
   *
   * @constructor
   *
   * @param {Cesium3DTileset} tileset The tileset that this content belongs to
   * @param {Cesium3DTile} tile The tile that this content belongs to
   * @param {Resource} tilesetResource The resource that points to the tileset. This will be used to derive each inner content's resource.
   * @param {any} contentJson The content JSON that contains the 'conditionalContents' array
   * @throws {DeveloperError} If the tileset does not contain the
   * top-level conditional content extension object.
   *
   * @private
   */
  constructor(tileset, tile, tilesetResource, contentJson) {
    // Safeguard to verify that the extension is present
    const extensions = tileset.extensions ?? {};
    const topLevelExtensionObject = extensions["3DTILES_content_conditional"];
    if (!defined(topLevelExtensionObject)) {
      throw new DeveloperError(
        "Cannot create a Conditional3DTileContent for a tileset that does not contain a top-level conditional content extension object.",
      );
    }

    /**
     * The tileset that this content belongs to.
     *
     * The 'conditionalContentUriCondition' of this tileset will be
     * used to determine which contents are currently "active" in
     * the "_activeContentUris" getter.
     *
     * @type {Cesium3DTileset}
     * @readonly
     */
    this._tileset = tileset;

    /**
     * The tile that this content belongs to.
     *
     * This is only required for the Cesium3DTileContent implementation,
     * and for handing it on to "finishContent".
     *
     * @type {Cesium3DTile}
     * @readonly
     */
    this._tile = tile;

    /**
     * The array of content objects.
     *
     * Each of these objects is a 3D Tiles 'content', with an
     * additional 'keys' property that contains the keys that
     * are used for selecting the "active" content at any
     * point in time.
     *
     * @type {any[]}
     * @readonly
     */
    this._conditionalContents = contentJson.conditionalContents;

    /**
     * A mapping from URL strings to ContentHandle objects.
     *
     * This is initialized with all the content definitions that
     * are found in the 'conditionalContents' array. It will create
     * one ContentHandle for each content. This map will never
     * be modified after it was created.
     *
     * @type {Map<string, ContentHandle>}
     * @readonly
     */
    this._contentHandles = this._createContentHandles(tilesetResource);

    /**
     * The mapping from URLs to the ContentHandle objects whose
     * content is currently defined (i.e. loaded).
     *
     * This will be filled in the 'update' function, evicting
     * the least recently used content handles if necessary,
     * and calling 'loadedContentHandleEvicted' for them, and
     * destroy that that content by calling 'reset'.
     *
     * It is initialized with a maximum size of +Infinity.
     * The maximum size will be ensured by calling its
     * trimToSize function accordingly.
     *
     * @type {LRUCache<string,ContentHandle>}
     * @readonly
     */
    this._loadedContentHandles = new LRUCache(
      Number.POSITIVE_INFINITY,
      this.loadedContentHandleEvicted,
    );

    /**
     * The maximum number of content objects that should be kept
     * in the "_loadedContentHandles" LRU cache at the same time.
     *
     * This is initialized with an arbitrary value. It will be
     * increased as necessary to accommodate for the maximum
     * number of contents that are found to be "active" at
     * any point in time.
     *
     * @type {number}
     */
    this._loadedContentHandlesMaximumSize = 10;

    /**
     * The last style that was applied to this content.
     *
     * It will be applied to all "rendered" contents in the 'update'
     * function.
     *
     * @type {Cesium3DTileStyle|undefined}
     */
    this._lastStyle = undefined;

    /**
     * The URIs content URIs that are currently being drawn.
     *
     * The '_activeContenUris' getter returns the URIs of contents
     * that are currently active and should be rendered. Only when
     * all active contents are "ready", they become the "rendered"
     * contents.
     *
     * @type {string[]}
     * @private
     */
    this._renderedContentUris = [];
  }

  /**
   * The function that will be called when a content handle is
   * evicted from the '_loadedContentHandles'.
   *
   * This will be called when the size of the '_loadedContentHandles'
   * is trimmed to the '_loadedContentHandlesMaximumSize', and receive
   * the least recently used content handles.
   *
   * It will call 'reset()' on the content handle, cancelling all
   * pending requests, and destroying the content.
   *
   * @param {string} uri The URI of the evicted content
   * @param {ContentHandle} contentHandle The ContentHandle
   */
  loadedContentHandleEvicted(uri, contentHandle) {
    if (CONDITIONAL_CONTENT_LOGGING) {
      console.log(`_loadedContentHandleEvicted with ${uri}`);
    }
    contentHandle.reset();
  }

  /**
   * Create the mapping from URL strings to ContentHandle objects.
   *
   * This is called once from the constructor. The content handles
   * will be used for tracking the process of requesting and
   * creating the content objects.
   *
   * @param {Resource} baseResource The base resource (from the tileset)
   * @returns {Map<string, ContentHandle>} The content handles
   */
  _createContentHandles(baseResource) {
    const conditionalContents = this._conditionalContents;

    const contentHandles = new Map();
    for (let i = 0; i < conditionalContents.length; i++) {
      const contentHeader = conditionalContents[i];
      const contentHandle = new ContentHandle(
        this.tile,
        baseResource,
        contentHeader,
      );
      this._attachTilesetStatisticsTracker(contentHandle);

      const uri = contentHeader.uri;
      contentHandles.set(uri, contentHandle);
    }
    return contentHandles;
  }

  /**
   * Attach a listener to the given content handle that will update
   * the tileset statistics based on the request state.
   *
   * @param {ContentHandle} contentHandle The content handle
   */
  _attachTilesetStatisticsTracker(contentHandle) {
    if (CONDITIONAL_CONTENT_LOGGING) {
      contentHandle.addRequestListener(new LoggingRequestListener());
      contentHandle.addContentListener(new LoggingContentListener());
    }

    const tileset = this._tile.tileset;
    contentHandle.addRequestListener({
      requestAttempted(request) {
        tileset.statistics.numberOfAttemptedRequests++;
      },
      requestStarted(request) {
        tileset.statistics.numberOfPendingRequests++;
      },
      requestCancelled(request) {
        tileset.statistics.numberOfPendingRequests--;
      },
      requestCompleted(request) {
        tileset.statistics.numberOfPendingRequests--;
      },
      requestFailed(request) {
        tileset.statistics.numberOfPendingRequests--;
      },
    });

    contentHandle.addContentListener({
      contentLoadedAndReady(content) {
        if (CONDITIONAL_CONTENT_LOGGING) {
          console.log(
            "Conditional3DTileContent content handle listener contentLoadedAndReady - update statistics for   loaded content: ",
            content,
          );
        }
        tileset.statistics.incrementLoadCounts(content);
      },
      contentUnloaded(content) {
        if (CONDITIONAL_CONTENT_LOGGING) {
          console.log(
            "Conditional3DTileContent content handle listener contentUnloaded       - update statistics for unloaded content: ",
            content,
          );
        }
        tileset.statistics.decrementLoadCounts(content);
      },
    });
  }

  /**
   * Returns the array of URIs of contents that are currently 'active'.
   *
   * This will query the 'conditionalContentUriCondition' of the tileset.
   * This returns whether the 'uri' for its given 'key' is supposed
   * to be currently active.
   *
   * If there is no conditionalContentUriCondition, then an empty
   * array will be returned.
   *
   * If there are no active contents, then an empty array will be
   * returned.
   *
   * Callers may NOT modify the returned array.
   *
   * @type {string[]}
   */
  get _activeContentUris() {
    const tileset = this.tileset;
    const conditionalContentUriCondition =
      tileset.conditionalContentUriCondition;
    if (!defined(conditionalContentUriCondition)) {
      return [];
    }
    const activeContentUris = [];
    const conditionalContents = this._conditionalContents;
    for (let i = 0; i < conditionalContents.length; i++) {
      const conditionalContent = conditionalContents[i];
      const uri = conditionalContent.uri;
      const keys = conditionalContent.keys;
      if (conditionalContentUriCondition(keys)) {
        activeContentUris.push(uri);
      }
    }
    return activeContentUris;
  }

  /**
   * Returns the contents that are currently "active" AND loaded (!).
   *
   * This will obtain the '_activeContentUris'. For each URI, it will
   * check whether the content was already requested and created. If
   * it was already requested and created, it will be contained in
   * the returned array.
   *
   * If there are no active contents, then an empty array will be
   * returned.
   *
   * Callers may NOT modify the returned array.
   *
   * @type {Cesium3DTileContent[]}
   */
  get _activeLoadedContents() {
    const activeContents = [];
    const activeContentUris = this._activeContentUris;
    for (const activeContentUri of activeContentUris) {
      const contentHandle = this._contentHandles.get(activeContentUri);
      const activeContent = contentHandle.tryGetContent();
      if (defined(activeContent)) {
        activeContents.push(activeContent);
      }
    }
    return activeContents;
  }

  /**
   * Returns the contents that are currently rendered.
   *
   * These are the contents that are "active", if all of them
   * are "loaded" and "ready".
   *
   * @type {Cesium3DTileContent[]}
   * @private
   */
  get _renderedContents() {
    const renderedContents = [];
    for (const uri of this._renderedContentUris) {
      const contentHandle = this._contentHandles.get(uri);
      if (!defined(contentHandle)) {
        continue;
      }
      const content = contentHandle.getContentOptional();
      if (defined(content)) {
        renderedContents.push(content);
      }
    }
    return renderedContents;
  }

  /**
   * Update the _renderedContentUris.
   *
   * This will determine all "active" URIs. If the contents for these URIs
   * are all loaded and "ready", then they become the "rendered" URIs.
   *
   * Otherwise, the current _renderedContentUris will remain unmodified.
   *
   * This is called at the start of each update pass.
   *
   * @private
   */
  _updateRenderedContentUris() {
    const activeContentUris = this._activeContentUris;

    // A compile-time flag to disable waiting for the contents
    // to be "ready". When this is "false", then the active
    // contents will be the "rendered" ones (regardless of
    // whether they are ready)
    const waitForAllReady = true;
    if (!waitForAllReady) {
      this._renderedContentUris = activeContentUris;
      return;
    }

    let allReady = true;
    for (const uri of activeContentUris) {
      const contentHandle = this._contentHandles.get(uri);
      if (!defined(contentHandle)) {
        continue;
      }
      const content = contentHandle.tryGetContent();
      if (!defined(content) || !content.ready) {
        allReady = false;
      }
    }
    if (allReady) {
      this._renderedContentUris = activeContentUris;
    }
  }

  /**
   * Returns ALL content URIs that have been found in the conditional
   * content JSON.
   *
   * This is only exposed for tests! Clients (even CesiumJS itself)
   * should not call this!
   *
   * @type {string[]}
   */
  get _allContentUris() {
    const allContentUris = [...this._contentHandles.keys()];
    return allContentUris;
  }

  /**
   * Returns ALL contents that are currently loaded.
   *
   * It will iterate over all contents that have been defined in
   * the conditional content JSON definition. Any content that
   * is currently loaded and in memory will be contained in the
   * returned array, regardless of whether that content is
   * currently "active" or not.
   *
   * @type {Cesium3DTileContent[]}
   */
  get _allLoadedContents() {
    const allLoadedContents = [];
    const contentHandleValues = this._contentHandles.values();
    for (const contentHandle of contentHandleValues) {
      const content = contentHandle.getContentOptional();
      if (defined(content)) {
        allLoadedContents.push(content);
      }
    }
    return allLoadedContents;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface. Checks if any of the inner contents have dirty featurePropertiesDirty.
   *
   * This is offered by each Cesium3DTileContent, with varying
   * degrees of enthusiasm about how meaningful it is. For the
   * conditional content, This should probably always return true
   * or false, leaving optimizations to the applyStyle function.
   * The current implementation is simply aligned with what
   * Multiple3DTileContent does.
   *
   * @type {boolean}
   */
  get featurePropertiesDirty() {
    const allLoadedContents = this._allLoadedContents;
    for (const content of allLoadedContents) {
      if (content.featurePropertiesDirty) {
        return true;
      }
    }

    return false;
  }
  set featurePropertiesDirty(value) {
    const allLoadedContents = this._allLoadedContents;
    for (const content of allLoadedContents) {
      content.featurePropertiesDirty = value;
    }
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @type {number}
   * @readonly
   */
  get featuresLength() {
    if (CONDITIONAL_CONTENT_AGGREGATE_RENDERED_VALUES) {
      return this.getAggregatedRendered("featuresLength");
    }
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @type {number}
   * @readonly
   */
  get pointsLength() {
    if (CONDITIONAL_CONTENT_AGGREGATE_RENDERED_VALUES) {
      return this.getAggregatedRendered("pointsLength");
    }
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @type {number}
   * @readonly
   */
  get trianglesLength() {
    if (CONDITIONAL_CONTENT_AGGREGATE_RENDERED_VALUES) {
      return this.getAggregatedRendered("trianglesLength");
    }
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @type {number}
   * @readonly
   */
  get geometryByteLength() {
    if (CONDITIONAL_CONTENT_AGGREGATE_LOADED_VALUES) {
      return this.getAggregatedLoaded("geometryByteLength");
    }
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @type {number}
   * @readonly
   */
  get texturesByteLength() {
    if (CONDITIONAL_CONTENT_AGGREGATE_LOADED_VALUES) {
      return this.getAggregatedLoaded("texturesByteLength");
    }
    return 0;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @type {number}
   * @readonly
   */
  get batchTableByteLength() {
    if (CONDITIONAL_CONTENT_AGGREGATE_LOADED_VALUES) {
      return this.getAggregatedLoaded("batchTableByteLength");
    }
    return 0;
  }

  /**
   * Fetches the value of the specified property of all contents
   * that are currently rendered
   *
   * This will call "getAggregated(content, property)" for each
   * active and loaded content, and return the sum of the results.
   *
   * See CONDITIONAL_CONTENT_AGGREGATE_RENDERED_VALUES for details.
   *
   * @param {string} property The property
   * @returns The result
   */
  getAggregatedRendered(property) {
    const contents = this._renderedContents;
    let result = 0;
    for (const content of contents) {
      result += Conditional3DTileContent.getAggregated(content, property);
    }
    return result;
  }

  /**
   * Fetches the value of the specified property of all contents
   * that are currently loaded (i.e. in memory) (regardless of
   * whether they are "active" or not)
   *
   * This will call "getAggregated(content, property)" for each
   * loaded content, and return the sum of the results.
   *
   * See CONDITIONAL_CONTENT_AGGREGATE_LOADED_VALUES for details.
   *
   * @param {string} property The property
   * @returns The result
   */
  getAggregatedLoaded(property) {
    const contents = this._allLoadedContents;
    let result = 0;
    for (const content of contents) {
      result += Conditional3DTileContent.getAggregated(content, property);
    }
    return result;
  }

  /**
   * If the given content has inner contents, then this function is
   * called recursively on all inner contents, accumulating and
   * returning the result.
   *
   * Otherwise, it returns the value of the specified property of the
   * given content.
   *
   * See the documentation of the `CONDITIONAL_CONTENT_AGGREGATE_...`
   * flags for details and caveats.
   *
   * @param {Cesium3DTileContent} content The content
   * @param {string} property The property
   * @returns The result
   */
  static getAggregated(content, property) {
    const innerContents = content.innerContents;
    if (defined(innerContents)) {
      let sum = 0;
      for (const innerContent of content.innerContents) {
        sum += Conditional3DTileContent.getAggregated(
          innerContent[property],
          property,
        );
      }
      return sum;
    }
    return content[property];
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Returns all contents that are currently loaded.
   */
  get innerContents() {
    return this._allLoadedContents;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * This returns 'true' if all contents that are currently
   * active (and supposed to be displayed) are actually loaded
   * and ready.
   *
   * @type {boolean}
   * @readonly
   */
  get ready() {
    let ready = true;
    for (const uri of this._activeContentUris) {
      const contentHandle = this._contentHandles.get(uri);
      if (!defined(contentHandle) || contentHandle.failed) {
        continue;
      }
      // This will trigger the request for the content if it
      // is not already lending
      const content = contentHandle.tryGetContent();
      if (!defined(content) || !content.ready) {
        ready = false;
      }
    }
    return ready;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  get tileset() {
    return this._tileset;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  get tile() {
    return this._tile;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Unlike other content types, this content does not
   * have a single URL, so this returns undefined.
   *
   * @type {string}
   * @readonly
   */
  get url() {
    return undefined;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   * @type {ImplicitMetadataView|undefined}
   */
  get metadata() {
    return undefined;
  }
  set metadata(value) {
    // Ignored
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Always returns <code>undefined</code>.  Instead call <code>batchTable</code> for a specific inner content.
   *
   * @type {Cesium3DTileBatchTable}
   */
  get batchTable() {
    return undefined;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @type {Cesium3DContentGroup|undefined}
   */
  get group() {
    return undefined;
  }
  set group(value) {
    // Ignored
  }

  /**
   * Cancel all pending requests.
   *
   * This is "inspired" by the Multiple3DTileContent class, which claimed
   * that this is called by the tile when a tile goes out of view - but
   * this statement is wrong (see checks for "tile.hasMultipleContents"
   * in Cesium3DTile). The conditions under which it is called are
   * completely unclear. They are related to some frame counters and the
   * tile state and some flags of the tile.
   *
   * This is a best (but "little") effort implementation: It simply
   * cancels ALL requests that are currently pending from this class.
   */
  cancelRequests() {
    if (CONDITIONAL_CONTENT_LOGGING) {
      console.log("Cancelling requests for Conditional3DTileContent");
    }
    for (const contentHandle of this._contentHandles.values()) {
      contentHandle.reset();
    }
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Implemented following the Multiple3DTileContent approach:
   *
   * Always returns <code>false</code>. Instead call <code>hasProperty</code>
   * for a specific inner content
   *
   * @param {number} batchId The batchId for the feature.
   * @param {string} name The case-sensitive name of the property.
   * @returns {boolean} <code>true</code> if the feature has this property; otherwise, <code>false</code>.
   */
  hasProperty(batchId, name) {
    return false;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Implemented following the Multiple3DTileContent approach:
   *
   * Always returns <code>undefined</code>. Instead call <code>getFeature</code>
   * for a specific inner content
   *
   * @param {number} batchId The batchId for the feature.
   * @returns {Cesium3DTileFeature} The corresponding {@link Cesium3DTileFeature} object.
   */
  getFeature(batchId) {
    return undefined;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @param {boolean} enabled Whether to enable or disable debug settings.
   * @param {Color|undefined} color The color to apply
   */
  applyDebugSettings(enabled, color) {
    this._lastDebugSettingsEnabled = enabled;
    this._lastDebugSettingsColor = color;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @param {Cesium3DTileStyle} style The style.
   */
  applyStyle(style) {
    this._lastStyle = style;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * @param {Cesium3DTileset} tileset The tileset containing this tile.
   * @param {FrameState} frameState The frame state.
   */
  update(tileset, frameState) {
    // Update the _loadedContentHandles cache. This will put all
    // content handles that are currently "loaded" into the cache,
    // and evict content handles that are not active and not
    // recently used, by calling "reset" on these handles,
    // destroying the content and its associated resources.
    this._unloadOldContent();

    // Apply the style to all contents that are currently rendered
    this._updateRenderedContentUris();
    for (const renderedContentUri of this._renderedContentUris) {
      const renderedContentHandle =
        this._contentHandles.get(renderedContentUri);
      if (defined(renderedContentHandle)) {
        renderedContentHandle.applyStyle(this._lastStyle);
      }
    }

    // Call update for all contents
    for (const contentHandle of this._contentHandles.values()) {
      contentHandle.updateContent(tileset, frameState);
    }

    // Hide all contents.
    const allLoadedContents = this._allLoadedContents;
    for (const content of allLoadedContents) {
      content.show = false;
    }

    // Show only the active contents.
    const renderedContents = this._renderedContents;
    for (const content of renderedContents) {
      content.show = true;
    }

    // Assign debug settings to all active contents
    const activeContentsDebug = this._activeLoadedContents;
    for (const content of activeContentsDebug) {
      // The applyDebugSettings call will override any style color
      // that was previously set. I'm not gonna sort this out.
      if (this._lastDebugSettingsEnabled) {
        content.applyDebugSettings(
          this._lastDebugSettingsEnabled,
          this._lastDebugSettingsColor,
        );
      }
    }
  }

  /**
   * Unload the least-recently used content.
   *
   * It will ensure that the "_loadedContentHandlesMaximumSize" is
   * at least as large as the number of contents that are currently
   * "active". And it will trim the size of the "_loadedContentHandles"
   * to this size, evicting (i.e. unloading the content of) the entries
   * that have been least recently used.
   */
  _unloadOldContent() {
    // Iterate over all content handles. If the content of a certain handle
    // is currently loaded, then store it in the loadedContentHandles.
    const contentHandleEntries = this._contentHandles.entries();
    const loadedContentHandles = this._loadedContentHandles;
    for (const [url, contentHandle] of contentHandleEntries) {
      if (!loadedContentHandles.has(url)) {
        const content = contentHandle.getContentOptional();
        if (defined(content)) {
          loadedContentHandles.set(url, contentHandle);
        }
      }
    }

    // Mark the "active" and "rendered" contents as "recently used", to
    // prevent them from being evicted from the loadedContentHandles cache
    const retainedContentUris = new Set([
      ...this._activeContentUris,
      ...this._renderedContentUris,
    ]);
    for (const activeContentUri of retainedContentUris) {
      if (loadedContentHandles.has(activeContentUri)) {
        loadedContentHandles.get(activeContentUri);
      }
    }

    // Ensure that at least the required number of contents
    // is retained
    this._loadedContentHandlesMaximumSize = Math.max(
      this._loadedContentHandlesMaximumSize,
      retainedContentUris.size,
    );

    // Trim the LRU cache to the target size, calling the
    // '_loadedContentHandleEvicted' for the least recently
    // used content handles.
    loadedContentHandles.trimToSize(this._loadedContentHandlesMaximumSize);
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   *
   * Find an intersection between a ray and the tile content surface of
   * a content that is currently "rendered".
   *
   * The ray must be given in world coordinates.
   *
   * @param {Ray} ray The ray to test for intersection.
   * @param {FrameState} frameState The frame state.
   * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
   * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
   */
  pick(ray, frameState, result) {
    let intersection;
    let minDistance = Number.POSITIVE_INFINITY;
    const contents = this._renderedContents;
    const length = contents.length;

    for (let i = 0; i < length; ++i) {
      const candidate = contents[i].pick(ray, frameState, result);

      if (!defined(candidate)) {
        continue;
      }

      const distance = Cartesian3.distance(ray.origin, candidate);
      if (distance < minDistance) {
        intersection = candidate;
        minDistance = distance;
      }
    }

    if (!defined(intersection)) {
      return undefined;
    }
    return result;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  isDestroyed() {
    return false;
  }

  /**
   * Part of the {@link Cesium3DTileContent} interface.
   */
  destroy() {
    const allLoadedContents = this._allLoadedContents;
    for (const content of allLoadedContents) {
      content.destroy();
    }
    return destroyObject(this);
  }

  /**
   * Only intended for testing:
   *
   * Wait until all pending promises from content requests are
   * either resolved or rejected.
   */
  async waitForSpecs() {
    for (const contentHandle of this._contentHandles.values()) {
      await contentHandle.waitForSpecs();
    }
  }
}

export default Conditional3DTileContent;
