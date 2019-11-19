import arrayFill from './arrayFill.js';
import BoundingSphere from './BoundingSphere.js';
import Cartesian2 from './Cartesian2.js';
import Cartesian3 from './Cartesian3.js';
import Check from './Check.js';
import ComponentDatatype from './ComponentDatatype.js';
import CylinderGeometryLibrary from './CylinderGeometryLibrary.js';
import defaultValue from './defaultValue.js';
import defined from './defined.js';
import DeveloperError from './DeveloperError.js';
import Geometry from './Geometry.js';
import GeometryAttribute from './GeometryAttribute.js';
import GeometryAttributes from './GeometryAttributes.js';
import GeometryOffsetAttribute from './GeometryOffsetAttribute.js';
import IndexDatatype from './IndexDatatype.js';
import PrimitiveType from './PrimitiveType.js';

    var radiusScratch = new Cartesian2();

    /**
     * A description of the outline of a cylinder.
     *
     * @alias CylinderOutlineGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Number} options.length The length of the cylinder.
     * @param {Number} options.topRadius The radius of the top of the cylinder.
     * @param {Number} options.bottomRadius The radius of the bottom of the cylinder.
     * @param {Number} [options.slices=128] The number of edges around the perimeter of the cylinder.
     * @param {Number} [options.numberOfVerticalLines=16] Number of lines to draw between the top and bottom surfaces of the cylinder.
     *
     * @exception {DeveloperError} options.length must be greater than 0.
     * @exception {DeveloperError} options.topRadius must be greater than 0.
     * @exception {DeveloperError} options.bottomRadius must be greater than 0.
     * @exception {DeveloperError} bottomRadius and topRadius cannot both equal 0.
     * @exception {DeveloperError} options.slices must be greater than or equal to 3.
     *
     * @see CylinderOutlineGeometry.createGeometry
     *
     * @example
     * // create cylinder geometry
     * var cylinder = new Cesium.CylinderOutlineGeometry({
     *     length: 200000,
     *     topRadius: 80000,
     *     bottomRadius: 200000,
     * });
     * var geometry = Cesium.CylinderOutlineGeometry.createGeometry(cylinder);
     */
    function CylinderOutlineGeometry(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var length = options.length;
        var topRadius = options.topRadius;
        var bottomRadius = options.bottomRadius;
        var slices = defaultValue(options.slices, 128);
        var numberOfVerticalLines = Math.max(defaultValue(options.numberOfVerticalLines, 16), 0);

        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number('options.positions', length);
        Check.typeOf.number('options.topRadius', topRadius);
        Check.typeOf.number('options.bottomRadius', bottomRadius);
        Check.typeOf.number.greaterThanOrEquals('options.slices', slices, 3);
        if (defined(options.offsetAttribute) && options.offsetAttribute === GeometryOffsetAttribute.TOP) {
            throw new DeveloperError('GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry.');
        }
        //>>includeEnd('debug');

        this._length = length;
        this._topRadius = topRadius;
        this._bottomRadius = bottomRadius;
        this._slices = slices;
        this._numberOfVerticalLines = numberOfVerticalLines;
        this._offsetAttribute = options.offsetAttribute;
        this._workerName = 'createCylinderOutlineGeometry';
    }

    /**
     * The number of elements used to pack the object into an array.
     * @type {Number}
     */
    CylinderOutlineGeometry.packedLength = 6;

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {CylinderOutlineGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    CylinderOutlineGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        array[startingIndex++] = value._length;
        array[startingIndex++] = value._topRadius;
        array[startingIndex++] = value._bottomRadius;
        array[startingIndex++] = value._slices;
        array[startingIndex++] = value._numberOfVerticalLines;
        array[startingIndex] = defaultValue(value._offsetAttribute, -1);

        return array;
    };

    var scratchOptions = {
        length : undefined,
        topRadius : undefined,
        bottomRadius : undefined,
        slices : undefined,
        numberOfVerticalLines : undefined,
        offsetAttribute : undefined
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {CylinderOutlineGeometry} [result] The object into which to store the result.
     * @returns {CylinderOutlineGeometry} The modified result parameter or a new CylinderOutlineGeometry instance if one was not provided.
     */
    CylinderOutlineGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var length = array[startingIndex++];
        var topRadius = array[startingIndex++];
        var bottomRadius = array[startingIndex++];
        var slices = array[startingIndex++];
        var numberOfVerticalLines = array[startingIndex++];
        var offsetAttribute = array[startingIndex];

        if (!defined(result)) {
            scratchOptions.length = length;
            scratchOptions.topRadius = topRadius;
            scratchOptions.bottomRadius = bottomRadius;
            scratchOptions.slices = slices;
            scratchOptions.numberOfVerticalLines = numberOfVerticalLines;
            scratchOptions.offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
            return new CylinderOutlineGeometry(scratchOptions);
        }

        result._length = length;
        result._topRadius = topRadius;
        result._bottomRadius = bottomRadius;
        result._slices = slices;
        result._numberOfVerticalLines = numberOfVerticalLines;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;

        return result;
    };

    /**
     * Computes the geometric representation of an outline of a cylinder, including its vertices, indices, and a bounding sphere.
     *
     * @param {CylinderOutlineGeometry} cylinderGeometry A description of the cylinder outline.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    CylinderOutlineGeometry.createGeometry = function(cylinderGeometry) {
        var length = cylinderGeometry._length;
        var topRadius = cylinderGeometry._topRadius;
        var bottomRadius = cylinderGeometry._bottomRadius;
        var slices = cylinderGeometry._slices;
        var numberOfVerticalLines = cylinderGeometry._numberOfVerticalLines;

        if ((length <= 0) || (topRadius < 0) || (bottomRadius < 0) || ((topRadius === 0) && (bottomRadius === 0))) {
            return;
        }

        var numVertices = slices * 2;

        var positions = CylinderGeometryLibrary.computePositions(length, topRadius, bottomRadius, slices, false);
        var numIndices = slices * 2;
        var numSide;
        if (numberOfVerticalLines > 0) {
            var numSideLines = Math.min(numberOfVerticalLines, slices);
            numSide = Math.round(slices / numSideLines);
            numIndices += numSideLines;
        }

        var indices = IndexDatatype.createTypedArray(numVertices, numIndices * 2);
        var index = 0;
        var i;
        for (i = 0; i < slices - 1; i++) {
            indices[index++] = i;
            indices[index++] = i + 1;
            indices[index++] = i + slices;
            indices[index++] = i + 1 + slices;
        }

        indices[index++] = slices - 1;
        indices[index++] = 0;
        indices[index++] = slices + slices - 1;
        indices[index++] = slices;

        if (numberOfVerticalLines > 0) {
            for (i = 0; i < slices; i += numSide) {
                indices[index++] = i;
                indices[index++] = i + slices;
            }
        }

        var attributes = new GeometryAttributes();
        attributes.position = new GeometryAttribute({
            componentDatatype : ComponentDatatype.DOUBLE,
            componentsPerAttribute : 3,
            values : positions
        });

        radiusScratch.x = length * 0.5;
        radiusScratch.y = Math.max(bottomRadius, topRadius);

        var boundingSphere = new BoundingSphere(Cartesian3.ZERO, Cartesian2.magnitude(radiusScratch));

        if (defined(cylinderGeometry._offsetAttribute)) {
            length = positions.length;
            var applyOffset = new Uint8Array(length / 3);
            var offsetValue = cylinderGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
            arrayFill(applyOffset, offsetValue);
            attributes.applyOffset = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 1,
                values: applyOffset
            });
        }

        return new Geometry({
            attributes : attributes,
            indices : indices,
            primitiveType : PrimitiveType.LINES,
            boundingSphere : boundingSphere,
            offsetAttribute : cylinderGeometry._offsetAttribute
        });
    };
export default CylinderOutlineGeometry;
