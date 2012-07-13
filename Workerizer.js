self.onmessage = function(parameters) {
    var desc = parameters.data;
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
    var relativeToCenter = desc.relativeToCenter;

    var vertices = desc.vertices = new Float32Array(width * height * 5);

    var radiiSquared = ellipsoid._radiiSquared;
    var radiiSquaredX = radiiSquared.x;
    var radiiSquaredY = radiiSquared.y;
    var radiiSquaredZ = radiiSquared.z;

    var cos = Math.cos;
    var sin = Math.sin;
    var sqrt = Math.sqrt;

    var vertexArrayIndex = 0;

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

            var nX = cosLatitude * cos(longitude);
            var nY = cosLatitude * sin(longitude);

            var kX = radiiSquaredX * nX;
            var kY = radiiSquaredY * nY;

            var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));

            var rSurfaceX = kX / gamma;
            var rSurfaceY = kY / gamma;
            var rSurfaceZ = kZ / gamma;

            vertices[vertexArrayIndex++] = rSurfaceX + nX * heightSample - relativeToCenter.x;
            vertices[vertexArrayIndex++] = rSurfaceY + nY * heightSample - relativeToCenter.y;
            vertices[vertexArrayIndex++] = rSurfaceZ + nZ * heightSample - relativeToCenter.z;

            var u = col / (width - 1);
            vertices[vertexArrayIndex++] = u;
            vertices[vertexArrayIndex++] = v;
        }
    }

    var postMessage = self.webkitPostMessage || self.postMessage;
    var result = {
        id: desc.id,
        vertices: vertices
    };
    postMessage(result, [result.vertices.buffer]);
};