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
        './DynamicBillboard'
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
                DynamicBillboard) {
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

        var coordsArray = text.split(' '); //TODO add every whitespace character as a possible separator by using regExp
        var finalCoords = [];
        for(var j = 0; coordsArray[j]; j++){
            var regExp = /(\-?\+?[0-9]+\.?[0-9]*)(,\-?\+?[0-9]+\.?[0-9]*)(,[0-9]+\.?[0-9]?)?$/;
            coords[j] = regExp.exec(coordsArray[j]);
            coords[j].shift(); //the first element is not needed, remove it
            finalCoords.push([]); //new inner array
            finalCoords[j][0] = parseFloat(coords[j][0], 10);
            finalCoords[j][1] = parseFloat(coords[j][1].substring(1), 10);
            finalCoords[j][2] = coords[j][2] && parseFloat(coords[j][2].substring(1), 10);
        }
        if(finalCoords.length === 1){
            return finalCoords[0]; //single tuple
        }
        return finalCoords;
    }

    function getId(node){
        var id = node.attributes.id && node.attributes.id.nodeValue;
        if (typeof id === 'undefined') {
            id = createGuid();
        }
        return id;
    }

    function getElementValue(node, elementType){
        var element = node.getElementsByTagName(elementType)[0];
        if (elementType === 'hotSpot' && typeof element !== 'undefined'){
            var hotSpot = {
              x: element.attributes.x.nodeValue,
              y: element.attributes.y.nodeValue,
              xunits: element.attributes.xunits.nodeValue,
              yunits: element.attributes.yunits.nodeValue
            };
            return hotSpot;
        }
            return element && element.firstChild.data; //protecting from TypeError
    }

    function getEmbeddedStyle(node){
        //TODO find a more efficient solution
        var style = node.getElementsByTagName('IconStyle');
        style = node.getElementsByTagName('LabelStyle');
        style = node.getElementsByTagName('LineStyle');
        style = node.getElementsByTagName('PolyStyle');
        return style;
    }

    function getColor(node, colorType){
        var color;
        if(typeof colorType ===  'undefined'){
            color = getElementValue(node,'color');
        } else {
            color = getElementValue(node, colorType);
        }
        color = parseInt(color,16);
        return color;
    }

    // KML processing functions
    function processPlacemark(dataSource, placemark, dynamicObjectCollection, styleCollection) {
        placemark.id = getId(placemark);
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(placemark.id);
        dynamicObject.name = getElementValue(placemark, 'name');

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
                geometryHandler(dataSource, placemark, node, dynamicObjectCollection, styleCollection);
            }
        }
    }

    function processPoint(dataSource, kml, node, dynamicObjectCollection, styleCollection) {
        var el = node.getElementsByTagName('coordinates');
        var coordinates = [];
        for (var j = 0; j < el.length; j++) {
            coordinates = coordinates.concat(readCoordinates(el[j]));
        }

        var cartographic = Cartographic.fromDegrees(coordinates[0], coordinates[1], coordinates[2]);
        var cartesian3 = Ellipsoid.WGS84.cartographicToCartesian(cartographic);
        var dynamicObject = dynamicObjectCollection.getOrCreateObject(kml.id);

        var embeddedStyle = getEmbeddedStyle(kml);
        if(embeddedStyle.length > 0){
            processStyle(embeddedStyle, dynamicObject);
        } else {
            var styleUrl = kml.getElementsByTagName('styleUrl');
            if(styleUrl.length > 0){
                var styleObj = styleCollection.getObject(styleUrl[0].textContent);
                if(typeof styleObj.label !== 'undefined'){ //TODO find a better way to set the text part of labels...
                    styleObj.label.text = new ConstantProperty(dynamicObject.name);
                }
                dynamicObject.merge(styleObj);
            }
        }
        dynamicObject.position = new ConstantPositionProperty(cartesian3);
    }

    function processLineString(dataSource, kml, node, dynamicObjectCollection, styleCollection){
        var el = node.getElementsByTagName('coordinates');
        var coordinates = [];
        for (var j = 0; j < el.length; j++) {
            coordinates = coordinates.concat(readCoordinates(el[j]));
        }

    }

    function processLinearRing(dataSource, kml, node){
        var el = node.getElementsByTagName('coordinates');
        var coordinates = [];
        for (var j = 0; j < el.length; j++) {
            coordinates = coordinates.concat(readCoordinates(el[j]));
        }
        //TODO gx:altitudeOffset, extrude, tessellate, altitudeMode, altitudeModeEnum, altitudeMode
    }

    function processPolygon(dataSource, kml, node){

    }

    function processMultiGeometry(dataSource, kml, node){

    }

    function processModel(dataSource, kml, node){

    }

    function processGxTrack(dataSource, kml, node){

    }

    function processGxMultiTrack(dataSource, kml, node){

    }

    //Object that holds all supported Geometry
    var geometryTypes = {
            Point : processPoint,
            LineString : processLineString,
            LinearRing : processLinearRing,
            Polygon : processPolygon,
            MultiGeometry : processMultiGeometry,
            Model : processModel,
            gxTrack : processGxTrack,
            gxMultitrack : processGxMultiTrack
        };

    function processStyle(styleNode, dynamicObject) {
        for(var i = 0, len = styleNode.childNodes.length; i < len; i++){
            var node = styleNode.childNodes.item(i);

            if(node.nodeName === "IconStyle"){
                dynamicObject.billboard = new DynamicBillboard();
                //Map style to billboard properties
                //TODO heading, hotSpot and ColorMode
                var scale = getElementValue(node, 'scale');
                var icon = getElementValue(node,'href');
                var color = getColor(node);

                dynamicObject.billboard.image = icon && new ConstantProperty(icon);
                dynamicObject.billboard.scale = scale && new ConstantProperty(scale);
                dynamicObject.billboard.color = color && new ConstantProperty(Color.fromRgba(color));
            }
            if(node.nodeName ===  "LabelStyle")   {
                dynamicObject.label = new DynamicLabel();
                //Map style to label properties
                //TODO ColorMode
                var labelScale = getElementValue(node, 'scale');
                var labelColor = getColor(node);

                dynamicObject.label.scale = labelScale && new ConstantProperty(labelScale);
                dynamicObject.label.fillColor = labelColor && new ConstantProperty(Color.fromRgba(labelColor)); //not sure how to set font color
                dynamicObject.label.text = dynamicObject.name && new ConstantProperty(dynamicObject.name);
            }
            if(node.nodeName ===  "LineStyle")   {
                dynamicObject.polyline = new DynamicPolyline();
                //Map style to line properties
                //TODO PhysicalWidth, Visibility, ColorMode
                var lineColor = getColor(node);
                var lineWidth = getElementValue(node,'width');
                var lineOuterColor = getColor(node,'gx:outerColor');
                var lineOuterWidth = getElementValue(node,'gx:outerWidth');

                dynamicObject.polyline.color = lineColor && new ConstantProperty(Color.fromRgba(lineColor));
                dynamicObject.polyline.width = lineWidth && new ConstantProperty(lineWidth);
                dynamicObject.polyline.outlineColor = lineOuterColor && new ConstantProperty(Color.fromRgba(lineOuterColor));
                dynamicObject.polyline.outlineWidth = lineOuterWidth && new ConstantProperty(lineOuterWidth);
            }
            if(node.nodeName === "PolyStyle")   {
                dynamicObject.polygon = new DynamicPolygon();
                //Map style to polygon properties
                //TODO Fill, Outline
            }
        }
    }

    function processFolder(){

    }

    function loadKML(dataSource, kml, sourceUri) {
        var dynamicObjectCollection = dataSource._dynamicObjectCollection;

        if (typeof kml === 'undefined') {
            throw new DeveloperError('kml is required.');
        }
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }

        var stylesArray = kml.getElementsByTagName('Style');
        var styleCollection = new DynamicObjectCollection();
        for ( var i = 0, len = stylesArray.length; i < len; i++){
            var styleNode = stylesArray.item(i);
            styleNode.id = '#' + getId(styleNode);
            var styleObject = styleCollection.getOrCreateObject(styleNode.id);

            processStyle(styleNode, styleObject);
        }

        var array = kml.getElementsByTagName('Folder');
        for (i = 0, len = array.length; i < len; i++){
            processFolder(dataSource, array[i], dynamicObjectCollection);
        }

        array = kml.getElementsByTagName('Placemark');
        for (i = 0, len = array.length; i < len; i++){
            var placemarkDynamicObject = new DynamicObject();
            var embeddedStyleNode = getEmbeddedStyle(array[i]);

            if(embeddedStyleNode.length > 0){
                processStyle(embeddedStyleNode, placemarkDynamicObject);
            } else {
                var styleUrl = array[i].getElementsByTagName('styleUrl');
                if(styleUrl.length > 0){
                    var styleObj = styleCollection.getObject(styleUrl[0].textContent);
                    placemarkDynamicObject.merge(styleObj);
                }
            }
            processPlacemark(dataSource, array[i], dynamicObjectCollection, styleCollection); //placemarkDynamicObject?
        }
    }



    /**
     * A {@link DataSource} which processes KML.
     * @alias KmlDataSource
     * @constructor
     */
    var KmlDataSource = function(){
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
        loadKML(this, kml, source);
        this._changed.raiseEvent(this);
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
        return loadXML(url).then(function(kml) {
            dataSource.load(kml, url);
        }, function(error) {
            this._error.raiseEvent(this, error);
        });
    };


    return KmlDataSource;
});