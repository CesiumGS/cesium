/*global define*/
define([
    '../Core/GoogleEarthEnterpriseMetadata',
    './createTaskProcessorWorker'
], function(
    GoogleEarthEnterpriseMetadata,
    createTaskProcessorWorker) {
    'use strict';

    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

    var Types = {
        METADATA : 0,
        IMAGERY : 1,
        TERRAIN : 2
    };

    Types.fromString = function(s) {
        if (s === 'Metadata') {
            return Types.METADATA;
        } else if (s === 'Imagery') {
            return Types.IMAGERY;
        } else if (s === 'Terrain') {
            return Types.TERRAIN;
        }
    };

    function decodeGoogleEarthEnterpriseTerrainPacket(parameters, transferableObjects) {
        var type = Types.fromString(parameters.type);
        var buffer = parameters.buffer;
        GoogleEarthEnterpriseMetadata.decode(buffer);

        var length = buffer.byteLength;
        if (type !== Types.IMAGERY) {
            var uncompressedTerrain = GoogleEarthEnterpriseMetadata.uncompressPacket(buffer);
            buffer = uncompressedTerrain.buffer;
            length = uncompressedTerrain.length;
        }

        switch(type) {
            case Types.METADATA:
                break;
            case Types.IMAGERY:
                break;
            case Types.TERRAIN:
                return processTerrain(buffer, length, transferableObjects);
        }

    }

    function processTerrain(buffer, totalSize, transferableObjects) {
        var dv = new DataView(buffer);

        var offset = 0;
        var terrainTiles = [];
        while (offset < totalSize) {
            // Each tile is split into 4 parts
            var tileStart = offset;
            for (var quad = 0; quad < 4; ++quad) {
                var size = dv.getUint32(offset, true);
                offset += sizeOfUint32;
                offset += size;
            }
            var tile = buffer.slice(tileStart, offset);
            transferableObjects.push(tile);
            terrainTiles.push(tile);
        }

        return terrainTiles;
    }

    return createTaskProcessorWorker(decodeGoogleEarthEnterpriseTerrainPacket);
});
