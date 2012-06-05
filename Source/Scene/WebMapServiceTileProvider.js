/*global define XMLHttpRequest*/
define([
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Extent',
        '../Core/clone',
        '../Core/Math',
        './Projections',
        './WebMapServiceLayer'
    ], function(
        DeveloperError,
        RuntimeError,
        Extent,
        clone,
        CesiumMath,
        Projections,
        WebMapServiceLayer) {
    "use strict";
    /*global Image*/

    /**
     * Uses the WMS API to load images for tiles.
     *
     * @name WebMapServiceTileProvider
     * @constructor
     *
     * @param {String} description.url The url that provides the WMS imagery service.
     * @param {String|String[]} description.layer The name(s) of the layer in the WMS imagery service.
     * @param {String|String[]} description.style The name(s) of the style of the layer in the WMS imagery service.
     * @param {Object} description.maxExtent An object that contains the north, south, east and west values.
     * @param {Number} description.zoomMax The maximum number of zoom levels that we will request. Raise this number if you aren't receiving all levels of detail.
     * @param {Object} description.proxy A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     *
     * @exception {DeveloperError} <code>description.server</code> is required.
     *
     * @see SingleTileProvider
     * @see ArcGISTileProvider
     * @see OpenStreetMapTileProvider
     * @see CompositeTileProvider
     * @see BingMapsTileProvider
     *
     * @see <a href="http://www.opengeospatial.org/standards/wms">WMS Specification</a>
     * @see <a href="http://www.w3.org/TR/cors/">Cross-Origin Resource Sharing</a>
     *
     * @example
     * // WMS tile provider
     * var wms = new WebMapServiceTileProvider({
     *     server : "'http://wms1.agr.gc.ca/cgi-bin/mapplant1967_f",
     *     layer  : "base",
     *     style  : "default"
     * });
     */
    function WebMapServiceTileProvider(description) {
        var desc = description || {};

        if (!desc.url) {
            throw new DeveloperError("description.url is required.", "description.url");
        }

        /**
         * The url of the WMS imagery service.
         * @type {String}
         */
        this.url = desc.url;
        this._url = desc.url;

        /**
         * The name(s) of the layer in the WMS imagery service.
         * @type {String}
         */
        if( typeof desc.layer !== 'undefined' ) {
            this.layer = typeof desc.layer === "string" ? [desc.layer] : desc.layer.slice();
            this._layer = this.layer.slice();
        }
        else {
            this.layer = [];
            this._layer = [];
        }

        /**
         * The name(s) of the style of the layer in the WMS imagery service.
         * @type {String}
         */
        if( typeof desc.style !== 'undefined' ) {
            this.style = typeof desc.style === "string" ? [desc.style] : desc.style.slice();
            this._style = this.style.slice();
        }
        else {
            this.style = [];
            this._style = [];
        }

        /**
         * A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
         * @type {Object}
         */
        this._proxy = desc.proxy;

        /**
         * The cartographic extent of the base tile, with north, south, east and
         * west properties in radians.
         *
         * @type {Object}
         */
        this.maxExtent = desc.maxExtent || new Extent(
            -CesiumMath.PI,
            -CesiumMath.PI_OVER_TWO,
             CesiumMath.PI,
             CesiumMath.PI_OVER_TWO
        );

        /**
         * The width of every image loaded.
         *
         * @type {Number}
         */
        this.tileWidth = 256;

        /**
         * The height of every image loaded.
         *
         * @type {Number}
         */
        this.tileHeight = 256;

        /**
         * The maximum zoom level that can be requested.
         *
         * @type {Number}
         */
        this.zoomMax = desc.zoomMax || 18;

        /**
         * The minimum zoom level that can be requested.
         *
         * @type {Number}
         */
        this.zoomMin = 0;

        /**
         * The map projection of the image.
         *
         * @type {Enumeration}
         * @see Projections
         */
        this.projection = Projections.WGS84;

        this._deferredQueue = [];
        this._tileUrl = "";
        this._capabilities = undefined;

        this._requestCapabilities();
    }

    WebMapServiceTileProvider.prototype._getTileUrl = function(tile) {
        var url = this._tileUrl + CesiumMath.toDegrees(tile.extent.west) + "," + CesiumMath.toDegrees(tile.extent.south) + "," +
                    CesiumMath.toDegrees(tile.extent.east) + "," + CesiumMath.toDegrees(tile.extent.north);
        if (typeof this._proxy !== 'undefined') {
            url = this._proxy.getURL(url);
        }

        return url;
    };

    WebMapServiceTileProvider.prototype._requestCapabilities = function() {
        var that = this;

        var callback = function(capabilities) {
            that._capabilities = capabilities;

            var layerParameter = "";
            var styleParameter = "";
            var l;
            var tmpExtent = {
                north : -CesiumMath.PI_OVER_TWO,
                south :  CesiumMath.PI_OVER_TWO,
                west :   CesiumMath.PI,
                east :  -CesiumMath.PI
            };
            for(var i=0;i<that.layer.length;++i) {
                l = that._capabilities.rootLayer.findLayer(that.layer[i]);
                if( !l ) {
                    throw new RuntimeError("The WMS imagery service doesn't contain a layer named '" + that.layer[i] + "'");
                }

                if( (that.style.length > i) && that.style[i] && l.findStyle(that.style[i]) ) {
                    throw new RuntimeError("The WMS layer '" + that.layer[i] + "' doesn't contain a style named '" + that.style[i] + "'");
                }

                if( i > 0 ) {
                    layerParameter += ",";
                    styleParameter += ",";
                }

                layerParameter += that.layer[i];
                styleParameter += (that.style.length > i) ? that.style[i] : "";

                // Calculate extent containing all layers
                if( l.extent.north > tmpExtent.north ) {
                    tmpExtent.north = l.extent.north;
                }
                if( l.extent.south < tmpExtent.south ) {
                    tmpExtent.south = l.extent.south;
                }
                if( l.extent.east > tmpExtent.east ) {
                    tmpExtent.east = l.extent.east;
                }
                if( l.extent.west < tmpExtent.west ) {
                    tmpExtent.west = l.extent.west;
                }
            }

            that.extent = {
                    north: tmpExtent.north,
                    south: tmpExtent.south,
                    east:  tmpExtent.east,
                    west:  tmpExtent.west
            };

            that._tileUrl = that._capabilities.mapService.getUrl; // Get URL is required
            that._tileUrl += "VERSION=" + that._capabilities.version + "&REQUEST=GetMap&SRS=EPSG:4326";
            that._tileUrl += "&WIDTH=" + that.tileWidth + "&HEIGHT=" + that.tileHeight;
            that._tileUrl += "&LAYERS=" + layerParameter + "&STYLES=" + styleParameter;

            // TODO: Make these configurable
            that._tileUrl += "&TRANSPARENT=TRUE&BGCOLOR=0xFFFFFF&FORMAT=" + that._getSupportedFormat(that._capabilities.mapService.formats);

            that._tileUrl += "&BBOX="; // The value will be added for each request

            that._deferredQueue.forEach(function(element) {
                this._loadImage(element);
            }, that);
            that._deferredQueue = [];
        };

        WebMapServiceTileProvider.GetCapabilities({
            url: this.url,
            proxy: this._proxy,
            onLoad: callback
        });
    };

    WebMapServiceTileProvider.prototype._getSupportedFormat = function(formats) {
        if( formats.indexOf("image/png") !== -1 ) {
            return "image/png";
        }
        else if( formats.indexOf("image/gif") !== -1 ) {
            return "image/gif";
        }
        else if( formats.indexOf("image/jpeg") !== -1 ) {
            return "image/jpeg";
        }
        else if( formats.indexOf("image/svg") !== -1 ) {
            return "image/svg";
        }

        return ""; // Use the servers default and hope the browser supports it
    };

    /**
     * Loads the image for <code>tile</code>.
     *
     * @memberof WebMapServiceTileProvider
     *
     * @param {Tile} tile The tile to load the image for.
     * @param {Function} onload A function that will be called when the image is finished loading.
     * @param {Function} onerror A function that will be called if there is an error loading the image.
     * @param {Function} oninvalid A function that will be called if the image loaded is not valid.
     *
     * @exception {DeveloperError} <code>tile.zoom</code> is less than <code>zoomMin</code>
     * or greater than <code>zoomMax</code>.
     */
    WebMapServiceTileProvider.prototype.loadTileImage = function(tile, onload, onerror, oninvalid) {
        if (this.url !== this._url || this.layer.length !== this._layer.length || this.style.length !== this._style.length) {
            this._tileUrl = '';
            this._url = this.url;
            this.layer = this._layer.slice();
            this.style = this._style.slice();

            this._requestCapabilities();
        }
        else {
            var bChanged = false;
            // Check that the layer lists are still equivalent
            for(var i=0;i<this.layer.length;++i) {
                if( this.layer[i] !== this._layer[i] ) {
                    bChanged = true;
                    break;
                }
                if( this.style.length > i ) {
                    if( this.style[i] !== this._style[i] ) {
                        bChanged = true;
                        break;
                    }
                }
            }

            if( bChanged ) {
                this._tileUrl = '';
                this._url = this.url;
                this.layer = this._layer.slice();
                this.style = this._style.slice();

                this._requestCapabilities();
            }
        }

        if (tile.zoom < this.zoomMin || tile.zoom > this.zoomMax) {
            throw new DeveloperError("The zoom must be between in [zoomMin, zoomMax].", "tile.zoom");
        }

        var image = new Image();

        if (!this._tileUrl) {
            if (!this._deferredQueue.contains) {
                this._deferredQueue.contains = function(tile) {
                    for ( var i = 0; i < this.length; ++i) {
                        var t = this[i].tile;
                        if (t.zoom === tile.zoom && t.x === tile.x && t.y === tile.y) {
                            return true;
                        }
                    }
                    return false;
                };
            }

            if (!this._deferredQueue.contains(tile)) {
                this._deferredQueue.push({
                    tile : tile,
                    onload : onload,
                    onerror : onerror,
                    image : image
                });
            }
            return image;
        }

        this._loadImage({
            tile : tile,
            onload : onload,
            onerror : onerror,
            oninvalid : oninvalid,
            image : image
        });
        return image;
    };

    WebMapServiceTileProvider.prototype._loadImage = function(element) {
        element.onload = (element.onload && typeof element.onload === "function") ? element.onload : function() {
        };
        element.onerror = (element.onerror && typeof element.onerror === "function") ? element.onerror : function() {
        };
        element.oninvalid = (element.oninvalid && typeof element.oninvalid === "function") ? element.oninvalid : function() {
        };

        var img = element.image;
        img.onload = function() {
            element.onload();
        };
        img.onerror = function() {
            element.onerror();
        };
        img.crossOrigin = '';
        img.src = this._getTileUrl(element.tile);
    };

    /**
     * Get the capabilities of the WMS server
     *
     * @name GetWebMapServicesCapabilities
     * @constructor
     *
     * @param {String} description.url The url of the WMS imagery service.
     * @param {Object} description.proxy A proxy to use for requests. This object is expected to have a getURL function which returns the proxied URL.
     * @param {Function} description.onLoad A function that will be called on successful loading of the WMS Capabilities. The function will take a single argument
     *                                      which is an object containing the capabilities of the WMS imagery service.
     * @param {Function} description.onError A function that will be called on a failed loading of the WMS Capabilities. The function will take a single argument which
     *                                       is a description of the error.
     *
     * @exception {DeveloperError} <code>description.url</code> is required.
     *
     * @see WebMapServiceTileProvider
     *
     * @see <a href="http://www.opengeospatial.org/standards/wms">WMS Specification</a>
     * @see <a href="http://www.w3.org/TR/cors/">Cross-Origin Resource Sharing</a>
     *
     * @example
     * // WMS Capabilities
     * GetWebMapServicesCapabilities({
     *     url : "http://aes.gsfc.nasa.gov/cgi-bin/wms",
     *     onLoad:  function(wms)
     *              {
     *                  // Do something with the capabilities
     *              },
     *     onError: function(error)
     *              {
     *                  // Handle the error
     *              }
     * });
     */
    WebMapServiceTileProvider.GetCapabilities = function(description){
        var desc = description || {};
        var i, formats, get, post, onlineResource;

        if (!desc.url) {
            throw new DeveloperError("description.uri is required.", "description.url");
        }

        var url = desc.url + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities";
        if (typeof desc.proxy !== 'undefined') {
            url = desc.proxy.getURL(url);
        }

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", url, true);
        xmlhttp.overrideMimeType('text/xml');
        xmlhttp.onreadystatechange = function(event) {
            if (xmlhttp.readyState === 4) {

                // We support version 1.1.0 and 1.1.1 for now
                var version;
                var rootElem = xmlhttp.responseXML.getElementsByTagName("WMT_MS_Capabilities");
                if( rootElem.length ) {
                    var ver = rootElem[0].attributes.getNamedItem("version");
                    if( ver ) {
                        if( ver.value === "1.1.0" || ver.value === "1.1.1" ) {
                            version = ver.value;
                        }
                        else {
                            if( desc.onError ) {
                                desc.onError("Unsupported WMS version"); // Unsupported version
                                return;
                            }
                        }
                    }
                }

                var capabilitiesService = {
                        formats: [],
                        getUrl: "",
                        postUrl: ""
                };
                var mapService = {
                        formats: [],
                        getUrl: "",
                        postUrl: ""
                };

                var capabilities = xmlhttp.responseXML.getElementsByTagName("GetCapabilities");
                if( capabilities.length )
                {
                    formats = capabilities[0].getElementsByTagName("Format");
                    for(i=0;i<formats.length;++i) {
                        capabilitiesService.formats.push(formats[i].textContent);
                    }

                    get = capabilities[0].getElementsByTagName("Get");
                    if( get.length ) {
                        onlineResource = get[0].getElementsByTagName("OnlineResource")[0];
                        capabilitiesService.getUrl = WebMapServiceTileProvider._fixUrl(onlineResource.attributes.getNamedItem("xlink:href").value);
                    }
                    post = capabilities[0].getElementsByTagName("Post");
                    if( post.length ) {
                        onlineResource = post[0].getElementsByTagName("OnlineResource")[0];
                        capabilitiesService.postUrl = WebMapServiceTileProvider._fixUrl(onlineResource.attributes.getNamedItem("xlink:href").value);
                    }
                }
                var map = xmlhttp.responseXML.getElementsByTagName("GetMap");
                if( map.length )
                {
                    formats = map[0].getElementsByTagName("Format");
                    for(i=0;i<formats.length;++i) {
                        mapService.formats.push(formats[i].textContent);
                    }

                    get = map[0].getElementsByTagName("Get");
                    if( get.length ) {
                        onlineResource = get[0].getElementsByTagName("OnlineResource")[0];
                        mapService.getUrl = WebMapServiceTileProvider._fixUrl(onlineResource.attributes.getNamedItem("xlink:href").value);
                    }
                    post = map[0].getElementsByTagName("Post");
                    if( post.length ) {
                        onlineResource = post[0].getElementsByTagName("OnlineResource")[0];
                        mapService.postUrl = WebMapServiceTileProvider._fixUrl(onlineResource.attributes.getNamedItem("xlink:href").value);
                    }
                }

                var layer = xmlhttp.responseXML.getElementsByTagName("Layer");
                var rootLayer = WebMapServiceTileProvider._parseLayer(layer[0], null);

                if( desc.onLoad ) {
                    desc.onLoad({
                        url: desc.url,
                        proxy: desc.proxy,
                        version: version,
                        capabilitiesService: capabilitiesService,
                        mapService: mapService,
                        rootLayer: rootLayer
                    });
                }
            }
        };
        xmlhttp.send();
    };

    // WMS files return some random stuff so lets try our best to fix it
    WebMapServiceTileProvider._fixUrl = function(url) {
        url = url.replace(new RegExp("&amp;", "g"), "&");
        var qIndex = url.indexOf('?');
        if( qIndex !== -1 ) {
            var c = url.charAt(url.length-1);
            if( c !== '?' && c !== '&' ) { // The last character isn't a ? or &
                url += '&';
            }
        }
        else {
            url += '?'; // Add a ? because we don't have query string yet
        }

        return url;
    };

    WebMapServiceTileProvider._parseLayer = function(xmlLayer, parent) {
        var i;

        // Can't be inherited from parent layers
        var layerName = xmlLayer.getElementsByTagName("Name")[0].textContent;
        var layerTitle = xmlLayer.getElementsByTagName("Title")[0].textContent;

        var newLayer;
        if( parent ) {
            newLayer = new WebMapServiceLayer(parent);
            newLayer.name = layerName;
            newLayer.title = layerTitle;
        }
        else {
            newLayer = new WebMapServiceLayer({
                            name: layerName,
                            title: layerTitle
                        });
        }

        // TODO: Right now we only support WGS84
        if( newLayer.projections.indexOf(Projections.WGS84) === -1 ) {
            var srs = xmlLayer.getElementsByTagName("SRS");
            for(i=0;i<srs.length;++i) {
                if( (srs[i].parentNode === xmlLayer) && (srs[i].textContent.indexOf("EPSG:4326") !== -1) ) {
                    newLayer.projections.push(Projections.WGS84);
                    break;
                }
            }
        }

        var latLonBB = xmlLayer.getElementsByTagName("LatLonBoundingBox");
        if( latLonBB.length && (latLonBB[0].parentNode === xmlLayer) ) {
            newLayer.extent.north = CesiumMath.toRadians(parseFloat(latLonBB[0].attributes.getNamedItem("maxy").value));
            newLayer.extent.south = CesiumMath.toRadians(parseFloat(latLonBB[0].attributes.getNamedItem("miny").value));
            newLayer.extent.east  = CesiumMath.toRadians(parseFloat(latLonBB[0].attributes.getNamedItem("maxx").value));
            newLayer.extent.west  = CesiumMath.toRadians(parseFloat(latLonBB[0].attributes.getNamedItem("minx").value));
        }

        var styles = xmlLayer.getElementsByTagName("Style");
        if( styles.length ) {
            for(i=0;i<styles.length;++i) {
                if(styles[i].parentNode === xmlLayer) {
                    newLayer.styles.push(WebMapServiceTileProvider._parseStyle(styles[i]));
                }
            }
        }
        else {
            newLayer.styles.push({
                name: "default",
                title: "default"
            });
        }

        var newChildLayers = xmlLayer.getElementsByTagName("Layer");
        for(i=0;i<newChildLayers.length;++i) {
            if(newChildLayers[i].parentNode === xmlLayer) {
                newLayer.children.push(WebMapServiceTileProvider._parseLayer(newChildLayers[i], newLayer));
            }
        }

        return newLayer;
    };

    WebMapServiceTileProvider._parseStyle = function(xmlStyle) {
        var style = {
                name: xmlStyle.getElementsByTagName("Name")[0].textContent,
                title: xmlStyle.getElementsByTagName("Title")[0].textContent,
                legend: null
        };

        var legend = xmlStyle.getElementsByTagName("LegendURL");
        if( legend.length ) {
            style.legend = {
                    format: "",
                    width: parseInt(legend[0].attributes.getNamedItem("width").value, 10),
                    height: parseInt(legend[0].attributes.getNamedItem("height").value, 10),
                    url: ""
            };

            var format = legend[0].getElementsByTagName("Format");
            if( format.length ) {
                style.legend.format = format[0].textContent;
            }

            var onlineResource = legend[0].getElementsByTagName("OnlineResource");
            if( onlineResource.length ) {
                style.legend.url = onlineResource[0].attributes.getNamedItem("xlink:href").value;
            }
        }

        return style;
    };

    return WebMapServiceTileProvider;
});