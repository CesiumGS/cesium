/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/Color',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/loadBlob',
        '../Core/loadXML',
        '../Core/Math',
        '../Core/NearFarScalar',
        '../Core/PinBuilder',
        '../Core/PolygonHierarchy',
        '../Core/Rectangle',
        '../Core/RuntimeError',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelStyle',
        '../ThirdParty/Autolinker',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        '../ThirdParty/zip',
        './BillboardGraphics',
        './CompositePositionProperty',
        './ConstantPositionProperty',
        './DataSource',
        './DataSourceClock',
        './Entity',
        './EntityCollection',
        './LabelGraphics',
        './PathGraphics',
        './PolygonGraphics',
        './PolylineGraphics',
        './PositionPropertyArray',
        './RectangleGraphics',
        './ReferenceProperty',
        './SampledPositionProperty',
        './ScaledPositionProperty',
        './TimeIntervalCollectionProperty',
        './WallGraphics'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Cartesian3,
        ClockRange,
        ClockStep,
        Color,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        getFilenameFromUri,
        Iso8601,
        JulianDate,
        loadBlob,
        loadXML,
        CesiumMath,
        NearFarScalar,
        PinBuilder,
        PolygonHierarchy,
        Rectangle,
        RuntimeError,
        TimeInterval,
        TimeIntervalCollection,
        HorizontalOrigin,
        LabelStyle,
        Autolinker,
        Uri,
        when,
        zip,
        BillboardGraphics,
        CompositePositionProperty,
        ConstantPositionProperty,
        DataSource,
        DataSourceClock,
        Entity,
        EntityCollection,
        LabelGraphics,
        PathGraphics,
        PolygonGraphics,
        PolylineGraphics,
        PositionPropertyArray,
        RectangleGraphics,
        ReferenceProperty,
        SampledPositionProperty,
        ScaledPositionProperty,
        TimeIntervalCollectionProperty,
        WallGraphics) {
    "use strict";

    //This is by no means an exhaustive list of MIME types.
    //The purpose of this list is to be able to accurately identify content embedded
    //in KMZ files. Eventually, we can make this configurable by the end user so they can add
    //there own content types if they have KMZ files that require it.
    var MimeTypes = {
        avi : "video/x-msvideo",
        bmp : "image/bmp",
        bz2 : "application/x-bzip2",
        chm : "application/vnd.ms-htmlhelp",
        css : "text/css",
        csv : "text/csv",
        doc : "application/msword",
        dvi : "application/x-dvi",
        eps : "application/postscript",
        flv : "video/x-flv",
        gif : "image/gif",
        gz : "application/x-gzip",
        htm : "text/html",
        html : "text/html",
        ico : "image/vnd.microsoft.icon",
        jnlp : "application/x-java-jnlp-file",
        jpeg : "image/jpeg",
        jpg : "image/jpeg",
        m3u : "audio/x-mpegurl",
        m4v : "video/mp4",
        mathml : "application/mathml+xml",
        mid : "audio/midi",
        midi : "audio/midi",
        mov : "video/quicktime",
        mp3 : "audio/mpeg",
        mp4 : "video/mp4",
        mp4v : "video/mp4",
        mpeg : "video/mpeg",
        mpg : "video/mpeg",
        odp : "application/vnd.oasis.opendocument.presentation",
        ods : "application/vnd.oasis.opendocument.spreadsheet",
        odt : "application/vnd.oasis.opendocument.text",
        ogg : "application/ogg",
        pdf : "application/pdf",
        png : "image/png",
        pps : "application/vnd.ms-powerpoint",
        ppt : "application/vnd.ms-powerpoint",
        ps : "application/postscript",
        qt : "video/quicktime",
        rdf : "application/rdf+xml",
        rss : "application/rss+xml",
        rtf : "application/rtf",
        svg : "image/svg+xml",
        swf : "application/x-shockwave-flash",
        text : "text/plain",
        tif : "image/tiff",
        tiff : "image/tiff",
        txt : "text/plain",
        wav : "audio/x-wav",
        wma : "audio/x-ms-wma",
        wmv : "video/x-ms-wmv",
        xml : "application/xml",
        zip : "application/zip",

        detectFromFilename : function(filename) {
            var ext = filename.toLowerCase();
            ext = ext.substr(ext.lastIndexOf('.') + 1);
            return MimeTypes[ext];
        }
    };

    var parser = new DOMParser();
    var autolinker = new Autolinker({
        stripPrefix : false,
        twitter : false,
        email : false,
        replaceFn : function(linker, match) {
            if (!match.protocolUrlMatch) {
                //Prevent matching of non-explicit urls.
                //i.e. foo.id won't match but http://foo.id will
                return false;
            }
        }
    });

    var BILLBOARD_SIZE = 32;

    function isZipFile(blob) {
        var magicBlob = blob.slice(0, Math.min(4, blob.size));
        var deferred = when.defer();
        var reader = new FileReader();
        reader.addEventListener('load', function() {
            deferred.resolve(new DataView(reader.result).getUint32(0, false) === 0x504b0304);
        });
        reader.addEventListener('error', function() {
            deferred.reject(reader.error);
        });
        reader.readAsArrayBuffer(magicBlob);
        return deferred;
    }

    function readBlobAsText(blob) {
        var deferred = when.defer();
        var reader = new FileReader();
        reader.addEventListener('load', function() {
            deferred.resolve(reader.result);
        });
        reader.addEventListener('error', function() {
            deferred.reject(reader.error);
        });
        reader.readAsText(blob);
        return deferred;
    }

    function loadXmlFromZip(reader, entry, uriResolver, deferred) {
        entry.getData(new zip.TextWriter(), function(text) {
            uriResolver.gpx = parser.parseFromString(text, 'application/xml');
            deferred.resolve();
        });
    }

    function loadDataUriFromZip(reader, entry, uriResolver, deferred) {
        var mimeType = defaultValue(MimeTypes.detectFromFilename(entry.filename), 'application/octet-stream');
        entry.getData(new zip.Data64URIWriter(mimeType), function(dataUri) {
            uriResolver[entry.filename] = dataUri;
            deferred.resolve();
        });
    }

    function replaceAttributes(div, elementType, attributeName, uriResolver) {
        var keys = uriResolver.keys;
        var baseUri = new Uri('.');
        var elements = div.querySelectorAll(elementType);
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            var value = element.getAttribute(attributeName);
            var uri = new Uri(value).resolve(baseUri).toString();
            var index = keys.indexOf(uri);
            if (index !== -1) {
                var key = keys[index];
                element.setAttribute(attributeName, uriResolver[key]);
                if (elementType === 'a' && element.getAttribute('download') === null) {
                    element.setAttribute('download', key);
                }
            }
        }
    }

    function proxyUrl(url, proxy) {
        if (defined(proxy)) {
            if (new Uri(url).isAbsolute()) {
                url = proxy.getURL(url);
            }
        }
        return url;
    }

    function getOrCreateEntity(node, entityCollection) {
        var id = queryStringAttribute(node, 'id');
        id = defined(id) ? id : createGuid();
        var entity = entityCollection.getOrCreateEntity(id);
        if (!defined(entity.gpx)) {
            entity.addProperty('gpx');
            entity.gpx = new GpxFeatureData();
        }
        return entity;
    }

    function readCoordinate(value) {
        if (!defined(value)) {
            return undefined;
        }

        var digits = value.match(/[^\s,\n]+/g);
        if (digits.length !== 2 && digits.length !== 3) {
            window.console.log('GPX - Invalid coordinates: ' + value);
            return undefined;
        }

        var longitude = parseFloat(digits[0]);
        var latitude = parseFloat(digits[1]);
        var height = parseFloat(digits[2]);

        longitude = isNaN(longitude) ? 0.0 : longitude;
        latitude = isNaN(latitude) ? 0.0 : latitude;
        height = isNaN(height) ? 0.0 : height;

        return Cartesian3.fromDegrees(longitude, latitude, height);
    }

    function readCoordinates(element) {
        if (!defined(element)) {
            return undefined;
        }

        var tuples = element.textContent.match(/[^\s\n]+/g);
        var length = tuples.length;
        var result = new Array(length);
        var resultIndex = 0;
        for (var i = 0; i < length; i++) {
            result[resultIndex++] = readCoordinate(tuples[i]);
        }
        return result;
    }

    var gpxNamespaces = [null, undefined, 'http://www.topografix.com/GPX/1/1'];
    var namespaces = {
        gpx : gpxNamespaces
    };

    function queryNumericAttribute(node, attributeName) {
        if (!defined(node)) {
            return undefined;
        }

        var value = node.getAttribute(attributeName);
        if (value !== null) {
            var result = parseFloat(value);
            return !isNaN(result) ? result : undefined;
        }
        return undefined;
    }

    function queryStringAttribute(node, attributeName) {
        if (!defined(node)) {
            return undefined;
        }
        var value = node.getAttribute(attributeName);
        return value !== null ? value : undefined;
    }

    function queryFirstNode(node, tagName, namespace) {
        if (!defined(node)) {
            return undefined;
        }
        var childNodes = node.childNodes;
        var length = childNodes.length;
        for (var q = 0; q < length; q++) {
            var child = childNodes[q];
            if (child.localName === tagName && namespace.indexOf(child.namespaceURI) !== -1) {
                return child;
            }
        }
        return undefined;
    }

    function queryNodes(node, tagName, namespace) {
        if (!defined(node)) {
            return undefined;
        }
        var result = [];
        var childNodes = node.getElementsByTagName(tagName);
        var length = childNodes.length;
        for (var q = 0; q < length; q++) {
            var child = childNodes[q];
            if (child.localName === tagName && namespace.indexOf(child.namespaceURI) !== -1) {
                result.push(child);
            }
        }
        return result;
    }

    function queryChildNodes(node, tagName, namespace) {
        if (!defined(node)) {
            return [];
        }
        var result = [];
        var childNodes = node.childNodes;
        var length = childNodes.length;
        for (var q = 0; q < length; q++) {
            var child = childNodes[q];
            if (child.localName === tagName && namespace.indexOf(child.namespaceURI) !== -1) {
                result.push(child);
            }
        }
        return result;
    }

    function queryNumericValue(node, tagName, namespace) {
        var resultNode = queryFirstNode(node, tagName, namespace);
        if (defined(resultNode)) {
            var result = parseFloat(resultNode.textContent);
            return !isNaN(result) ? result : undefined;
        }
        return undefined;
    }

    function queryStringValue(node, tagName, namespace) {
        var result = queryFirstNode(node, tagName, namespace);
        if (defined(result)) {
            return result.textContent.trim();
        }
        return undefined;
    }

    function queryBooleanValue(node, tagName, namespace) {
        var result = queryFirstNode(node, tagName, namespace);
        return defined(result) ? result.textContent === '1' : undefined;
    }

    function resolveHref(href, proxy, sourceUri, uriResolver) {
        if (!defined(href)) {
            return undefined;
        }
        var hrefResolved = false;
        if (defined(uriResolver)) {
            var blob = uriResolver[href];
            if (defined(blob)) {
                hrefResolved = true;
                href = blob;
            }
        }
        if (!hrefResolved && defined(sourceUri)) {
            var baseUri = new Uri(document.location.href);
            sourceUri = new Uri(sourceUri);
            href = new Uri(href).resolve(sourceUri.resolve(baseUri)).toString();
            href = proxyUrl(href, proxy);
        }
        return href;
    }

    var colorOptions = {};
    function parseColorString(value, isRandom) {
        if (!defined(value)) {
            return undefined;
        }

        if(value[0] === '#'){
            value = value.substring(1);
        }

        var alpha = parseInt(value.substring(0, 2), 16) / 255.0;
        var blue = parseInt(value.substring(2, 4), 16) / 255.0;
        var green = parseInt(value.substring(4, 6), 16) / 255.0;
        var red = parseInt(value.substring(6, 8), 16) / 255.0;

        if (!isRandom) {
            return new Color(red, green, blue, alpha);
        }

        if (red > 0) {
            colorOptions.maximumRed = red;
        } else {
            colorOptions.red = 0;
        }
        if (green > 0) {
            colorOptions.maximumGreen = green;
        } else {
            colorOptions.green = 0;
        }
        if (blue > 0) {
            colorOptions.maximumBlue = blue;
        } else {
            colorOptions.blue = 0;
        }
        colorOptions.alpha = alpha;
        return Color.fromRandom(colorOptions);
    }

    function queryColorValue(node, tagName, namespace) {
        var value = queryStringValue(node, tagName, namespace);
        if (!defined(value)) {
            return undefined;
        }
        return parseColorString(value, queryStringValue(node, 'colorMode', namespace) === 'random');
    }

    function createDefaultBillboard(proxy, sourceUri, uriResolver) {
        var billboard = new BillboardGraphics();
        billboard.width = BILLBOARD_SIZE;
        billboard.height = BILLBOARD_SIZE;
        billboard.scaleByDistance = new NearFarScalar(2414016, 1.0, 1.6093e+7, 0.1);
        var DEFAULT_ICON = '../../../Build/Cesium/Assets/Textures/maki/marker.png';
        billboard.image = resolveHref(DEFAULT_ICON, proxy, sourceUri, uriResolver);
        return billboard;
    }

    function createDefaultPolygon() {
        var polygon = new PolygonGraphics();
        polygon.outline = true;
        polygon.outlineColor = Color.WHITE;
        return polygon;
    }

    function createDefaultLabel() {
        var label = new LabelGraphics();
        label.translucencyByDistance = new NearFarScalar(3000000, 1.0, 5000000, 0.0);
        label.pixelOffset = new Cartesian2(17, 0);
        label.horizontalOrigin = HorizontalOrigin.LEFT;
        label.font = '16px sans-serif';
        label.style = LabelStyle.FILL_AND_OUTLINE;
        return label;
    }

    function processWpt(dataSource, geometryNode, entityCollection, sourceUri, uriResolver) {

        //Required Information:
        //  <lon> Longitude of the waypoint.
        //  <lat> Latitude of the waypoint.
        var longitude = queryNumericAttribute(geometryNode, 'lon');
        var latitude = queryNumericAttribute(geometryNode, 'lat');
        var coordinatesString = longitude + ", " + latitude;
        var position = readCoordinate(coordinatesString);
        if (!defined(position)) {
            throw new DeveloperError('Position Coordinates are required.');
        }

        var entity = getOrCreateEntity(geometryNode, entityCollection);
        entity.position = position;
        entity.billboard = createDefaultBillboard(dataSource._proxy, sourceUri, uriResolver);

        //Optional Position Information:
        //  <ele> Elevation of the waypoint.
        //  <time> Creation date/time of the waypoint
        //  <magvar> Magnetic variation of the waypoint in degrees
        //  <geoidheight> Geoid height of the waypoint
        //      var elevation = queryNumericValue(geometryNode, 'ele', namespaces.gpx);
        //      var time = queryNumericValue(geometryNode, 'time', namespaces.gpx);
        //      var magvar = queryNumericValue(geometryNode, 'magvar', namespaces.gpx);
        //      var geoidheight = queryNumericValue(geometryNode, 'geoidheight', namespaces.gpx);

        //Optional Description Information:
        //  <name> GPS waypoint name of the waypoint
        //  <cmt> GPS comment of the waypoint
        //  <desc> Descriptive description of the waypoint
        //  <src> Source of the waypoint data
        //  <link> Link (URI/URL) associated with the waypoint
        //  <sym> Waypoint symbol
        //  <type> Type (category) of waypoint
        var name = queryStringValue(geometryNode, 'name', namespaces.gpx);
        entity.label = createDefaultLabel();
        entity.label.text = name;
        //        var comment = queryStringValue(geometryNode, 'cmt', namespaces.gpx);
        //        var description = queryStringValue(geometryNode, 'desc', namespaces.gpx);
        //        var source = queryStringValue(geometryNode, 'src', namespaces.gpx);
        //        var link = queryLinkgValue(geometryNode, 'link', namespaces.gpx);
        //        var symbol = queryStringValue(geometryNode, 'sym', namespaces.gpx);
        //        var type = queryStringValue(geometryNode, 'type', namespaces.gpx);

        //Optional Accuracy Information:
        //  <fix> Type of GPS fix
        //  <sat> Number of satellites
        //  <hdop> HDOP
        //  <vdop> VDOP
        //  <pdop> PDOP
        //  <ageofdgpsdata> Time since last DGPS fix
        //  <dgpsid> DGPS station ID
    }

    var complexTypes = {
        wpt : processWpt
    };

    function processGpx(dataSource, node, entityCollection, sourceUri, uriResolver) {
        var complexTypeNames = Object.keys(complexTypes);
        var complexTypeNamesLength = complexTypeNames.length;

        for (var i = 0; i < complexTypeNamesLength; i++) {
            var typeName = complexTypeNames[i];
            var processComplexTypeNode = complexTypes[typeName];

            var childNodes = node.childNodes;
            var length = childNodes.length;
            for (var q = 0; q < length; q++) {
                var child = childNodes[q];
                if (child.localName === typeName && namespaces.gpx.indexOf(child.namespaceURI) !== -1) {
                    processComplexTypeNode(dataSource, child, entityCollection, sourceUri, uriResolver);
                }
            }
        }
    }

    function loadGpx(dataSource, gpx, sourceUri, uriResolver) {
        var entityCollection = dataSource._entityCollection;

        dataSource._promises = [];
        entityCollection.removeAll();

        var element = gpx.documentElement;
        var name = queryStringValue(document, 'name', namespaces.gpx);
        if (!defined(name) && defined(sourceUri)) {
            name = getFilenameFromUri(sourceUri);
        }

        if (element.localName === 'gpx') {
            processGpx(dataSource, element, entityCollection, sourceUri, uriResolver);
        } else {
            window.console.log('GPX - Unsupported node: ' + element.localName);
        }

        return when.all(dataSource._promises, function() {
            var clock;
            var availability = entityCollection.computeAvailability();

            var start = availability.start;
            var stop = availability.stop;
            var isMinStart = JulianDate.equals(start, Iso8601.MINIMUM_VALUE);
            var isMaxStop = JulianDate.equals(stop, Iso8601.MAXIMUM_VALUE);
            if (!isMinStart || !isMaxStop) {
                var date;

                //If start is min time just start at midnight this morning, local time
                if (isMinStart) {
                    date = new Date();
                    date.setHours(0, 0, 0, 0);
                    start = JulianDate.fromDate(date);
                }

                //If stop is max value just stop at midnight tonight, local time
                if (isMaxStop) {
                    date = new Date();
                    date.setHours(24, 0, 0, 0);
                    stop = JulianDate.fromDate(date);
                }

                clock = new DataSourceClock();
                clock.startTime = start;
                clock.stopTime = stop;
                clock.currentTime = JulianDate.clone(start);
                clock.clockRange = ClockRange.LOOP_STOP;
                clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
                clock.multiplier = Math.round(Math.min(Math.max(JulianDate.secondsDifference(stop, start) / 60, 1), 3.15569e7));
            }
            var changed = false;
            if (dataSource._name !== name) {
                dataSource._name = name;
                changed = true;
            }

            if (clock !== dataSource._clock) {
                changed = true;
                dataSource._clock = clock;
            }

            if (changed) {
                dataSource._changed.raiseEvent(dataSource);
            }

            DataSource.setLoading(dataSource, false);
            return dataSource;
        });
    }

    /**
     * A {@link DataSource} which processes Keyhole Markup Language 2.2 (GPX).
     * <p>
     * GPX support in Cesium is incomplete, but a large amount of the standard,
     * as well as Google's <code>gx</code> extension namespace, is supported. See Github issue
     * {@link https://github.com/AnalyticalGraphicsInc/cesium/issues/873|#873} for a
     * detailed list of what is and isn't support. Cesium will also write information to the
     * console when it encounters most unsupported features.
     * </p>
     * <p>
     * Non visual feature data, such as <code>atom:author</code> and <code>ExtendedData</code>
     * is exposed via an instance of {@link GpxFeatureData}, which is added to each {@link Entity}
     * under the <code>gpx</code> property.
     * </p>
     *
     * @alias GpxDataSource
     * @constructor
     *
     * @param {DefaultProxy} [proxy] A proxy to be used for loading external data.
     *
     * @see {@link http://www.opengeospatial.org/standards/gpx/|Open Geospatial Consortium GPX Standard}
     * @see {@link https://developers.google.com/gpx/|Google GPX Documentation}
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=GPX.html|Cesium Sandcastle GPX Demo}
     *
     * @example
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.dataSources.add(Cesium.GpxDataSource.load('../../SampleData/facilities.kmz'));
     */
    var GpxDataSource = function(proxy) {
        this._changed = new Event();
        this._error = new Event();
        this._loading = new Event();
        this._clock = undefined;
        this._entityCollection = new EntityCollection();
        this._name = undefined;
        this._isLoading = false;
        this._proxy = proxy;
        this._pinBuilder = new PinBuilder();
        this._promises = [];
    };

    /**
     * Creates a Promise to a new instance loaded with the provided GPX data.
     *
     * @param {String|Document|Blob} data A url, parsed GPX document, or Blob containing binary KMZ data or a parsed GPX document.
     * @param {Object} [options] An object with the following properties:
     * @param {DefaultProxy} [options.proxy] A proxy to be used for loading external data.
     * @param {String} [options.sourceUri] Overrides the url to use for resolving relative links and other GPX network features.
     * @returns {Promise} A promise that will resolve to a new GpxDataSource instance once the GPX is loaded.
     */
    GpxDataSource.load = function(data, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var dataSource = new GpxDataSource(options.proxy);
        return dataSource.load(data, options);
    };

    defineProperties(GpxDataSource.prototype, {
        /**
         * Gets a human-readable name for this instance.
         * This will be automatically be set to the GPX document name on load.
         * @memberof GpxDataSource.prototype
         * @type {String}
         */
        name : {
            get : function() {
                return this._name;
            }
        },
        /**
         * Gets the clock settings defined by the loaded GPX. This represents the total
         * availability interval for all time-dynamic data. If the GPX does not contain
         * time-dynamic data, this value is undefined.
         * @memberof GpxDataSource.prototype
         * @type {DataSourceClock}
         */
        clock : {
            get : function() {
                return this._clock;
            }
        },
        /**
         * Gets the collection of {@link Entity} instances.
         * @memberof GpxDataSource.prototype
         * @type {EntityCollection}
         */
        entities : {
            get : function() {
                return this._entityCollection;
            }
        },
        /**
         * Gets a value indicating if the data source is currently loading data.
         * @memberof GpxDataSource.prototype
         * @type {Boolean}
         */
        isLoading : {
            get : function() {
                return this._isLoading;
            }
        },
        /**
         * Gets an event that will be raised when the underlying data changes.
         * @memberof GpxDataSource.prototype
         * @type {Event}
         */
        changedEvent : {
            get : function() {
                return this._changed;
            }
        },
        /**
         * Gets an event that will be raised if an error is encountered during processing.
         * @memberof GpxDataSource.prototype
         * @type {Event}
         */
        errorEvent : {
            get : function() {
                return this._error;
            }
        },
        /**
         * Gets an event that will be raised when the data source either starts or stops loading.
         * @memberof GpxDataSource.prototype
         * @type {Event}
         */
        loadingEvent : {
            get : function() {
                return this._loading;
            }
        }
    });

    /**
     * Asynchronously loads the provided GPX data, replacing any existing data.
     *
     * @param {String|Document|Blob} data A url, parsed GPX document, or Blob containing binary KMZ data or a parsed GPX document.
     * @param {Object} [options] An object with the following properties:
     * @param {Number} [options.sourceUri] Overrides the url to use for resolving relative links and other GPX network features.
     * @returns {Promise} A promise that will resolve to this instances once the GPX is loaded.
     */
    GpxDataSource.prototype.load = function(data, options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(data)) {
            throw new DeveloperError('data is required.');
        }
        //>>includeEnd('debug');

        DataSource.setLoading(this, true);

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var sourceUri = options.sourceUri;

        var promise = data;
        if (typeof data === 'string') {
            promise = loadBlob(proxyUrl(data, this._proxy));
            sourceUri = defaultValue(sourceUri, data);
        }

        var that = this;
        return when(promise, function(dataToLoad) {
            if (dataToLoad instanceof Blob) {
                return isZipFile(dataToLoad).then(function(isZip) {
                    if (isZip) {
                        //return loadKmz(that, dataToLoad, sourceUri);
                    }
                    return when(readBlobAsText(dataToLoad)).then(function(text) {
                        //There's no official way to validate if a parse was successful.
                        //The following check detects the error on various browsers.

                        //IE raises an exception
                        var gpx;
                        var error;
                        try {
                            gpx = parser.parseFromString(text, 'application/xml');
                        } catch (e) {
                            error = e.toString();
                        }

                        //The pase succeeds on Chrome and Firefox, but the error
                        //handling is different in each.
                        if (defined(error) || gpx.body || gpx.documentElement.tagName === 'parsererror') {
                            //Firefox has error information as the firstChild nodeValue.
                            var msg = defined(error) ? error : gpx.documentElement.firstChild.nodeValue;

                            //Chrome has it in the body text.
                            if (!msg) {
                                msg = gpx.body.innerText;
                            }

                            //Return the error
                            throw new RuntimeError(msg);
                        }
                        return loadGpx(that, gpx, sourceUri, undefined);
                    });
                });
            } else {
                return when(loadGpx(that, dataToLoad, sourceUri, undefined));
            }
        }).otherwise(function(error) {
            DataSource.setLoading(that, false);
            that._error.raiseEvent(that, error);
            window.console.log(error);
            return when.reject(error);
        });
    };

    /**
     * Contains GPX Feature data loaded into the <code>Entity.gpx</code> property by {@link GpxDataSource}.
     * @alias GpxFeatureData
     * @constructor
     */
    var GpxFeatureData = function() {
        /**
         * Gets the atom syndication format author field.
         * @type Object
         */
        this.author = {
            /**
             * Gets the name.
             * @type String
             * @alias author.name
             * @memberof! GpxFeatureData#
             * @property author.name
             */
            name : undefined,
            /**
             * Gets the URI.
             * @type String
             * @alias author.uri
             * @memberof! GpxFeatureData#
             * @property author.uri
             */
            uri : undefined,
            /**
             * Gets the email.
             * @type String
             * @alias author.email
             * @memberof! GpxFeatureData#
             * @property author.email
             */
            email : undefined
        };

        /**
         * Gets the link.
         * @type Object
         */
        this.link = {
            /**
             * Gets the href.
             * @type String
             * @alias link.href
             * @memberof! GpxFeatureData#
             * @property link.href
             */
            href : undefined,
            /**
             * Gets the language of the linked resource.
             * @type String
             * @alias link.hreflang
             * @memberof! GpxFeatureData#
             * @property link.hreflang
             */
            hreflang : undefined,
            /**
             * Gets the link relation.
             * @type String
             * @alias link.rel
             * @memberof! GpxFeatureData#
             * @property link.rel
             */
            rel : undefined,
            /**
             * Gets the link type.
             * @type String
             * @alias link.type
             * @memberof! GpxFeatureData#
             * @property link.type
             */
            type : undefined,
            /**
             * Gets the link title.
             * @type String
             * @alias link.title
             * @memberof! GpxFeatureData#
             * @property link.title
             */
            title : undefined,
            /**
             * Gets the link length.
             * @type String
             * @alias link.length
             * @memberof! GpxFeatureData#
             * @property link.length
             */
            length : undefined
        };

        /**
         * Gets the unstructured address field.
         * @type String
         */
        this.address = undefined;
        /**
         * Gets the phone number.
         * @type String
         */
        this.phoneNumber = undefined;
        /**
         * Gets the snippet.
         * @type String
         */
        this.snippet = undefined;
        /**
         * Gets the extended data, parsed into a JSON object.
         * Currently only the <code>Data</code> property is supported.
         * <code>SchemaData</code> and custom data are ignored.
         * @type String
         */
        this.extendedData = undefined;
    };

    return GpxDataSource;
});
