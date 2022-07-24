import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Event from "../../Core/Event.js";
import wrapFunction from "../../Core/wrapFunction.js";
import CzmlDataSource from "../../DataSources/CzmlDataSource.js";
import GeoJsonDataSource from "../../DataSources/GeoJsonDataSource.js";
import KmlDataSource from "../../DataSources/KmlDataSource.js";
import GpxDataSource from "../../DataSources/GpxDataSource.js";
import getElement from "../getElement.js";
import Model from "../../Scene/Model.js";
import Cartesian2 from "../../Core/Cartesian2";
import Matrix4 from "../../Core/Matrix4";
import Transforms from "../../Core/Transforms";
import { Cartesian3 } from "../../Cesium.js";

/**
 * A mixin which adds default drag and drop support for CZML files to the Viewer widget.
 * Rather than being called directly, this function is normally passed as
 * a parameter to {@link Viewer#extend}, as shown in the example below.
 * @function viewerDragDropMixin

 * @param {Viewer} viewer The viewer instance.
 * @param {Object} [options] Object with the following properties:
 * @param {Element|String} [options.dropTarget=viewer.container] The DOM element which will serve as the drop target.
 * @param {Boolean} [options.clearOnDrop=true] When true, dropping files will clear all existing data sources first, when false, new data sources will be loaded after the existing ones.
 * @param {Boolean} [options.flyToOnDrop=true] When true, dropping files will fly to the data source once it is loaded.
 * @param {Boolean} [options.clampToGround=true] When true, datasources are clamped to the ground.
 * @param {Proxy} [options.proxy] The proxy to be used for KML network links.
 *
 * @exception {DeveloperError} Element with id <options.dropTarget> does not exist in the document.
 * @exception {DeveloperError} dropTarget is already defined by another mixin.
 * @exception {DeveloperError} dropEnabled is already defined by another mixin.
 * @exception {DeveloperError} dropError is already defined by another mixin.
 * @exception {DeveloperError} clearOnDrop is already defined by another mixin.
 *
 * @example
 * // Add basic drag and drop support and pop up an alert window on error.
 * const viewer = new Cesium.Viewer('cesiumContainer');
 * viewer.extend(Cesium.viewerDragDropMixin);
 * viewer.dropError.addEventListener(function(viewerArg, source, error) {
 *     window.alert('Error processing ' + source + ':' + error);
 * });
 */
function viewerDragDropMixin(viewer, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(viewer)) {
    throw new DeveloperError("viewer is required.");
  }
  if (viewer.hasOwnProperty("dropTarget")) {
    throw new DeveloperError("dropTarget is already defined by another mixin.");
  }
  if (viewer.hasOwnProperty("dropEnabled")) {
    throw new DeveloperError(
      "dropEnabled is already defined by another mixin."
    );
  }
  if (viewer.hasOwnProperty("dropError")) {
    throw new DeveloperError("dropError is already defined by another mixin.");
  }
  if (viewer.hasOwnProperty("clearOnDrop")) {
    throw new DeveloperError(
      "clearOnDrop is already defined by another mixin."
    );
  }
  if (viewer.hasOwnProperty("flyToOnDrop")) {
    throw new DeveloperError(
      "flyToOnDrop is already defined by another mixin."
    );
  }
  //>>includeEnd('debug');

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //Local variables to be closed over by defineProperties.
  let dropEnabled = true;
  let flyToOnDrop = defaultValue(options.flyToOnDrop, true);
  const dropError = new Event();
  let clearOnDrop = defaultValue(options.clearOnDrop, true);
  let dropTarget = defaultValue(options.dropTarget, viewer.container);
  let clampToGround = defaultValue(options.clampToGround, true);
  let proxy = options.proxy;

  dropTarget = getElement(dropTarget);

  Object.defineProperties(viewer, {
    /**
     * Gets or sets the element to serve as the drop target.
     * @memberof viewerDragDropMixin.prototype
     * @type {Element}
     */
    dropTarget: {
      //TODO See https://github.com/CesiumGS/cesium/issues/832
      // Yeah. OK. Seen that. So what is "TODO" here, actually?
      get: function () {
        return dropTarget;
      },
      set: function (value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
          throw new DeveloperError("value is required.");
        }
        //>>includeEnd('debug');

        unsubscribe(dropTarget, handleDrop);
        dropTarget = value;
        subscribe(dropTarget, handleDrop);
      },
    },

    /**
     * Gets or sets a value indicating if drag and drop support is enabled.
     * @memberof viewerDragDropMixin.prototype
     * @type {Element}
     */
    dropEnabled: {
      get: function () {
        return dropEnabled;
      },
      set: function (value) {
        if (value !== dropEnabled) {
          if (value) {
            subscribe(dropTarget, handleDrop);
          } else {
            unsubscribe(dropTarget, handleDrop);
          }
          dropEnabled = value;
        }
      },
    },

    /**
     * Gets the event that will be raised when an error is encountered during drop processing.
     * @memberof viewerDragDropMixin.prototype
     * @type {Event}
     */
    dropError: {
      get: function () {
        return dropError;
      },
    },

    /**
     * Gets or sets a value indicating if existing data sources should be cleared before adding the newly dropped sources.
     * @memberof viewerDragDropMixin.prototype
     * @type {Boolean}
     */
    clearOnDrop: {
      get: function () {
        return clearOnDrop;
      },
      set: function (value) {
        clearOnDrop = value;
      },
    },

    /**
     * Gets or sets a value indicating if the camera should fly to the data source after it is loaded.
     * @memberof viewerDragDropMixin.prototype
     * @type {Boolean}
     */
    flyToOnDrop: {
      get: function () {
        return flyToOnDrop;
      },
      set: function (value) {
        flyToOnDrop = value;
      },
    },

    /**
     * Gets or sets the proxy to be used for KML.
     * @memberof viewerDragDropMixin.prototype
     * @type {Proxy}
     */
    proxy: {
      get: function () {
        return proxy;
      },
      set: function (value) {
        proxy = value;
      },
    },

    /**
     * Gets or sets a value indicating if the datasources should be clamped to the ground
     * @memberof viewerDragDropMixin.prototype
     * @type {Boolean}
     */
    clampToGround: {
      get: function () {
        return clampToGround;
      },
      set: function (value) {
        clampToGround = value;
      },
    },
  });

  function handleDrop(event) {
    stop(event);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleDroppedFiles(files, event.clientX, event.clientY);
    }
  }

  /**
   * Will be called when at least one file is dropped into the viewer.
   *
   * By default, the implementation will clear the entities and data
   * sources of the viewer (depending on the `cleanOnDrop` setting),
   * and call `handleDroppedFile` with each file
   *
   * @param {File[]} files The non-empty files
   * @param {Number} clientX The client x-coordinate of the drop position
   * @param {Number} clientY The client y-coordinate of the drop position
   */
  function handleDroppedFiles(files, clientX, clientY) {
    if (clearOnDrop) {
      viewer.entities.removeAll();
      viewer.dataSources.removeAll();
    }
    const length = files.length;
    for (let i = 0; i < length; i++) {
      const file = files[i];
      handleDroppedFile(file, clientX, clientY);
    }
  }

  /**
   * Will be called for each file that is dropped into the viewer.
   *
   * By default, this will check the file extension, case insensitively,
   * and pass the file to one of the `handleDropped*` methods, depending
   * on the extension.
   *
   * If the file does not have a known extension, then a `dropError`
   * event will be raised.
   *
   * @param {File} file The file
   * @param {Number} clientX The client x-coordinate of the drop position
   * @param {Number} clientY The client y-coordinate of the drop position
   */
  function handleDroppedFile(file, clientX, clientY) {
    const fileName = file.name;
    if (/\.czml$/i.test(fileName)) {
      handleDroppedCzml(file);
      return;
    }
    if (
      /\.geojson$/i.test(fileName) ||
      /\.json$/i.test(fileName) ||
      /\.topojson$/i.test(fileName)
    ) {
      handleDroppedGeoJson(file);
      return;
    }
    if (/\.(kml|kmz)$/i.test(fileName)) {
      handleDroppedKml(file);
      return;
    }
    if (/\.gpx$/i.test(fileName)) {
      handleDroppedGpx(file);
      return;
    }
    console.log("Here we go", fileName);
    if (/\.glb$/i.test(fileName)) {
      handleDroppedGlb(file, clientX, clientY);
      return;
    }
    viewer.dropError.raiseEvent(
      viewer,
      fileName,
      `Unrecognized file: ${fileName}`
    );
    return;
  }

  /**
   * Handle a dropped GeoJson file
   *
   * @param {File} file The file
   */
  function handleDroppedCzml(file) {
    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = function (evt) {
      const loadPromise = CzmlDataSource.load(JSON.parse(evt.target.result), {
        sourceUri: fileName,
      });
      handleDroppedDataSource(file, loadPromise);
    };
    reader.onerror = createDropErrorCallback(file);
    reader.readAsText(file);
  }

  /**
   * Handle a dropped GeoJson file
   *
   * @param {File} file The file
   */
  function handleDroppedGeoJson(file) {
    const fileName = file.name;
    const reader = new FileReader();
    reader.onload = function (evt) {
      const loadPromise = GeoJsonDataSource.load(
        JSON.parse(evt.target.result),
        {
          sourceUri: fileName,
          clampToGround: clampToGround,
        }
      );
      handleDroppedDataSource(file, loadPromise);
    };
    reader.onerror = createDropErrorCallback(file);
    reader.readAsText(file);
  }

  /**
   * Handle a dropped KML file
   *
   * @param {File} file The file
   */
  function handleDroppedKml(file) {
    const fileName = file.name;
    const scene = viewer.scene;
    const loadPromise = KmlDataSource.load(file, {
      sourceUri: fileName,
      proxy: proxy,
      camera: scene.camera,
      canvas: scene.canvas,
      clampToGround: clampToGround,
      screenOverlayContainer: viewer.container,
    });
    handleDroppedDataSource(file, loadPromise);
  }

  /**
   * Handle a dropped GPX file
   *
   * @param {File} file The file
   */
  function handleDroppedGpx(file) {
    const fileName = file.name;
    const loadPromise = GpxDataSource.load(file, {
      sourceUri: fileName,
      proxy: proxy,
    });
    handleDroppedDataSource(file, loadPromise);
  }

  /**
   * Will be called for a dropped file from which a DataSource has been
   * created.
   *
   * @param {File} file The file
   * @param {Promise<DataSource>} dataSourceLoadPromise The data source promise
   */
  function handleDroppedDataSource(file, dataSourceLoadPromise) {
    const fileName = file.name;
    viewer.dataSources
      .add(dataSourceLoadPromise)
      .then(function (dataSource) {
        if (viewer.flyToOnDrop) {
          viewer.flyTo(dataSource);
        }
      })
      .catch(function (error) {
        viewer.dropError.raiseEvent(viewer, fileName, error);
      });
  }

  /**
   * Handle a dropped GLB file
   *
   * @param {File} file The file
   * @param {Number} clientX The client x-coordinate of the drop position
   * @param {Number} clientY The client y-coordinate of the drop position
   */
  function handleDroppedGlb(file, clientX, clientY) {
    //console.log(`Dropped GLB at ${clientX} ${clientY}`);
    const cartesian = viewer.scene.pickPosition(
      new Cartesian2(clientX, clientY)
    );
    //console.log(`Pick position is `, cartesian);

    const reader = new FileReader();
    reader.onload = function (evt) {
      const arrayBuffer = evt.target.result;
      const model = viewer.scene.primitives.add(
        Model.fromGltf({
          url: "DUMMY_PATH",
          gltf: arrayBuffer,
        })
      );
      //viewer.scene.requestRender();
      //console.log(`Added model`, model);

      model.readyPromise.then(function (m) {
        //console.log(`Model ready`, model);

        let matrix = model.modelMatrix;
        const enu = Transforms.eastNorthUpToFixedFrame(cartesian);
        const translation = Matrix4.fromTranslation(
          new Cartesian3(0, 0, 1),
          new Matrix4()
        );
        matrix = Matrix4.multiply(matrix, enu, new Matrix4());
        matrix = Matrix4.multiply(matrix, translation, new Matrix4());
        model.modelMatrix = matrix;

        //console.log('Model matrix', model.modelMatrix);

        if (viewer.flyToOnDrop) {
          viewer.scene.camera.flyToBoundingSphere(model.boundingSphere);
        }
      });
    };
    reader.onerror = createDropErrorCallback(file);
    reader.readAsArrayBuffer(file);
  }

  /**
   * Creates a FileReader.onError callback that handles the case that
   * the given file could not be loaded.
   *
   * @param {File} file
   * @returns The error callback
   */
  function createDropErrorCallback(file) {
    return function (evt) {
      viewer.dropError.raiseEvent(file.name, evt.target.error);
    };
  }

  //Enable drop by default;
  subscribe(dropTarget, handleDrop);

  //Wrap the destroy function to make sure all events are unsubscribed from
  viewer.destroy = wrapFunction(viewer, viewer.destroy, function () {
    viewer.dropEnabled = false;
  });

  //Specs need access to handleDrop
  viewer._handleDrop = handleDrop;
}

function stop(event) {
  event.stopPropagation();
  event.preventDefault();
}

function unsubscribe(dropTarget, handleDrop) {
  const currentTarget = dropTarget;
  if (defined(currentTarget)) {
    currentTarget.removeEventListener("drop", handleDrop, false);
    currentTarget.removeEventListener("dragenter", stop, false);
    currentTarget.removeEventListener("dragover", stop, false);
    currentTarget.removeEventListener("dragexit", stop, false);
  }
}

function subscribe(dropTarget, handleDrop) {
  dropTarget.addEventListener("drop", handleDrop, false);
  dropTarget.addEventListener("dragenter", stop, false);
  dropTarget.addEventListener("dragover", stop, false);
  dropTarget.addEventListener("dragexit", stop, false);
}

export default viewerDragDropMixin;
