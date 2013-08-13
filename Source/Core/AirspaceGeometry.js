/*global define*/
define([
        './DeveloperError',
        './Cartesian3',
        './ComponentDatatype',
        './Ellipsoid',
        './IndexDatatype',
        './Math',
        './PolylinePipeline',
        './PolygonPipeline',
        './PrimitiveType',
        './defaultValue',
        './BoundingSphere',
        './GeometryAttribute',
        './GeometryAttributes',
        './VertexFormat'
    ], function(
        DeveloperError,
        Cartesian3,
        ComponentDatatype,
        Ellipsoid,
        IndexDatatype,
        CesiumMath,
        PolylinePipeline,
        PolygonPipeline,
        PrimitiveType,
        defaultValue,
        BoundingSphere,
        GeometryAttribute,
        GeometryAttributes,
        VertexFormat) {
    "use strict";

    var scratchNormal = new Cartesian3();

    var scratchCartesian1 = new Cartesian3();
    var scratchCartesian2 = new Cartesian3();
    var scratchCartesian3 = new Cartesian3();
    var scratchCartesian4 = new Cartesian3();
    var scratchCartesian5 = new Cartesian3();
    var scratchCartesian6 = new Cartesian3();
    var scratchCartesian7 = new Cartesian3();
    var scratchCartesian8 = new Cartesian3();
    var scratchCartesian9 = new Cartesian3();
    var scratch = new Cartesian3();

    var cross = new Cartesian3();
    function angleIsGreaterThanPi (first, second) {
        cross = first.cross(second, cross);
        return cross.z < 0;
    }

    function addAttributes(attributes, normal, left, front, back) {
        var normals = attributes.normals;
        var binormals = attributes.binormals;
        var tangents = attributes.tangents;
        if (typeof normals !== 'undefined') {
            normals[front] = normal.x;
            normals[front+1] = normal.y;
            normals[front+2] = normal.z;

            normals[back] = normal.z;
            normals[back-1] = normal.y;
            normals[back-2] = normal.x;
        }

        if (typeof tangents !== 'undefined') {
            tangents[front] = left.x;
            tangents[front+1] = left.y;
            tangents[front+2] = left.z;

            tangents[back] = left.z;
            tangents[back-1] = left.y;
            tangents[back-2] = left.x;
        }

        if (typeof binormals !== 'undefined') {
            var forward = left.cross(normal, scratch).normalize(scratch);
            binormals[front] = forward.x;
            binormals[front+1] = forward.y;
            binormals[front+2] = forward.z;

            binormals[back] = forward.z;
            binormals[back-1] = forward.y;
            binormals[back-2] = forward.x;
        }
        return attributes;
    }

    function scalePositionsToHeight(positions, height, ellipsoid) {
        for(var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            var normal = ellipsoid.geodeticSurfaceNormal(pos, scratchNormal);
            pos = ellipsoid.scaleToGeodeticSurface(pos, pos);
            pos = pos.add(normal.multiplyByScalar(height, normal), pos);
        }
        return positions;
    }


    /**
     * A {@link Geometry} that represents vertices and indices for a cube centered at the origin.
     *
     * @alias AirspaceGeometry
     * @constructor
     *
     * @param {Array} options.positions An array of {Cartesain3} positions that define the center of the airspace.
     * @param {Number} options.width The distance from the positions to the walls of the airspace.
     * @param {Array} [options.normals] An array of {Cartesian3} normals to the airspace, one normal for each position.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.height=0] The distance between the ellipsoid surface and the positions.
     * @param {Number} [options.extrudedHeight] The distance between the ellipsoid surface and the extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @pararm {Booleen} [options.roundCorners = false] Round corners instead of mitering them.
     *
     * @exception {DeveloperError} options.positions is required.
     * @exception {DeveloperError} options.width is required.
     * @exception {DeveloperError} options.normals.length must equal options.positions.length.
     *
     * @example
     * var airspace = new AirspaceGeometry({
     *   vertexFormat : VertexFormat.POSITION_ONLY,
     *   positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0)
     *     ]),
     *   width : 100000
     * });
     */
    var AirspaceGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var positions = options.positions;
        if (typeof positions === 'undefined') {
            throw new DeveloperError('options.positions is required.');
        }
        var width = options.width;
        if (typeof width === 'undefined') {
            throw new DeveloperError('options.width is required.');
        }

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);

        var height = defaultValue(options.height, 0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);
        var extrude = (height !== extrudedHeight);
        if (extrude) {
            var h = Math.max(height, extrudedHeight);
            extrudedHeight = Math.min(height, extrudedHeight);
            height = h;
        }
        var cleanPositions = PolylinePipeline.removeDuplicates(positions);
        cleanPositions = scalePositionsToHeight(cleanPositions, height, ellipsoid);
        var length = cleanPositions.length;
        var vertexCount = length*4 - 2;
        if (extrude) {
            vertexCount *= 6;
        }
        var threeVertex = vertexCount*3;

        var attributes = new GeometryAttributes();
        var st = ((vertexFormat.st) ? new Float32Array(vertexCount * 2) : undefined);
        var normals = ((vertexFormat.normal) ? new Float32Array(threeVertex) : undefined);
        var tangents = ((vertexFormat.tangent) ? new Float32Array(threeVertex) : undefined);
        var binormals = ((vertexFormat.binormal) ? new Float32Array(threeVertex) : undefined);

        var attr = {
                st: st,
                normals: normals,
                tangents: tangents,
                binormals: binormals
        };

        var i;
        var front = 0;
        var back = (extrude) ? threeVertex/6-1 : threeVertex-1;

        var finalPositions = new Float64Array(threeVertex);

        var stIndex = 0;

        var positionNormals =options.normals;
        var position;
        var normal;
        if (typeof positionNormals !== 'undefined') {
            if (positionNormals.length !== positions.length) {
                throw new DeveloperError('options.normals.length must equal options.positions.length.');
            }
        } else {
            positionNormals = new Array(positions.length);
            for (i = 0; i < length; i++) {
                position = cleanPositions[i];
                normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
                positionNormals[i] = normal;
            }
        }

        var previousPosition = scratchCartesian1;
        position = scratchCartesian2;
        var nextPosition = scratchCartesian3;
        var forward = scratchCartesian4;
        var backward = scratchCartesian5;
        var left = scratchCartesian6;
        var midpoint = scratchCartesian7;
        var midNormal = scratchCartesian8;
        var scratch = scratchCartesian9;

        position = cleanPositions[0]; //add first point
        nextPosition = cleanPositions[1];
        forward = nextPosition.subtract(position, forward).normalize(forward);
        normal = positionNormals[0];
        left = normal.cross(forward, left).normalize(left);

        var leftPos = position.add(left.multiplyByScalar(width, scratch), scratch);
        finalPositions[front] = leftPos.x;
        finalPositions[front+1] = leftPos.y;
        finalPositions[front+2] = leftPos.z;
        var rightPos = position.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
        finalPositions[back] = rightPos.z;
        finalPositions[back-1] = rightPos.y;
        finalPositions[back-2] = rightPos.x;

        attr = addAttributes(attr, normal, left, front, back);

        front += 3;
        back -= 3;

        previousPosition = position.clone(previousPosition);
        position = nextPosition.clone(position);
        backward = forward.negate(backward);
        var previousNormal = normal;
        for (i = 1; i < length; i++) {
            normal = positionNormals[i]; //add midpoint
            midpoint = position.add(previousPosition, midpoint).multiplyByScalar(0.5, midpoint);
            midNormal = normal.add(previousNormal, midNormal).normalize(midNormal);
            left = midNormal.cross(forward, left).normalize(left);

            leftPos = midpoint.add(left.multiplyByScalar(width, scratch), scratch);
            finalPositions[front] = leftPos.x;
            finalPositions[front+1] = leftPos.y;
            finalPositions[front+2] = leftPos.z;

            rightPos = midpoint.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
            finalPositions[back] = rightPos.z;
            finalPositions[back-1] = rightPos.y;
            finalPositions[back-2] = rightPos.x;

            attr = addAttributes(attr, midNormal, left, front, back);

            front += 3;
            back -= 3;
            if (i === length-1) {
                break;
            }

            nextPosition = cleanPositions[i+1];
            forward = nextPosition.subtract(position, forward).normalize(forward);
            var angle = Cartesian3.angleBetween(forward, backward);
            if ( angle !== Math.PI && angle !== 0) {
                left = forward.add(backward, left).normalize(left);
//                var f = normal.cross(left);
  //              left = f.cross(normal, left);
            }
            if (angleIsGreaterThanPi(forward, backward) || angle === 0 ) {
                left = left.negate(left);
            }
            var scalar = width / (Cartesian3.cross(left.negate(scratch), backward, scratch).magnitude());

            leftPos = position.add(left.multiplyByScalar(scalar, scratch), scratch);
            finalPositions[front] = leftPos.x;
            finalPositions[front+1] = leftPos.y;
            finalPositions[front+2] = leftPos.z;
            rightPos = position.add(left.multiplyByScalar(scalar, scratch).negate(scratch), scratch);
            finalPositions[back] = rightPos.z;
            finalPositions[back-1] = rightPos.y;
            finalPositions[back-2] = rightPos.x;
            attr = addAttributes(attr, normal, left, front, back);

            front += 3;
            back -= 3;

            previousPosition = position.clone(previousPosition);
            position = nextPosition.clone(position);
            backward = forward.negate(backward);
            previousNormal = normal;
        }
        normal = positionNormals[positionNormals.length-1];
        left = normal.cross(forward, left).normalize(left);
        leftPos = position.add(left.multiplyByScalar(width, scratch), scratch); // add last position
        finalPositions[front] = leftPos.x;
        finalPositions[front+1] = leftPos.y;
        finalPositions[front+2] = leftPos.z;
        rightPos = position.add(left.multiplyByScalar(width, scratch).negate(scratch), scratch);
        finalPositions[back] = rightPos.z;
        finalPositions[back-1] = rightPos.y;
        finalPositions[back-2] = rightPos.x;

        attr = addAttributes(attr, normal, left, front, back);

        if (vertexFormat.st) {
            var stvar = 1 / (vertexCount/2-1);
            for (i = 0; i < vertexCount/2; i++) {
                st[stIndex++] = i*stvar;
                st[stIndex++] = 1;
            }
            for (i = vertexCount/2; i > -1; i--) {
                st[stIndex++] = (i-1)*stvar;
                st[stIndex++] = 0;
            }
            attributes.st = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 2,
                values : st
            });
        }

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : finalPositions
            });
        }

        if (vertexFormat.normal) {
            attributes.normal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.normals
            });
        }

        if (vertexFormat.tangent) {
            attributes.tangent = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.tangents
            });
        }

        if (vertexFormat.binormal) {
            attributes.binormal = new GeometryAttribute({
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : attr.binormals
            });
        }

        var indices = IndexDatatype.createTypedArray(vertexCount, threeVertex - 6);
        var index = 0;

        for(i = 0; i < vertexCount/2-1; i++) {
            var UL = i;
            var UR = UL + 1;
            var LL = vertexCount - 1 - i;
            var LR = LL - 1;

            indices[index++] = UL;
            indices[index++] = LL;
            indices[index++] = UR;
            indices[index++] = UR;
            indices[index++] = LL;
            indices[index++] = LR;
        }
        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type GeometryAttributes
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that, along with {@link Geometry#primitiveType}, determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = PrimitiveType.TRIANGLES;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = BoundingSphere.fromPoints(positions);
    };

    return AirspaceGeometry;
});