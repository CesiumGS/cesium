import Cartesian3 from '../Core/Cartesian3.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import defineProperties from '../Core/defineProperties.js';
import destroyObject from '../Core/destroyObject.js';
import DeveloperError from '../Core/DeveloperError.js';
import getStringFromTypedArray from '../Core/getStringFromTypedArray.js';
import Matrix4 from '../Core/Matrix4.js';
import RuntimeError from '../Core/RuntimeError.js';
import when from '../ThirdParty/when.js';
import Cesium3DTileBatchTable from './Cesium3DTileBatchTable.js';
import Vector3DTileGeometry from './Vector3DTileGeometry.js';

    /**
     * <p>
     * Implements the {@link Cesium3DTileContent} interface.
     * </p>
     *
     * @alias Geometry3DTileContent
     * @constructor
     *
     * @private
     */
    function Geometry3DTileContent(tileset, tile, resource, arrayBuffer, byteOffset) {
        this._tileset = tileset;
        this._tile = tile;
        this._resource = resource;
        this._geometries = undefined;

        this._contentReadyPromise = undefined;
        this._readyPromise = when.defer();

        this._batchTable = undefined;
        this._features = undefined;

        /**
         * Part of the {@link Cesium3DTileContent} interface.
         */
        this.featurePropertiesDirty = false;

        initialize(this, arrayBuffer, byteOffset);
    }

    defineProperties(Geometry3DTileContent.prototype, {
        featuresLength : {
            get : function() {
                return defined(this._batchTable) ? this._batchTable.featuresLength : 0;
            }
        },

        pointsLength : {
            get : function() {
                return 0;
            }
        },

        trianglesLength : {
            get : function() {
                if (defined(this._geometries)) {
                    return this._geometries.trianglesLength;
                }
                return 0;
            }
        },

        geometryByteLength : {
            get : function() {
                if (defined(this._geometries)) {
                    return this._geometries.geometryByteLength;
                }
                return 0;
            }
        },

        texturesByteLength : {
            get : function() {
                return 0;
            }
        },

        batchTableByteLength : {
            get : function() {
                return defined(this._batchTable) ? this._batchTable.memorySizeInBytes : 0;
            }
        },

        innerContents : {
            get : function() {
                return undefined;
            }
        },

        readyPromise : {
            get : function() {
                return this._readyPromise.promise;
            }
        },

        tileset : {
            get : function() {
                return this._tileset;
            }
        },

        tile : {
            get : function() {
                return this._tile;
            }
        },

        url : {
            get : function() {
                return this._resource.getUrlComponent(true);
            }
        },

        batchTable : {
            get : function() {
                return this._batchTable;
            }
        }
    });

    function createColorChangedCallback(content) {
        return function(batchId, color) {
            if (defined(content._geometries)) {
                content._geometries.updateCommands(batchId, color);
            }
        };
    }

    function getBatchIds(featureTableJson, featureTableBinary) {
        var boxBatchIds;
        var cylinderBatchIds;
        var ellipsoidBatchIds;
        var sphereBatchIds;
        var i;

        var numberOfBoxes = defaultValue(featureTableJson.BOXES_LENGTH, 0);
        var numberOfCylinders = defaultValue(featureTableJson.CYLINDERS_LENGTH, 0);
        var numberOfEllipsoids = defaultValue(featureTableJson.ELLIPSOIDS_LENGTH, 0);
        var numberOfSpheres = defaultValue(featureTableJson.SPHERES_LENGTH, 0);

        if (numberOfBoxes > 0 && defined(featureTableJson.BOX_BATCH_IDS)) {
            var boxBatchIdsByteOffset = featureTableBinary.byteOffset + featureTableJson.BOX_BATCH_IDS.byteOffset;
            boxBatchIds = new Uint16Array(featureTableBinary.buffer, boxBatchIdsByteOffset, numberOfBoxes);
        }

        if (numberOfCylinders > 0 && defined(featureTableJson.CYLINDER_BATCH_IDS)) {
            var cylinderBatchIdsByteOffset = featureTableBinary.byteOffset + featureTableJson.CYLINDER_BATCH_IDS.byteOffset;
            cylinderBatchIds = new Uint16Array(featureTableBinary.buffer, cylinderBatchIdsByteOffset, numberOfCylinders);
        }

        if (numberOfEllipsoids > 0 && defined(featureTableJson.ELLIPSOID_BATCH_IDS)) {
            var ellipsoidBatchIdsByteOffset = featureTableBinary.byteOffset + featureTableJson.ELLIPSOID_BATCH_IDS.byteOffset;
            ellipsoidBatchIds = new Uint16Array(featureTableBinary.buffer, ellipsoidBatchIdsByteOffset, numberOfEllipsoids);
        }

        if (numberOfSpheres > 0 && defined(featureTableJson.SPHERE_BATCH_IDS)) {
            var sphereBatchIdsByteOffset = featureTableBinary.byteOffset + featureTableJson.SPHERE_BATCH_IDS.byteOffset;
            sphereBatchIds = new Uint16Array(featureTableBinary.buffer, sphereBatchIdsByteOffset, numberOfSpheres);
        }

        var atLeastOneDefined = defined(boxBatchIds) || defined(cylinderBatchIds) || defined(ellipsoidBatchIds) || defined(sphereBatchIds);
        var atLeastOneUndefined = (numberOfBoxes > 0 && !defined(boxBatchIds)) ||
                                  (numberOfCylinders > 0 && !defined(cylinderBatchIds)) ||
                                  (numberOfEllipsoids > 0 && !defined(ellipsoidBatchIds)) ||
                                  (numberOfSpheres > 0 && !defined(sphereBatchIds));

        if (atLeastOneDefined && atLeastOneUndefined) {
            throw new RuntimeError('If one group of batch ids is defined, then all batch ids must be defined.');
        }

        var allUndefinedBatchIds = !defined(boxBatchIds) && !defined(cylinderBatchIds) && !defined(ellipsoidBatchIds) && !defined(sphereBatchIds);
        if (allUndefinedBatchIds) {
            var id = 0;
            if (!defined(boxBatchIds) && numberOfBoxes > 0) {
                boxBatchIds = new Uint16Array(numberOfBoxes);
                for (i = 0; i < numberOfBoxes; ++i) {
                    boxBatchIds[i] = id++;
                }
            }
            if (!defined(cylinderBatchIds) && numberOfCylinders > 0) {
                cylinderBatchIds = new Uint16Array(numberOfCylinders);
                for (i = 0; i < numberOfCylinders; ++i) {
                    cylinderBatchIds[i] = id++;
                }
            }
            if (!defined(ellipsoidBatchIds) && numberOfEllipsoids > 0) {
                ellipsoidBatchIds = new Uint16Array(numberOfEllipsoids);
                for (i = 0; i < numberOfEllipsoids; ++i) {
                    ellipsoidBatchIds[i] = id++;
                }
            }
            if (!defined(sphereBatchIds) && numberOfSpheres > 0) {
                sphereBatchIds = new Uint16Array(numberOfSpheres);
                for (i = 0; i < numberOfSpheres; ++i) {
                    sphereBatchIds[i] = id++;
                }
            }
        }

        return {
            boxes : boxBatchIds,
            cylinders : cylinderBatchIds,
            ellipsoids : ellipsoidBatchIds,
            spheres : sphereBatchIds
        };
    }

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    function initialize(content, arrayBuffer, byteOffset) {
        byteOffset = defaultValue(byteOffset, 0);

        var uint8Array = new Uint8Array(arrayBuffer);
        var view = new DataView(arrayBuffer);
        byteOffset += sizeOfUint32;  // Skip magic number

        var version = view.getUint32(byteOffset, true);
        if (version !== 1) {
            throw new RuntimeError('Only Geometry tile version 1 is supported.  Version ' + version + ' is not.');
        }
        byteOffset += sizeOfUint32;

        var byteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        if (byteLength === 0) {
            content._readyPromise.resolve(content);
            return;
        }

        var featureTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        if (featureTableJSONByteLength === 0) {
            throw new RuntimeError('Feature table must have a byte length greater than zero');
        }

        var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var batchTableJSONByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;
        var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
        byteOffset += sizeOfUint32;

        var featureTableString = getStringFromTypedArray(uint8Array, byteOffset, featureTableJSONByteLength);
        var featureTableJson = JSON.parse(featureTableString);
        byteOffset += featureTableJSONByteLength;

        var featureTableBinary = new Uint8Array(arrayBuffer, byteOffset, featureTableBinaryByteLength);
        byteOffset += featureTableBinaryByteLength;

        var batchTableJson;
        var batchTableBinary;
        if (batchTableJSONByteLength > 0) {
            // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
            // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
            //
            // We could also make another request for it, but that would make the property set/get
            // API async, and would double the number of numbers in some cases.
            var batchTableString = getStringFromTypedArray(uint8Array, byteOffset, batchTableJSONByteLength);
            batchTableJson = JSON.parse(batchTableString);
            byteOffset += batchTableJSONByteLength;

            if (batchTableBinaryByteLength > 0) {
                // Has a batch table binary
                batchTableBinary = new Uint8Array(arrayBuffer, byteOffset, batchTableBinaryByteLength);
                // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
                batchTableBinary = new Uint8Array(batchTableBinary);
            }
        }

        var numberOfBoxes = defaultValue(featureTableJson.BOXES_LENGTH, 0);
        var numberOfCylinders = defaultValue(featureTableJson.CYLINDERS_LENGTH, 0);
        var numberOfEllipsoids = defaultValue(featureTableJson.ELLIPSOIDS_LENGTH, 0);
        var numberOfSpheres = defaultValue(featureTableJson.SPHERES_LENGTH, 0);

        var totalPrimitives = numberOfBoxes + numberOfCylinders + numberOfEllipsoids + numberOfSpheres;

        var batchTable = new Cesium3DTileBatchTable(content, totalPrimitives, batchTableJson, batchTableBinary, createColorChangedCallback(content));
        content._batchTable = batchTable;

        if (totalPrimitives === 0) {
            return;
        }

        var modelMatrix = content.tile.computedTransform;

        var center;
        if (defined(featureTableJson.RTC_CENTER)) {
            center = Cartesian3.unpack(featureTableJson.RTC_CENTER);
            Matrix4.multiplyByPoint(modelMatrix, center, center);
        }

        var batchIds = getBatchIds(featureTableJson, featureTableBinary);

        if (numberOfBoxes > 0 || numberOfCylinders > 0 || numberOfEllipsoids > 0 || numberOfSpheres > 0) {
            var boxes;
            var cylinders;
            var ellipsoids;
            var spheres;

            if (numberOfBoxes > 0) {
                var boxesByteOffset = featureTableBinary.byteOffset + featureTableJson.BOXES.byteOffset;
                boxes = new Float32Array(featureTableBinary.buffer, boxesByteOffset, Vector3DTileGeometry.packedBoxLength * numberOfBoxes);
            }

            if (numberOfCylinders > 0) {
                var cylindersByteOffset = featureTableBinary.byteOffset + featureTableJson.CYLINDERS.byteOffset;
                cylinders = new Float32Array(featureTableBinary.buffer, cylindersByteOffset, Vector3DTileGeometry.packedCylinderLength * numberOfCylinders);
            }

            if (numberOfEllipsoids > 0) {
                var ellipsoidsByteOffset = featureTableBinary.byteOffset + featureTableJson.ELLIPSOIDS.byteOffset;
                ellipsoids = new Float32Array(featureTableBinary.buffer, ellipsoidsByteOffset, Vector3DTileGeometry.packedEllipsoidLength * numberOfEllipsoids);
            }

            if (numberOfSpheres > 0) {
                var spheresByteOffset = featureTableBinary.byteOffset + featureTableJson.SPHERES.byteOffset;
                spheres = new Float32Array(featureTableBinary.buffer, spheresByteOffset, Vector3DTileGeometry.packedSphereLength * numberOfSpheres);
            }

            content._geometries = new Vector3DTileGeometry({
                boxes : boxes,
                boxBatchIds : batchIds.boxes,
                cylinders : cylinders,
                cylinderBatchIds : batchIds.cylinders,
                ellipsoids : ellipsoids,
                ellipsoidBatchIds : batchIds.ellipsoids,
                spheres : spheres,
                sphereBatchIds : batchIds.spheres,
                center : center,
                modelMatrix : modelMatrix,
                batchTable : batchTable,
                boundingVolume : content.tile.boundingVolume.boundingVolume
            });
        }
    }

    function createFeatures(content) {
        var featuresLength = content.featuresLength;
        if (!defined(content._features) && (featuresLength > 0)) {
            var features = new Array(featuresLength);
            if (defined(content._geometries)) {
                content._geometries.createFeatures(content, features);
            }
            content._features = features;
        }
    }

    Geometry3DTileContent.prototype.hasProperty = function(batchId, name) {
        return this._batchTable.hasProperty(batchId, name);
    };

    Geometry3DTileContent.prototype.getFeature = function(batchId) {
        //>>includeStart('debug', pragmas.debug);
        var featuresLength = this.featuresLength;
        if (!defined(batchId) || (batchId < 0) || (batchId >= featuresLength)) {
            throw new DeveloperError('batchId is required and between zero and featuresLength - 1 (' + (featuresLength - 1) + ').');
        }
        //>>includeEnd('debug');

        createFeatures(this);
        return this._features[batchId];
    };

    Geometry3DTileContent.prototype.applyDebugSettings = function(enabled, color) {
        if (defined(this._geometries)) {
            this._geometries.applyDebugSettings(enabled, color);
        }
    };

    Geometry3DTileContent.prototype.applyStyle = function(style) {
        createFeatures(this);
        if (defined(this._geometries)) {
            this._geometries.applyStyle(style, this._features);
        }
    };

    Geometry3DTileContent.prototype.update = function(tileset, frameState) {
        if (defined(this._geometries)) {
            this._geometries.classificationType = this._tileset.classificationType;
            this._geometries.debugWireframe = this._tileset.debugWireframe;
            this._geometries.update(frameState);
        }
        if (defined(this._batchTable) && this._geometries._ready) {
            this._batchTable.update(tileset, frameState);
        }

        if (!defined(this._contentReadyPromise)) {
            var that = this;
            this._contentReadyPromise = this._geometries.readyPromise.then(function() {
                that._readyPromise.resolve(that);
            });
        }
    };

    Geometry3DTileContent.prototype.isDestroyed = function() {
        return false;
    };

    Geometry3DTileContent.prototype.destroy = function() {
        this._geometries = this._geometries && this._geometries.destroy();
        this._batchTable = this._batchTable && this._batchTable.destroy();
        return destroyObject(this);
    };
export default Geometry3DTileContent;
