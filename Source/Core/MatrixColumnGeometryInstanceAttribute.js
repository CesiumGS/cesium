define([
        './ComponentDatatype',
        './defineProperties',
        './Matrix4',
        './Transforms'
    ], function(
        ComponentDatatype,
        defineProperties,
        Matrix4,
        Transforms) {
    'use strict';

    function MatrixColumnGeometryInstanceAttribute(array, startIndex) {
        this.value = new Float32Array(array.slice(startIndex, startIndex + 4));
    }

    defineProperties(MatrixColumnGeometryInstanceAttribute.prototype, {
        /**
         * The datatype of each component in the attribute, e.g., individual elements in
         * {@link MatrixColumnGeometryInstanceAttribute#value}.
         *
         * @memberof MatrixColumnGeometryInstanceAttribute.prototype
         *
         * @type {ComponentDatatype}
         * @readonly
         *
         * @default {@link ComponentDatatype.FLOAT}
         */
        componentDatatype : {
            get : function() {
                return ComponentDatatype.FLOAT;
            }
        },

        /**
         * The number of components in the attributes, i.e., {@link MatrixColumnGeometryInstanceAttribute#value}.
         *
         * @memberof MatrixColumnGeometryInstanceAttribute.prototype
         *
         * @type {Number}
         * @readonly
         *
         * @default 4
         */
        componentsPerAttribute : {
            get : function() {
                return 4;
            }
        },

        /**
         * When <code>true</code> and <code>componentDatatype</code> is an integer format,
         * indicate that the components should be mapped to the range [0, 1] (unsigned)
         * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
         *
         * @memberof MatrixColumnGeometryInstanceAttribute.prototype
         *
         * @type {Boolean}
         * @readonly
         *
         * @default false
         */
        normalize : {
            get : function() {
                return false;
            }
        }
    });


    var transformScratch = new Matrix4();
    var packedArray = new Array(16).fill(0.0);
    MatrixColumnGeometryInstanceAttribute.addAttributes = function(cartographicCenter, ellipsoid, attributes) { // TODO: this should prolly just swallow matrices
        var transform = Transforms.eastNorthUpToFixedFrame(cartographicCenter, ellipsoid, transformScratch);

        Matrix4.pack(transform, packedArray);
        // TODO: should probably accept a name
        attributes.column0 = new MatrixColumnGeometryInstanceAttribute(packedArray, 0);
        attributes.column1 = new MatrixColumnGeometryInstanceAttribute(packedArray, 4);
        attributes.column2 = new MatrixColumnGeometryInstanceAttribute(packedArray, 8);
        attributes.column3 = new MatrixColumnGeometryInstanceAttribute(packedArray, 12);

        console.log(packedArray);
    }

    return MatrixColumnGeometryInstanceAttribute;
});
