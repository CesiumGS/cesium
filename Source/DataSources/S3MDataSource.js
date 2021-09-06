import Cesium3DTileset from '../Scene/Cesium3DTileset.js';
import Cesium3DTile from '../Scene/Cesium3DTile.js';
import Cartesian3 from '../Core/Cartesian3.js';
import Transforms from '../Core/Transforms.js';
import BoundingSphere from '../Core/BoundingSphere.js';
import Resource from '../Core/Resource.js';
import defined from '../Core/defined.js';
import Request from '../Core/Request.js';
import RequestType from '../Core/RequestType.js';
import Cesium3DTileContentState from '../Scene/Cesium3DTileContentState.js';
import ComponentDatatype from '../Core/ComponentDatatype.js';
import when from '../ThirdParty/when.js';
import pako from '../ThirdParty/pako.js';
import Empty3DTileContent from '../Scene/Empty3DTileContent.js';
import FeatureDetection from '../Core/FeatureDetection.js';

/**
 * A data source used to load S3M Layer.
 *
 * @alias S3MDataSource
 * @constructor
 *
 * @param {Object} [scene] The scene object.
 *
 * @example
 * var dataSource = new Cesium.S3MDataSource(scene);
 * dataSource.load("http://localhost:8090/iserver/services/3D-JinJiangS3MB/rest/realspace/datas/Combine/config");
 * }));
 */
function S3MDataSource(scene) {
	this._tileset = undefined;
	this._scene = scene;
	this._url = undefined;
	this._basePath = undefined;
	this._baseResource = undefined;
    this._GLTFProcessingQueue = new S3MGLTFProcessingQueue();
}

/**
 * Load S3M layer.
 *
 * @param {String} url A S3M layer url to be loaded.
 *
 * @returns {Promise.<S3MDataSource>} A promise that will resolve when the data is loaded.
 */
S3MDataSource.prototype.load = function(url) {
	var that = this;
    var deferred = when.defer();
	when(url)
		.then(function(url) {
			var resource = Resource.createIfNeeded(url);
			var basePath = resource.getBaseUri(true);
			that._url = resource.url;
			that._basePath = basePath;
			that._baseResource = resource;
			return resource.fetchJson();
		})
		.then(function(config) {
			var tilesetJson = {
				asset: {
					version: "1.0",
					gltfUpAxis: "Z"
				},
				geometricError: Number.MAX_VALUE,
				root: {
					boundingVolume: {
						sphere: []
					},
					content: {
						uri: ''
					},
					transform: [],
					geometricError: Number.MAX_VALUE,
					refine: 'REPLACE',
					children: [

					]
				}
			};

			var lon = config.position.x;
			var lat = config.position.y;
			var height = config.position.z;
			var position = Cartesian3.fromDegrees(lon, lat, height);
			var modelMatrix = Transforms.eastNorthUpToFixedFrame(position);
			tilesetJson.root.transform = [
				modelMatrix[0], modelMatrix[1], modelMatrix[2], modelMatrix[3],
				modelMatrix[4], modelMatrix[5], modelMatrix[6], modelMatrix[7],
				modelMatrix[8], modelMatrix[9], modelMatrix[10], modelMatrix[11],
				modelMatrix[12], modelMatrix[13], modelMatrix[14], modelMatrix[15]
			];

			// Bounding sphere of all tiles.
			var allCenters = [];
			for(var i = 0, len = config.tiles.length; i < len; i++) {
				var bbox = config.tiles[i].boundingbox;
				var perMin = new Cartesian3(bbox.min.x, bbox.min.y, bbox.min.z);
				var perMax = new Cartesian3(bbox.max.x, bbox.max.y, bbox.max.z);
				var perSphere = BoundingSphere.fromCornerPoints(perMin, perMax, new BoundingSphere());
				var perCenter = perSphere.center;
				var perRadius = perSphere.radius;
				var perBoundingVolume = [perCenter.x, perCenter.y, perCenter.z, perRadius];
				allCenters.push(perSphere);
				tilesetJson.root.children.push({
					boundingVolume: {
						sphere: perBoundingVolume
					},
					content: {
						uri: config.tiles[i].url
					},
					geometricError: 70,
					refine: "REPLACE"
				});
			}
			var sphere = BoundingSphere.fromBoundingSpheres(allCenters, new BoundingSphere());
			var center = sphere.center;
			var radius = sphere.radius;
			tilesetJson.root.boundingVolume.sphere = [center.x, center.y, center.z, radius];

			var blob = new Blob([JSON.stringify(tilesetJson)], {
				type: "application/json",
			});

			var tilesetUrl = URL.createObjectURL(blob);
			that._tileset = that._scene.primitives.add(
				new Cesium3DTileset({
					url: tilesetUrl
				})
			);

			that._tileset._isS3MTileSet = true;
			that._tileset._baseResource = that._baseResource;
            that._tileset._s3mDataSource = that;

			that._tileset.tileVisible.addEventListener((tile) => {
				if(!tile._childrenAreLoaded) {
					var baseResource = tile._tileset._baseResource;
					var relPath = './data/path/' + tile._header.content.uri;
					var resource = baseResource.getDerivedResource({
						url: relPath
					});
					for(var k = 0; k < tile._pageLods.length; k++) {
						var pageLod = tile._pageLods[k];
						if(pageLod.childTile === "") {
							continue;
						}
						var childResource = resource.getDerivedResource({
							url: pageLod.childTile
						});

						var childTileJson = {
							boundingVolume: {
								sphere: [pageLod.boundingSphere.center.x, pageLod.boundingSphere.center.y, pageLod.boundingSphere.center.z, pageLod.boundingSphere.radius]
							},
							content: {
								uri: tile._s3mTile._relativePath + pageLod.childTile
							},
							geometricError: pageLod.boundingSphere.radius / pageLod.rangeList * 16,
							refine: "REPLACE"
						};
						var childTile = new Cesium3DTile(tile.tileset, childResource, childTileJson, tile);
						tile.children.push(childTile);
					}
					tile._childrenAreLoaded = true;
				}
			});
            deferred.resolve(that);
		}).otherwise(function(error) {
        	deferred.reject(error);
		});
    return deferred.promise;
};

function unZip(buffer, bytesOffset) {
    var dataZip = new Uint8Array(buffer, bytesOffset);
    return pako.inflate(dataZip).buffer;
}

var _workerCode =
`
	/**
	 * Class for parsing S3M data structure.
	 * @constructor
	 */
	function S3MModelParser() {}

	S3MModelParser.VertexCompressOption = {
		SVC_Vertex: 1,
		SVC_Normal: 2,
		SVC_VertexColor: 4,
		SVC_SecondColor: 8,
		SVC_TexutreCoord: 16,
		SVC_TexutreCoordIsW: 32
	};
	
	var S3MPixelFormat = {
	    LUMINANCE_8 : 1,
	    LUMINANCE_16 : 2,
	    ALPHA : 3,
	    ALPHA_4_LUMINANCE_4 : 4,
	    LUMINANCE_ALPHA : 5,
	    RGB_565 : 6,
	    BGR565 : 7,
	    RGB : 10,
	    BGR : 11,
	    ARGB : 12,
	    ABGR : 13,
	    BGRA : 14,
	    WEBP : 25,
	    RGBA : 28,
	    DXT1 : 17,
	    DXT2 : 18,
	    DXT3 : 19,
	    DXT4 : 20,
	    DXT5 : 21,
	    CRN_DXT5 : 26
	};

	S3MModelParser.S3MBVertexTag = {
		SV_Unkown: 0,
		SV_Standard: 1,
		SV_Compressed: 2
	};

    S3MModelParser.ComponentDatatype = {
        BYTE: 0x1400,
        UNSIGNED_BYTE: 0x1401,
        SHORT: 0x1402,
        UNSIGNED_SHORT: 0x1403,
        INT: 0x1404,
        UNSIGNED_INT: 0x1405,
        FLOAT: 0x1406,
        DOUBLE: 0x140a
	};

    S3MModelParser.PixelFormat = {
        DEPTH_COMPONENT: 0x1902,
        DEPTH_STENCIL: 0x84f9,
        ALPHA: 0x1906,
        RGB: 0x1907,
        RGBA: 0x1908,
        LUMINANCE: 0x1909,
        LUMINANCE_ALPHA: 0x190a,
        RGB_DXT1: 0x83f0,
        RGBA_DXT1: 0x83f1,
        RGBA_DXT3: 0x83f2,
        RGBA_DXT5: 0x83f3,
        RGB_PVRTC_4BPPV1: 0x8c00,
        RGB_PVRTC_2BPPV1: 0x8c00,
        RGBA_PVRTC_4BPPV1: 0x8c02,
        RGBA_PVRTC_2BPPV1: 0x8c03,
        RGB_ETC1: 0x8d64,
        compressedTextureSizeInBytes : function (
			pixelFormat,
			width,
			height
		) {
			switch (pixelFormat) {
				case S3MModelParser.PixelFormat.RGB_DXT1:
				case S3MModelParser.PixelFormat.RGBA_DXT1:
				case S3MModelParser.PixelFormat.RGB_ETC1:
					return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 8;

				case S3MModelParser.PixelFormat.RGBA_DXT3:
				case S3MModelParser.PixelFormat.RGBA_DXT5:
					return Math.floor((width + 3) / 4) * Math.floor((height + 3) / 4) * 16;

				case S3MModelParser.PixelFormat.RGB_PVRTC_4BPPV1:
				case S3MModelParser.PixelFormat.RGBA_PVRTC_4BPPV1:
					return Math.floor((Math.max(width, 8) * Math.max(height, 8) * 4 + 7) / 8);

				case S3MModelParser.PixelFormat.RGB_PVRTC_2BPPV1:
				case S3MModelParser.PixelFormat.RGBA_PVRTC_2BPPV1:
					return Math.floor(
						(Math.max(width, 16) * Math.max(height, 8) * 2 + 7) / 8
					);

				default:
					return 0;
			}
		}
	};

    S3MModelParser.prototype.getStringFromTypedArray = function(uint8Array) {
        var byteOffset = 0;
        var byteLength = uint8Array.byteLength - byteOffset;

        var subView = uint8Array.subarray(byteOffset, byteOffset + byteLength);

        var decoder = new TextDecoder("utf-8");
        return decoder.decode(subView);
    };

    S3MModelParser.multiplyByPoint = function(matrix, cartesian, result) {
        var vX = cartesian.x;
        var vY = cartesian.y;
        var vZ = cartesian.z;

        var x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
        var y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
        var z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];

        result.x = x;
        result.y = y;
        result.z = z;
        return result;
    };
    
    
    // --------------------- DXT decode --------------

	//! Use DXT1 compression.
	var kDxt1 = ( 1 << 0 );
	
	//! Use DXT3 compression.
	var kDxt3 = ( 1 << 1 );
	
	//! Use DXT5 compression.
	var kDxt5 = ( 1 << 2 );
	
	//! Use a very slow but very high quality colour compressor.
	var kColourIterativeClusterFit = ( 1 << 8 );
	
	//! Use a slow but high quality colour compressor (the default).
	var kColourClusterFit = ( 1 << 3 );
	
	//! Use a fast but low quality colour compressor.
	var kColourRangeFit = ( 1 << 4 );
	
	//! Weight the colour by alpha during cluster fit (disabled by default).
	var kWeightColourByAlpha = ( 1 << 7 );
	
	var krgb565 = ( 1 << 5 );
	
	function Unpack565(packed0, packed1, colour, offset) {
	    var value = packed0 | (packed1 << 8);
	
	    var red = (value >> 11) & 0x1f;
	    var green = (value >> 5) & 0x3f;
	    var blue = value & 0x1f;
	
	    colour[offset + 0] = ( red << 3 ) | ( red >> 2 );
	    colour[offset + 1] = ( green << 2 ) | ( green >> 4 );
	    colour[offset + 2] = ( blue << 3 ) | ( blue >> 2 );
	    colour[offset + 3] = 255;
	
	    return value;
	}
	
	function DecompressColour(rgba, block, nOffset, isDxt1) {
	    var codes = new Uint8Array(16);
	
	    var a = Unpack565(block[nOffset + 0], block[nOffset + 1], codes, 0);
	    var b = Unpack565(block[nOffset + 2], block[nOffset + 3], codes, 4);
	
	    for (var i = 0; i < 3; i++) {
	        var c = codes[i];
	        var d = codes[4 + i];
	
	        if (isDxt1 && a <= b) {
	            codes[8 + i] = ( c + d ) / 2;
	            codes[12 + i] = 0;
	        }
	        else {
	            codes[8 + i] = ( 2 * c + d ) / 3;
	            codes[12 + i] = ( c + 2 * d ) / 3;
	        }
	    }
	
	    codes[8 + 3] = 255;
	    codes[12 + 3] = ( isDxt1 && a <= b ) ? 0 : 255;
	
	    var indices = new Uint8Array(16);
	    for (var i = 0; i < 4; ++i) {
	        var packed = block[nOffset + 4 + i];
	
	        indices[4 * i + 0] = packed & 0x3;
	        indices[4 * i + 1] = ( packed >> 2 ) & 0x3;
	        indices[4 * i + 2] = ( packed >> 4 ) & 0x3;
	        indices[4 * i + 3] = ( packed >> 6 ) & 0x3;
	    }
	
	    for (var i = 0; i < 16; ++i) {
	        var offset = 4 * indices[i];
	        for (var j = 0; j < 4; ++j)
	            rgba[4 * i + j] = codes[offset + j];
	    }
	
	}
	
	function DecompressAlphaDxt3(rgba, block, nOffset) {
	    // unpack the alpha values pairwise
	    for (var i = 0; i < 8; ++i) {
	        // quantise down to 4 bits
	        var quant = bytes[nOffset + i];
	
	        // unpack the values
	        var lo = quant & 0x0f;
	        var hi = quant & 0xf0;
	
	        // convert back up to bytes
	        rgba[8 * i + 3] = lo | ( lo << 4 );
	        rgba[8 * i + 7] = hi | ( hi >> 4 );
	    }
	}
	
	function DecompressAlphaDxt5(rgba, block, nOffset) {
	    var alpha0 = block[nOffset + 0];
	    var alpha1 = block[nOffset + 1];
	
	    var codes = new Uint8Array(8);
	
	    codes[0] = alpha0;
	    codes[1] = alpha1;
	    if (alpha0 <= alpha1) {
	        // use 5-alpha codebook
	        for (var i = 1; i < 5; ++i)
	            codes[1 + i] = ( ( 5 - i ) * alpha0 + i * alpha1 ) / 5;
	        codes[6] = 0;
	        codes[7] = 255;
	    }
	    else {
	        // use 7-alpha codebook
	        for (var i = 1; i < 7; ++i)
	            codes[1 + i] = ( ( 7 - i ) * alpha0 + i * alpha1 ) / 7;
	    }
	
	    var indices = new Uint8Array(16);
	    var nOffset = nOffset + 2;
	    var nBegin = 0;
	    for (var i = 0; i < 2; ++i) {
	        // grab 3 bytes
	        var value = 0;
	        for (var j = 0; j < 3; ++j) {
	            var byte = block[nOffset++];
	            value |= ( byte << 8 * j );
	        }
	
	        // unpack 8 3-bit values from it
	        for (var j = 0; j < 8; ++j) {
	            var index = ( value >> 3 * j ) & 0x7;
	            indices[nBegin++] = index;
	        }
	    }
	
	    for (var i = 0; i < 16; ++i)
	        rgba[4 * i + 3] = codes[indices[i]];
	}
	
	function Decompress(rgba, block, nOffset, flags) {
	    var nOffset2 = 0;
	    if (( flags & ( kDxt3 | kDxt5 ) ) != 0)
	        nOffset2 = 8;
	
	    DecompressColour(rgba, block, nOffset + nOffset2, ( flags & kDxt1 ) != 0);
	
	    if (( flags & kDxt3 ) != 0) {
	        DecompressAlphaDxt3(rgba, block, nOffset);
	    }
	    else if (( flags & kDxt5 ) != 0) {
	        DecompressAlphaDxt5(rgba, block, nOffset);
	    }
	}
	
	function DecompressImage565(rgb565, width, height, blocks) {
	    var c = new Uint16Array(4);
	    var dst = rgb565;
	    var m = 0;
	    var dstI = 0;
	    var i = 0;
	    var r0 = 0, g0 = 0, b0 = 0, r1 = 0, g1 = 0, b1 = 0;
	
	    var blockWidth = width / 4;
	    var blockHeight = height / 4;
	    for (var blockY = 0; blockY < blockHeight; blockY++) {
	        for (var blockX = 0; blockX < blockWidth; blockX++) {
	        	// flip Y
	            i = 4 * ((blockHeight - blockY) * blockWidth + blockX);
	            c[0] = blocks[i];
	            c[1] = blocks[i + 1];
	            r0 = c[0] & 0x1f;
	            g0 = c[0] & 0x7e0;
	            b0 = c[0] & 0xf800;
	            r1 = c[1] & 0x1f;
	            g1 = c[1] & 0x7e0;
	            b1 = c[1] & 0xf800;
	            // Interpolate between c0 and c1 to get c2 and c3.    ~
	            // Note that we approximate 1/3 as 3/8 and 2/3 as 5/8 for
	            // speed.  This also appears to be what the hardware DXT
	            // decoder in many GPUs does :)
	            c[2] = ((5 * r0 + 3 * r1) >> 3)
	                | (((5 * g0 + 3 * g1) >> 3) & 0x7e0)
	                | (((5 * b0 + 3 * b1) >> 3) & 0xf800);
	            c[3] = ((5 * r1 + 3 * r0) >> 3)
	                | (((5 * g1 + 3 * g0) >> 3) & 0x7e0)
	                | (((5 * b1 + 3 * b0) >> 3) & 0xf800);
	            m = blocks[i + 2];
	            dstI = (blockY * 4) * width + blockX * 4;
	            dst[dstI+2] = c[m & 0x3];
	            dst[dstI + 1] = c[(m >> 2) & 0x3];
	            dst[dstI + 0] = c[(m >> 4) & 0x3];
	            dst[dstI + 3] = c[(m >> 6) & 0x3];
	            dstI += width;
	            dst[dstI+2] = c[(m >> 8) & 0x3];
	            dst[dstI + 1] = c[(m >> 10) & 0x3];
	            dst[dstI + 0] = c[(m >> 12) & 0x3];
	            dst[dstI + 3] = c[(m >> 14)];
	            m = blocks[i + 3];
	            dstI += width;
	            dst[dstI+2] = c[m & 0x3];
	            dst[dstI + 1] = c[(m >> 2) & 0x3];
	            dst[dstI + 0] = c[(m >> 4) & 0x3];
	            dst[dstI + 3] = c[(m >> 6) & 0x3];
	            dstI += width;
	            dst[dstI+2] = c[(m >> 8) & 0x3];
	            dst[dstI + 1] = c[(m >> 10) & 0x3];
	            dst[dstI + 0] = c[(m >> 12) & 0x3];
	            dst[dstI + 3] = c[(m >> 14)];
	        }
	    }
	    return dst;
	}
	
	function DecompressImage(rgba, width, height, blocks, flags) {
	    var bytesPerBlock = ( ( flags & kDxt1 ) != 0 ) ? 8 : 16;
	
	    var nOffset = 0;
	    for (var y = 0; y < height; y += 4) {
	        for (var x = 0; x < width; x += 4) {
	            var targetRgba = new Uint8Array(4 * 16);
	            Decompress(targetRgba, blocks, nOffset, flags);
	
	            var nOffsetTarget = 0;
	            for (var py = 0; py < 4; ++py) {
	                for (var px = 0; px < 4; ++px) {
	                    var sx = x + px;
	                    var sy = y + py;
	                    if (sx < width && sy < height) {
	                    	// flip Y
	                        var nBegin = 4 * ( width * (height - sy) + sx );
	
	                        rgba[nBegin+2] = targetRgba[nOffsetTarget++]
							rgba[nBegin+1] = targetRgba[nOffsetTarget++]
							rgba[nBegin+0] = targetRgba[nOffsetTarget++]
							rgba[nBegin+3] = targetRgba[nOffsetTarget++]
	                    }
	                    else {
	                        nOffsetTarget += 4;
	                    }
	                }
	            }
	
	            // advance
	            nOffset += bytesPerBlock;
	        }
	    }
	}
	
	function DXTTextureDecode(options){
	}
	
	DXTTextureDecode.decode = function(out, width, height, block, format){
	    if (out == null || block == null || height == 0 || width == 0) {
	        return;
	    }
	    var flags = 0;
	    //有alpha通道,转为RGBA，否则转为rgb565
	    if (format > S3MPixelFormat.BGR || format === S3MPixelFormat.LUMINANCE_ALPHA) {
	        flags = kDxt5;
	    }
	    else {
	        flags = kDxt1 | krgb565;
	    }
	    if ((flags & kDxt1) && (flags & krgb565)) {
	        DecompressImage565(out, width, height, block);
	    }
	    else {
	        DecompressImage(out, width, height, block, flags);
	    }
	};
	// --------------------- DXT decode


	S3MModelParser.prototype.parseString = function(buffer, view, bytesOffset) {
		var length = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		var stringBufferView = new Uint8Array(buffer, bytesOffset, length);
		var string = this.getStringFromTypedArray(stringBufferView);
		bytesOffset += length;

		return {
			string: string,
			bytesOffset: bytesOffset
		}
	};

	S3MModelParser.prototype.parseGeode = function(buffer, view, bytesOffset, geodes) {
		var geode = {};
		var skeletonNames = [];
		var geoMatrix = new Array(16);
		for(var i = 0; i < 16; i++) {
			geoMatrix[i] = view.getFloat64(bytesOffset, true);
			bytesOffset += Float64Array.BYTES_PER_ELEMENT;
		}

		geode.matrix = geoMatrix;
		geode.skeletonNames = skeletonNames;
		var skeletonCount = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		for(var i = 0; i < skeletonCount; i++) {
			var res = this.parseString(buffer, view, bytesOffset);
			skeletonNames.push(res.string);
			bytesOffset = res.bytesOffset;
		}

		geodes.push(geode);

		return bytesOffset;
	};

	S3MModelParser.prototype.parsePageLOD = function(buffer, view, bytesOffset, pageLods) {
		var pageLOD = {};
		pageLOD.rangeList = view.getFloat32(bytesOffset, true);
		bytesOffset += Float32Array.BYTES_PER_ELEMENT;
		pageLOD.rangeMode = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var center = {};
		center.x = view.getFloat64(bytesOffset, true);
		bytesOffset += Float64Array.BYTES_PER_ELEMENT;
		center.y = view.getFloat64(bytesOffset, true);
		bytesOffset += Float64Array.BYTES_PER_ELEMENT;
		center.z = view.getFloat64(bytesOffset, true);
		bytesOffset += Float64Array.BYTES_PER_ELEMENT;
		var radius = view.getFloat64(bytesOffset, true);
		bytesOffset += Float64Array.BYTES_PER_ELEMENT;
		pageLOD.boundingSphere = {
			center: center,
			radius: radius
		};

		var res = this.parseString(buffer, view, bytesOffset);
		var strChildTile = res.string;
		bytesOffset = res.bytesOffset;
		var index = strChildTile.indexOf('Geometry');
		if(index !== -1) {
			var ignoreString = strChildTile.substring(index);
			strChildTile = strChildTile.replace(ignoreString, '');
		}

		pageLOD.childTile = strChildTile;
		pageLOD.geodes = [];
		var geodeCount = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		for(var i = 0; i < geodeCount; i++) {
			bytesOffset = this.parseGeode(buffer, view, bytesOffset, pageLOD.geodes);
		}

		pageLods.push(pageLOD);

		return bytesOffset;
	};

	S3MModelParser.prototype.parseGroupNode = function(buffer, view, bytesOffset, result) {
		var groupNode = {};
		var pageLods = [];
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		var count = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		for(var i = 0; i < count; i++) {
			bytesOffset = this.parsePageLOD(buffer, view, bytesOffset, pageLods);
		}
		groupNode.pageLods = pageLods;
		var align = bytesOffset % 4;
		if(align !== 0) {
			bytesOffset += (4 - align);
		}

		result.groupNode = groupNode;

		return bytesOffset;
	};

	S3MModelParser.prototype.parseVertex = function(buffer, view, bytesOffset, vertexPackage) {
		var verticesCount = view.getUint32(bytesOffset, true);
		vertexPackage.verticesCount = verticesCount;
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		if(bytesOffset <= 0) {
			return bytesOffset;
		}

		var vertexDimension = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var vertexStride = view.getUint16(bytesOffset, true);
		vertexStride = vertexDimension * Float32Array.BYTES_PER_ELEMENT;
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var byteLength = verticesCount * vertexDimension * Float32Array.BYTES_PER_ELEMENT;
		var attributes = vertexPackage.vertexAttributes;
		var attrLocation = vertexPackage.attrLocation;
		attrLocation['aPosition'] = attributes.length;
		var vertexBuffer = new Uint8Array(buffer).subarray(bytesOffset, bytesOffset + byteLength);
		attributes.push({
			index: attrLocation['aPosition'],
			componentsPerAttribute: vertexDimension,
			componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
			offsetInBytes: bytesOffset,
			strideInBytes: vertexStride,
			byteLength: byteLength,
			normalize: false,
			typedArray: vertexBuffer
		});
		bytesOffset += byteLength;

		return bytesOffset;
	};

	S3MModelParser.prototype.parseNormal = function(buffer, view, bytesOffset, vertexPackage) {
		var normalCount = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		if(normalCount <= 0) {
			return bytesOffset;
		}

		var normalDimension = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var normalStride = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var byteLength = normalCount * normalDimension * Float32Array.BYTES_PER_ELEMENT;
		var attributes = vertexPackage.vertexAttributes;
		var attrLocation = vertexPackage.attrLocation;
		attrLocation['aNormal'] = attributes.length;
		attributes.push({
			index: attrLocation['aNormal'],
			componentsPerAttribute: normalDimension,
			componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
			offsetInBytes: bytesOffset,
			strideInBytes: normalStride,
			byteLength: byteLength,
			normalize: false
		});
		bytesOffset += byteLength;

		return bytesOffset;
	};

	S3MModelParser.prototype.parseVertexColor = function(buffer, view, bytesOffset, vertexPackage) {
		var colorCount = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		var verticesCount = vertexPackage.verticesCount;
		var vertexColor;
		if(colorCount > 0) {
			var colorStride = view.getUint16(bytesOffset, true);
			bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
			bytesOffset += Uint8Array.BYTES_PER_ELEMENT * 2;
			var byteLength = colorCount * Uint8Array.BYTES_PER_ELEMENT * 4;
			var attributes = vertexPackage.vertexAttributes;
			var attrLocation = vertexPackage.attrLocation;
			attrLocation['aColor'] = attributes.length;
			attributes.push({
				index: attrLocation['aColor'],
				typedArray: vertexColor,
				componentsPerAttribute: 4,
				componentDatatype: S3MModelParser.ComponentDatatype.UNSIGNED_BYTE,
				offsetInBytes: bytesOffset,
				strideInBytes: 4,
				byteLength: byteLength,
				normalize: true
			});

			bytesOffset += byteLength;
		}

		return bytesOffset;
	};

	S3MModelParser.prototype.parseSecondColor = function(buffer, view, bytesOffset, vertexPackage) {
		var secondColorCount = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		if(secondColorCount <= 0) {
			return bytesOffset;
		}

		var secondColorStride = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		bytesOffset += Uint8Array.BYTES_PER_ELEMENT * 2;
		var byteLength = secondColorCount * Uint8Array.BYTES_PER_ELEMENT * 4;
		bytesOffset += byteLength;
		return bytesOffset;
	};

	S3MModelParser.prototype.parseTexCoord = function(buffer, view, bytesOffset, vertexPackage) {
		var count = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;

		for(var i = 0; i < count; i++) {
			var texCoordCount = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var dimension = view.getUint16(bytesOffset, true);
			bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
			var texCoordStride = view.getUint16(bytesOffset, true);
			bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
			var byteLength = texCoordCount * dimension * Float32Array.BYTES_PER_ELEMENT;
			var str = 'aTexCoord' + i;
			var attributes = vertexPackage.vertexAttributes;
			var attrLocation = vertexPackage.attrLocation;
			attrLocation[str] = attributes.length;
			attributes.push({
				index: attrLocation[str],
				componentsPerAttribute: dimension,
				componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
				offsetInBytes: bytesOffset,
				strideInBytes: dimension * Float32Array.BYTES_PER_ELEMENT,
				byteLength: byteLength,
				normalize: false
			});
			bytesOffset += byteLength;
		}

		return bytesOffset;
	};

	S3MModelParser.prototype.parseInstanceInfo = function(buffer, view, bytesOffset, vertexPackage) {
		var count = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var attributes = vertexPackage.vertexAttributes;
		var attrLocation = vertexPackage.attrLocation;

		for(var i = 0; i < count; i++) {
			var texCoordCount = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var texDimensions = view.getUint16(bytesOffset, true);
			bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
			var texCoordStride = view.getUint16(bytesOffset, true);
			bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
			var byteLength = texCoordCount * texDimensions * Float32Array.BYTES_PER_ELEMENT;
			if(texDimensions === 17 || texDimensions === 29) {
				var instanceBuffer = new Uint8Array(buffer, bytesOffset, byteLength);
				vertexPackage.instanceCount = texCoordCount;
				vertexPackage.instanceMode = texDimensions;
				vertexPackage.instanceBuffer = instanceBuffer;
				vertexPackage.instanceIndex = 1;
				var len = texDimensions * texCoordCount * 4;
				var vertexColorInstance = instanceBuffer.slice(0, len);
				vertexPackage.vertexColorInstance = vertexColorInstance;
				var byteStride;
				if(texDimensions === 17) {
					byteStride = Float32Array.BYTES_PER_ELEMENT * 17;
					attrLocation['uv2'] = attributes.length;
					attributes.push({
						index: attrLocation['uv2'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 0,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});

					attrLocation['uv3'] = attributes.length;
					attributes.push({
						index: attrLocation['uv3'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 4 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});

					attrLocation['uv4'] = attributes.length;
					attributes.push({
						index: attrLocation['uv4'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 8 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});
					attrLocation['secondary_colour'] = attributes.length;
					attributes.push({
						index: attrLocation['secondary_colour'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 12 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});
					attrLocation['uv6'] = attributes.length;
					attributes.push({
						index: attrLocation['uv6'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.UNSIGNED_BYTE,
						normalize: true,
						offsetInBytes: 16 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});
				} else if(texDimensions === 29) {
					byteStride = Float32Array.BYTES_PER_ELEMENT * 29;
					attrLocation['uv1'] = attributes.length;
					attributes.push({
						index: attrLocation['uv1'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 0,
						strideInBytes: byteStride,
						instanceDivisor: 1,
						byteLength: byteLength
					});

					attrLocation['uv2'] = attributes.length;
					attributes.push({
						index: attrLocation['uv2'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 4 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});

					attrLocation['uv3'] = attributes.length;
					attributes.push({
						index: attrLocation['uv3'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 8 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});

					attrLocation['uv4'] = attributes.length;
					attributes.push({
						index: attrLocation['uv4'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 12 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});

					attrLocation['uv5'] = attributes.length;
					attributes.push({
						index: attrLocation['uv5'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 16 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});

					attrLocation['uv6'] = attributes.length;
					attributes.push({
						index: attrLocation['uv6'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 20 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});

					attrLocation['uv7'] = attributes.length;
					attributes.push({
						index: attrLocation['uv7'],
						componentsPerAttribute: 3,
						componentDatatype: S3MModelParser.ComponentDatatype.FLOAT,
						normalize: false,
						offsetInBytes: 24 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});
					attrLocation['secondary_colour'] = attributes.length;
					attributes.push({
						index: attrLocation['secondary_colour'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.UNSIGNED_BYTE,
						normalize: true,
						offsetInBytes: 27 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});
					attrLocation['uv9'] = attributes.length;
					attributes.push({
						index: attrLocation['uv9'],
						componentsPerAttribute: 4,
						componentDatatype: S3MModelParser.ComponentDatatype.UNSIGNED_BYTE,
						normalize: true,
						offsetInBytes: 28 * Float32Array.BYTES_PER_ELEMENT,
						strideInBytes: byteStride,
						instanceDivisor: 1
					});
				}
			} else {
				var len = texCoordCount * texDimensions;
				vertexPackage.instanceBounds = new Float32Array(len);
				for(var k = 0; k < len; k++) {
					vertexPackage.instanceBounds[k] = view.getFloat32(bytesOffset + k * Float32Array.BYTES_PER_ELEMENT, true);
				}
			}

			bytesOffset += byteLength;
		}
		return bytesOffset;
	};

	S3MModelParser.prototype.parseCompressVertex = function(buffer, view, bytesOffset, vertexPackage) {
		var verticesCount = view.getUint32(bytesOffset, true);
		vertexPackage.verticesCount = verticesCount;
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		if(bytesOffset <= 0) {
			return bytesOffset;
		}

		var vertexDimension = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var vertexStride = view.getUint16(bytesOffset, true);
		vertexStride = vertexDimension * Int16Array.BYTES_PER_ELEMENT;
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;

		var vertCompressConstant = view.getFloat32(bytesOffset, true);
		bytesOffset += Float32Array.BYTES_PER_ELEMENT;
		var minVerticesValue = {};
		minVerticesValue.x = view.getFloat32(bytesOffset, true);
		bytesOffset += Float32Array.BYTES_PER_ELEMENT;
		minVerticesValue.y = view.getFloat32(bytesOffset, true);
		bytesOffset += Float32Array.BYTES_PER_ELEMENT;
		minVerticesValue.z = view.getFloat32(bytesOffset, true);
		bytesOffset += Float32Array.BYTES_PER_ELEMENT;
		minVerticesValue.w = view.getFloat32(bytesOffset, true);
		bytesOffset += Float32Array.BYTES_PER_ELEMENT;

		vertexPackage.vertCompressConstant = vertCompressConstant;
		vertexPackage.minVerticesValue = minVerticesValue;

		var byteLength = verticesCount * vertexDimension * Int16Array.BYTES_PER_ELEMENT;
		var vertexBuffer = new Uint8Array(buffer, bytesOffset, byteLength);
		bytesOffset += byteLength;

		var attributes = vertexPackage.vertexAttributes;
		var attrLocation = vertexPackage.attrLocation;
		attrLocation['aPosition'] = attributes.length;
		attributes.push({
			index: attrLocation['aPosition'],
			typedArray: vertexBuffer,
			componentsPerAttribute: vertexDimension,
			componentDatatype: ComponentDatatype.SHORT,
			offsetInBytes: 0,
			strideInBytes: vertexStride,
			normalize: false
		});

		return bytesOffset;
	};

	S3MModelParser.prototype.parseCompressNormal = function(buffer, view, bytesOffset, vertexPackage) {
		var normalCount = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		if(normalCount <= 0) {
			return bytesOffset;
		}

		var normalDimension = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var normalStride = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		var byteLength = normalCount * 2 * Int16Array.BYTES_PER_ELEMENT;
		var normalBuffer = new Uint8Array(buffer, bytesOffset, byteLength);
		bytesOffset += byteLength;
		var attributes = vertexPackage.vertexAttributes;
		var attrLocation = vertexPackage.attrLocation;
		attrLocation['aNormal'] = attributes.length;
		attributes.push({
			index: attrLocation['aNormal'],
			typedArray: normalBuffer,
			componentsPerAttribute: 2,
			componentDatatype: ComponentDatatype.SHORT,
			offsetInBytes: 0,
			strideInBytes: normalStride,
			normalize: false
		});

		return bytesOffset;
	};

	S3MModelParser.prototype.parseCompressTexCoord = function(buffer, view, bytesOffset, vertexPackage) {
		vertexPackage.texCoordCompressConstant = [];
		vertexPackage.minTexCoordValue = [];
		var count = view.getUint16(bytesOffset, true);
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
		for(var i = 0; i < count; i++) {
			var bNeedTexCoordZ = view.getUint8(bytesOffset, true);
			bytesOffset += Uint8Array.BYTES_PER_ELEMENT;
			bytesOffset += Uint8Array.BYTES_PER_ELEMENT * 3;
			var texCoordCount = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var dimension = view.getUint16(bytesOffset, true);
			bytesOffset += Uint16Array.BYTES_PER_ELEMENT;
			var texCoordStride = view.getUint16(bytesOffset, true);
			bytesOffset += Uint16Array.BYTES_PER_ELEMENT;

			var texCoordCompressConstant = view.getFloat32(bytesOffset, true);
			bytesOffset += Float32Array.BYTES_PER_ELEMENT;
			vertexPackage.texCoordCompressConstant.push(texCoordCompressConstant);

			var minTexCoordValue = {};
			minTexCoordValue.x = view.getFloat32(bytesOffset, true);
			bytesOffset += Float32Array.BYTES_PER_ELEMENT;
			minTexCoordValue.y = view.getFloat32(bytesOffset, true);
			bytesOffset += Float32Array.BYTES_PER_ELEMENT;
			minTexCoordValue.z = view.getFloat32(bytesOffset, true);
			bytesOffset += Float32Array.BYTES_PER_ELEMENT;
			minTexCoordValue.w = view.getFloat32(bytesOffset, true);
			bytesOffset += Float32Array.BYTES_PER_ELEMENT;
			vertexPackage.minTexCoordValue.push(minTexCoordValue);

			var byteLength = texCoordCount * dimension * Int16Array.BYTES_PER_ELEMENT;
			var texCoordBuffer = new Uint8Array(buffer, bytesOffset, byteLength);
			bytesOffset += byteLength;
			var align = bytesOffset % 4;
			if(align !== 0) {
				bytesOffset += (4 - align);
			}

			var str = 'aTexCoord' + i;
			var attributes = vertexPackage.vertexAttributes;
			var attrLocation = vertexPackage.attrLocation;
			attrLocation[str] = attributes.length;
			attributes.push({
				index: attrLocation[str],
				typedArray: texCoordBuffer,
				componentsPerAttribute: dimension,
				componentDatatype: ComponentDatatype.SHORT,
				offsetInBytes: 0,
				strideInBytes: dimension * Int16Array.BYTES_PER_ELEMENT,
				normalize: false
			});

			if(bNeedTexCoordZ) {
				byteLength = texCoordCount * Float32Array.BYTES_PER_ELEMENT;
				var texCoordZBuffer = new Uint8Array(buffer, bytesOffset, byteLength);
				bytesOffset += byteLength;
				vertexPackage.texCoordZMatrix = true;
				str = 'aTexCoordZ' + i;
				attrLocation[str] = attributes.length;
				attributes.push({
					index: attrLocation[str],
					typedArray: texCoordZBuffer,
					componentsPerAttribute: 1,
					componentDatatype: ComponentDatatype.FLOAT,
					offsetInBytes: 0,
					strideInBytes: Float32Array.BYTES_PER_ELEMENT,
					normalize: false
				});
			}
		}
		return bytesOffset;
	};

	S3MModelParser.prototype.parseStandardSkeleton = function(buffer, view, bytesOffset, vertexPackage) {
		bytesOffset = this.parseVertex(buffer, view, bytesOffset, vertexPackage);

		bytesOffset = this.parseNormal(buffer, view, bytesOffset, vertexPackage);

		bytesOffset = this.parseVertexColor(buffer, view, bytesOffset, vertexPackage);

		bytesOffset = this.parseSecondColor(buffer, view, bytesOffset, vertexPackage);

		bytesOffset = this.parseTexCoord(buffer, view, bytesOffset, vertexPackage);

		bytesOffset = this.parseInstanceInfo(buffer, view, bytesOffset, vertexPackage);

		return bytesOffset;
	};

	S3MModelParser.prototype.parseCompressSkeleton = function(buffer, view, bytesOffset, vertexPackage) {
		var compressOptions = view.getUint32(bytesOffset, true);
		vertexPackage.compressOptions = compressOptions;
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		if((compressOptions & S3MModelParser.VertexCompressOption.SVC_Vertex) === S3MModelParser.VertexCompressOption.SVC_Vertex) {
			bytesOffset = this.parseCompressVertex(buffer, view, bytesOffset, vertexPackage);
		} else {
			bytesOffset = this.parseVertex(buffer, view, bytesOffset, vertexPackage);
		}

		if((compressOptions & S3MModelParser.VertexCompressOption.SVC_Normal) === S3MModelParser.VertexCompressOption.SVC_Normal) {
			bytesOffset = this.parseCompressNormal(buffer, view, bytesOffset, vertexPackage);
		} else {
			bytesOffset = this.parseNormal(buffer, view, bytesOffset, vertexPackage);
		}

		bytesOffset = this.parseVertexColor(buffer, view, bytesOffset, vertexPackage);

		bytesOffset = this.parseSecondColor(buffer, view, bytesOffset, vertexPackage);

		if((compressOptions & S3MModelParser.VertexCompressOption.SVC_TexutreCoord) === S3MModelParser.VertexCompressOption.SVC_TexutreCoord) {
			bytesOffset = this.parseCompressTexCoord(buffer, view, bytesOffset, vertexPackage);
		} else {
			bytesOffset = this.parseTexCoord(buffer, view, bytesOffset, vertexPackage);
		}

		if((compressOptions & S3MModelParser.VertexCompressOption.SVC_TexutreCoordIsW) === S3MModelParser.VertexCompressOption.SVC_TexutreCoordIsW) {
			vertexPackage.textureCoordIsW = true;
		}

		bytesOffset = this.parseInstanceInfo(buffer, view, bytesOffset, vertexPackage);

		return bytesOffset;
	};

	S3MModelParser.prototype.parseIndexPackage = function(buffer, view, bytesOffset, arrIndexPackage) {
		var count = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		for(var i = 0; i < count; i++) {
			var indexPackage = {};
			var indexCount = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var indexType = view.getUint8(bytesOffset, true);
			bytesOffset += Uint8Array.BYTES_PER_ELEMENT;
			var bUseIndex = view.getUint8(bytesOffset, true);
			bytesOffset += Uint8Array.BYTES_PER_ELEMENT;
			var primitiveType = view.getUint8(bytesOffset, true);
			bytesOffset += Uint8Array.BYTES_PER_ELEMENT;
			bytesOffset += Uint8Array.BYTES_PER_ELEMENT;

			if(indexCount > 0) {
				var byteLength;
				if(indexType === 1 || indexType === 3) {
					byteLength = indexCount * Uint32Array.BYTES_PER_ELEMENT;
					indexPackage.bytesOffset = bytesOffset;
					indexPackage.byteLength = byteLength;
				} else {
					byteLength = indexCount * Uint16Array.BYTES_PER_ELEMENT;
					indexPackage.bytesOffset = bytesOffset;
					indexPackage.byteLength = byteLength;
					if(indexCount % 2 !== 0) {
						byteLength += 2;
					}
				}

				bytesOffset += byteLength;
			}

			indexPackage.indicesCount = indexCount;
			indexPackage.indexType = indexType;
			indexPackage.primitiveType = primitiveType;

			var arrPassName = [];
			var passNameCount = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			for(var j = 0; j < passNameCount; j++) {
				var res = this.parseString(buffer, view, bytesOffset);
				var passName = res.string;
				bytesOffset = res.bytesOffset;
				arrPassName.push(passName);
				indexPackage.materialCode = passName;
			}

			var align = bytesOffset % 4;
			if(align !== 0) {
				var nReserved = 4 - bytesOffset % 4;
				bytesOffset += nReserved;
			}

			arrIndexPackage.push(indexPackage);
		}

		return bytesOffset;
	};

	S3MModelParser.prototype.parseSkeleton = function(buffer, view, bytesOffset, geoPackage) {
		var size = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		var count = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		for(var i = 0; i < count; i++) {
			var res = this.parseString(buffer, view, bytesOffset);
			var geometryName = res.string;
			bytesOffset = res.bytesOffset;
			var align = bytesOffset % 4;
			if(align !== 0) {
				bytesOffset += (4 - align);
			}

			var tag = view.getUint32(bytesOffset, true);
			bytesOffset += Int32Array.BYTES_PER_ELEMENT;

			var vertexPackage = {
				vertexAttributes: [],
				attrLocation: {},
				instanceCount: 0,
				instanceMode: 0,
				instanceIndex: -1
			};

			if(tag === S3MModelParser.S3MBVertexTag.SV_Standard) {
				bytesOffset = this.parseStandardSkeleton(buffer, view, bytesOffset, vertexPackage);
			} else if(tag === S3MModelParser.S3MBVertexTag.SV_Compressed) {
				bytesOffset = this.parseCompressSkeleton(buffer, view, bytesOffset, vertexPackage);
			}

			var arrIndexPackage = [];
			bytesOffset = this.parseIndexPackage(buffer, view, bytesOffset, arrIndexPackage);

			geoPackage[geometryName] = {
				vertexPackage: vertexPackage,
				arrIndexPackage: arrIndexPackage
			};
		}

		var secColorSize = view.getUint32(bytesOffset, true);
		bytesOffset += secColorSize;
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;

		return bytesOffset;
	};

	S3MModelParser.prototype.parseTexturePackage = function(buffer, view, bytesOffset, texturePackage) {
		var size = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		var count = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		for(var i = 0; i < count; i++) {
			var res = this.parseString(buffer, view, bytesOffset);
			var textureCode = res.string;
			bytesOffset = res.bytesOffset;
			var align = bytesOffset % 4;
			if(align !== 0) {
				bytesOffset += (4 - align);
			}

			var level = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var width = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var height = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var compressType = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var size = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var pixelFormat = view.getUint32(bytesOffset, true);
			bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
			var textureData = new Uint8Array(buffer, bytesOffset, size);
			bytesOffset += size;

			texturePackage[textureCode] = {
				id: textureCode,
				width: width,
				height: height,
				compressType: compressType,
				nFormat: pixelFormat,
				internalFormat: S3MModelParser.PixelFormat.RGBA_DXT5,
				imageBuffer: textureData
			};
		}

		return bytesOffset;
	};

	S3MModelParser.prototype.parseMaterial = function(buffer, view, bytesOffset, result) {
		var byteLength = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
		var materialBuffer = new Uint8Array(buffer, bytesOffset, byteLength);
		var strMaterials = this.getStringFromTypedArray(materialBuffer);
		bytesOffset += byteLength;
		result.materials = JSON.parse(strMaterials);

		return bytesOffset;
	};

	S3MModelParser.prototype.parseBuffer = function(unzipBuffer, bytesOffset) {
        var result = {
            version: undefined,
            groupNode: undefined,
            geoPackage: {},
            matrials: undefined,
            texturePackage: {}
        };

		result.byteLength = unzipBuffer.byteLength;
		result.buffer = unzipBuffer;
		view = new DataView(unzipBuffer);
		bytesOffset = 0;
		var nOptions = view.getUint32(bytesOffset, true);
		bytesOffset += Uint32Array.BYTES_PER_ELEMENT;

		bytesOffset = this.parseGroupNode(unzipBuffer, view, bytesOffset, result);

		bytesOffset = this.parseSkeleton(unzipBuffer, view, bytesOffset, result.geoPackage);

		bytesOffset = this.parseTexturePackage(unzipBuffer, view, bytesOffset, result.texturePackage);

		bytesOffset = this.parseMaterial(unzipBuffer, view, bytesOffset, result);

		return result;
	};

	function _fillBMPHeader(buffer,width,height){
		var extraBytes = width%4;
		var rgbSize = height * (4 * width + extraBytes);
		var headerInfoSize = 108;
	
		/******************header***********************/
		var flag = "BM";
		var reserved = 0;
		var offset_header = 122;
		var fileSize = rgbSize + offset;
		var planes = 1;
		var bitPP = 32;
		var compress = 3;
		var hr = 2835;
		var vr = 2835;
		var colors = 0;
		var importantColors = 0;
		
		var view = new DataView(buffer);
		var offset = 0;
		view.setUint16(offset, 0x4d42, true);offset += 2;	
		view.setUint32(offset, fileSize, true);offset += 4;

		view.setUint32(offset, reserved, true);offset += 4;

		view.setUint32(offset, offset_header, true);offset += 4;
		view.setUint32(offset, headerInfoSize, true);offset += 4;
		view.setUint32(offset, width, true);offset += 4;
		view.setUint32(offset, height, true);offset += 4;	
	
		view.setUint16(offset, planes, true);offset += 2;	
		view.setUint16(offset, bitPP, true);offset += 2;	
		
		view.setUint32(offset, this.compress, true);offset += 4;

		view.setUint32(offset, rgbSize, true);offset += 4;
		view.setUint32(offset, hr, true);offset += 4;
		view.setUint32(offset, vr, true);offset += 4;

		view.setUint8(offset, colors, true);offset += 4;
		view.setUint32(offset, importantColors, true);offset += 4;	

		view.setUint32(offset, 0xff0000, true);offset += 4;	
		view.setUint32(offset, 0xff00, true);offset += 4;	
		view.setUint32(offset, 0xff, true);offset += 4;	
		view.setUint32(offset, 0xff000000, true);offset += 4;	
		view.setUint32(offset, 0x57696e20, true);offset += 4;
	};

    S3MModelParser.prototype.generateGLTFBuffer = function(
        vertexCount,
        indicesArr,
        positionsArr,
        normalsArr,
        uv0sArr,
        colorsArr,
        texturePackage,
        geoMat,
        min,
        max,
        textureCodes,
        materialArr
    ) {
    	return new Promise(function(resolve, reject) {
	    	(function(vertexCount, indicesArr, positionsArr, normalsArr, uv0sArr, colorsArr, texturePackage, geoMat, min, max, textureCodes, materialArr) {
		        if(
		            vertexCount === 0 ||
		            positionsArr === undefined ||
		            positionsArr.length === 0
		        ) {
		            return {
		                buffers: [],
		                bufferViews: [],
		                accessors: [],
		                meshes: [],
		                nodes: [],
		                nodesInScene: [],
		            };
		        }
		
		        var buffers = [];
		        var bufferViews = [];
		        var accessors = [];
		        var meshes = [];
		        var nodes = [];
		        var nodesInScene = [];
		
		        var posIndex = 0;
		        var normalIndex = 0;
		        var uv0Index = 0;
		        var colorIndex = 0;
		        var indicesIndex = 0;
		        var currentIndex = posIndex;
		
		        for(var meshIndex = 0; meshIndex < positionsArr.length; meshIndex++) {
		            var indices = indicesArr ? indicesArr[meshIndex] : undefined;
		            var positions = positionsArr ? positionsArr[meshIndex] : undefined;
		            var normals = normalsArr ? normalsArr[meshIndex] : undefined;
		            var uv0s = uv0sArr ? uv0sArr[meshIndex] : undefined;
		            var colors = colorsArr ? colorsArr[meshIndex] : undefined;
		
		            // if we provide indices, then the vertex count is the length
		            // of that array, otherwise we assume non-indexed triangle
		            if(indices) {
		                vertexCount = indices.length;
		            }
		
		            // allocate array
		            var indexArray = new Uint32Array(vertexCount);
		
		            if(indices) {
		                // set the indices
		                for(var vertexIndex = 0; vertexIndex < vertexCount; ++vertexIndex) {
		                    indexArray[vertexIndex] = indices[vertexIndex];
		                }
		            } else {
		                // generate indices
		                for(var vertexIndex = 0; vertexIndex < vertexCount; ++vertexIndex) {
		                    indexArray[vertexIndex] = vertexIndex;
		                }
		            }
		
		            // push to the buffers, bufferViews and accessors
		            var indicesBlob = new Blob([indexArray], {
		                type: "application/binary"
		            });
		            var indicesURL = URL.createObjectURL(indicesBlob);
		
		            var endIndex = vertexCount;
		
		            // POSITIONS
		            var meshPositions = positions.subarray(0, endIndex * 3);
		            var positionsBlob = new Blob([meshPositions], {
		                type: "application/binary",
		            });
		            var positionsURL = URL.createObjectURL(positionsBlob);
		
		            // NORMALS
		            var meshNormals = normals ? normals.subarray(0, endIndex * 3) : null;
		            var normalsURL = null;
		            if(meshNormals) {
		                var normalsBlob = new Blob([meshNormals], {
		                    type: "application/binary",
		                });
		                normalsURL = URL.createObjectURL(normalsBlob);
		            }
		
		            // UV0s
		            var meshUv0s = uv0s ? uv0s.subarray(0, endIndex * 2) : null;
		            var uv0URL = null;
		            if(meshUv0s) {
		                var uv0Blob = new Blob([meshUv0s], {
		                    type: "application/binary"
		                });
		                uv0URL = URL.createObjectURL(uv0Blob);
		            }
		
		            // Colors
		            // @TODO: check we can directly import vertex colors as bytes instead
		            // of having to convert to float
		            var meshColorsInBytes = colors ? colors.subarray(0, endIndex * 4) : null;
		            var meshColors = null;
		            var colorsURL = null;
		            if(meshColorsInBytes) {
		                var colorCount = meshColorsInBytes.length;
		                meshColors = new Float32Array(colorCount);
		                for(var i = 0; i < colorCount; ++i) {
		                    meshColors[i] = meshColorsInBytes[i] / 255.0;
		                }
		
		                var colorsBlob = new Blob([meshColors], {
		                    type: "application/binary"
		                });
		                colorsURL = URL.createObjectURL(colorsBlob);
		            }
		
		            var attributes = {};
		
		            // POSITIONS
		            attributes.POSITION = currentIndex;
		            buffers.push({
		                uri: positionsURL,
		                byteLength: meshPositions.byteLength,
		            });
		            bufferViews.push({
		                buffer: currentIndex,
		                byteOffset: 0,
		                byteLength: meshPositions.byteLength,
		                target: 34962,
		            });
		            accessors.push({
		                bufferView: currentIndex,
		                byteOffset: 0,
		                componentType: 5126,
		                count: vertexCount,
		                type: "VEC3",
		                max: max,
		                min: min
		            });
		
		            // NORMALS
		            if(normalsURL) {
		                ++currentIndex;
		                normalIndex = currentIndex;
		                attributes.NORMAL = normalIndex;
		                buffers.push({
		                    uri: normalsURL,
		                    byteLength: meshNormals.byteLength,
		                });
		                bufferViews.push({
		                    buffer: normalIndex,
		                    byteOffset: 0,
		                    byteLength: meshNormals.byteLength,
		                    target: 34962,
		                });
		                accessors.push({
		                    bufferView: normalIndex,
		                    byteOffset: 0,
		                    componentType: 5126,
		                    count: vertexCount,
		                    type: "VEC3",
		                    max: [0, 0, 0],
		                    min: [0, 0, 0],
		                });
		            }
		
		            // UV0
		            if(uv0URL) {
		                ++currentIndex;
		                uv0Index = currentIndex;
		                attributes.TEXCOORD_0 = uv0Index;
		                buffers.push({
		                    uri: uv0URL,
		                    byteLength: meshUv0s.byteLength,
		                });
		                bufferViews.push({
		                    buffer: uv0Index,
		                    byteOffset: 0,
		                    byteLength: meshUv0s.byteLength,
		                    target: 34962,
		                });
		                accessors.push({
		                    bufferView: uv0Index,
		                    byteOffset: 0,
		                    componentType: 5126,
		                    count: vertexCount,
		                    type: "VEC2",
		                    max: [0, 0],
		                    min: [0, 0],
		                });
		            }
		
		            // COLORS
		            if(colorsURL) {
		                ++currentIndex;
		                colorIndex = currentIndex;
		                attributes.COLOR_0 = colorIndex;
		                buffers.push({
		                    uri: colorsURL,
		                    byteLength: meshColors.byteLength,
		                });
		                bufferViews.push({
		                    buffer: colorIndex,
		                    byteOffset: 0,
		                    byteLength: meshColors.byteLength,
		                    target: 34962,
		                });
		                accessors.push({
		                    bufferView: colorIndex,
		                    byteOffset: 0,
		                    componentType: 5126,
		                    count: vertexCount,
		                    type: "VEC4",
		                    max: [0, 0, 0, 0],
		                    min: [0, 0, 0, 0],
		                });
		            }
		
		            // INDICES
		            ++currentIndex;
		            indicesIndex = currentIndex;
		            buffers.push({
		                uri: indicesURL,
		                byteLength: indexArray.byteLength,
		            });
		            bufferViews.push({
		                buffer: indicesIndex,
		                byteOffset: 0,
		                byteLength: indexArray.byteLength,
		                target: 34963,
		            });
		            accessors.push({
		                bufferView: indicesIndex,
		                byteOffset: 0,
		                componentType: 5125,
		                count: vertexCount,
		                type: "SCALAR",
		                max: [0],
		                min: [0],
		            });
		
		            // create a new mesh for this page
		            meshes.push({
		                primitives: [{
		                    attributes: attributes,
		                    indices: indicesIndex,
		                    material: meshIndex,
		                }, ],
		            });
		            nodesInScene.push(meshIndex);
		            nodes.push({
		                mesh: meshIndex,
		            });
		            currentIndex++;
		        }
		
		        var gltfTextures = [];
		        var gltfImages = [];
		
		        var gltfSamplers = [{
		            magFilter: 9729,
		            minFilter: 9729,
		            wrapS: 10497,
		            wrapT: 10497,
		        }];
		
		        var gltfMaterials = new Array(textureCodes.length);
		        var imageIndex = 0;
		        var materialIndex = 0;
		        
		        var textureCount = 0;
				var blobs = [];
		        var materialDefer = new Promise(function(subResolve, subReject) {
			        for(var k = 0; k < materialArr.length; k++) {
			        	(function(k) {
				            var hasTexture = materialArr[k].textureunitstates[0];
				            if(hasTexture) {
				            	textureCount++;
					            var textureId = materialArr[k].textureunitstates[0].textureunitstate.id;
					            var textureObj = texturePackage[textureId];
					            var imageBuffer = textureObj.imageBuffer;
					            var imageTypedArray = null;
					            var pixelFormat = textureObj.nFormat;
								var bmpHeaderLength = 122;
					            if (pixelFormat > S3MPixelFormat.BGR || pixelFormat === S3MPixelFormat.LUMINANCE_ALPHA) {
					                imageTypedArray = new Uint8Array(bmpHeaderLength + textureObj.width * textureObj.height * 4);
					            }
					            else {
					                imageTypedArray = new Uint16Array(bmpHeaderLength / 2 + textureObj.width * textureObj.height);
					            }
					            DXTTextureDecode.decode(imageTypedArray.subarray(bmpHeaderLength), textureObj.width, textureObj.height, imageBuffer, pixelFormat);
					
								_fillBMPHeader(imageTypedArray.buffer, textureObj.width, textureObj.height);

								var bmpblob = new Blob([imageTypedArray],{type:"image/bmp"});
								var textureURL = URL.createObjectURL(bmpblob);
								
								buffers.push({
									uri: textureURL,
									byteLength: imageTypedArray.byteLength,
								});
					
								bufferViews.push({
									buffer: buffers.length - 1,
									byteOffset: 0,
									byteLength: imageTypedArray.byteLength,
									target: 34962,
								});
					
								gltfImages.push({
									"mimeType": "image/bmp",
									"bufferView": bufferViews.length - 1
								});
					
								gltfTextures.push({
									sampler: 0,
									source: imageIndex++,
								});
								
								blobs.push(bmpblob);
								if(blobs.length === textureCount) {
									// materialDefer.resolve();
									subResolve();
								}
				            }
				
				            gltfMaterials.push({
				                pbrMetallicRoughness: {
				                    metallicFactor: 0.0,
				                    baseColorTexture: hasTexture ? {
				                        index: materialIndex++,
				                        texCoord: 0
				                    } : undefined
				                },
				                doubleSided: true,
				                name: textureId,
				            });
				        })(k);
			        }
			    });
		
		        var rawGLTF = {
		            scene: 0,
		            scenes: [{
		                nodes: nodesInScene,
		            }, ],
		            nodes: nodes,
		            meshes: meshes,
		            buffers: buffers,
		            bufferViews: bufferViews,
		            accessors: accessors,
		            materials: gltfMaterials,
		            textures: gltfTextures,
		            images: gltfImages,
		            samplers: gltfSamplers,
		            asset: {
		                version: "2.0",
		            },
		        };
		        
		        if(textureCount === 0) {
					resolve(rawGLTF);
				}
					
				materialDefer.then(function() {
					resolve(rawGLTF);
				});
			
		    })(vertexCount, indicesArr, positionsArr, normalsArr, uv0sArr, colorsArr, texturePackage, geoMat, min, max, textureCodes, materialArr);
	    });
    };

    S3MModelParser.prototype._binarizeGLTF = function(rawGLTF) {
        var encoder = new TextEncoder();
        var rawGLTFData = encoder.encode(JSON.stringify(rawGLTF));
        var binaryGLTFData = new Uint8Array(rawGLTFData.byteLength + 20);
        var binaryGLTF = {
            magic: new Uint8Array(binaryGLTFData.buffer, 0, 4),
            version: new Uint32Array(binaryGLTFData.buffer, 4, 1),
            length: new Uint32Array(binaryGLTFData.buffer, 8, 1),
            chunkLength: new Uint32Array(binaryGLTFData.buffer, 12, 1),
            chunkType: new Uint32Array(binaryGLTFData.buffer, 16, 1),
            chunkData: new Uint8Array(
                binaryGLTFData.buffer,
                20,
                rawGLTFData.byteLength
            ),
        };

        binaryGLTF.magic[0] = "g".charCodeAt();
        binaryGLTF.magic[1] = "l".charCodeAt();
        binaryGLTF.magic[2] = "T".charCodeAt();
        binaryGLTF.magic[3] = "F".charCodeAt();

        binaryGLTF.version[0] = 2;
        binaryGLTF.length[0] = binaryGLTFData.byteLength;
        binaryGLTF.chunkLength[0] = rawGLTFData.byteLength;
        binaryGLTF.chunkType[0] = 0x4e4f534a; // JSON
        binaryGLTF.chunkData.set(rawGLTFData);

        return binaryGLTFData;
    };

    S3MModelParser.prototype._binarizeB3DM = function(featureTableJSON, batchTabelJSON, binaryGLTFData) {
        var encoder = new TextEncoder();

        // Feature Table
        var featureTableOffset = 28;
        var featureTableJSONData = encoder.encode(featureTableJSON);
        var featureTableLength = featureTableJSONData.byteLength;

        // Batch Table
        var batchTableOffset = featureTableOffset + featureTableLength;
        var batchTableJSONData = encoder.encode(batchTabelJSON);

        // Calculate alignment buffer by padding the remainder of the batch table
        var paddingCount = (batchTableOffset + batchTableJSONData.byteLength) % 8;
        var batchTableLength = batchTableJSONData.byteLength + paddingCount;
        var paddingStart = batchTableJSONData.byteLength;
        var paddingStop = batchTableLength;

        // Binary GLTF
        var binaryGLTFOffset = batchTableOffset + batchTableLength;
        var binaryGLTFLength = binaryGLTFData.byteLength;

        var dataSize = featureTableLength + batchTableLength + binaryGLTFLength;
        var b3dmRawData = new Uint8Array(28 + dataSize);

        var b3dmData = {
            magic: new Uint8Array(b3dmRawData.buffer, 0, 4),
            version: new Uint32Array(b3dmRawData.buffer, 4, 1),
            byteLength: new Uint32Array(b3dmRawData.buffer, 8, 1),
            featureTableJSONByteLength: new Uint32Array(b3dmRawData.buffer, 12, 1),
            featureTableBinaryByteLength: new Uint32Array(b3dmRawData.buffer, 16, 1),
            batchTableJSONByteLength: new Uint32Array(b3dmRawData.buffer, 20, 1),
            batchTableBinaryByteLength: new Uint32Array(b3dmRawData.buffer, 24, 1),
            featureTable: new Uint8Array(
                b3dmRawData.buffer,
                featureTableOffset,
                featureTableLength
            ),
            batchTable: new Uint8Array(
                b3dmRawData.buffer,
                batchTableOffset,
                batchTableLength
            ),
            binaryGLTF: new Uint8Array(
                b3dmRawData.buffer,
                binaryGLTFOffset,
                binaryGLTFLength
            ),
        };

        b3dmData.magic[0] = "b".charCodeAt();
        b3dmData.magic[1] = "3".charCodeAt();
        b3dmData.magic[2] = "d".charCodeAt();
        b3dmData.magic[3] = "m".charCodeAt();

        b3dmData.version[0] = 1;
        b3dmData.byteLength[0] = b3dmRawData.byteLength;

        b3dmData.featureTable.set(featureTableJSONData);
        b3dmData.featureTableJSONByteLength[0] = featureTableLength;
        b3dmData.featureTableBinaryByteLength[0] = 0;

        b3dmData.batchTable.set(batchTableJSONData);
        for(var index = paddingStart; index < paddingStop; ++index) {
            b3dmData.batchTable[index] = 0x20;
        }
        b3dmData.batchTableJSONByteLength[0] = batchTableLength;
        b3dmData.batchTableBinaryByteLength[0] = 0;
        b3dmData.binaryGLTF.set(binaryGLTFData);

        return b3dmRawData;
    };

	var modelParser = new S3MModelParser();
    onmessage = function (e) {
    	var buffer = e.data.buffer;
    	var bytesOffset = e.data.bytesOffset;
        var result = modelParser.parseBuffer(buffer, bytesOffset);
        var geoPackage = result.geoPackage;
        var pageLods = result.groupNode.pageLods;
        var verticesCount;
        var indices;
        var positionsArr = [];
        var positions_4;
        var positions;
        var indexArr = [];
        var uvArr = [];
        var colorArr = [];
        var materialArr = [];
        var totalVerticesCount = 0;
        var mat = pageLods[0].geodes[0].matrix;
        var textureCodes = [];

        var materialsMap = {}
        for(var i = 0; i < result.materials.material.length; i++) {
            materialsMap[result.materials.material[i].material.id] = result.materials.material[i].material;
        }

        var scratchCartesian = {
        	x: 0,
			y: 0,
			z: 0
		};
        var indicesCount = 0;
        var minX = Number.MAX_VALUE,
            minY = Number.MAX_VALUE,
            minZ = Number.MAX_VALUE;
        var maxX = Number.MIN_VALUE,
            maxY = Number.MIN_VALUE,
            maxZ = Number.MIN_VALUE;
        for(var geoName in geoPackage) {
            var vertexPackage = geoPackage[geoName].vertexPackage;
            verticesCount = vertexPackage.verticesCount;
            var buffer = vertexPackage.vertexAttributes[0].typedArray.buffer;
            var componentsPerAttribute = vertexPackage.vertexAttributes[0].componentsPerAttribute;
            positions_4 = new Float32Array(buffer,
                vertexPackage.vertexAttributes[0].offsetInBytes,
                verticesCount * componentsPerAttribute);
            positions = new Float32Array(verticesCount * 3);
            for(var i = 0; i < verticesCount; i++) {
                var x = positions_4[i * componentsPerAttribute];
                var y = positions_4[i * componentsPerAttribute + 1];
                var z = positions_4[i * componentsPerAttribute + 2];
                S3MModelParser.multiplyByPoint(mat, {x: x, y: y, z: z}, scratchCartesian);
                positions[i * 3] = scratchCartesian.x;
                positions[i * 3 + 1] = scratchCartesian.y;
                positions[i * 3 + 2] = scratchCartesian.z;

                minX = Math.min(minX, positions[i * 3]);
                minY = Math.min(minY, positions[i * 3 + 1]);
                minZ = Math.min(minZ, positions[i * 3 + 2]);
                maxX = Math.max(maxX, positions[i * 3]);
                maxY = Math.max(maxY, positions[i * 3 + 1]);
                maxZ = Math.max(maxZ, positions[i * 3 + 2]);
            }
            positionsArr.push(positions);

            var attrLocation = vertexPackage.attrLocation['aTexCoord0'];
            if(attrLocation) {
                var uvNum = vertexPackage.vertexAttributes[attrLocation].componentsPerAttribute;
                var uvsOri = new Float32Array(buffer,
                    vertexPackage.vertexAttributes[attrLocation].offsetInBytes, verticesCount * uvNum
                );
                var uvs = new Float32Array(verticesCount * 2);
                for(var i = 0; i < verticesCount; i++) {
                    uvs[i * 2] = uvsOri[i * uvNum];
                    uvs[i * 2 + 1] = uvsOri[i * uvNum + 1];
                }
                uvArr.push(uvs);
            } else {
                uvArr.push(undefined);
            }

            indices = new Uint16Array(result.buffer,
                geoPackage[geoName].arrIndexPackage[0].bytesOffset,
                geoPackage[geoName].arrIndexPackage[0].byteLength / 2);
            indexArr.push(indices);
            indicesCount += indices.length;
            totalVerticesCount += verticesCount;

            var materialCode = geoPackage[geoName].arrIndexPackage[0].materialCode;
            materialArr.push(materialsMap[materialCode]);
        }

        var min = [minX, minY, minZ];
        var max = [maxX, maxY, maxZ];

        var rawGLTFPromise = modelParser.generateGLTFBuffer(totalVerticesCount, indexArr, positionsArr, null, uvArr, null, result.texturePackage, mat, min, max, textureCodes, materialArr);
        rawGLTFPromise.then(function(rawGLTF) {
	        var binaryGLTFData = modelParser._binarizeGLTF(rawGLTF);
	        var featureTableJSON = JSON.stringify({
	            BATCH_LENGTH: 0
	        });
	        var batchTableJSON = JSON.stringify({});
	        var b3dmBuffer = modelParser._binarizeB3DM(
	            featureTableJSON,
	            batchTableJSON,
	            binaryGLTFData
	        );
	
	        postMessage({
	            b3dmBuffer: b3dmBuffer,
	            pageLods: pageLods
			});
		});
    };
`;

/**
 * A tile in a S3M data source.
 *
 * @alias S3MTile
 * @constructor
 */
function S3MTile(tile) {
	this._ownerTile = tile;
	this._dataSource = tile._tileset._s3mDataSource;
	this._ready = false;
	this._relativePath = "";
	if(tile._depth <= 1) {
		this._relativePath = tile._header.content.uri.substring(0, tile._header.content.uri.lastIndexOf("\/") + 1);
	} else {
		this._relativePath = tile.parent._s3mTile._relativePath;
	}
}

function createPriorityFunction(tile) {
	return function() {
		return tile.priority;
	};
}

S3MTile.prototype.requestContent = function() {
	var tile = this._ownerTile;
	var baseResource = tile._tileset._baseResource;
	var fileName = tile._header.content.uri;
	var relPath = './data/path/' + fileName;

	if(fileName === "") {
		tile._contentState = Cesium3DTileContentState.UNLOADED;
		this._ready = true;
		tile._content = new Empty3DTileContent(tile.tileset, tile);
		tile.hasEmptyContent = true;
		return;
	}

	var resource = baseResource.getDerivedResource({
		url: relPath
	});
	var request = new Request({
		throttle: true,
		throttleByServer: true,
		type: RequestType.TILES3D,
		priorityFunction: createPriorityFunction(tile),
		serverKey: tile._serverKey
	});

	tile._request = request;
	resource.request = request;

	var promise = resource.fetchArrayBuffer();

	if(!defined(promise)) {
		return false;
	}

	tile._contentState = Cesium3DTileContentState.LOADING;
	var that = this;
	promise.then(function(buffer) {
        var promiseGltf = that._dataSource._GLTFProcessingQueue.addTask(buffer);
        promiseGltf.then(function(data) {
            var b3dmBuffer = data.gltfData;

			var blob = new Blob([b3dmBuffer], {
				type: "application/binary",
			});

			tile._pageLods = data.pageLods;
			tile._contentResource._url = URL.createObjectURL(blob);
			tile._contentState = Cesium3DTileContentState.UNLOADED;
			that._ready = true;
			tile._resolveHookedObject();
        });

	}).otherwise(function(e) {
		tile._contentState = Cesium3DTileContentState.UNLOADED;
	});

	return false;
};

Cesium3DTile.prototype._resolveHookedObject = function() {
	// Keep a handle on the early promises
	var _contentReadyToProcessPromise = this._contentReadyToProcessPromise;
	var _contentReadyPromise = this._contentReadyPromise;

	// Call the real requestContent function
	this._hookedRequestContent();

	// Fulfill the promises
	if(_contentReadyToProcessPromise) {
		this._contentReadyToProcessPromise.then(() => {
			_contentReadyToProcessPromise.resolve();
		});
	}

	if(_contentReadyPromise) {
		this._contentReadyPromise.then(() => {
			this._isLoading = false;
			this._content._contentReadyPromise.resolve();
		});
	}
};

Cesium3DTile.prototype._hookedRequestContent = Cesium3DTile.prototype.requestContent;
Cesium3DTile.prototype.requestContent = function() {
	if(!this.tileset._isS3MTileSet) {
		return this._hookedRequestContent();
	}

	if(!defined(this._s3mTile)) {
		this._s3mTile = new S3MTile(this);

		this._contentReadyToProcessPromise = when.defer();
		this._contentReadyPromise = when.defer();
	}

	this._s3mTile.requestContent();
};

function S3MGLTFProcessingQueue() {
    this._queue = [];
    this._processing = false;
    this._createWorkers(() => {
        this._process();
    });
}

S3MGLTFProcessingQueue.prototype._process = function () {
    for (let worker of this._workers) {
        if (worker.isReadyToWork) {
            if (this._queue.length > 0) {
                let task = this._queue.shift();
                task.execute(worker);
            }
        }
    }
    setTimeout(() => {
        this._process();
    }, 100);
};

S3MGLTFProcessingQueue.prototype._createWorkers = function(cb) {
    var workerCode = _workerCode;

    var externalModules = [];

    var externalModuleCode = "";
    var fetchPromises = [];

    for (var index = 0; index < externalModules.length; ++index) {
        var moduleLoadedResolve;
        var moduleLoaded = new Promise((resolve, reject) => {
            moduleLoadedResolve = resolve;
        });
        fetchPromises.push(moduleLoaded);

        fetch(externalModules[index]).then((response) => {
            response.text().then((data) => {
                externalModuleCode += data;
                moduleLoadedResolve();
            });
        });
    }

    var externalModulesLoaded = Promise.all(fetchPromises);
    var that = this;
    externalModulesLoaded.then(function() {
        var blob = new Blob([externalModuleCode + workerCode], {
            type: "test/javascript"
        });

        var workerCount = 1;//FeatureDetection.hardwareConcurrency - 1;
        that._workers = [];

        for (var loop = 0; loop < workerCount; ++loop) {
			(function() {
				var worker = new Worker(window.URL.createObjectURL(blob));
				worker.setTask = function (task) {
					worker._task = task;
					worker.isReadyToWork = false;

					var buffer = task._data;
					var bytesOffset = 0;
					var result = {
						version: undefined,
						groupNode: undefined,
						geoPackage: {},
						matrials: undefined,
						texturePackage: {}
					};

					var view = new DataView(buffer);
					result.version = view.getFloat32(bytesOffset, true);
					bytesOffset += Float32Array.BYTES_PER_ELEMENT;
					if(result.version >= 2.0) {
						var unzipSize = view.getUint32(bytesOffset, true);
						bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
					}

					var byteSize = view.getUint32(bytesOffset, true);
					bytesOffset += Uint32Array.BYTES_PER_ELEMENT;
					var unzipBuffer = unZip(buffer, bytesOffset);

					worker.postMessage({
						buffer: unzipBuffer,
						bytesOffset: bytesOffset,
					});
				};

				worker.onmessage = function (e) {
					var task = worker._task;
					var b3dmBuffer = e.data.b3dmBuffer;
					var pageLods = e.data.pageLods;
					worker._task = null;
					worker.isReadyToWork = true;
					task.resolve({
						gltfData: b3dmBuffer,
						pageLods: pageLods,
					});
				};

				worker.isReadyToWork = true;
				that._workers.push(worker);
            })();
		}
        cb();
    });
};

S3MGLTFProcessingQueue.prototype.addTask = function(data) {
    var newTask = {
        _data: data,
        execute: function (worker) {
            worker.setTask(this);
        },
    };

    return new Promise((resolve, reject) => {
        newTask.resolve = resolve;
        newTask.reject = reject;
        this._queue.push(newTask);
    });
};

export default S3MDataSource;