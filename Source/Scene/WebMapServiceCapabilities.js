/*global define XMLHttpRequest*/
define([
        '../Core/DeveloperError',
        '../Core/clone',
        '../Core/Math',
        './Projections',
        './ProxyUsagePolicy',
        './WebMapServiceLayer'
    ], function(
        DeveloperError,
        clone,
        CesiumMath,
        Projections,
        ProxyUsagePolicy,
        WebMapServiceLayer) {
    "use strict";

    /**
     * Uses the WMS API to get the capabilities of the WMS server
     *
     * @name WebMapServiceCapabilities
     * @constructor
     *
     * @param {String} description.url The url of the WMS imagery service.
     * @param {String} description.proxy A proxy URL to send image requests through. This URL will have the desired image URL appended as a query parameter.
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
     * var wms = new WebMapServiceCapabilities({
     *     url : "http://aes.gsfc.nasa.gov/cgi-bin/wms"
     * });
     */
    function WebMapServiceCapabilities(description) {
        var desc = description || {};

        if (!desc.url) {
            throw new DeveloperError("description.uri is required.", "description.url");
        }

        /**
         * The url of the WMS imagery service.
         * @type {String}
         */
        this.url = desc.url;

        /**
         * A proxy URL to send image requests through. This URL will have the desired image URL appended as a query parameter.
         * @type {String}
         */
        this.proxy = desc.proxy;

        /**
         * Information that is available for GetCapabilities requests.
         * @type {Object}
         */
        this.getCapabilitiesService = null;

        /**
         * Information that is available for GetMap requests.
         * @type {Object}
         */
        this.getMapService = null;

        /**
         * The root layer of the WMS imagery service.
         * @type {Object}
         */
        this.rootLayer = null;
    }

    WebMapServiceCapabilities.prototype.getCapabilities = function(callback) {
        var that = this;
        var i, formats, get, post;

        // TODO: Maybe Handle other more recent/less popular versions (1.3.0)
        var u;
        if ( this.proxy ) {
            u = this.proxy + '?' + encodeURIComponent(this.url + "?SERVICE=WMS&VERSION=1.1.0&REQUEST=GetCapabilities");
        }
        else {
            u = this.url + "?SERVICE=WMS&VERSION=1.1.0&REQUEST=GetCapabilities";
        }

        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", u, true);
        xmlhttp.overrideMimeType('text/xml');
        xmlhttp.onreadystatechange = function(event) {
            if (xmlhttp.readyState === 4) {
                that.getCapabilitiesService = {
                        formats: [],
                        getUrl: "",
                        postUrl: ""
                };

                that.getMapService = {
                        formats: [],
                        getUrl: "",
                        postUrl: ""
                };

                var capabilities = xmlhttp.responseXML.getElementsByTagName("GetCapabilities");
                if( capabilities.length )
                {
                    formats = capabilities[0].getElementsByTagName("Format");
                    for(i=0;i<formats.length;++i) {
                        that.getCapabilitiesService.formats.push(formats[i].textContent);
                    }

                    get = capabilities[0].getElementsByTagName("Get");
                    if( get.length ) {
                        that.getCapabilitiesService.getUrl = get[0].childNodes[0].attributes.getNamedItem("xlink:href").value;
                    }
                    post = capabilities[0].getElementsByTagName("Post");
                    if( post.length ) {
                        that.getCapabilitiesService.postUrl = post[0].childNodes[0].attributes.getNamedItem("xlink:href").value;
                    }
                }
                var map = xmlhttp.responseXML.getElementsByTagName("GetMap");
                if( map.length )
                {
                    formats = map[0].getElementsByTagName("Format");
                    for(i=0;i<formats.length;++i) {
                        that.getMapService.formats.push(formats[i].textContent);
                    }

                    get = map[0].getElementsByTagName("Get");
                    if( get.length ) {
                        that.getMapService.getUrl = get[0].childNodes[0].attributes.getNamedItem("xlink:href").value;
                    }
                    post = map[0].getElementsByTagName("Post");
                    if( post.length ) {
                        that.getMapService.postUrl = post[0].childNodes[0].attributes.getNamedItem("xlink:href").value;
                    }
                }
                var layer = xmlhttp.responseXML.getElementsByTagName("Layer");
                that.rootLayer = that._parseLayer(layer[0], null);

                callback((xmlhttp.status === 200), that);
            }
        };
        xmlhttp.send();
    };

    WebMapServiceCapabilities.prototype._parseLayer = function(xmlLayer, parent) {
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
                    newLayer.styles.push(this._parseStyle(styles[i]));
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
                newLayer.children.push(this._parseLayer(newChildLayers[i], newLayer));
            }
        }

        return newLayer;
    };

    WebMapServiceCapabilities.prototype._parseStyle = function(xmlStyle) {
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

    return WebMapServiceCapabilities;
});