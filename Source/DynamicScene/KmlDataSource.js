/*global define*/
define(['../Core/createGuid',
        '../Core/Cartographic',
        '../Core/Color',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/Iso8601',
        '../Core/loadXML',
        './ConstantProperty',
        './DynamicProperty',
        './DynamicClock',
        './DynamicObject',
        './DynamicObjectCollection',
        './DynamicPoint',
        './DynamicPolyline',
        './DynamicPolygon',
        './DynamicLabel',
        './DynamicBillboard',
        '../ThirdParty/when',
        '../ThirdParty/Uri'
    ], function(
        createGuid,
        Cartographic,
        Color,
        ClockRange,
        ClockStep,
        DeveloperError,
        RuntimeError,
        Ellipsoid,
        Event,
        Iso8601,
        loadXML,
        ConstantProperty,
        DynamicProperty,
        DynamicClock,
        DynamicObject,
        DynamicObjectCollection,
        DynamicPoint,
        DynamicPolyline,
        DynamicPolygon,
        DynamicLabel,
        DynamicBillboard,
        when,
        Uri) {
    "use strict";

    //Copied from GeoJsonDataSource
    var ConstantPositionProperty = function(value) {
        this._value = value;
    };

    ConstantPositionProperty.prototype.getValueCartesian = function(time, result) {
        var value = this._value;
        if (typeof value.clone === 'function') {
            return value.clone(result);
        }
        return value;
    };

    ConstantPositionProperty.prototype.setValue = function(value) {
        this._value = value;
    };

    function createObject(kml, dynamicObjectCollection) {
        var id = kml.id;
        if (typeof id === 'undefined') {
            id = createGuid();
        } else {
            var finalId = id;
            while (typeof dynamicObjectCollection.getObject(finalId) !== 'undefined') {
                finalId = createGuid();
            }
            id = finalId;
        }
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(id);
        dynamicObject.kml = kml;
        return dynamicObject;
    }

    //Helper functions
    function readCoordinates(el) {
        var text = "", coords = [], i;
        for (i = 0; i < el.childNodes.length; i++) {
            text = text + el.childNodes[i].nodeValue;
        }
        var coordsArray = text.split(/[\s\n]+/);
        var finalCoords = [];
        for(var j = 0; coordsArray[j]; j++){
            var regExp = /(\-?\+?[0-9]+\.?[0-9]*)(,\-?\+?[0-9]+\.?[0-9]*)(,[0-9]+\.?[0-9]?)?$/;
            coords[j] = regExp.exec(coordsArray[j]);
            coords[j].shift(); //the first element is not needed, remove it
            finalCoords.push([]); //new inner array
            finalCoords[j][0] = parseFloat(coords[j][0], 10);
            finalCoords[j][1] = parseFloat(coords[j][1].substring(1), 10);
            if(typeof coords[j][2] !== 'undefined'){ // altitude given?
                finalCoords[j][2] = parseFloat(coords[j][2].substring(1), 10);
            }
        }
        for(var k = 0; k < finalCoords.length; k++){
            if (isNaN(finalCoords[k][0]) || isNaN(finalCoords[k][1])) {
                throw new RuntimeError('Longitude and latitude are required.');
            }
        }
        if(finalCoords.length === 1){
            return finalCoords[0]; //single tuple
        }
        return finalCoords;
    }

    function crsFunction(coordinates) {
        var cartographic = Cartographic.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
        return Ellipsoid.WGS84.cartographicToCartesian(cartographic);
    }

    function coordinatesArrayToCartesianArray(coordinates) {
        var positions = new Array(coordinates.length);
        for ( var i = 0; i < coordinates.length; i++) {
            positions[i] = crsFunction(coordinates[i]);
        }
        return positions;
    }

    function getId(node){
        var id;
        var idNode = node.attributes.id;
        if(typeof idNode !== 'undefined') {
            id = idNode.value;
        } else {
            id = createGuid();
        }
        return id;
    }

    function getNumericValue(node, tagName){
        var element = node.getElementsByTagName(tagName)[0];
        var value = typeof element !== 'undefined' ? element.firstChild.data : undefined;
        return parseFloat(value, 10);
    }

    function getStringValue(node, tagName){
        var element = node.getElementsByTagName(tagName)[0];
        var value = typeof element !== 'undefined' ? element.firstChild.data : undefined;
        return value;
    }

    function getColorValue(node, tagName){
        var red, green, blue, alpha;
        var element = node.getElementsByTagName(tagName)[0];
        var colorMode = node.getElementsByTagName('colorMode')[0];
        var value = typeof element !== 'undefined' ? element.firstChild.data : undefined;
        if (typeof value === 'undefined'){
            return new Color(1.0, 1.0, 1.0, 1.0); //white as default?
        }
        if(colorMode === 'random'){
            alpha = value.substring(0,1);
            blue = value.substring(2,3);
            green = value.substring(4,5);
            red = value.substring(6,7);
            return Color.fromRandom(red, green, blue, alpha);
        }
            //normal mode as default
            alpha = value.substring(0,1);
            blue = value.substring(2,3);
            green = value.substring(4,5);
            red = value.substring(6,7);
            return Color.fromBytes(red, green, blue, alpha);
    }

    // KML processing functions
    function processPlacemark(dataSource, dynamicObject, placemark, dynamicObjectCollection, styleCollection) {
        dynamicObject.name = getStringValue(placemark, 'name');
        if(typeof dynamicObject.label !== 'undefined'){
            dynamicObject.label.text = new ConstantProperty(dynamicObject.name);
        }
        // I want to iterate over every placemark
        for(var i = 0, len = placemark.childNodes.length; i < len; i++){
            var node = placemark.childNodes.item(i);
            //Checking if the node holds a supported Geometry type
            if(geometryTypes.hasOwnProperty(node.nodeName)){
                placemark.geometry = node.nodeName;
                var geometryType = placemark.geometry;
                var geometryHandler = geometryTypes[geometryType];
                if (typeof geometryHandler === 'undefined') {
                    throw new RuntimeError('Unknown geometry type: ' + geometryType);
                }
                geometryHandler(dataSource, dynamicObject, placemark, node);
            }
        }

    }

    function processPoint(dataSource, dynamicObject, kml, node) {
        //TODO extrude, altitudeMode, gx:altitudeMode
        var el = node.getElementsByTagName('coordinates');
        var coordinates = [];
        for (var j = 0; j < el.length; j++) {
            coordinates = coordinates.concat(readCoordinates(el[j]));
        }
        var cartesian3 = crsFunction(coordinates);
        dynamicObject.position = new ConstantPositionProperty(cartesian3);
    }

    function processLineString(dataSource, dynamicObject, kml, node){
        //TODO gx:altitudeOffset, extrude, tessellate, altitudeMode, gx:altitudeMode, gx:drawOrder
        var el = node.getElementsByTagName('coordinates');
        var coordinates = [];
        for (var j = 0; j < el.length; j++) {
            coordinates = coordinates.concat(readCoordinates(el[j]));
        }
        dynamicObject.vertexPositions = new ConstantPositionProperty(coordinatesArrayToCartesianArray(coordinates));
    }

    function processLinearRing(dataSource, dynamicObject, kml, node){
        var el = node.getElementsByTagName('coordinates');
        var coordinates = [];
        for (var j = 0; j < el.length; j++) {
            coordinates = coordinates.concat(readCoordinates(el[j]));
        }
        //TODO gx:altitudeOffset, extrude, tessellate, altitudeMode, altitudeModeEnum, altitudeMode
    }

    //Object that holds all supported Geometry
    var geometryTypes = {
            Point : processPoint,
            LineString : processLineString,
            LinearRing : processLinearRing
            //TODO Polygon, MultiGeometry, Model, gxTrack, gxMultitrack
    };

    function processStyle(styleNode, dynamicObject) {
        for(var i = 0, len = styleNode.childNodes.length; i < len; i++){
            var node = styleNode.childNodes.item(i);

            if(node.nodeName === "IconStyle"){
                dynamicObject.billboard = new DynamicBillboard();
                //Map style to billboard properties
                //TODO heading, hotSpot and ColorMode
                var scale = getNumericValue(node, 'scale');
                var icon = getStringValue(node,'href');
                var color = getColorValue(node, 'color');

                dynamicObject.billboard.image = typeof icon !== 'undefined' ? new ConstantProperty(icon) : undefined;
                dynamicObject.billboard.scale = typeof scale !== 'undefined' ? new ConstantProperty(scale) : undefined;
                dynamicObject.billboard.color = typeof color !== 'undefined' ? new ConstantProperty(color) : undefined;
            }
            else if(node.nodeName ===  "LabelStyle")   {
                dynamicObject.label = new DynamicLabel();
                //Map style to label properties
                //TODO ColorMode
                var labelScale = getNumericValue(node, 'scale');
                var labelColor = getColorValue(node, 'color');

                dynamicObject.label.scale = typeof labelScale !== 'undefined' ? new ConstantProperty(labelScale) : undefined;
                dynamicObject.label.fillColor = typeof labelColor !== 'undefined' ? new ConstantProperty(labelColor) : undefined;
                dynamicObject.label.text = typeof dynamicObject.name !== 'undefined' ? new ConstantProperty(dynamicObject.name) : undefined;
            }
            else if(node.nodeName ===  "LineStyle")   {
                dynamicObject.polyline = new DynamicPolyline();
                //Map style to line properties
                //TODO PhysicalWidth, Visibility, ColorMode
                var lineColor = getColorValue(node, 'color');
                var lineWidth = getNumericValue(node,'width');
                var lineOuterColor = getColorValue(node,'gx:outerColor');
                var lineOuterWidth = getNumericValue(node,'gx:outerWidth');

                dynamicObject.polyline.color = typeof lineColor !== 'undefined' ? new ConstantProperty(lineColor) : undefined;
                dynamicObject.polyline.width = typeof lineWidth !== 'undefined' ? new ConstantProperty(lineWidth) : undefined;
                dynamicObject.polyline.outlineColor = typeof lineOuterColor !== 'undefined' ? new ConstantProperty(lineOuterColor) : undefined;
                dynamicObject.polyline.outlineWidth = typeof lineOuterWidth !== 'undefined' ? new ConstantProperty(lineOuterWidth) : undefined;
            }
            else if(node.nodeName === "PolyStyle")   {
                dynamicObject.polygon = new DynamicPolygon();
                //Map style to polygon properties
                //TODO Fill, Outline
            }
        }
    }

    //Processes and merges any inline styles for the provided node into the provided dynamic object.
    function processInlineStyles(dynamicObject, node, styleCollection) {
        //KML_TODO Validate the behavior for multiple/conflicting styles.
        var inlineStyles = node.getElementsByTagName('Style');
        var inlineStylesLength = inlineStyles.length;
        if (inlineStylesLength > 0) {
            //Google earth seems to always use the last inline style only.
            processStyle(inlineStyles.item(inlineStylesLength - 1), dynamicObject);
        }

        var externalStyles = node.getElementsByTagName('styleUrl');
        if (externalStyles.length > 0) {
            var styleObject = styleCollection.getObject(externalStyles.item(0).textContent);
            if (typeof styleObject !== 'undefined') {
                //Google earth seems to always use the first external style only.
                DynamicBillboard.mergeProperties(dynamicObject, styleObject);
                DynamicLabel.mergeProperties(dynamicObject, styleObject);
                DynamicPoint.mergeProperties(dynamicObject, styleObject);
                DynamicPolygon.mergeProperties(dynamicObject, styleObject);
                DynamicPolyline.mergeProperties(dynamicObject, styleObject);
                DynamicObject.mergeProperties(dynamicObject, styleObject);
            }
        }
    }

    //Asynchronously processes an external style file.
    function processExternalStyles(uri, styleCollection) {
        return when(loadXML(uri), function(styleKml) {
            return processStyles(styleKml, styleCollection, uri);
        });
    }

    //Processes all shared and external styles and stores
    //their id into the rovided styleCollection.
    //Returns an array of promises that will resolve when
    //each style is loaded.
    function processStyles(kml, styleCollection, sourceUri) {
        var i;

        var styleNodes = kml.getElementsByTagName('Style');
        var styleNodesLength = styleNodes.length;
        for (i = styleNodesLength - 1; i >= 0; i--) {
            var node = styleNodes.item(i);
            var attributes = node.attributes;
            var id = typeof attributes.id !== 'undefined' ? attributes.id.textContent : undefined;
            if (typeof id !== 'undefined') {
                id = '#' + id;
                if (typeof sourceUri !== 'undefined') {
                    id = sourceUri + id;
                }
                if (typeof styleCollection.getObject(id) === 'undefined') {
                    var styleObject = styleCollection.getOrCreateObject(id);
                    processStyle(node, styleObject);
                }
            }
        }

        var externalStyleHash = {};
        var promises = [];
        var styleUrlNodes = kml.getElementsByTagName('styleUrl');
        var styleUrlNodesLength = styleUrlNodes.length;
        for (i = 0; i < styleUrlNodesLength; i++) {
            var styleReference = styleUrlNodes[i].textContent;
            if (styleReference[0] !== '#') {
                var tokens = styleReference.split('#');
                if (tokens.length !== 2) {
                    throw new RuntimeError();
                }
                var uri = tokens[0];
                if (typeof externalStyleHash[uri] === 'undefined') {
                    if (typeof sourceUri !== 'undefined') {
                        var baseUri = new Uri(document.location.href);
                        sourceUri = new Uri(sourceUri);
                        uri = new Uri(uri).resolve(sourceUri.resolve(baseUri)).toString();
                    }
                    promises.push(processExternalStyles(uri, styleCollection));
                }
            }
        }

        return promises;
    }

    function loadKML(dataSource, kml, sourceUri) {
        var dynamicObjectCollection = dataSource._dynamicObjectCollection;
        var styleCollection = new DynamicObjectCollection();

        //Since KML external styles can be asynchonous, we start off
        //my loading all styles first, before doing anything else.
        //The rest of the loading code is synchronous
        return when.all(processStyles(kml, styleCollection), function() {
            var array = kml.getElementsByTagName('Placemark');
            for ( var i = 0, len = array.length; i < len; i++) {
                var placemark = array[i];
                var placemarkId = typeof placemark.id !== 'undefined' ? placemark.id : createGuid();
                var placemarkDynamicObject = dynamicObjectCollection.getOrCreateObject(placemarkId);
                processInlineStyles(placemarkDynamicObject, array[i], styleCollection);
                processPlacemark(dataSource, placemarkDynamicObject, placemark, dynamicObjectCollection, styleCollection);
            }
            dataSource._changed.raiseEvent(this);
        });
    }

    /**
     * A {@link DataSource} which processes KML.
     * @alias KmlDataSource
     * @constructor
     */
    var KmlDataSource = function() {
        this._changed = new Event();
        this._error = new Event();
        this._clock = undefined;
        this._dynamicObjectCollection = new DynamicObjectCollection();
        this._timeVarying = true;
    };

    /**
     * Gets an event that will be raised when non-time-varying data changes
     * or if the return value of getIsTimeVarying changes.
     * @memberof DataSource
     *
     * @returns {Event} The event.
     */
    KmlDataSource.prototype.getChangedEvent = function() {
        return this._changed;
    };

    /**
     * Gets an event that will be raised if an error is encountered during processing.
     * @memberof KmlDataSource
     *
     * @returns {Event} The event.
     */
    KmlDataSource.prototype.getErrorEvent = function() {
        return this._error;
    };

    /**
     * Gets the top level clock defined in KML or the availability of the
     * underlying data if no clock is defined.  If the KML document only contains
     * infinite data, undefined will be returned.
     * @memberof KmlDataSource
     *
     * @returns {DynamicClock} The clock associated with the current KML data, or undefined if none exists.
     */
    KmlDataSource.prototype.getClock = function() {
        return undefined;
    };

    /**
     * Gets the DynamicObjectCollection generated by this data source.
     * @memberof DataSource
     *
     * @returns {DynamicObjectCollection} The collection of objects generated by this data source.
     */
    KmlDataSource.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Gets a value indicating if the data varies with simulation time.  If the return value of
     * this function changes, the changed event will be raised.
     * @memberof DataSource
     *
     * @returns {Boolean} True if the data is varies with simulation time, false otherwise.
     */
    KmlDataSource.prototype.getIsTimeVarying = function() {
        return true;
    };

    /**
     * Replaces any existing data with the provided KML.
     *
     * @param {Object} KML The KML to be processed.
     * @param {String} source The source of the KML.
     *
     * @exception {DeveloperError} KML is required.
     */
    KmlDataSource.prototype.load = function(kml, source) {
        if (typeof kml === 'undefined') {
            throw new DeveloperError('kml is required.');
        }

        this._dynamicObjectCollection.clear();
        return loadKML(this, kml, source);
    };

    /**
     * Asynchronously loads the KML at the provided url, replacing any existing data.
     *
     * @param {Object} url The url to be processed.
     *
     * @returns {Promise} a promise that will resolve when the KML is processed.
     *
     * @exception {DeveloperError} url is required.
     */
    KmlDataSource.prototype.loadUrl = function(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        var dataSource = this;
        return when(loadXML(url), function(kml) {
            return dataSource.load(kml, url);
        }, function(error) {
            dataSource._error.raiseEvent(dataSource, error);
            return when.reject(error);
        });
    };
    return KmlDataSource;
});