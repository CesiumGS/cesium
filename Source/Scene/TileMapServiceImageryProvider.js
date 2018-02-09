define([
    '../Core/Cartesian2',
    '../Core/Cartographic',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/deprecationWarning',
    '../Core/DeveloperError',
    '../Core/GeographicTilingScheme',
    '../Core/Rectangle',
    '../Core/Resource',
    '../Core/RuntimeError',
    '../Core/TileProviderError',
    '../Core/WebMercatorTilingScheme',
    '../ThirdParty/when',
    './UrlTemplateImageryProvider'
], function(
    Cartesian2,
    Cartographic,
    defaultValue,
    defined,
    deprecationWarning,
    DeveloperError,
    GeographicTilingScheme,
    Rectangle,
    Resource,
    RuntimeError,
    TileProviderError,
    WebMercatorTilingScheme,
    when,
    UrlTemplateImageryProvider) {
    'use strict';

    function TileMapServiceImageryProvider(options) {
        options = defaultValue(options, {});

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.url)) {
            throw new DeveloperError('options.url is required.');
        }
        //>>includeEnd('debug');

        if (defined(options.proxy)) {
            deprecationWarning('TileMapServiceImageryProvider.proxy', 'The options.proxy parameter has been deprecated. Specify options.url as a Resource instance and set the proxy property there.');
        }

        var deferred = when.defer();
        UrlTemplateImageryProvider.call(this, deferred.promise);

        var resource = Resource.createIfNeeded(options.url, {
            proxy : options.proxy
        });
        resource.appendForwardSlash();

        this._tmsResource = resource;
        this._xmlResource = resource.getDerivedResource({
            url : 'tilemapresource.xml'
        });
        this._options = options;
        this._deferred = deferred;
        this._metadataError = undefined;

        this._metadataSuccess = this._metadataSuccess.bind(this);
        this._metadataFailure = this._metadataFailure.bind(this);
        this._requestMetadata = this._requestMetadata.bind(this);

        this._requestMetadata();
    }

    if (defined(Object.create)) {
        TileMapServiceImageryProvider.prototype = Object.create(UrlTemplateImageryProvider.prototype);
        TileMapServiceImageryProvider.prototype.constructor = TileMapServiceImageryProvider;
    }

    TileMapServiceImageryProvider.prototype._requestMetadata = function() {
        // Try to load remaining parameters from XML
        this._xmlResource.fetchXML().then(this._metadataSuccess).otherwise(this._metadataFailure);
    };

    TileMapServiceImageryProvider.prototype._metadataSuccess = function(xml) {
        var tileFormatRegex = /tileformat/i;
        var tileSetRegex = /tileset/i;
        var tileSetsRegex = /tilesets/i;
        var bboxRegex = /boundingbox/i;
        var format, bbox, tilesets;
        var tilesetsList = []; //list of TileSets
        var xmlResource = this._xmlResource;
        var metadataError = this._metadataError;
        var deferred = this._deferred;
        var requestMetadata = this._requestMetadata;

        // Allowing options properties (already copied to that) to override XML values

        // Iterate XML Document nodes for properties
        var nodeList = xml.childNodes[0].childNodes;
        for (var i = 0; i < nodeList.length; i++) {
            if (tileFormatRegex.test(nodeList.item(i).nodeName)) {
                format = nodeList.item(i);
            } else if (tileSetsRegex.test(nodeList.item(i).nodeName)) {
                tilesets = nodeList.item(i); // Node list of TileSets
                var tileSetNodes = nodeList.item(i).childNodes;
                // Iterate the nodes to find all TileSets
                for (var j = 0; j < tileSetNodes.length; j++) {
                    if (tileSetRegex.test(tileSetNodes.item(j).nodeName)) {
                        // Add them to tilesets list
                        tilesetsList.push(tileSetNodes.item(j));
                    }
                }
            } else if (bboxRegex.test(nodeList.item(i).nodeName)) {
                bbox = nodeList.item(i);
            }
        }

        var message;
        if (!defined(tilesets) || !defined(bbox)) {
            message = 'Unable to find expected tilesets or bbox attributes in ' + xmlResource.url + '.';
            metadataError = TileProviderError.handleError(metadataError, this, this.errorEvent, message, undefined, undefined, undefined, requestMetadata);
            if (!metadataError.retry) {
                deferred.reject(new RuntimeError(message));
            }
            this._metadataError = metadataError;
            return;
        }

        var options = this._options;
        var fileExtension = defaultValue(options.fileExtension, format.getAttribute('extension'));
        var tileWidth = defaultValue(options.tileWidth, parseInt(format.getAttribute('width'), 10));
        var tileHeight = defaultValue(options.tileHeight, parseInt(format.getAttribute('height'), 10));
        var minimumLevel = defaultValue(options.minimumLevel, parseInt(tilesetsList[0].getAttribute('order'), 10));
        var maximumLevel = defaultValue(options.maximumLevel, parseInt(tilesetsList[tilesetsList.length - 1].getAttribute('order'), 10));
        var tilingSchemeName = tilesets.getAttribute('profile');
        var tilingScheme = options.tilingScheme;

        if (!defined(tilingScheme)) {
            if (tilingSchemeName === 'geodetic' || tilingSchemeName === 'global-geodetic') {
                tilingScheme = new GeographicTilingScheme({ellipsoid : options.ellipsoid});
            } else if (tilingSchemeName === 'mercator' || tilingSchemeName === 'global-mercator') {
                tilingScheme = new WebMercatorTilingScheme({ellipsoid : options.ellipsoid});
            } else {
                message = xmlResource.url + 'specifies an unsupported profile attribute, ' + tilingSchemeName + '.';
                metadataError = TileProviderError.handleError(metadataError, this, this.errorEvent, message, undefined, undefined, undefined, requestMetadata);
                if (!metadataError.retry) {
                    deferred.reject(new RuntimeError(message));
                }
                this._metadataError = metadataError;
                return;
            }
        }

        // rectangle handling
        var rectangle = Rectangle.clone(options.rectangle);

        if (!defined(rectangle)) {
            var sw;
            var ne;
            var swXY;
            var neXY;

            // In older versions of gdal x and y values were flipped, which is why we check for an option to flip
            // the values here as well. Unfortunately there is no way to autodetect whether flipping is needed.
            var flipXY = defaultValue(options.flipXY, false);
            if (flipXY) {
                swXY = new Cartesian2(parseFloat(bbox.getAttribute('miny')), parseFloat(bbox.getAttribute('minx')));
                neXY = new Cartesian2(parseFloat(bbox.getAttribute('maxy')), parseFloat(bbox.getAttribute('maxx')));
            } else {
                swXY = new Cartesian2(parseFloat(bbox.getAttribute('minx')), parseFloat(bbox.getAttribute('miny')));
                neXY = new Cartesian2(parseFloat(bbox.getAttribute('maxx')), parseFloat(bbox.getAttribute('maxy')));
            }

            // Determine based on the profile attribute if this tileset was generated by gdal2tiles.py, which
            // uses 'mercator' and 'geodetic' profiles, or by a tool compliant with the TMS standard, which is
            // 'global-mercator' and 'global-geodetic' profiles. In the gdal2Tiles case, X and Y are always in
            // geodetic degrees.
            var isGdal2tiles = tilingSchemeName === 'geodetic' || tilingSchemeName === 'mercator';
            if (tilingScheme instanceof GeographicTilingScheme || isGdal2tiles) {
                sw = Cartographic.fromDegrees(swXY.x, swXY.y);
                ne = Cartographic.fromDegrees(neXY.x, neXY.y);
            } else {
                var projection = tilingScheme.projection;
                sw = projection.unproject(swXY);
                ne = projection.unproject(neXY);
            }

            rectangle = new Rectangle(sw.longitude, sw.latitude, ne.longitude, ne.latitude);
        }

        // The rectangle must not be outside the bounds allowed by the tiling scheme.
        if (rectangle.west < tilingScheme.rectangle.west) {
            rectangle.west = tilingScheme.rectangle.west;
        }
        if (rectangle.east > tilingScheme.rectangle.east) {
            rectangle.east = tilingScheme.rectangle.east;
        }
        if (rectangle.south < tilingScheme.rectangle.south) {
            rectangle.south = tilingScheme.rectangle.south;
        }
        if (rectangle.north > tilingScheme.rectangle.north) {
            rectangle.north = tilingScheme.rectangle.north;
        }

        // Check the number of tiles at the minimum level.  If it's more than four,
        // try requesting the lower levels anyway, because starting at the higher minimum
        // level will cause too many tiles to be downloaded and rendered.
        var swTile = tilingScheme.positionToTileXY(Rectangle.southwest(rectangle), minimumLevel);
        var neTile = tilingScheme.positionToTileXY(Rectangle.northeast(rectangle), minimumLevel);
        var tileCount = (Math.abs(neTile.x - swTile.x) + 1) * (Math.abs(neTile.y - swTile.y) + 1);
        if (tileCount > 4) {
            minimumLevel = 0;
        }

        var templateResource = this._tmsResource.getDerivedResource({
            url : '{z}/{x}/{reverseY}.' + fileExtension
        });

        deferred.resolve({
            url : templateResource,
            tilingScheme : tilingScheme,
            rectangle : rectangle,
            tileWidth : tileWidth,
            tileHeight : tileHeight,
            minimumLevel : minimumLevel,
            maximumLevel : maximumLevel,
            tileDiscardPolicy : options.tileDiscardPolicy,
            credit : options.credit
        });
    };

    TileMapServiceImageryProvider.prototype._metadataFailure = function(error) {
        // Can't load XML, still allow options and defaults
        var options = this._options;
        var fileExtension = defaultValue(options.fileExtension, 'png');
        var tileWidth = defaultValue(options.tileWidth, 256);
        var tileHeight = defaultValue(options.tileHeight, 256);
        var minimumLevel = defaultValue(options.minimumLevel, 0);
        var maximumLevel = options.maximumLevel;
        var tilingScheme = defined(options.tilingScheme) ? options.tilingScheme : new WebMercatorTilingScheme({ellipsoid : options.ellipsoid});
        var rectangle = defaultValue(options.rectangle, tilingScheme.rectangle);

        var templateResource = this._tmsResource.getDerivedResource({
            url : '{z}/{x}/{reverseY}.' + fileExtension
        });

        this._deferred.resolve({
            url : templateResource,
            tilingScheme : tilingScheme,
            rectangle : rectangle,
            tileWidth : tileWidth,
            tileHeight : tileHeight,
            minimumLevel : minimumLevel,
            maximumLevel : maximumLevel,
            tileDiscardPolicy : options.tileDiscardPolicy,
            credit : options.credit
        });
    };

    return TileMapServiceImageryProvider;
});
