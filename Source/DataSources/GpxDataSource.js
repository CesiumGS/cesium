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
        './PointGraphics',
        './PolygonGraphics',
        './PolylineGraphics',
        './PolylineOutlineMaterialProperty',
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
        PointGraphics,
        PolygonGraphics,
        PolylineGraphics,
        PolylineOutlineMaterialProperty,
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

    function getCoordinatesString(node) {
        var longitude = queryNumericAttribute(node, 'lon');
        var latitude = queryNumericAttribute(node, 'lat');
        var elevation = queryNumericValue(node, 'ele', namespaces.gpx);
        var coordinatesString = longitude + ", " + latitude;
        //TODO disregard elevation for now
        //if(defined(elevation)){
        //  coordinatesString = coordinatesString + ', ' + elevation;
        //}
        return coordinatesString;
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

    function processPositionGraphics(dataSource, entity) {
        var label = entity.label;
        if (!defined(label)) {
            label = createDefaultLabel();
            entity.label = label;
        }
        label.text = entity.name;

        var billboard = entity.billboard;
        if (!defined(billboard)) {
            billboard = createDefaultBillboard();
            entity.billboard = billboard;
        }

        if (!defined(billboard.image)) {
            billboard.image = dataSource._pinBuilder.fromColor(Color.YELLOW, 64);
        }

        if (defined(billboard.scale)) {
            var scale = billboard.scale.getValue();
            if (scale !== 0) {
                label.pixelOffset = new Cartesian2((scale * 16) + 1, 0);
            } else {
                //Minor tweaks to better match Google Earth.
                label.pixelOffset = undefined;
                label.horizontalOrigin = undefined;
            }
        }
    }

    function processPathGraphics(dataSource, entity) {
        var path = entity.path;
        if (!defined(path)) {
            path = new PathGraphics();
            path.leadTime = 0;
            entity.path = path;
        }

        //
        //        var polyline = styleEntity.polyline;
        //        if (defined(polyline)) {
        //            path.material = polyline.material;
        //            path.width = polyline.width;
        //        }
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

    function createDefaultPolyline() {
        var polyline = new PolylineGraphics();
        polyline.width = 5;
        polyline.material = new PolylineOutlineMaterialProperty();
        polyline.material.color = Color.RED;
        polyline.material.outlineWidth = 2;
        polyline.material.outlineColor = Color.BLACK;
        return polyline;
    }

    function createDefaultPoint() {
        var point = new PointGraphics();
        point.pixelSize = 15;
        point.color = Color.YELLOW;
        return point;
    }

    // This is a list of the Optional Description Information:
    //  <name> GPS waypoint name of the waypoint
    //  <cmt> GPS comment of the waypoint
    //  <desc> Descriptive description of the waypoint
    //  <src> Source of the waypoint data
    //  TODO <link> Link (URI/URL) associated with the waypoint
    //  <type> Type (category) of waypoint
    var descriptiveInfoTypes = {
        position : {
            text : 'Coordinates'
        },
        elevation : {
            text : 'Elevation in meters',
            tag : 'ele'
        },
        time : {
            text : 'Time',
            tag : 'time'
        },
        name : {
            text : 'Name',
            tag : 'name'
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
    function processDescription(node, entity, uriResolver) {
        var i;

        var text = '';
        var infoTypeNames = Object.keys(descriptiveInfoTypes);
        var length = infoTypeNames.length;
        for (i = 0; i < length; i++) {
            var infoTypeName = infoTypeNames[i];
            var infoType = descriptiveInfoTypes[infoTypeName];
            if (infoTypeName === 'position') {
                var longitude = queryNumericAttribute(node, 'lon');
                var latitude = queryNumericAttribute(node, 'lat');
                if (!defined(latitude) || !defined(longitude)) {
                    continue; // no position to show on description
                }
                var elevation = queryNumericValue(node, 'ele', namespaces.gpx);
                text = text + '<p>' + infoType.text + ': ' + longitude + ', ' + latitude;
                if (defined(elevation)) {
                    text = text + ', ' + elevation + '</p>';
                } else {
                    text = text + '</p>';
                }
            } else {
                infoType.value = defaultValue(queryStringValue(node, infoType.tag, namespaces.gpx), '');
                if (defined(infoType.value) && infoType.value !== '') {
                    text = text + '<p>' + infoType.text + ': ' + infoType.value + '</p>';
                }
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

    function processWpt(dataSource, geometryNode, entityCollection, sourceUri, uriResolver) {
        var coordinatesString = getCoordinatesString(geometryNode);
        var position = readCoordinate(coordinatesString);
        if (!defined(position)) {
            throw new DeveloperError('Position Coordinates are required.');
        }

        var entity = getOrCreateEntity(geometryNode, entityCollection);
        entity.position = position;
        // TODO different icon support
        // var symbol = queryStringValue(geometryNode, 'sym', namespaces.gpx);
        entity.billboard = createDefaultBillboard(dataSource._proxy, sourceUri, uriResolver);

        var name = queryStringValue(geometryNode, 'name', namespaces.gpx);
        entity.name = name;
        entity.label = createDefaultLabel();
        entity.label.text = name;
        entity.description = processDescription(geometryNode, entity, uriResolver);
    }

    //rte represents route - an ordered list of waypoints representing a series of turn points leading to a destination
    function processRte(dataSource, geometryNode, entityCollection, sourceUri, uriResolver) {
        var entity = getOrCreateEntity(geometryNode, entityCollection);
        entity.description = processDescription(geometryNode, entity, uriResolver);

        //a list of wpt
        var routePoints = queryNodes(geometryNode, 'rtept', namespaces.gpx);
        var coordinateTuples = new Array(routePoints.length);
        var coordinate;
        for (var i = 0; i < routePoints.length; i++) {
            processWpt(dataSource, routePoints[i], entityCollection, sourceUri, uriResolver);
            coordinate = getCoordinatesString(routePoints[i]);
            coordinateTuples[i] = readCoordinate(coordinate);
        }
        entity.polyline = createDefaultPolyline();
        entity.polyline.positions = coordinateTuples;
    }

    //trk represents a track - an ordered list of points describing a path.
    function processTrk(dataSource, geometryNode, entityCollection, sourceUri, uriResolver) {
        var entity = getOrCreateEntity(geometryNode, entityCollection);
        entity.description = processDescription(geometryNode, entity, uriResolver);

        var interpolate = true; //TODO interpolate by default?
        //a list of track segments
        var trackSegs = queryNodes(geometryNode, 'trkseg', namespaces.gpx);
        var trackSegInfo;
        var nonTimestampedPositions = [];
        var times;
        var data;
        var lastStop;
        var lastStopPosition;
        var needDropLine = false;
        var dropShowProperty = new TimeIntervalCollectionProperty();
        var availability = new TimeIntervalCollection();
        var composite = new CompositePositionProperty();
        for (var i = 0; i < trackSegs.length; i++) {
            trackSegInfo = processTrkSeg(trackSegs[i]);
            var positions = trackSegInfo.positions;
            times = trackSegInfo.times;
            if (times.length > 0) {
                if (interpolate) { //TODO Copied from KML
                    //If we are interpolating, then we need to fill in the end of
                    //the last track and the beginning of this one with a sampled
                    //property.  From testing in Google Earth, this property
                    //is never extruded and always absolute.
                    if (defined(lastStop)) {
                        addToTrack([lastStop, times[0]], [lastStopPosition, positions[0]], composite, availability, dropShowProperty, false, 'absolute', undefined, false);
                    }
                    lastStop = times[length - 1];
                    lastStopPosition = positions[positions.length - 1];
                }
                if (times.length > 0) {
                    addToTrack(times, positions, composite, availability, dropShowProperty, true);
                    //    needDropLine = needDropLine || (canExtrude && extrude);
                }
            } else {
                nonTimestampedPositions = nonTimestampedPositions.concat(positions);
            }
        }

        if (times.length > 0) {
            entity.availability = availability;
            entity.position = composite;
            processPositionGraphics(dataSource, entity);
            processPathGraphics(dataSource, entity);
        } else {
            entity.polyline = createDefaultPolyline();
            entity.polyline.positions = nonTimestampedPositions;
        }
        //        if (needDropLine) {
        //            createDropLine(dataSource, entity, styleEntity);
        //            entity.polyline.show = dropShowProperty;
        //        }
    }

    function addToTrack(times, positions, composite, availability, dropShowProperty, includeEndPoints) {
        var start = times[0];
        var stop = times[times.length - 1];

        var data = new SampledPositionProperty();
        data.addSamples(times, positions);

        composite.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            isStartIncluded : includeEndPoints,
            isStopIncluded : includeEndPoints,
            data : data
        }));
        availability.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            isStartIncluded : includeEndPoints,
            isStopIncluded : includeEndPoints
        }));
        dropShowProperty.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            isStartIncluded : includeEndPoints,
            isStopIncluded : includeEndPoints,
            data : true
        }));
    }

    function processTrkSeg(node) {
        var result = {
            positions : [],
            times : []
        };
        var trackPoints = queryNodes(node, 'trkpt', namespaces.gpx);
        var coordinate;
        var time;
        for (var i = 0; i < trackPoints.length; i++) {

            coordinate = getCoordinatesString(trackPoints[i]);
            var position = readCoordinate(coordinate);
            if (!defined(position)) {
                throw new DeveloperError('Trkpt: Position Coordinates are required.');
            }
            result.positions.push(position);

            time = queryStringValue(node, 'time', namespaces.gpx);
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
            return {
                name : queryStringValue(metadataNode, 'name', namespaces.gpx),
                desc : queryStringValue(metadataNode, 'desc', namespaces.gpx),
                author : getPerson(metadataNode),
                copyright : getCopyright(metadataNode),
                link : getLink(metadataNode),
                time : queryStringValue(metadataNode, 'time', namespaces.gpx),
                keywords : queryStringValue(metadataNode, 'keywords', namespaces.gpx),
                bounds : getBounds(metadataNode)
            };
        } else {
            return undefined;
        }
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
            return person;
        } else {
            return null;
        }
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
            return null;
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
            return link;
        } else {
            return null;
        }
    }
    /**
    *  Receives a XML node and returns a copyrightType object, refer to
    * {@link http://www.topografix.com/gpx/1/1/#type_copyrightType|GPX Schema}
    */
    function getCopyright(node) {
        var copyright = {
            author : queryStringAttribute(node, 'author'),
            year : queryStringValue(node, 'year', namespaces.gpx),
            license : queryStringValue(node, 'license', namespaces.gpx)
        };
        return copyright;
    }
    /**
     *  Receives a XML node and returns a boundsType object, refer to
     * {@link http://www.topografix.com/gpx/1/1/#type_boundsType|GPX Schema}
     */
    function getBounds(node) {
        var bounds = {
            minLat : queryNumericValue(node, 'minlat'),
            maxLat : queryNumericValue(node, 'maxlat'),
            minLon : queryNumericValue(node, 'minlon'),
            maxLon : queryNumericValue(node, 'maxlon')
        };
        return bounds;
    }

    var complexTypes = {
        wpt : processWpt,
        rte : processRte,
        trk : processTrk
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
        var version = queryStringAttribute(element, 'version');
        var creator = queryStringAttribute(element, 'creator');

        var name;
        var metadata = processMetadata(element);
        if(defined(metadata)){
            name = metadata.name;
        }

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

            if (dataSource._creator !== creator) {
                dataSource._creator = creator;
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
        });
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

        version : {
            get : function() {
                return this._version;
            }
        },

        creator : {
            get : function() {
                return this._creator;
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

    return GpxDataSource;
});
