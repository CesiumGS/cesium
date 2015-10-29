/*global define*/
define([
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/definedNotNull',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        './ImageryLayerFeatureInfo'
    ], function(
        Cartographic,
        defaultValue,
        defined,
        definedNotNull,
        DeveloperError,
        RuntimeError,
        ImageryLayerFeatureInfo) {
    "use strict";

    /**
     * Describes the format in which to request GetFeatureInfo from a Web Map Service (WMS) server.
     *
     * @alias GetFeatureInfoFormat
     * @constructor
     *
     * @param {String} type The type of response to expect from a GetFeatureInfo request.  Valid
     *        values are 'json', 'xml', 'html', or 'text'.
     * @param {String} [format] The info format to request from the WMS server.  This is usually a
     *        MIME type such as 'application/json' or text/xml'.  If this parameter is not specified, the provider will request 'json'
     *        using 'application/json', 'xml' using 'text/xml', 'html' using 'text/html', and 'text' using 'text/plain'.
     * @param {Function} [callback] A function to invoke with the GetFeatureInfo response from the WMS server
     *        in order to produce an array of picked {@link ImageryLayerFeatureInfo} instances.  If this parameter is not specified,
     *        a default function for the type of response is used.
     */
    var GetFeatureInfoFormat = function(type, format, callback) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        //>>includeEnd('debug');

        this.type = type;

        if (!defined(format)) {
            if (type === 'json') {
                format = 'application/json';
            } else if (type === 'xml') {
                format = 'text/xml';
            } else if (type === 'html') {
                format = 'text/html';
            } else if (type === 'text') {
                format = 'text/plain';
            }
            //>>includeStart('debug', pragmas.debug);
            else {
                throw new DeveloperError('format is required when type is not "json", "xml", "html", or "text".');
            }
            //>>includeEnd('debug');
        }

        this.format = format;

        if (!defined(callback)) {
            if (type === 'json') {
                callback = geoJsonToFeatureInfo;
            } else if (type === 'xml') {
                callback = xmlToFeatureInfo;
            } else if (type === 'html') {
                callback = textToFeatureInfo;
            } else if (type === 'text') {
                callback = textToFeatureInfo;
            }
            //>>includeStart('debug', pragmas.debug);
            else {
                throw new DeveloperError('callback is required when type is not "json", "xml", "html", or "text".');
            }
            //>>includeEnd('debug');
        }

        this.callback = callback;
    };

    function geoJsonToFeatureInfo(json) {
        var result = [];

        var features = json.features;
        for (var i = 0; i < features.length; ++i) {
            var feature = features[i];

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = feature;
            featureInfo.properties = feature.properties;
            featureInfo.configureNameFromProperties(feature.properties);
            featureInfo.configureDescriptionFromProperties(feature.properties);

            // If this is a point feature, use the coordinates of the point.
            if (definedNotNull(feature.geometry) && feature.geometry.type === 'Point') {
                var longitude = feature.geometry.coordinates[0];
                var latitude = feature.geometry.coordinates[1];
                featureInfo.position = Cartographic.fromDegrees(longitude, latitude);
            }

            result.push(featureInfo);
        }

        return result;
    }

    var mapInfoMxpNamespace = 'http://www.mapinfo.com/mxp';
    var esriWmsNamespace = 'http://www.esri.com/wms';
    var wfsNamespace = 'http://www.opengis.net/wfs';
    var gmlNamespace = 'http://www.opengis.net/gml';

    function xmlToFeatureInfo(xml) {
        var documentElement = xml.documentElement;
        if (documentElement.localName === 'MultiFeatureCollection' && documentElement.namespaceURI === mapInfoMxpNamespace) {
            // This looks like a MapInfo MXP response
            return mapInfoXmlToFeatureInfo(xml);
        } else if (documentElement.localName === 'FeatureInfoResponse' && documentElement.namespaceURI === esriWmsNamespace) {
            // This looks like an Esri WMS response
            return esriXmlToFeatureInfo(xml);
        } else if (documentElement.localName === 'FeatureCollection' && documentElement.namespaceURI === wfsNamespace) {
            // This looks like a WFS/GML response.
            return gmlToFeatureInfo(xml);
        } else if (documentElement.localName === 'ServiceExceptionReport') {
            // This looks like a WMS server error, so no features picked.
            throw new RuntimeError(new XMLSerializer().serializeToString(documentElement));
        } else {
            // Unknown response type, so just dump the XML itself into the description.
            return unknownXmlToFeatureInfo(xml);
        }
    }

    function mapInfoXmlToFeatureInfo(xml) {
        var result = [];

        var multiFeatureCollection = xml.documentElement;

        var features = multiFeatureCollection.getElementsByTagNameNS(mapInfoMxpNamespace, 'Feature');
        for (var featureIndex = 0; featureIndex < features.length; ++featureIndex) {
            var feature = features[featureIndex];

            var properties = {};

            var propertyElements = feature.getElementsByTagNameNS(mapInfoMxpNamespace, 'Val');
            for (var propertyIndex = 0; propertyIndex < propertyElements.length; ++propertyIndex) {
                var propertyElement = propertyElements[propertyIndex];
                if (propertyElement.hasAttribute('ref')) {
                    var name = propertyElement.getAttribute('ref');
                    var value = propertyElement.textContent.trim();
                    properties[name] = value;
                }
            }

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = feature;
            featureInfo.properties = properties;
            featureInfo.configureNameFromProperties(properties);
            featureInfo.configureDescriptionFromProperties(properties);
            result.push(featureInfo);
        }

        return result;
    }

    function esriXmlToFeatureInfo(xml) {
        var result = [];

        var featureInfoResponse = xml.documentElement;

        var features = featureInfoResponse.getElementsByTagNameNS(esriWmsNamespace, 'FIELDS');
        for (var featureIndex = 0; featureIndex < features.length; ++featureIndex) {
            var feature = features[featureIndex];

            var properties = {};

            var propertyAttributes = feature.attributes;
            for (var attributeIndex = 0; attributeIndex < propertyAttributes.length; ++attributeIndex) {
                var attribute = propertyAttributes[attributeIndex];
                properties[attribute.name] = attribute.value;
            }

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = feature;
            featureInfo.properties = properties;
            featureInfo.configureNameFromProperties(properties);
            featureInfo.configureDescriptionFromProperties(properties);
            result.push(featureInfo);
        }

        return result;
    }

    function gmlToFeatureInfo(xml) {
        var result = [];

        var featureCollection = xml.documentElement;

        var featureMembers = featureCollection.getElementsByTagNameNS(gmlNamespace, 'featureMember');
        for (var featureIndex = 0; featureIndex < featureMembers.length; ++featureIndex) {
            var featureMember = featureMembers[featureIndex];

            var properties = {};

            getGmlPropertiesRecursively(featureMember, properties);

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = featureMember;
            featureInfo.properties = properties;
            featureInfo.configureNameFromProperties(properties);
            featureInfo.configureDescriptionFromProperties(properties);
            result.push(featureInfo);
        }

        return result;
    }

    function getGmlPropertiesRecursively(gmlNode, properties) {
        var isSingleValue = true;

        for (var i = 0; i < gmlNode.children.length; ++i) {
            var child = gmlNode.children[i];

            if (child.nodeType === Node.ELEMENT_NODE) {
                isSingleValue = false;
            }

            if (child.localName === 'Point' || child.localName === 'LineString' || child.localName === 'Polygon') {
                continue;
            }

            if (child.hasChildNodes() && getGmlPropertiesRecursively(child, properties)) {
                properties[child.localName] = child.textContent;
            }
        }

        return isSingleValue;
    }

    function unknownXmlToFeatureInfo(xml) {
        var xmlText = new XMLSerializer().serializeToString(xml);

        var element = document.createElement('div');
        var pre = document.createElement('pre');
        pre.textContent = xmlText;
        element.appendChild(pre);

        var featureInfo = new ImageryLayerFeatureInfo();
        featureInfo.data = xml;
        featureInfo.description = element.innerHTML;
        return [featureInfo];
    }

    var emptyBodyRegex= /<body>\s*<\/body>/im;
    var wmsServiceExceptionReportRegex = /<ServiceExceptionReport([\s\S]*)<\/ServiceExceptionReport>/im;
    var titleRegex = /<title>([\s\S]*)<\/title>/im;

    function textToFeatureInfo(text) {
        // If the text is HTML and it has an empty body tag, assume it means no features were found.
        if (emptyBodyRegex.test(text)) {
            return undefined;
        }

        // If this is a WMS exception report, treat it as "no features found" rather than showing
        // bogus feature info.
        if (wmsServiceExceptionReportRegex.test(text)) {
            return undefined;
        }

        // If the text has a <title> element, use it as the name.
        var name;
        var title = titleRegex.exec(text);
        if (title && title.length > 1) {
            name = title[1];
        }

        var featureInfo = new ImageryLayerFeatureInfo();
        featureInfo.name = name;
        featureInfo.description = text;
        featureInfo.data = text;
        return [featureInfo];
    }

    return GetFeatureInfoFormat;
});
