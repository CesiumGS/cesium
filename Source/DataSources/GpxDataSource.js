/*global define*/
define([
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
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/loadBlob',
        '../Core/loadXML',
        '../Core/Math',
        '../Core/NearFarScalar',
        '../Core/PinBuilder',
        '../Core/RuntimeError',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Scene/HorizontalOrigin',
        '../Scene/LabelStyle',
        '../ThirdParty/Autolinker',
        '../ThirdParty/Uri',
        '../ThirdParty/when',
        './BillboardGraphics',
        './DataSource',
        './DataSourceClock',
        './Entity',
        './EntityCollection',
        './LabelGraphics',
        './PathGraphics',
        './PolylineGraphics',
        './PolylineOutlineMaterialProperty',
        './SampledPositionProperty'
    ], function(
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
        Event,
        getFilenameFromUri,
        Iso8601,
        JulianDate,
        loadBlob,
        loadXML,
        CesiumMath,
        NearFarScalar,
        PinBuilder,
        RuntimeError,
        TimeInterval,
        TimeIntervalCollection,
        HorizontalOrigin,
        LabelStyle,
        Autolinker,
        Uri,
        when,
        BillboardGraphics,
        DataSource,
        DataSourceClock,
        Entity,
        EntityCollection,
        LabelGraphics,
        PathGraphics,
        PolylineGraphics,
        PolylineOutlineMaterialProperty,
        SampledPositionProperty) {
    "use strict";

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
        return entity;
    }

    function readCoordinateFromNode(node) {
        var longitude = queryNumericAttribute(node, 'lon');
        var latitude = queryNumericAttribute(node, 'lat');
        var elevation = queryNumericValue(node, 'ele', namespaces.gpx);
        return Cartesian3.fromDegrees(longitude, latitude, elevation);
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

    function resolveHref(href, proxy, sourceUri) {
        if (!defined(href)) {
            return undefined;
        }
        if (defined(sourceUri)) {
            var baseUri = new Uri(document.location.href);
            sourceUri = new Uri(sourceUri);
            href = new Uri(href).resolve(sourceUri.resolve(baseUri)).toString();
            href = proxyUrl(href, proxy);
        }
        return href;
    }

    function createDefaultBillboard(proxy, sourceUri) {
        var billboard = new BillboardGraphics();
        billboard.width = BILLBOARD_SIZE;
        billboard.height = BILLBOARD_SIZE;
        billboard.scaleByDistance = new NearFarScalar(2414016, 1.0, 1.6093e+7, 0.1);
        var DEFAULT_ICON = '../../../Build/Cesium/Assets/Textures/maki/marker.png';
        billboard.image = resolveHref(DEFAULT_ICON, proxy, sourceUri);
        return billboard;
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

    function createDefaultPolyline() {
        var polyline = new PolylineGraphics();
        polyline.width = 4;
        polyline.material = new PolylineOutlineMaterialProperty();
        polyline.material.color = Color.RED;
        polyline.material.outlineWidth = 2;
        polyline.material.outlineColor = Color.BLACK;
        return polyline;
    }

    function createDefaultPath() {
        var path = new PathGraphics();
        path.leadTime = 0;
        path.width = 4;
        path.material = new PolylineOutlineMaterialProperty();
        path.material.color = Color.RED;
        path.material.outlineWidth = 2;
        path.material.outlineColor = Color.BLACK;
        return path;
    }

    // This is a list of the Optional Description Information:
    //  <cmt> GPS comment of the waypoint
    //  <desc> Descriptive description of the waypoint
    //  <src> Source of the waypoint data
    //  TODO <link> Link (URI/URL) associated with the waypoint
    //  <type> Type (category) of waypoint
    var descriptiveInfoTypes = {
        time : {
            text : 'Time',
            tag : 'time'
        },
        comment : {
            text : 'Comment',
            tag : 'cmt'
        },
        description : {
            text : 'Description',
            tag : 'desc'
        },
        source : {
            text : 'Source',
            tag : 'src'
        },
        number : {
            text : 'GPS track/route number',
            tag : 'number'
        },
        type : {
            text : 'Type',
            tag : 'type'
        }

    };
    var scratchDiv = document.createElement('div');
    function processDescription(node, entity) {
        var i;

        var text = '';
        var infoTypeNames = Object.keys(descriptiveInfoTypes);
        var length = infoTypeNames.length;
        for (i = 0; i < length; i++) {
            var infoTypeName = infoTypeNames[i];
            var infoType = descriptiveInfoTypes[infoTypeName];
            infoType.value = defaultValue(queryStringValue(node, infoType.tag, namespaces.gpx), '');
            if (defined(infoType.value) && infoType.value !== '') {
                text = text + '<p>' + infoType.text + ': ' + infoType.value + '</p>';
            }
        }

        if (!defined(text) || text === '') {
            //No description
            return;
        }

        //Turns non-explicit links into clickable links.
        text = autolinker.link(text);

        //Use a temporary div to manipulate the links
        //so that they open in a new window.
        scratchDiv.innerHTML = text;
        var links = scratchDiv.querySelectorAll('a');

        for (i = 0; i < links.length; i++) {
            links[i].setAttribute('target', '_blank');
        }

        var background = Color.WHITE;
        var foreground = Color.BLACK;
        var tmp = '<div class="cesium-infoBox-description-lighter" style="';
        tmp += 'overflow:auto;';
        tmp += 'word-wrap:break-word;';
        tmp += 'background-color:' + background.toCssColorString() + ';';
        tmp += 'color:' + foreground.toCssColorString() + ';';
        tmp += '">';
        tmp += scratchDiv.innerHTML + '</div>';
        scratchDiv.innerHTML = '';

        //return the final HTML as the description.
        return tmp;
    }

    function processWpt(dataSource, geometryNode, entityCollection, sourceUri) {
        var position = readCoordinateFromNode(geometryNode);
        if (!defined(position)) {
            throw new DeveloperError('Position Coordinates are required.');
        }

        var entity = getOrCreateEntity(geometryNode, entityCollection);
        entity.position = position;
        // TODO different icon support
        // var symbol = queryStringValue(geometryNode, 'sym', namespaces.gpx);
        entity.billboard = createDefaultBillboard(dataSource._proxy, sourceUri);

        var name = queryStringValue(geometryNode, 'name', namespaces.gpx);
        entity.name = name;
        entity.label = createDefaultLabel();
        entity.label.text = name;
        entity.description = processDescription(geometryNode, entity);
    }

    //rte represents route - an ordered list of waypoints representing a series of turn points leading to a destination
    function processRte(dataSource, geometryNode, entityCollection, sourceUri) {
        var entity = getOrCreateEntity(geometryNode, entityCollection);
        entity.description = processDescription(geometryNode, entity);

        //a list of wpt
        var routePoints = queryNodes(geometryNode, 'rtept', namespaces.gpx);
        var coordinateTuples = new Array(routePoints.length);
        for (var i = 0; i < routePoints.length; i++) {
            processWpt(dataSource, routePoints[i], entityCollection, sourceUri);
            coordinateTuples[i] = readCoordinateFromNode(routePoints[i]);
        }
        entity.polyline = createDefaultPolyline();
        entity.polyline.positions = coordinateTuples;
    }

    //trk represents a track - an ordered list of points describing a path.
    function processTrk(dataSource, geometryNode, entityCollection, sourceUri) {
        var entity = getOrCreateEntity(geometryNode, entityCollection);
        entity.description = processDescription(geometryNode, entity);

        var trackSegs = queryNodes(geometryNode, 'trkseg', namespaces.gpx);
        var positions = [];
        var times = [];
        var trackSegInfo;
        var isTimeDynamic = true;
        var property = new SampledPositionProperty();
        for (var i = 0; i < trackSegs.length; i++) {
            trackSegInfo = processTrkSeg(trackSegs[i]);
            positions = positions.concat(trackSegInfo.positions);
            if (trackSegInfo.times.length > 0) {
                times = times.concat(trackSegInfo.times);
                property.addSamples(times, positions);
                //if one track segment is non dynamic the whole track must also be
                isTimeDynamic = isTimeDynamic && true;
            } else {
                isTimeDynamic = false;
            }
        }
        if (isTimeDynamic) {
            entity.billboard = createDefaultBillboard();
            entity.billboard.image = resolveHref('../../../Build/Cesium/Assets/Textures/maki/bicycle.png');
            entity.position = property;
            entity.path = createDefaultPath();
            entity.availability = new TimeIntervalCollection();
            entity.availability.addInterval(new TimeInterval({
                start : times[0],
                stop : times[times.length - 1]
            }));
        } else {
            entity.polyline = createDefaultPolyline();
            entity.polyline.positions = positions;
        }
    }

    function processTrkSeg(node) {
        var result = {
            positions : [],
            times : []
        };
        var trackPoints = queryNodes(node, 'trkpt', namespaces.gpx);
        var time;
        for (var i = 0; i < trackPoints.length; i++) {

            var position = readCoordinateFromNode(trackPoints[i]);
            if (!defined(position)) {
                throw new DeveloperError('Trkpt: Position Coordinates are required.');
            }
            result.positions.push(position);

            time = queryStringValue(trackPoints[i], 'time', namespaces.gpx);
            if (defined(time)) {
                result.times.push(JulianDate.fromIso8601(time));
            }
        }
        return result;
    }

    /**
     * Processes a metadaType node and returns a metadata object
     * {@link http://www.topografix.com/gpx/1/1/#type_metadataType|GPX Schema}
     */
    function processMetadata(node) {
        var metadataNode = queryFirstNode(node, 'metadata', namespaces.gpx);
        if (defined(metadataNode)) {
            var metadata = {
                name : queryStringValue(metadataNode, 'name', namespaces.gpx),
                desc : queryStringValue(metadataNode, 'desc', namespaces.gpx),
                author : getPerson(metadataNode),
                copyright : getCopyright(metadataNode),
                link : getLink(metadataNode),
                time : queryStringValue(metadataNode, 'time', namespaces.gpx),
                keywords : queryStringValue(metadataNode, 'keywords', namespaces.gpx),
                bounds : getBounds(metadataNode)
            };
            if (defined(metadata.name) || defined(metadata.desc) || defined(metadata.author) || defined(metadata.copyright) || defined(metadata.link) || defined(metadata.time) || defined(metadata.keywords) || defined(metadata.bounds)) {
                return metadata;
            }
        }
        return undefined;
    }
    /**
     *  Receives a XML node and returns a personType object, refer to
     * {@link http://www.topografix.com/gpx/1/1/#type_personType|GPX Schema}
     */
    function getPerson(node) {
        var personNode = queryFirstNode(node, 'author', namespaces.gpx);
        if (defined(personNode)) {
            var person = {
                name : queryStringValue(personNode, 'name', namespaces.gpx),
                email : getEmail(personNode),
                link : getLink(personNode)
            };
            if (defined(person.name) || defined(person.email) || defined(person.link)) {
                return person;
            }
        }
        return undefined;
    }
    /**
     *  Receives a XML node and returns an email address (from emailType), refer to
     * {@link http://www.topografix.com/gpx/1/1/#type_emailType|GPX Schema}
     */
    function getEmail(node) {
        var emailNode = queryFirstNode(node, 'email', namespaces.gpx);
        if (defined(emailNode)) {
            var id = queryStringValue(emailNode, 'id', namespaces.gpx);
            var domain = queryStringValue(emailNode, 'domain', namespaces.gpx);
            return id + '@' + domain;
        } else {
            return undefined;
        }
    }
    /**
     *  Receives a XML node and returns a linkType object, refer to
     * {@link http://www.topografix.com/gpx/1/1/#type_linkType|GPX Schema}
     */
    function getLink(node) {
        var linkNode = queryFirstNode(node, 'link', namespaces.gpx);
        if (defined(linkNode)) {
            var link = {
                href : queryStringAttribute(linkNode, 'href'),
                text : queryStringValue(linkNode, 'text', namespaces.gpx),
                mimeType : queryStringValue(linkNode, 'type', namespaces.gpx)
            };
            if (defined(link.href) || defined(link.text) || defined(link.mimeType)) {
                return link;
            }
        }
        return undefined;
    }
    /**
    *  Receives a XML node and returns a copyrightType object, refer to
    * {@link http://www.topografix.com/gpx/1/1/#type_copyrightType|GPX Schema}
    */
    function getCopyright(node) {
        var copyrightNode = queryFirstNode(node, 'copyright', namespaces.gpx);
        if (defined(copyrightNode)) {
            var copyright = {
                author : queryStringAttribute(copyrightNode, 'author'),
                year : queryStringValue(copyrightNode, 'year', namespaces.gpx),
                license : queryStringValue(copyrightNode, 'license', namespaces.gpx)
            };
            if (defined(copyright.author) || defined(copyright.year) || defined(copyright.license)) {
                return copyright;
            }
        }
        return undefined;
    }
    /**
     *  Receives a XML node and returns a boundsType object, refer to
     * {@link http://www.topografix.com/gpx/1/1/#type_boundsType|GPX Schema}
     */
    function getBounds(node) {
        var boundsNode = queryFirstNode(node, 'bounds', namespaces.gpx);
        if (defined(boundsNode)) {
            var bounds = {
                minLat : queryNumericValue(boundsNode, 'minlat', namespaces.gpx),
                maxLat : queryNumericValue(boundsNode, 'maxlat', namespaces.gpx),
                minLon : queryNumericValue(boundsNode, 'minlon', namespaces.gpx),
                maxLon : queryNumericValue(boundsNode, 'maxlon', namespaces.gpx)
            };
            if (defined(bounds.minLat) || defined(bounds.maxLat) || defined(bounds.minLon) || defined(bounds.maxLon)) {
                return bounds;
            }
        }
        return undefined;
    }

    var complexTypes = {
        wpt : processWpt,
        rte : processRte,
        trk : processTrk
    };

    function processGpx(dataSource, node, entityCollection, sourceUri) {
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
                    processComplexTypeNode(dataSource, child, entityCollection, sourceUri);
                }
            }
        }
    }

    function loadGpx(dataSource, gpx, sourceUri) {
        var entityCollection = dataSource._entityCollection;

        entityCollection.removeAll();

        var element = gpx.documentElement;
        var version = queryStringAttribute(element, 'version');
        var creator = queryStringAttribute(element, 'creator');

        var name;
        var metadata = processMetadata(element);
        if (defined(metadata)) {
            name = metadata.name;
        }

        if (!defined(name) && defined(sourceUri)) {
            name = getFilenameFromUri(sourceUri);
        }

        if (element.localName === 'gpx') {
            processGpx(dataSource, element, entityCollection, sourceUri);
        } else {
            window.console.log('GPX - Unsupported node: ' + element.localName);
        }

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

        if (dataSource._creator !== creator) {
            dataSource._creator = creator;
            changed = true;
        }

        if (metadataChanged(dataSource._metadata, metadata)) {
            dataSource._metadata = metadata;
            changed = true;
        }

        if (dataSource._version !== version) {
            dataSource._version = version;
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
    }

    function metadataChanged(old, current) {
        if (!defined(old) && !defined(current)) {
            return false;
        } else if (defined(old) && defined(current)) {
            if (old.name !== current.name || old.dec !== current.desc || old.src !== current.src || old.author !== current.author || old.copyright !== current.copyright || old.link !== current.link || old.time !== current.time || old.bounds !== current.bounds) {
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    }

    /**
     * A {@link DataSource} which processes The GPS Exchange Format (GPX).
     *
     * @alias GpxDataSource
     * @constructor
     *
     * @param {DefaultProxy} [proxy] A proxy to be used for loading external data.
     *
     * @see {@link http://www.topografix.com/gpx.asp|Topografix GPX Standard}
     * @see {@link http://www.topografix.com/gpx/1/1/|Topografix GPX Documentation}
     *
     * @demo {@link}
     *
     * @example
     * var viewer = new Cesium.Viewer('cesiumContainer');
     * viewer.dataSources.add(Cesium.GpxDataSource.load('../../SampleData/track.gpx'));
     */
    var GpxDataSource = function(proxy) {
        this._changed = new Event();
        this._error = new Event();
        this._loading = new Event();
        this._clock = undefined;
        this._entityCollection = new EntityCollection();
        this._name = undefined;
        this._version = undefined;
        this._creator = undefined;
        this._metadata = undefined;
        this._isLoading = false;
        this._proxy = proxy;
        this._pinBuilder = new PinBuilder();
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
         * Gets the version of the GPX Schema in use.
         * @memberof GpxDataSource.prototype
         * @type {String}
         */
        version : {
            get : function() {
                return this._version;
            }
        },
        /**
         * Gets the creator of the GPX document.
         * @memberof GpxDataSource.prototype
         * @type {String}
         */
        creator : {
            get : function() {
                return this._creator;
            }
        },
        /**
         * Gets an object containing metadata about the GPX file.
         * @memberof GpxDataSource.prototype
         * @type {Object}
         */
        metadata : {
            get : function() {
                return this._metadata;
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
     * @param {String|Document|Blob} data A url, parsed GPX document, or Blob containing binary GPX data or a parsed GPX document.
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

    return GpxDataSource;
});
