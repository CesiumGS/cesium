import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";

/**
 * A cumulus cloud billboard positioned in the 3D scene, that is created and rendered using a {@link CloudCollection}.
 * A cloud is created and its initial properties are set by calling {@link CloudCollection#add}.
 * and {@link CloudCollection#remove}.
 * <br /><br />
 * <div align='center'>
 * <img src='Images/CumulusCloud.png' width='400' height='300' /><br />
 * Example cumulus clouds
 * </div>
 * @alias CumulusCloud
 *
 * @performance Similar to {@link Billboard}, reading a property, e.g., {@link CumulusCloud#show},
 * takes constant time. Assigning to a property is constant time but results in
 * CPU to GPU traffic when {@link CloudCollection#update} is called.  The per-cloud traffic is
 * the same regardless of how many properties were updated.  If most clouds in a collection need to be
 * updated, it may be more efficient to clear the collection with {@link CloudCollection#removeAll}
 * and add new clouds instead of modifying each one.
 *
 * @see CloudCollection
 * @see CloudCollection#add
 *
 * @internalConstructor
 * @class
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Cloud%20Parameters.html|Cesium Sandcastle Cloud Parameters Demo}
 */
function CumulusCloud(options, cloudCollection) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._show = defaultValue(options.show, true);

  this._position = Cartesian3.clone(
    defaultValue(options.position, Cartesian3.ZERO)
  );

  if (!defined(options.scale) && defined(options.maximumSize)) {
    this._maximumSize = Cartesian3.clone(options.maximumSize);
    this._scale = new Cartesian2(this._maximumSize.x, this._maximumSize.y);
  } else {
    this._scale = Cartesian2.clone(
      defaultValue(options.scale, new Cartesian2(20.0, 12.0))
    );

    const defaultMaxSize = new Cartesian3(
      this._scale.x,
      this._scale.y,
      Math.min(this._scale.x, this._scale.y) / 1.5
    );
    this._maximumSize = Cartesian3.clone(
      defaultValue(options.maximumSize, defaultMaxSize)
    );
  }

  this._slice = defaultValue(options.slice, -1.0);
  this._color = Color.clone(defaultValue(options.color, Color.WHITE));
  this._brightness = defaultValue(options.brightness, 1.0);
  this._cloudCollection = cloudCollection;
  this._index = -1; // Used by CloudCollection
}

const SHOW_INDEX = (CumulusCloud.SHOW_INDEX = 0);
const POSITION_INDEX = (CumulusCloud.POSITION_INDEX = 1);
const SCALE_INDEX = (CumulusCloud.SCALE_INDEX = 2);
const MAXIMUM_SIZE_INDEX = (CumulusCloud.MAXIMUM_SIZE_INDEX = 3);
const SLICE_INDEX = (CumulusCloud.SLICE_INDEX = 4);
const BRIGHTNESS_INDEX = (CumulusCloud.BRIGHTNESS_INDEX = 5);
const COLOR_INDEX = (CumulusCloud.COLOR_INDEX = 6);
CumulusCloud.NUMBER_OF_PROPERTIES = 7;

function makeDirty(cloud, propertyChanged) {
  const cloudCollection = cloud._cloudCollection;
  if (defined(cloudCollection)) {
    cloudCollection._updateCloud(cloud, propertyChanged);
    cloud._dirty = true;
  }
}

Object.defineProperties(CumulusCloud.prototype, {
  /**
   * Determines if this cumulus cloud will be shown.  Use this to hide or show a cloud, instead
   * of removing it and re-adding it to the collection.
   * @memberof CumulusCloud.prototype
   * @type {Boolean}
   * @default true
   */
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("value", value);
      //>>includeEnd('debug');

      if (this._show !== value) {
        this._show = value;
        makeDirty(this, SHOW_INDEX);
      }
    },
  },

  /**
   * Gets or sets the Cartesian position of this cumulus cloud.
   * @memberof CumulusCloud.prototype
   * @type {Cartesian3}
   */
  position: {
    get: function () {
      return this._position;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      const position = this._position;
      if (!Cartesian3.equals(position, value)) {
        Cartesian3.clone(value, position);
        makeDirty(this, POSITION_INDEX);
      }
    },
  },

  /**
   * <p>Gets or sets the scale of the cumulus cloud billboard in meters.
   * The <code>scale</code> property will affect the size of the billboard,
   * but not the cloud's actual appearance.</p>
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'>
   *   <code>cloud.scale = new Cesium.Cartesian2(12, 8);</code><br/>
   *   <img src='Images/CumulusCloud.scalex12y8.png' width='250' height='158' />
   * </td>
   * <td align='center'>
   *   <code>cloud.scale = new Cesium.Cartesian2(24, 10);</code><br/>
   *   <img src='Images/CumulusCloud.scalex24y10.png' width='250' height='158' />
   * </td>
   * </tr></table>
   * </div>
   *
   * <p>To modify the cloud's appearance, modify its <code>maximumSize</code>
   * and <code>slice</code> properties.</p>
   * @memberof CumulusCloud.prototype
   * @type {Cartesian2}
   *
   * @see CumulusCloud#maximumSize
   * @see CumulusCloud#slice
   */
  scale: {
    get: function () {
      return this._scale;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      const scale = this._scale;
      if (!Cartesian2.equals(scale, value)) {
        Cartesian2.clone(value, scale);
        makeDirty(this, SCALE_INDEX);
      }
    },
  },

  /**
   * <p>Gets or sets the maximum size of the cumulus cloud rendered on the billboard.
   * This defines a maximum ellipsoid volume that the cloud can appear in.
   * Rather than guaranteeing a specific size, this specifies a boundary for the
   * cloud to appear in, and changing it can affect the shape of the cloud.</p>
   * <p>Changing the z-value of <code>maximumSize</code> has the most dramatic effect
   * on the cloud's appearance because it changes the depth of the cloud, and thus the
   * positions at which the cloud-shaping texture is sampled.</p>
   * <div align='center'>
   * <table border='0' cellpadding='5'>
   * <tr>
   *   <td align='center'>
   *     <code>cloud.maximumSize = new Cesium.Cartesian3(14, 9, 10);</code><br/>
   *     <img src='Images/CumulusCloud.maximumSizex14y9z10.png' width='250' height='158' />
   *   </td>
   *   <td align='center'>
   *     <code>cloud.maximumSize.x = 25;</code><br/>
   *     <img src='Images/CumulusCloud.maximumSizex25.png' width='250' height='158' />
   *   </td>
   * </tr>
   * <tr>
   *   <td align='center'>
   *     <code>cloud.maximumSize.y = 5;</code><br/>
   *     <img src='Images/CumulusCloud.maximumSizey5.png' width='250' height='158' />
   *   </td>
   *   <td align='center'>
   *     <code>cloud.maximumSize.z = 17;</code><br/>
   *     <img src='Images/CumulusCloud.maximumSizez17.png' width='250' height='158' />
   *   </td>
   * </tr>
   * </table>
   * </div>
   *
   * <p>To modify the billboard's actual size, modify the cloud's <code>scale</code> property.</p>
   * @memberof CumulusCloud.prototype
   * @type {Cartesian3}
   *
   * @see CumulusCloud#scale
   */
  maximumSize: {
    get: function () {
      return this._maximumSize;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      const maximumSize = this._maximumSize;
      if (!Cartesian3.equals(maximumSize, value)) {
        Cartesian3.clone(value, maximumSize);
        makeDirty(this, MAXIMUM_SIZE_INDEX);
      }
    },
  },
  /**
   * Sets the color of the cloud
   * @memberof CumulusCloud.prototype
   * @type {Color}
   * @default Color.WHITE
   */
  color: {
    get: function () {
      return this._color;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      const color = this._color;
      if (!Color.equals(color, value)) {
        Color.clone(value, color);
        makeDirty(this, COLOR_INDEX);
      }
    },
  },
  /**
   * <p>Gets or sets the "slice" of the cloud that is rendered on the billboard, i.e.
   * the specific cross-section of the cloud chosen for the billboard's appearance.
   * Given a value between 0 and 1, the slice specifies how deeply into the cloud
   * to intersect based on its maximum size in the z-direction.</p>
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><code>cloud.slice = 0.32;</code><br/><img src='Images/CumulusCloud.slice0.32.png' width='250' height='158' /></td>
   * <td align='center'><code>cloud.slice = 0.5;</code><br/><img src='Images/CumulusCloud.slice0.5.png' width='250' height='158' /></td>
   * <td align='center'><code>cloud.slice = 0.6;</code><br/><img src='Images/CumulusCloud.slice0.6.png' width='250' height='158' /></td>
   * </tr></table>
   * </div>
   *
   * <br />
   * <p>Due to the nature in which this slice is calculated,
   * values below <code>0.2</code> may result in cross-sections that are too small,
   * and the edge of the ellipsoid will be visible. Similarly, values above <code>0.7</code>
   * will cause the cloud to appear smaller. Values outside the range <code>[0.1, 0.9]</code>
   * should be avoided entirely because they do not produce desirable results.</p>
   *
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><code>cloud.slice = 0.08;</code><br/><img src='Images/CumulusCloud.slice0.08.png' width='250' height='158' /></td>
   * <td align='center'><code>cloud.slice = 0.8;</code><br/><img src='Images/CumulusCloud.slice0.8.png' width='250' height='158' /></td>
   * </tr></table>
   * </div>
   *
   * <p>If <code>slice</code> is set to a negative number, the cloud will not render a cross-section.
   * Instead, it will render the outside of the ellipsoid that is visible. For clouds with
   * small values of `maximumSize.z`, this can produce good-looking results, but for larger
   * clouds, this can result in a cloud that is undesirably warped to the ellipsoid volume.</p>
   *
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'>
   *  <code>cloud.slice = -1.0;<br/>cloud.maximumSize.z = 18;</code><br/>
   *  <img src='Images/CumulusCloud.slice-1z18.png' width='250' height='158' />
   * </td>
   * <td align='center'>
   *   <code>cloud.slice = -1.0;<br/>cloud.maximumSize.z = 30;</code><br/>
   *   <img src='Images/CumulusCloud.slice-1z30.png' width='250' height='158' /></td>
   * </tr></table>
   * </div>
   *
   * @memberof CumulusCloud.prototype
   * @type {Number}
   * @default -1.0
   */
  slice: {
    get: function () {
      return this._slice;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');

      const slice = this._slice;
      if (slice !== value) {
        this._slice = value;
        makeDirty(this, SLICE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the brightness of the cloud. This can be used to give clouds
   * a darker, grayer appearance.
   * <br /><br />
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><code>cloud.brightness = 1.0;</code><br/><img src='Images/CumulusCloud.brightness1.png' width='250' height='158' /></td>
   * <td align='center'><code>cloud.brightness = 0.6;</code><br/><img src='Images/CumulusCloud.brightness0.6.png' width='250' height='158' /></td>
   * <td align='center'><code>cloud.brightness = 0.0;</code><br/><img src='Images/CumulusCloud.brightness0.png' width='250' height='158' /></td>
   * </tr></table>
   * </div>
   * @memberof CumulusCloud.prototype
   * @type {Number}
   * @default 1.0
   */
  brightness: {
    get: function () {
      return this._brightness;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');

      const brightness = this._brightness;
      if (brightness !== value) {
        this._brightness = value;
        makeDirty(this, BRIGHTNESS_INDEX);
      }
    },
  },
});

CumulusCloud.prototype._destroy = function () {
  this._cloudCollection = undefined;
};

export default CumulusCloud;
