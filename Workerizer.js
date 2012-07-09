var HeightmapTessellator = {};

HeightmapTessellator._computeVertices = function(description) {
    var desc = description || {};

    var heightmap = desc.heightmap;
    var heightScale = desc.heightScale;
    var heightOffset = desc.heightOffset;
    var bytesPerHeight = desc.bytesPerHeight;
    var strideBytes = desc.strideBytes;
    var width = desc.width;
    var height = desc.height;

    var extent = desc.extent;
    var ellipsoid = desc.ellipsoid;
    var granularityX = (extent.east - extent.west) / width;
    var granularityY = (extent.north - extent.south) / height;
    var genTexCoords = desc.generateTextureCoords;
    var interleave = desc.interleave;
    var relativeToCenter = desc.relativeToCenter;

    var vertices = desc.vertices;
    var texCoords = desc.texCoords;
    var indices = desc.indices;

    var radiiSquared = ellipsoid._radiiSquared;
    var radiiSquaredX = radiiSquared.x;
    var radiiSquaredY = radiiSquared.y;
    var radiiSquaredZ = radiiSquared.z;

    var cos = Math.cos;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    for (var row = 0; row < height; ++row) {
        var latitude = extent.north - granularityY * row;
        var cosLatitude = cos(latitude);
        var nZ = sin(latitude);
        var kZ = radiiSquaredZ * nZ;

        var v = (height - row - 1) / (height - 1);

        for (var col = 0; col < width; ++col) {
            var longitude = extent.west + granularityX * col;

            var terrainOffset = row * (width * strideBytes) + col * strideBytes;
            var heightSample = (heightmap[terrainOffset] << 16) +
                         (heightmap[terrainOffset + 1] << 8) +
                         heightmap[terrainOffset + 2];
            if (bytesPerHeight === 4) {
                heightSample = (heightSample << 8) + heightmap[terrainOffset + 3];
            }
            heightSample = heightSample / heightScale - heightOffset;
            heightSample *= 10.0;

            var nX = cosLatitude * cos(longitude);
            var nY = cosLatitude * sin(longitude);

            var kX = radiiSquaredX * nX;
            var kY = radiiSquaredY * nY;

            var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

            var rSurfaceX = kX / gamma;
            var rSurfaceY = kY / gamma;
            var rSurfaceZ = kZ / gamma;

            vertices.push(rSurfaceX + nX * heightSample - relativeToCenter.x);
            vertices.push(rSurfaceY + nY * heightSample - relativeToCenter.y);
            vertices.push(rSurfaceZ + nZ * heightSample - relativeToCenter.z);

            if (genTexCoords) {
                var u = col / (width - 1);
                if (interleave) {
                    vertices.push(u);
                    vertices.push(v);
                } else {
                    texCoords.push(u);
                    texCoords.push(v);
                }
            }
        }
    }

    var index = 0;
    for (var i = 0; i < height - 1; ++i) {
        for (var j = 0; j < width - 1; ++j) {
            var upperLeft = index;
            var lowerLeft = upperLeft + width;
            var lowerRight = lowerLeft + 1;
            var upperRight = upperLeft + 1;

            indices.push(upperLeft, lowerLeft, upperRight);
            indices.push(upperRight, lowerLeft, lowerRight);

            ++index;
        }
        ++index;
    }
};

HeightmapTessellator.computeBuffers = function(description) {
    var desc = description || {};

    //Extent.validate(desc.extent);

    desc.ellipsoid = desc.ellipsoid;
    desc.relativeToCenter = (desc.relativeToCenter) ? desc.relativeToCenter : {x:0,y:0,z:0};
    desc.boundaryWidth = desc.boundaryWidth || 0; // NOTE: may want to expose in the future.

    desc.vertices = [];
    desc.texCoords = [];
    desc.indices = [];
//    desc.boundaryExtent = new Extent(
//        desc.extent.west - desc.granularity * desc.boundaryWidth,
//        desc.extent.south - desc.granularity * desc.boundaryWidth,
//        desc.extent.east + desc.granularity * desc.boundaryWidth,
//        desc.extent.north + desc.granularity * desc.boundaryWidth
//    );

    HeightmapTessellator._computeVertices(desc);

    var result = {};
    if (desc.interleave) {
        result.vertices = desc.vertices;
    } else {
        result.positions = desc.vertices;
        if (desc.generateTextureCoords) {
            result.textureCoords = desc.texCoords;
        }
    }

    result.indices = desc.indices;
    return result;
};

self.onmessage = function(parameters) {
    var buffers = HeightmapTessellator.computeBuffers(parameters.data);
    self.postMessage({id: parameters.data.id, data: buffers});
};