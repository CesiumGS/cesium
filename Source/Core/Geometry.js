/*global define*/
define([
        './defaultValue',
        './DeveloperError'
    ], function(
        defaultValue,
        DeveloperError) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Geometry
     * @constructor
     */
    var Geometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * Attributes, which make up the geometry's vertices..  Each property in this object corresponds to a
         * {@link GeometryAttribute} containing the attribute's data.
         * <p>
         * Attributes are always stored non-interleaved in a Geometry.  When geometry is prepared for rendering
         * with {@link Context#createVertexArrayFromGeometry}, attributes are generally written interleaved
         * into the vertex buffer for better rendering performance.
         * </p>
         * <p>
         * There are reserved attribute names with well-known semantics.  The following attributes
         * are created by a Geometry (depending on the provided {@link VertexFormat}.
         * <ul>
         *    <li><code>position</code> - 3D vertex position.  64-bit floating-point (for precision).  3 components per attribute.  See {@link VertexFormat.position}.</li>
         *    <li><code>normal</code> - Normal (normalized), commonly used for lighting.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat.normal}.</li>
         *    <li><code>st</code> - 2D texture coordinate.  32-bit floating-point.  2 components per attribute.  See {@link VertexFormat.st}.</li>
         *    <li><code>binormal</code> - Binormal (normalized), used for tangent-space effects like bump mapping.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat.binormal}.</li>
         *    <li><code>tangent</code> - Tangent (normalized), used for tangent-space effects like bump mapping.  32-bit floating-point.  3 components per attribute.  See {@link VertexFormat.tangent}.</li>
         * </ul>
         * </p>
         * <p>
         * The following attribute names are generally not created by a Geometry, but are added
         * to a Geometry by a {@link Primitive} or {@link GeometryPipeline} functions to prepare
         * the geometry for rendering.
         * <ul>
         *    <li><code>position3DHigh</code> - High 32 bits for encoded 64-bit position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position3DLow</code> - Low 32 bits for encoded 64-bit position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position3DHigh</code> - High 32 bits for encoded 64-bit 2D (Columbus view) position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>position2DLow</code> - Low 32 bits for encoded 64-bit 2D (Columbus view) position computed with {@link GeometryPipeline.encodeAttribute}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>color</code> - RGBA color (normalized) usually from {@link GeometryInstance.color}.  32-bit floating-point.  4 components per attribute.</li>
         *    <li><code>pickColor</code> - RGBA color used for picking, created from {@link Context#createPickId}.  32-bit floating-point.  4 components per attribute.</li>
         * </ul>
         * </p>
         *
         * @type Object
         *
         * @example
         * geometry.attributes = new GeometryAttribute({
         *   componentDatatype : ComponentDatatype.FLOAT,
         *   componentsPerAttribute : 3,
         *   values : new Float32Array()
         * });
         *
         * @see GeometryAttribute
         * @see VertexFormat
         */
        this.attributes = defaultValue(options.attributes, {});

        /**
         * DOC_TBA
         */
        this.indexList = options.indexList;

        /**
         * DOC_TBA
         */
        this.primitiveType = options.primitiveType;

        /**
         * DOC_TBA
         */
        this.boundingSphere = options.boundingSphere;
    };

    /**
     * DOC_TBA
     */
    Geometry.prototype.cloneGeometry = function(result) {
        if (typeof result === 'undefined') {
// TODO: is this always what we want, for say BoxGeometry?
            result = new Geometry();
        }

        var attributes = this.attributes;
        var newAttributes = {};
        for (var property in attributes) {
            if (attributes.hasOwnProperty(property)) {
                newAttributes[property] = attributes[property].clone();
            }
        }
        result.attributes = newAttributes;

// TODO: typed array or not.  fastest way to copy?
        var sourceValues = this.indexList;
        var length = sourceValues.length;
        var values = new Array(length);
        for (var i = 0; i < length; ++i) {
            values[i] = sourceValues[i];
        }
        result.indexList = values;

        result.primitiveType = this.primitiveType;
        this.boundingSphere.clone(result.boundingSphere);

        return result;
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} geometries is required.
     */
    Geometry.computeNumberOfVertices = function(geometry) {
        if (typeof geometry === 'undefined') {
            throw new DeveloperError('geometry is required.');
        }

        var numberOfVertices = -1;
        for ( var property in geometry.attributes) {
            if (geometry.attributes.hasOwnProperty(property) && geometry.attributes[property].values) {
                var attribute = geometry.attributes[property];
                var num = attribute.values.length / attribute.componentsPerAttribute;
                if ((numberOfVertices !== num) && (numberOfVertices !== -1)) {
                    throw new DeveloperError('All attribute lists must have the same number of attributes.');
                }
                numberOfVertices = num;
            }
        }

        return numberOfVertices;
    };

    return Geometry;
});
