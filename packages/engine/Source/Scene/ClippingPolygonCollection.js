import Cartesian2 from "../Core/Cartesian2.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import Intersect from "../Core/Intersect.js";
import PixelFormat from "../Core/PixelFormat.js";
import Rectangle from "../Core/Rectangle.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import RuntimeError from "../Core/RuntimeError.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import TextureMagnificationFilter from "../Renderer/TextureMagnificationFilter.js";
import TextureMinificationFilter from "../Renderer/TextureMinificationFilter.js";
import TextureWrap from "../Renderer/TextureWrap.js";
import ClippingPolygon from "./ClippingPolygon.js";
import ComputeCommand from "../Renderer/ComputeCommand.js";
import PolygonSignedDistanceFS from "../Shaders/PolygonSignedDistanceFS.js";

/**
 * Specifies a set of clipping polygons. Clipping polygons selectively disable rendering in a region
 * inside or outside the specified list of {@link ClippingPolygon} objects for a single glTF model, 3D Tileset, or the globe.
 *
 * Clipping Polygons are only supported in WebGL 2 contexts.
 *
 * @alias ClippingPolygonCollection
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {ClippingPolygon[]} [options.polygons=[]] An array of {@link ClippingPolygon} objects used to selectively disable rendering on the inside of each polygon.
 * @param {boolean} [options.enabled=true] Determines whether the clipping polygons are active.
 * @param {boolean} [options.inverse=false] If true, a region will be clipped if it is outside of every polygon in the collection. Otherwise, a region will only be clipped if it is on the inside of any polygon.
 *
 * @example
 * const positions = Cesium.Cartesian3.fromRadiansArray([
 *     -1.3194369277314022,
 *     0.6988062530900625,
 *     -1.31941,
 *     0.69879,
 *     -1.3193955980204217,
 *     0.6988091578771254,
 *     -1.3193931220959367,
 *     0.698743632490865,
 *     -1.3194358224045408,
 *     0.6987471965556998,
 * ]);
 *
 * const polygon = new Cesium.ClippingPolygon({
 *     positions: positions
 * });
 *
 * const polygons = new Cesium.ClippingPolygonCollection({
 *    polygons: [ polygon ]
 * });
 */
function ClippingPolygonCollection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._polygons = [];
  this._totalPositions = 0;

  /**
   * If true, clipping will be enabled.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {boolean}
   * @default true
   */
  this.enabled = defaultValue(options.enabled, true);

  /**
   * If true, a region will be clipped if it is outside of every polygon in the
   * collection. Otherwise, a region will only be clipped if it is
   * inside of any polygon.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {boolean}
   * @default false
   */
  this.inverse = defaultValue(options.inverse, false);

  /**
   * An event triggered when a new clipping polygon is added to the collection.  Event handlers
   * are passed the new polygon and the index at which it was added.
   * @type {Event}
   * @default Event()
   */
  this.polygonAdded = new Event();

  /**
   * An event triggered when a new clipping polygon is removed from the collection.  Event handlers
   * are passed the new polygon and the index from which it was removed.
   * @type {Event}
   * @default Event()
   */
  this.polygonRemoved = new Event();

  // If this ClippingPolygonCollection has an owner, only its owner should update or destroy it.
  // This is because in a Cesium3DTileset multiple models may reference the tileset's ClippingPolygonCollection.
  this._owner = undefined;

  this._float32View = undefined;
  this._extentsFloat32View = undefined;
  this._extentsCount = 0;

  this._polygonsTexture = undefined;
  this._extentsTexture = undefined;
  this._signedDistanceTexture = undefined;

  this._signedDistanceComputeCommand = undefined;

  // Add each ClippingPolygon object.
  const polygons = options.polygons;
  if (defined(polygons)) {
    const polygonsLength = polygons.length;
    for (let i = 0; i < polygonsLength; ++i) {
      this._polygons.push(polygons[i]);
    }
  }
}

Object.defineProperties(ClippingPolygonCollection.prototype, {
  /**
   * Returns the number of polygons in this collection.  This is commonly used with
   * {@link ClippingPolygonCollection#get} to iterate over all the polygons
   * in the collection.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._polygons.length;
    },
  },

  /**
   * Returns the total number of positions in all polygons in the collection.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {number}
   * @readonly
   * @private
   */
  totalPositions: {
    get: function () {
      return this._totalPositions;
    },
  },

  /**
   * Returns a texture containing the packed computed spherical extents for each polygon
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  extentsTexture: {
    get: function () {
      return this._extentsTexture;
    },
  },

  /**
   * Returns the number of packed extents, which can be fewer than the number of polygons.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {number}
   * @readonly
   * @private
   */
  extentsCount: {
    get: function () {
      return this._extentsCount;
    },
  },

  /**
   * Returns the number of pixels needed in the texture containing the packed computed spherical extents for each polygon.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {number}
   * @readonly
   * @private
   */
  pixelsNeededForExtents: {
    get: function () {
      return this.length; // With an RGBA texture, each pixel contains min/max latitude and longitude.
    },
  },

  /**
   * Returns the number of pixels needed in the texture containing the packed polygon positions.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {number}
   * @readonly
   * @private
   */
  pixelsNeededForPolygonPositions: {
    get: function () {
      // In an RG FLOAT texture, each polygon position is 2 floats packed to a RG.
      // Each polygon is the number of positions of that polygon, followed by the list of positions
      return this.totalPositions + this.length;
    },
  },

  /**
   * Returns a texture containing the computed signed distance of each polygon.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  clippingTexture: {
    get: function () {
      return this._signedDistanceTexture;
    },
  },

  /**
   * A reference to the ClippingPolygonCollection's owner, if any.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @readonly
   * @private
   */
  owner: {
    get: function () {
      return this._owner;
    },
  },

  /**
   * Returns a number encapsulating the state for this ClippingPolygonCollection.
   *
   * Clipping mode is encoded in the sign of the number, which is just the total position count.
   * If this value changes, then shader regeneration is necessary.
   *
   * @memberof ClippingPolygonCollection.prototype
   * @returns {number} A Number that describes the ClippingPolygonCollection's state.
   * @readonly
   * @private
   */
  clippingPolygonsState: {
    get: function () {
      return this.inverse ? -this.extentsCount : this.extentsCount;
    },
  },
});

/**
 * Adds the specified {@link ClippingPolygon} to the collection to be used to selectively disable rendering
 * on the inside of each polygon. Use {@link ClippingPolygonCollection#unionClippingRegions} to modify
 * how modify the clipping behavior of multiple polygons.
 *
 * @param {ClippingPolygon} polygon The ClippingPolygon to add to the collection.
 * @returns {ClippingPolygon} The added ClippingPolygon.
 *
 * @example
 * const polygons = new Cesium.ClippingPolygonCollection();
 *
 * const positions = Cesium.Cartesian3.fromRadiansArray([
 *     -1.3194369277314022,
 *     0.6988062530900625,
 *     -1.31941,
 *     0.69879,
 *     -1.3193955980204217,
 *     0.6988091578771254,
 *     -1.3193931220959367,
 *     0.698743632490865,
 *     -1.3194358224045408,
 *     0.6987471965556998,
 * ]);
 *
 * polygons.add(new Cesium.ClippingPolygon({
 *     positions: positions
 * }));
 *
 *
 *
 * @see ClippingPolygonCollection#remove
 * @see ClippingPolygonCollection#removeAll
 */
ClippingPolygonCollection.prototype.add = function (polygon) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygon", polygon);
  //>>includeEnd('debug');

  const newPlaneIndex = this._polygons.length;
  this._polygons.push(polygon);
  this.polygonAdded.raiseEvent(polygon, newPlaneIndex);
  return polygon;
};

/**
 * Returns the clipping polygon in the collection at the specified index.  Indices are zero-based
 * and increase as polygons are added.  Removing a polygon polygon all polygons after
 * it to the left, changing their indices.  This function is commonly used with
 * {@link ClippingPolygonCollection#length} to iterate over all the polygons
 * in the collection.
 *
 * @param {number} index The zero-based index of the polygon.
 * @returns {ClippingPolygon} The ClippingPolygon at the specified index.
 *
 * @see ClippingPolygonCollection#length
 */
ClippingPolygonCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("index", index);
  //>>includeEnd('debug');

  return this._polygons[index];
};

/**
 * Checks whether this collection contains a ClippingPolygon equal to the given ClippingPolygon.
 *
 * @param {ClippingPolygon} polygon The ClippingPolygon to check for.
 * @returns {boolean} true if this collection contains the ClippingPolygon, false otherwise.
 *
 * @see ClippingPolygonCollection#get
 */
ClippingPolygonCollection.prototype.contains = function (polygon) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygon", polygon);
  //>>includeEnd('debug');

  return this._polygons.some((p) => ClippingPolygon.equals(p, polygon));
};

/**
 * Removes the first occurrence of the given ClippingPolygon from the collection.
 *
 * @param {ClippingPolygon} polygon
 * @returns {boolean} <code>true</code> if the polygon was removed; <code>false</code> if the polygon was not found in the collection.
 *
 * @see ClippingPolygonCollection#add
 * @see ClippingPolygonCollection#contains
 * @see ClippingPolygonCollection#removeAll
 */
ClippingPolygonCollection.prototype.remove = function (polygon) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygon", polygon);
  //>>includeEnd('debug');

  const polygons = this._polygons;
  const index = polygons.findIndex((p) => ClippingPolygon.equals(p, polygon));

  if (index === -1) {
    return false;
  }

  polygons.splice(index, 1);

  this.polygonRemoved.raiseEvent(polygon, index);
  return true;
};

const scratchRectangle = new Rectangle();

// Map the polygons to a list of extents-- Overlapping extents will be merged
// into a single encompassing extent
function getExtents(polygons) {
  const extentsList = [];
  const polygonIndicesList = [];

  const length = polygons.length;
  for (let polygonIndex = 0; polygonIndex < length; ++polygonIndex) {
    const polygon = polygons[polygonIndex];
    const extents = polygon.computeSphericalExtents();

    let height = Math.max(extents.height * 2.5, 0.001);
    let width = Math.max(extents.width * 2.5, 0.001);

    // Pad extents to avoid floating point error when fragment culling at edges.
    let paddedExtents = Rectangle.clone(extents);
    paddedExtents.south -= height;
    paddedExtents.west -= width;
    paddedExtents.north += height;
    paddedExtents.east += width;

    paddedExtents.south = Math.max(paddedExtents.south, -Math.PI);
    paddedExtents.west = Math.max(paddedExtents.west, -Math.PI);
    paddedExtents.north = Math.min(paddedExtents.north, Math.PI);
    paddedExtents.east = Math.min(paddedExtents.east, Math.PI);

    const polygonIndices = [polygonIndex];
    for (let i = 0; i < extentsList.length; ++i) {
      const e = extentsList[i];
      if (
        defined(e) &&
        defined(Rectangle.simpleIntersection(e, paddedExtents)) &&
        !Rectangle.equals(e, paddedExtents)
      ) {
        const intersectingPolygons = polygonIndicesList[i];
        polygonIndices.push(...intersectingPolygons);
        intersectingPolygons.reduce(
          (extents, p) =>
            Rectangle.union(
              polygons[p].computeSphericalExtents(scratchRectangle),
              extents,
              extents
            ),
          extents
        );

        extentsList[i] = undefined;
        polygonIndicesList[i] = undefined;

        height = Math.max(extents.height * 2.5, 0.001);
        width = Math.max(extents.width * 2.5, 0.001);

        paddedExtents = Rectangle.clone(extents, paddedExtents);
        paddedExtents.south -= height;
        paddedExtents.west -= width;
        paddedExtents.north += height;
        paddedExtents.east += width;

        paddedExtents.south = Math.max(paddedExtents.south, -Math.PI);
        paddedExtents.west = Math.max(paddedExtents.west, -Math.PI);
        paddedExtents.north = Math.min(paddedExtents.north, Math.PI);
        paddedExtents.east = Math.min(paddedExtents.east, Math.PI);

        // Reiterate through the extents list until there are no more intersections
        i = -1;
      }
    }

    extentsList.push(paddedExtents);
    polygonIndicesList.push(polygonIndices);
  }

  const extentsIndexByPolygon = new Map();
  polygonIndicesList
    .filter(defined)
    .forEach((polygonIndices, e) =>
      polygonIndices.forEach((p) => extentsIndexByPolygon.set(p, e))
    );

  return {
    extentsList: extentsList.filter(defined),
    extentsIndexByPolygon: extentsIndexByPolygon,
  };
}

/**
 * Removes all polygons from the collection.
 *
 * @see ClippingPolygonCollection#add
 * @see ClippingPolygonCollection#remove
 */
ClippingPolygonCollection.prototype.removeAll = function () {
  // Dereference this ClippingPolygonCollection from all ClippingPolygons
  const polygons = this._polygons;
  const polygonsCount = polygons.length;
  for (let i = 0; i < polygonsCount; ++i) {
    const polygon = polygons[i];
    this.polygonRemoved.raiseEvent(polygon, i);
  }
  this._polygons = [];
};

function packPolygonsAsFloats(clippingPolygonCollection) {
  const polygonsFloat32View = clippingPolygonCollection._float32View;
  const extentsFloat32View = clippingPolygonCollection._extentsFloat32View;
  const polygons = clippingPolygonCollection._polygons;

  const { extentsList, extentsIndexByPolygon } = getExtents(polygons);

  let floatIndex = 0;
  for (const [polygonIndex, polygon] of polygons.entries()) {
    // Pack the length of the polygon into the polygon texture array buffer
    const length = polygon.length;
    polygonsFloat32View[floatIndex++] = length;
    polygonsFloat32View[floatIndex++] = extentsIndexByPolygon.get(polygonIndex);

    // Pack the polygon positions into the polygon texture array buffer
    for (let i = 0; i < length; ++i) {
      const spherePoint = polygon.positions[i];

      // Project into plane with vertical for latitude
      const magXY = Math.hypot(spherePoint.x, spherePoint.y);

      // Use fastApproximateAtan2 for alignment with shader
      const latitudeApproximation = CesiumMath.fastApproximateAtan2(
        magXY,
        spherePoint.z
      );
      const longitudeApproximation = CesiumMath.fastApproximateAtan2(
        spherePoint.x,
        spherePoint.y
      );

      polygonsFloat32View[floatIndex++] = latitudeApproximation;
      polygonsFloat32View[floatIndex++] = longitudeApproximation;
    }
  }

  // Pack extents
  let extentsFloatIndex = 0;
  for (const extents of extentsList) {
    const longitudeRangeInverse = 1.0 / (extents.east - extents.west);
    const latitudeRangeInverse = 1.0 / (extents.north - extents.south);

    extentsFloat32View[extentsFloatIndex++] = extents.south;
    extentsFloat32View[extentsFloatIndex++] = extents.west;
    extentsFloat32View[extentsFloatIndex++] = latitudeRangeInverse;
    extentsFloat32View[extentsFloatIndex++] = longitudeRangeInverse;
  }

  clippingPolygonCollection._extentsCount = extentsList.length;
}

const textureResolutionScratch = new Cartesian2();
/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * build the resources for clipping polygons.
 * <p>
 * Do not call this function directly.
 * </p>
 * @private
 * @throws {RuntimeError} ClippingPolygonCollections are only supported for WebGL 2
 */
ClippingPolygonCollection.prototype.update = function (frameState) {
  const context = frameState.context;

  if (!ClippingPolygonCollection.isSupported(frameState)) {
    throw new RuntimeError(
      "ClippingPolygonCollections are only supported for WebGL 2."
    );
  }

  // It'd be expensive to validate any individual position has changed. Instead verify if the list of polygon positions has had elements added or removed, which should be good enough for most cases.
  const totalPositions = this._polygons.reduce(
    (totalPositions, polygon) => totalPositions + polygon.length,
    0
  );

  if (totalPositions === this.totalPositions) {
    return;
  }

  this._totalPositions = totalPositions;

  // If there are no clipping polygons, there's nothing to update.
  if (this.length === 0) {
    return;
  }

  if (defined(this._signedDistanceComputeCommand)) {
    this._signedDistanceComputeCommand.canceled = true;
    this._signedDistanceComputeCommand = undefined;
  }

  let polygonsTexture = this._polygonsTexture;
  let extentsTexture = this._extentsTexture;
  let signedDistanceTexture = this._signedDistanceTexture;
  if (defined(polygonsTexture)) {
    const currentPixelCount = polygonsTexture.width * polygonsTexture.height;
    // Recreate the texture to double current requirement if it isn't big enough or is 4 times larger than it needs to be.
    // Optimization note: this isn't exactly the classic resizeable array algorithm
    // * not necessarily checking for resize after each add/remove operation
    // * random-access deletes instead of just pops
    // * alloc ops likely more expensive than demonstrable via big-O analysis
    if (
      currentPixelCount < this.pixelsNeededForPolygonPositions ||
      this.pixelsNeededForPolygonPositions < 0.25 * currentPixelCount
    ) {
      polygonsTexture.destroy();
      polygonsTexture = undefined;
      this._polygonsTexture = undefined;
    }
  }

  if (!defined(polygonsTexture)) {
    const requiredResolution = ClippingPolygonCollection.getTextureResolution(
      polygonsTexture,
      this.pixelsNeededForPolygonPositions,
      textureResolutionScratch
    );

    polygonsTexture = new Texture({
      context: context,
      width: requiredResolution.x,
      height: requiredResolution.y,
      pixelFormat: PixelFormat.RG,
      pixelDatatype: PixelDatatype.FLOAT,
      sampler: Sampler.NEAREST,
      flipY: false,
    });
    this._float32View = new Float32Array(
      requiredResolution.x * requiredResolution.y * 2
    );
    this._polygonsTexture = polygonsTexture;
  }

  if (defined(extentsTexture)) {
    const currentPixelCount = extentsTexture.width * extentsTexture.height;
    // Recreate the texture to double current requirement if it isn't big enough or is 4 times larger than it needs to be.
    // Optimization note: this isn't exactly the classic resizeable array algorithm
    // * not necessarily checking for resize after each add/remove operation
    // * random-access deletes instead of just pops
    // * alloc ops likely more expensive than demonstrable via big-O analysis
    if (
      currentPixelCount < this.pixelsNeededForExtents ||
      this.pixelsNeededForExtents < 0.25 * currentPixelCount
    ) {
      extentsTexture.destroy();
      extentsTexture = undefined;
      this._extentsTexture = undefined;
    }
  }

  if (!defined(extentsTexture)) {
    const requiredResolution = ClippingPolygonCollection.getTextureResolution(
      extentsTexture,
      this.pixelsNeededForExtents,
      textureResolutionScratch
    );

    extentsTexture = new Texture({
      context: context,
      width: requiredResolution.x,
      height: requiredResolution.y,
      pixelFormat: PixelFormat.RGBA,
      pixelDatatype: PixelDatatype.FLOAT,
      sampler: Sampler.NEAREST,
      flipY: false,
    });
    this._extentsFloat32View = new Float32Array(
      requiredResolution.x * requiredResolution.y * 4
    );

    this._extentsTexture = extentsTexture;
  }

  packPolygonsAsFloats(this);

  extentsTexture.copyFrom({
    source: {
      width: extentsTexture.width,
      height: extentsTexture.height,
      arrayBufferView: this._extentsFloat32View,
    },
  });

  polygonsTexture.copyFrom({
    source: {
      width: polygonsTexture.width,
      height: polygonsTexture.height,
      arrayBufferView: this._float32View,
    },
  });

  if (!defined(signedDistanceTexture)) {
    const textureDimensions = ClippingPolygonCollection.getClippingDistanceTextureResolution(
      this,
      textureResolutionScratch
    );
    signedDistanceTexture = new Texture({
      context: context,
      width: textureDimensions.x,
      height: textureDimensions.y,
      pixelFormat: context.webgl2 ? PixelFormat.RED : PixelFormat.LUMINANCE,
      pixelDatatype: PixelDatatype.FLOAT,
      sampler: new Sampler({
        wrapS: TextureWrap.CLAMP_TO_EDGE,
        wrapT: TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: TextureMinificationFilter.LINEAR,
        magnificationFilter: TextureMagnificationFilter.LINEAR,
      }),
      flipY: false,
    });

    this._signedDistanceTexture = signedDistanceTexture;
  }

  this._signedDistanceComputeCommand = createSignedDistanceTextureCommand(this);
};

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * build the resources for clipping polygons.
 * <p>
 * Do not call this function directly.
 * </p>
 * @private
 * @param {FrameState} frameState
 */
ClippingPolygonCollection.prototype.queueCommands = function (frameState) {
  if (defined(this._signedDistanceComputeCommand)) {
    frameState.commandList.push(this._signedDistanceComputeCommand);
  }
};

function createSignedDistanceTextureCommand(collection) {
  const polygonTexture = collection._polygonsTexture;
  const extentsTexture = collection._extentsTexture;

  return new ComputeCommand({
    fragmentShaderSource: PolygonSignedDistanceFS,
    outputTexture: collection._signedDistanceTexture,
    uniformMap: {
      u_polygonsLength: function () {
        return collection.length;
      },
      u_extentsLength: function () {
        return collection.extentsCount;
      },
      u_extentsTexture: function () {
        return extentsTexture;
      },
      u_polygonTexture: function () {
        return polygonTexture;
      },
    },
    persists: false,
    owner: collection,
    postExecute: () => {
      collection._signedDistanceComputeCommand = undefined;
    },
  });
}

const scratchRectangleTile = new Rectangle();
const scratchRectangleIntersection = new Rectangle();
/**
 * Determines the type intersection with the polygons of this ClippingPolygonCollection instance and the specified {@link TileBoundingVolume}.
 * @private
 *
 * @param {object} tileBoundingVolume The volume to determine the intersection with the polygons.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid on which the bounding volumes are defined.
 * @returns {Intersect} The intersection type: {@link Intersect.OUTSIDE} if the entire volume is not clipped, {@link Intersect.INSIDE}
 *                      if the entire volume should be clipped, and {@link Intersect.INTERSECTING} if the volume intersects the polygons and will partially clipped.
 */
ClippingPolygonCollection.prototype.computeIntersectionWithBoundingVolume = function (
  tileBoundingVolume,
  ellipsoid
) {
  const polygons = this._polygons;
  const length = polygons.length;

  let intersection = Intersect.OUTSIDE;
  if (this.inverse) {
    intersection = Intersect.INSIDE;
  }

  for (let i = 0; i < length; ++i) {
    const polygon = polygons[i];

    const polygonBoundingRectangle = polygon.computeRectangle();
    let tileBoundingRectangle = tileBoundingVolume.rectangle;
    if (
      !defined(tileBoundingRectangle) &&
      defined(tileBoundingVolume.boundingVolume?.computeCorners)
    ) {
      const points = tileBoundingVolume.boundingVolume.computeCorners();
      tileBoundingRectangle = Rectangle.fromCartesianArray(
        points,
        ellipsoid,
        scratchRectangleTile
      );
    }

    if (!defined(tileBoundingRectangle)) {
      tileBoundingRectangle = Rectangle.fromBoundingSphere(
        tileBoundingVolume.boundingSphere,
        ellipsoid,
        scratchRectangleTile
      );
    }

    const result = Rectangle.simpleIntersection(
      tileBoundingRectangle,
      polygonBoundingRectangle,
      scratchRectangleIntersection
    );

    if (defined(result)) {
      intersection = Intersect.INTERSECTING;
    }
  }

  return intersection;
};

/**
 * Sets the owner for the input ClippingPolygonCollection if there wasn't another owner.
 * Destroys the owner's previous ClippingPolygonCollection if setting is successful.
 *
 * @param {ClippingPolygonCollection} [clippingPolygonsCollection] A ClippingPolygonCollection (or undefined) being attached to an object
 * @param {object} owner An Object that should receive the new ClippingPolygonCollection
 * @param {string} key The Key for the Object to reference the ClippingPolygonCollection
 * @private
 */
ClippingPolygonCollection.setOwner = function (
  clippingPolygonsCollection,
  owner,
  key
) {
  // Don't destroy the ClippingPolygonCollection if it is already owned by newOwner
  if (clippingPolygonsCollection === owner[key]) {
    return;
  }
  // Destroy the existing ClippingPolygonCollection, if any
  owner[key] = owner[key] && owner[key].destroy();
  if (defined(clippingPolygonsCollection)) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(clippingPolygonsCollection._owner)) {
      throw new DeveloperError(
        "ClippingPolygonCollection should only be assigned to one object"
      );
    }
    //>>includeEnd('debug');
    clippingPolygonsCollection._owner = owner;
    owner[key] = clippingPolygonsCollection;
  }
};

/**
 * Function for checking if the context will allow clipping polygons, which require floating point textures.
 *
 * @param {Scene|object} scene The scene that will contain clipped objects and clipping textures.
 * @returns {boolean} <code>true</code> if the context supports clipping polygons.
 */
ClippingPolygonCollection.isSupported = function (scene) {
  return scene?.context.webgl2;
};

/**
 * Function for getting packed texture resolution.
 * If the ClippingPolygonCollection hasn't been updated, returns the resolution that will be
 * allocated based on the provided needed pixels.
 *
 * @param {Texture} texture The texture to be packed.
 * @param {number} pixelsNeeded The number of pixels needed based on the current polygon count.
 * @param {Cartesian2} result A Cartesian2 for the result.
 * @returns {Cartesian2} The required resolution.
 * @private
 */
ClippingPolygonCollection.getTextureResolution = function (
  texture,
  pixelsNeeded,
  result
) {
  if (defined(texture)) {
    result.x = texture.width;
    result.y = texture.height;
    return result;
  }

  const maxSize = ContextLimits.maximumTextureSize;
  result.x = Math.min(pixelsNeeded, maxSize);
  result.y = Math.ceil(pixelsNeeded / result.x);

  // Allocate twice as much space as needed to avoid frequent texture reallocation.
  result.y *= 2;

  return result;
};

/**
 * Function for getting the clipping collection's signed distance texture resolution.
 * If the ClippingPolygonCollection hasn't been updated, returns the resolution that will be
 * allocated based on the current settings
 *
 * @param {ClippingPolygonCollection} clippingPolygonCollection The clipping polygon collection
 * @param {Cartesian2} result A Cartesian2 for the result.
 * @returns {Cartesian2} The required resolution.
 * @private
 */
ClippingPolygonCollection.getClippingDistanceTextureResolution = function (
  clippingPolygonCollection,
  result
) {
  const texture = clippingPolygonCollection.signedDistanceTexture;
  if (defined(texture)) {
    result.x = texture.width;
    result.y = texture.height;
    return result;
  }

  result.x = Math.min(ContextLimits.maximumTextureSize, 4096);
  result.y = Math.min(ContextLimits.maximumTextureSize, 4096);

  return result;
};

/**
 * Function for getting the clipping collection's extents texture resolution.
 * If the ClippingPolygonCollection hasn't been updated, returns the resolution that will be
 * allocated based on the current polygon count.
 *
 * @param {ClippingPolygonCollection} clippingPolygonCollection The clipping polygon collection
 * @param {Cartesian2} result A Cartesian2 for the result.
 * @returns {Cartesian2} The required resolution.
 * @private
 */
ClippingPolygonCollection.getClippingExtentsTextureResolution = function (
  clippingPolygonCollection,
  result
) {
  const texture = clippingPolygonCollection.extentsTexture;
  if (defined(texture)) {
    result.x = texture.width;
    result.y = texture.height;
    return result;
  }

  return ClippingPolygonCollection.getTextureResolution(
    texture,
    clippingPolygonCollection.pixelsNeededForExtents,
    result
  );
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see ClippingPolygonCollection#destroy
 */
ClippingPolygonCollection.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * clippingPolygons = clippingPolygons && clippingPolygons.destroy();
 *
 * @see ClippingPolygonCollection#isDestroyed
 */
ClippingPolygonCollection.prototype.destroy = function () {
  if (defined(this._signedDistanceComputeCommand)) {
    this._signedDistanceComputeCommand.canceled = true;
  }

  this._polygonsTexture =
    this._polygonsTexture && this._polygonsTexture.destroy();
  this._extentsTexture = this._extentsTexture && this._extentsTexture.destroy();
  this._signedDistanceTexture =
    this._signedDistanceTexture && this._signedDistanceTexture.destroy();
  return destroyObject(this);
};

export default ClippingPolygonCollection;
