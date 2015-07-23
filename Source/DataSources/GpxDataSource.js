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

    function isExtrudable(altitudeMode, gxAltitudeMode) {
        return altitudeMode === 'absolute' || altitudeMode === 'relativeToGround' || gxAltitudeMode === 'relativeToSeaFloor';
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

    function processTimeStamp(featureNode) {
        var node = queryFirstNode(featureNode, 'TimeStamp', namespaces.gpxgx);
        var whenString = queryStringValue(node, 'when', namespaces.gpxgx);

        if (!defined(node) || !defined(whenString) || whenString.length === 0) {
            return undefined;
        }

        //According to the GPX spec, a TimeStamp represents a "single moment in time"
        //However, since Cesium animates much differently than Google Earth, that doesn't
        //Make much sense here.  Instead, we use the TimeStamp as the moment the feature
        //comes into existence.  This works much better and gives a similar feel to
        //GE's experience.
        var when = JulianDate.fromIso8601(whenString);
        var result = new TimeIntervalCollection();
        result.addInterval(new TimeInterval({
            start : when,
            stop : Iso8601.MAXIMUM_VALUE
        }));
        return result;
    }

    function processTimeSpan(featureNode) {
        var node = queryFirstNode(featureNode, 'TimeSpan', namespaces.gpxgx);
        if (!defined(node)) {
            return undefined;
        }
        var result;

        var beginNode = queryFirstNode(node, 'begin', namespaces.gpxgx);
        var beginDate = defined(beginNode) ? JulianDate.fromIso8601(beginNode.textContent) : undefined;

        var endNode = queryFirstNode(node, 'end', namespaces.gpxgx);
        var endDate = defined(endNode) ? JulianDate.fromIso8601(endNode.textContent) : undefined;

        if (defined(beginDate) && defined(endDate)) {
            if (JulianDate.lessThan(endDate, beginDate)) {
                var tmp = beginDate;
                beginDate = endDate;
                endDate = tmp;
            }
            result = new TimeIntervalCollection();
            result.addInterval(new TimeInterval({
                start : beginDate,
                stop : endDate
            }));
        } else if (defined(beginDate)) {
            result = new TimeIntervalCollection();
            result.addInterval(new TimeInterval({
                start : beginDate,
                stop : Iso8601.MAXIMUM_VALUE
            }));
        } else if (defined(endDate)) {
            result = new TimeIntervalCollection();
            result.addInterval(new TimeInterval({
                start : Iso8601.MINIMUM_VALUE,
                stop : endDate
            }));
        }

        return result;
    }

    function createDefaultBillboard() {
        var billboard = new BillboardGraphics();
        billboard.width = BILLBOARD_SIZE;
        billboard.height = BILLBOARD_SIZE;
        billboard.scaleByDistance = new NearFarScalar(2414016, 1.0, 1.6093e+7, 0.1);
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

    function processBillboardIcon(dataSource, node, targetEntity, sourceUri, uriResolver) {
        var scale = queryNumericValue(node, 'scale', namespaces.gpx);
        var heading = queryNumericValue(node, 'heading', namespaces.gpx);
        var color = queryColorValue(node, 'color', namespaces.gpx);

        var iconNode = queryFirstNode(node, 'Icon', namespaces.gpx);
        var href = queryStringValue(iconNode, 'href', namespaces.gpx);
        var icon = resolveHref(href, dataSource._proxy, sourceUri, uriResolver);
        var x = queryNumericValue(iconNode, 'x', namespaces.gx);
        var y = queryNumericValue(iconNode, 'y', namespaces.gx);
        var w = queryNumericValue(iconNode, 'w', namespaces.gx);
        var h = queryNumericValue(iconNode, 'h', namespaces.gx);

        var hotSpotNode = queryFirstNode(node, 'hotSpot', namespaces.gpx);
        var hotSpotX = queryNumericAttribute(hotSpotNode, 'x');
        var hotSpotY = queryNumericAttribute(hotSpotNode, 'y');
        var hotSpotXUnit = queryStringAttribute(hotSpotNode, 'xunits');
        var hotSpotYUnit = queryStringAttribute(hotSpotNode, 'yunits');

        var billboard = targetEntity.billboard;
        if (!defined(billboard)) {
            billboard = createDefaultBillboard(dataSource);
            targetEntity.billboard = billboard;
        }

        billboard.image = icon;
        billboard.scale = scale;
        billboard.color = color;

        if (defined(x) || defined(y) || defined(w) || defined(h)) {
            billboard.imageSubRegion = new BoundingRectangle(x, y, w, h);
        }

        //GE treats a heading of zero as no heading
        //Yes, this means it's impossible to actually point north in GPX
        if (defined(heading) && heading !== 0) {
            billboard.rotation = CesiumMath.toRadians(-heading);
            billboard.alignedAxis = Cartesian3.UNIT_Z;
        }

        //Hotpot is the GPX equivalent of pixel offset
        //The hotspot origin is the lower left, but we leave
        //our billboard origin at the center and simply
        //modify the pixel offset to take this into account
        scale = defaultValue(scale, 1.0);

        var xOffset;
        var yOffset;
        if (defined(hotSpotX)) {
            if (hotSpotXUnit === 'pixels') {
                xOffset = -hotSpotX * scale;
            } else if (hotSpotXUnit === 'insetPixels') {
                xOffset = (hotSpotX - BILLBOARD_SIZE) * scale;
            } else if (hotSpotXUnit === 'fraction') {
                xOffset = -BILLBOARD_SIZE * scale * hotSpotX;
            }
            xOffset += BILLBOARD_SIZE * 0.5 * scale;
        }

        if (defined(hotSpotY)) {
            if (hotSpotYUnit === 'pixels') {
                yOffset = hotSpotY;
            } else if (hotSpotYUnit === 'insetPixels') {
                yOffset = -hotSpotY;
            } else if (hotSpotYUnit === 'fraction') {
                yOffset = hotSpotY * BILLBOARD_SIZE;
            }
            yOffset -= BILLBOARD_SIZE * 0.5 * scale;
        }

        if (defined(xOffset) || defined(yOffset)) {
            billboard.pixelOffset = new Cartesian2(xOffset, yOffset);
        }
    }

    function applyStyle(dataSource, styleNode, targetEntity, sourceUri, uriResolver) {
        for (var i = 0, len = styleNode.childNodes.length; i < len; i++) {
            var node = styleNode.childNodes.item(i);
            var material;
            if (node.localName === 'IconStyle') {
                processBillboardIcon(dataSource, node, targetEntity, sourceUri, uriResolver);
            } else if (node.localName === 'LabelStyle') {
                var label = targetEntity.label;
                if (!defined(label)) {
                    label = createDefaultLabel();
                    targetEntity.label = label;
                }
                label.scale = defaultValue(queryNumericValue(node, 'scale', namespaces.gpx), label.scale);
                label.fillColor = defaultValue(queryColorValue(node, 'color', namespaces.gpx), label.fillColor);
                label.text = targetEntity.name;
            } else if (node.localName === 'LineStyle') {
                var polyline = targetEntity.polyline;
                if (!defined(polyline)) {
                    polyline = new PolylineGraphics();
                    targetEntity.polyline = polyline;
                }
                polyline.width = queryNumericValue(node, 'width', namespaces.gpx);
                polyline.material = queryColorValue(node, 'color', namespaces.gpx);
            } else if (node.localName === 'PolyStyle') {
                var polygon = targetEntity.polygon;
                if (!defined(polygon)) {
                    polygon = createDefaultPolygon();
                    targetEntity.polygon = polygon;
                }
                polygon.material = defaultValue(queryColorValue(node, 'color', namespaces.gpx), polygon.material);
                polygon.fill = defaultValue(queryBooleanValue(node, 'fill', namespaces.gpx), polygon.fill);
                polygon.outline = defaultValue(queryBooleanValue(node, 'outline', namespaces.gpx), polygon.outline);
            } else if (node.localName === 'BalloonStyle') {
                var bgColor = defaultValue(parseColorString(queryStringValue(node, 'bgColor', namespaces.gpx)), Color.WHITE);
                var textColor = defaultValue(parseColorString(queryStringValue(node, 'textColor', namespaces.gpx)), Color.BLACK);
                var text = queryStringValue(node, 'text', namespaces.gpx);

                //This is purely an internal property used in style processing,
                //it never ends up on the final entity.
                targetEntity.addProperty('balloonStyle');
                targetEntity.balloonStyle = {
                    bgColor : bgColor,
                    textColor : textColor,
                    text : text
                };
            }
        }
    }

    //Processes and merges any inline styles for the provided node into the provided entity.
    function computeFinalStyle(entity, dataSource, placeMark, styleCollection, sourceUri, uriResolver) {
        var result = new Entity();

        var inlineStyles = queryChildNodes(placeMark, 'Style', namespaces.gpx);
        var inlineStylesLength = inlineStyles.length;
        if (inlineStylesLength > 0) {
            //Google earth seems to always use the last inline style only.
            applyStyle(dataSource, inlineStyles[inlineStylesLength - 1], result, sourceUri, uriResolver);
        }

        //Google earth seems to always use the first external style only.
        var externalStyle = queryStringValue(placeMark, 'styleUrl', namespaces.gpx);
        if (defined(externalStyle)) {
            //Google Earth ignores leading and trailing whitespace for styleUrls
            //Without the below trim, some docs that load in Google Earth won't load
            //in cesium.
            var id = externalStyle;
            var styleEntity = styleCollection.getById(id);
            if (!defined(styleEntity)) {
                styleEntity = styleCollection.getById('#' + id);
            }
            if (defined(styleEntity)) {
                result.merge(styleEntity);
            }
        }

        return result;
    }

    //Asynchronously processes an external style file.
    function processExternalStyles(dataSource, uri, styleCollection) {
        return when(loadXML(proxyUrl(uri, dataSource._proxy)), function(styleGpx) {
            return processStyles(dataSource, styleGpx, styleCollection, uri, true);
        });
    }

    //Processes all shared and external styles and stores
    //their id into the provided styleCollection.
    //Returns an array of promises that will resolve when
    //each style is loaded.
    function processStyles(dataSource, gpx, styleCollection, sourceUri, isExternal, uriResolver) {
        var i;
        var id;
        var styleEntity;

        var node;
        var styleNodes = queryNodes(gpx, 'Style', namespaces.gpx);
        if (defined(styleNodes)) {
            var styleNodesLength = styleNodes.length;
            for (i = 0; i < styleNodesLength; i++) {
                node = styleNodes[i];
                id = queryStringAttribute(node, 'id');
                if (defined(id)) {
                    id = '#' + id;
                    if (isExternal && defined(sourceUri)) {
                        id = sourceUri + id;
                    }
                    if (!defined(styleCollection.getById(id))) {
                        styleEntity = new Entity({
                            id : id
                        });
                        styleCollection.add(styleEntity);
                        applyStyle(dataSource, node, styleEntity, sourceUri, uriResolver);
                    }
                }
            }
        }

        var styleMaps = queryNodes(gpx, 'StyleMap', namespaces.gpx);
        if (defined(styleMaps)) {
            var styleMapsLength = styleMaps.length;
            for (i = 0; i < styleMapsLength; i++) {
                var styleMap = styleMaps[i];
                id = queryStringAttribute(styleMap, 'id');
                if (defined(id)) {
                    var pairs = queryChildNodes(styleMap, 'Pair', namespaces.gpx);
                    for (var p = 0; p < pairs.length; p++) {
                        var pair = pairs[p];
                        if (queryStringValue(pair, 'key', namespaces.gpx) === 'normal') {
                            id = '#' + id;
                            if (isExternal && defined(sourceUri)) {
                                id = sourceUri + id;
                            }
                            if (!defined(styleCollection.getById(id))) {
                                styleEntity = styleCollection.getOrCreateEntity(id);

                                var styleUrl = queryStringValue(pair, 'styleUrl', namespaces.gpx);
                                if (defined(styleUrl)) {
                                    var base = styleCollection.getOrCreateEntity(styleUrl);
                                    if (defined(base)) {
                                        styleEntity.merge(base);
                                    }
                                } else {
                                    node = queryFirstNode(pair, 'Style', namespaces.gpx);
                                    applyStyle(dataSource, node, styleEntity, sourceUri, uriResolver);
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }

        var externalStyleHash = {};
        var promises = [];
        var styleUrlNodes = gpx.getElementsByTagName('styleUrl');
        var styleUrlNodesLength = styleUrlNodes.length;
        for (i = 0; i < styleUrlNodesLength; i++) {
            var styleReference = styleUrlNodes[i].textContent;
            if (styleReference[0] !== '#') {
                //According to the spec, all local styles should start with a #
                //and everything else is an external style that has a # seperating
                //the URL of the document and the style.  However, Google Earth
                //also accepts styleUrls without a # as meaning a local style.
                var tokens = styleReference.split('#');
                if (tokens.length === 2) {
                    var uri = tokens[0];
                    if (!defined(externalStyleHash[uri])) {
                        if (defined(sourceUri)) {
                            var baseUri = new Uri(document.location.href);
                            sourceUri = new Uri(sourceUri);
                            uri = new Uri(uri).resolve(sourceUri.resolve(baseUri)).toString();
                        }
                        promises.push(processExternalStyles(dataSource, uri, styleCollection, sourceUri));
                    }
                }
            }
        }

        return promises;
    }

    function createDropLine(dataSource, entity, styleEntity) {
        var entityPosition = new ReferenceProperty(dataSource._entityCollection, entity.id, ['position']);
        var surfacePosition = new ScaledPositionProperty(entity.position);
        entity.polyline = defined(styleEntity.polyline) ? styleEntity.polyline.clone() : new PolylineGraphics();
        entity.polyline.positions = new PositionPropertyArray([entityPosition, surfacePosition]);
    }

    function createPositionPropertyFromAltitudeMode(property, altitudeMode, gxAltitudeMode) {
        if (gxAltitudeMode === 'relativeToSeaFloor' || altitudeMode === 'absolute' || altitudeMode === 'relativeToGround') {
            //Just return the ellipsoid referenced property until we support MSL and terrain
            return property;
        }

        if ((defined(altitudeMode) && altitudeMode !== 'clampToGround') || //
           (defined(gxAltitudeMode) && gxAltitudeMode !== 'clampToSeaFloor')) {
            window.console.log('GPX - Unknown altitudeMode: ' + defaultValue(altitudeMode, gxAltitudeMode));
        }

        //Clamp to ellipsoid until we support terrain
        return new ScaledPositionProperty(property);
    }

    function createPositionPropertyArrayFromAltitudeMode(properties, altitudeMode, gxAltitudeMode) {
        if (!defined(properties)) {
            return undefined;
        }

        if (gxAltitudeMode === 'relativeToSeaFloor' || altitudeMode === 'absolute' || altitudeMode === 'relativeToGround') {
            //Just return the ellipsoid referenced property until we support MSL and terrain
            return properties;
        }

        if ((defined(altitudeMode) && altitudeMode !== 'clampToGround') || //
            (defined(gxAltitudeMode) && gxAltitudeMode !== 'clampToSeaFloor')) {
            window.console.log('GPX - Unknown altitudeMode: ' + defaultValue(altitudeMode, gxAltitudeMode));
        }

        //Clamp to ellipsoid until we support terrain.
        var propertiesLength = properties.length;
        for (var i = 0; i < propertiesLength; i++) {
            var property = properties[i];
            Ellipsoid.WGS84.scaleToGeodeticSurface(property, property);
        }
        return properties;
    }

    function processPositionGraphics(dataSource, entity, styleEntity) {
        var label = entity.label;
        if (!defined(label)) {
            label = defined(styleEntity.label) ? styleEntity.label.clone() : createDefaultLabel();
            entity.label = label;
        }
        label.text = entity.name;

        var billboard = entity.billboard;
        if (!defined(billboard)) {
            billboard = defined(styleEntity.billboard) ? styleEntity.billboard.clone() : createDefaultBillboard();
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

    function processPathGraphics(dataSource, entity, styleEntity) {
        var path = entity.path;
        if (!defined(path)) {
            path = new PathGraphics();
            path.leadTime = 0;
            entity.path = path;
        }

        var polyline = styleEntity.polyline;
        if (defined(polyline)) {
            path.material = polyline.material;
            path.width = polyline.width;
        }
    }

    function processWpt(dataSource, geometryNode, entity) {
        var longitude = queryNumericAttribute(geometryNode, 'lon');
        var latitude = queryNumericAttribute(geometryNode, 'lat');
        var coordinatesString = longitude + ", " + latitude;

        //TODO add support for these and others
        var elevation = queryNumericValue(geometryNode, 'ele', namespaces.gpx);
        var name = queryStringValue(geometryNode, 'name', namespaces.gpx);
        var comment = queryStringValue(geometryNode, 'cmt', namespaces.gpx);
        var description = queryStringValue(geometryNode, 'desc', namespaces.gpx);
        var symbol = queryStringValue(geometryNode, 'sym', namespaces.gpx);

//        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.gpx);
//        var gxAltitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.gx);
//        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.gpx);

        var position = readCoordinate(coordinatesString);
        if (!defined(position)) {
            return;
        }

        entity.position = createPositionPropertyFromAltitudeMode(new ConstantPositionProperty(position), 'relativeToSeaFloor', undefined);
        var styleEntity = new Entity(); //TODO add default style?
        processPositionGraphics(dataSource, entity, styleEntity);
//
//        if (extrude && isExtrudable(altitudeMode, gxAltitudeMode)) {
//            createDropLine(dataSource, entity, styleEntity);
//        }
    }

    function processLineStringOrLinearRing(dataSource, geometryNode, entity, styleEntity) {
        var coordinatesNode = queryFirstNode(geometryNode, 'coordinates', namespaces.gpx);
        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.gpx);
        var gxAltitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.gx);
        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.gpx);
        var tessellate = queryBooleanValue(geometryNode, 'tessellate', namespaces.gpx);
        var canExtrude = isExtrudable(altitudeMode, gxAltitudeMode);

        var coordinates = readCoordinates(coordinatesNode);
        var polyline = styleEntity.polyline;
        if (canExtrude && extrude) {
            var wall = new WallGraphics();
            entity.wall = wall;
            wall.positions = coordinates;
            var polygon = styleEntity.polygon;

            if (defined(polygon)) {
                wall.fill = polygon.fill;
                wall.outline = polygon.outline;
                wall.material = polygon.material;
            }

            if (defined(polyline)) {
                wall.outlineColor = defined(polyline.material) ? polyline.material.color : Color.WHITE;
                wall.outlineWidth = polyline.width;
            }
        } else {
            polyline = defined(polyline) ? polyline.clone() : new PolylineGraphics();
            entity.polyline = polyline;
            polyline.positions = createPositionPropertyArrayFromAltitudeMode(coordinates, altitudeMode, gxAltitudeMode);
            if (!tessellate || canExtrude) {
                polyline.followSurface = false;
            }
        }
    }

    function processPolygon(dataSource, geometryNode, entity, styleEntity) {
        var outerBoundaryIsNode = queryFirstNode(geometryNode, 'outerBoundaryIs', namespaces.gpx);
        var linearRingNode = queryFirstNode(outerBoundaryIsNode, 'LinearRing', namespaces.gpx);
        var coordinatesNode = queryFirstNode(linearRingNode, 'coordinates', namespaces.gpx);
        var coordinates = readCoordinates(coordinatesNode);
        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.gpx);
        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.gpx);
        var gxAltitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.gx);
        var canExtrude = isExtrudable(altitudeMode, gxAltitudeMode);

        var polygon = defined(styleEntity.polygon) ? styleEntity.polygon.clone() : createDefaultPolygon();

        var polyline = styleEntity.polyline;
        if (defined(polyline)) {
            polygon.outlineColor = defined(polyline.material) ? polyline.material.color : Color.WHITE;
            polygon.outlineWidth = polyline.width;
        }
        entity.polygon = polygon;

        if (canExtrude) {
            polygon.perPositionHeight = true;
            polygon.extrudedHeight = extrude ? 0 : undefined;
        }

        if (defined(coordinates)) {
            var hierarchy = new PolygonHierarchy(coordinates);
            var innerBoundaryIsNodes = queryChildNodes(geometryNode, 'innerBoundaryIs', namespaces.gpx);
            for (var j = 0; j < innerBoundaryIsNodes.length; j++) {
                linearRingNode = queryChildNodes(innerBoundaryIsNodes[j], 'LinearRing', namespaces.gpx);
                for (var k = 0; k < linearRingNode.length; k++) {
                    coordinatesNode = queryFirstNode(linearRingNode[k], 'coordinates', namespaces.gpx);
                    coordinates = readCoordinates(coordinatesNode);
                    if (defined(coordinates)) {
                        hierarchy.holes.push(new PolygonHierarchy(coordinates));
                    }
                }
            }
            polygon.hierarchy = hierarchy;
        }
    }

    function processTrack(dataSource, geometryNode, entity, styleEntity) {
        var altitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.gpx);
        var gxAltitudeMode = queryStringValue(geometryNode, 'altitudeMode', namespaces.gx);
        var coordNodes = queryChildNodes(geometryNode, 'coord', namespaces.gx);
        var timeNodes = queryChildNodes(geometryNode, 'when', namespaces.gpx);
        var extrude = queryBooleanValue(geometryNode, 'extrude', namespaces.gpx);
        var canExtrude = isExtrudable(altitudeMode, gxAltitudeMode);

        var length = Math.min(coordNodes.length, timeNodes.length);
        var coordinates = [];
        var times = [];
        for (var i = 0; i < length; i++) {
            //An empty position is OK according to the spec
            var position = readCoordinate(coordNodes[i].textContent);
            if (defined(position)) {
                coordinates.push(position);
                times.push(JulianDate.fromIso8601(timeNodes[i].textContent));
            }
        }
        var property = new SampledPositionProperty();
        property.addSamples(times, coordinates);
        entity.position = createPositionPropertyFromAltitudeMode(property, altitudeMode, gxAltitudeMode);
        processPositionGraphics(dataSource, entity, styleEntity);
        processPathGraphics(dataSource, entity, styleEntity);

        entity.availability = new TimeIntervalCollection();

        if (timeNodes.length > 0) {
            entity.availability.addInterval(new TimeInterval({
                start : times[0],
                stop : times[times.length - 1]
            }));
        }

        if (canExtrude && extrude) {
            createDropLine(dataSource, entity, styleEntity);
        }
    }

    function addToMultiTrack(times, positions, composite, availability, dropShowProperty, extrude, altitudeMode, gxAltitudeMode, includeEndPoints) {
        var start = times[0];
        var stop = times[times.length - 1];

        var data = new SampledPositionProperty();
        data.addSamples(times, positions);

        composite.intervals.addInterval(new TimeInterval({
            start : start,
            stop : stop,
            isStartIncluded : includeEndPoints,
            isStopIncluded : includeEndPoints,
            data : createPositionPropertyFromAltitudeMode(data, altitudeMode, gxAltitudeMode)
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
            data : extrude
        }));
    }

    function processMultiTrack(dataSource, geometryNode, entity, styleEntity) {
        // Multitrack options do not work in GE as detailed in the spec,
        // rather than altitudeMode being at the MultiTrack level,
        // GE just defers all settings to the underlying track.

        var interpolate = queryBooleanValue(geometryNode, 'interpolate', namespaces.gx);
        var trackNodes = queryChildNodes(geometryNode, 'Track', namespaces.gx);

        var times;
        var data;
        var lastStop;
        var lastStopPosition;
        var needDropLine = false;
        var dropShowProperty = new TimeIntervalCollectionProperty();
        var availability = new TimeIntervalCollection();
        var composite = new CompositePositionProperty();
        for (var i = 0, len = trackNodes.length; i < len; i++) {
            var trackNode = trackNodes[i];
            var timeNodes = queryChildNodes(trackNode, 'when', namespaces.gpx);
            var coordNodes = queryChildNodes(trackNode, 'coord', namespaces.gx);
            var altitudeMode = queryStringValue(trackNode, 'altitudeMode', namespaces.gpx);
            var gxAltitudeMode = queryStringValue(trackNode, 'altitudeMode', namespaces.gx);
            var canExtrude = isExtrudable(altitudeMode, gxAltitudeMode);
            var extrude = queryBooleanValue(trackNode, 'extrude', namespaces.gpx);

            var length = Math.min(coordNodes.length, timeNodes.length);

            var positions = [];
            times = [];
            for (var x = 0; x < length; x++) {
                //An empty position is OK according to the spec
                var position = readCoordinate(coordNodes[x].textContent);
                if (defined(position)) {
                    positions.push(position);
                    times.push(JulianDate.fromIso8601(timeNodes[x].textContent));
                }
            }

            if (interpolate) {
                //If we are interpolating, then we need to fill in the end of
                //the last track and the beginning of this one with a sampled
                //property.  From testing in Google Earth, this property
                //is never extruded and always absolute.
                if (defined(lastStop)) {
                    addToMultiTrack([lastStop, times[0]], [lastStopPosition, positions[0]], composite, availability, dropShowProperty, false, 'absolute', undefined, false);
                }
                lastStop = times[length - 1];
                lastStopPosition = positions[positions.length - 1];
            }

            addToMultiTrack(times, positions, composite, availability, dropShowProperty, canExtrude && extrude, altitudeMode, gxAltitudeMode, true);
            needDropLine = needDropLine || (canExtrude && extrude);
        }

        entity.availability = availability;
        entity.position = composite;
        processPositionGraphics(dataSource, entity, styleEntity);
        processPathGraphics(dataSource, entity, styleEntity);
        if (needDropLine) {
            createDropLine(dataSource, entity, styleEntity);
            entity.polyline.show = dropShowProperty;
        }
    }

    function processMultiGeometry(dataSource, geometryNode, entity, styleEntity) {
        var childNodes = geometryNode.childNodes;
        for (var i = 0, len = childNodes.length; i < len; i++) {
            var childNode = childNodes.item(i);
            var geometryProcessor = complexTypes[childNode.localName];
            if (defined(geometryProcessor)) {
                var childEntity = getOrCreateEntity(childNode, dataSource._entityCollection);
                childEntity.parent = entity;
                childEntity.name = entity.name;
                childEntity.availability = entity.availability;
                childEntity.description = entity.description;
                childEntity.gpx = entity.gpx;
                geometryProcessor(dataSource, childNode, childEntity, styleEntity);
            }
        }
    }

    function processExtendedData(node, entity) {
        var extendedDataNode = queryFirstNode(node, 'ExtendedData', namespaces.gpx);

        if (!defined(extendedDataNode)) {
            return undefined;
        }

        var result = {};
        var dataNodes = queryChildNodes(extendedDataNode, 'Data', namespaces.gpx);
        if (defined(dataNodes)) {
            var length = dataNodes.length;
            for (var i = 0; i < length; i++) {
                var dataNode = dataNodes[i];
                var name = queryStringAttribute(dataNode, 'name');
                if (defined(name)) {
                    result[name] = {
                        displayName : queryStringValue(dataNode, 'displayName', namespaces.gpx),
                        value : queryStringValue(dataNode, 'value', namespaces.gpx)
                    };
                }
            }
        }
        entity.gpx.extendedData = result;
    }

    var scratchDiv = document.createElement('div');
    function processDescription(node, entity, styleEntity, uriResolver) {
        var i;
        var key;
        var keys;

        var gpxData = entity.gpx;
        var extendedData = gpxData.extendedData;
        var description = queryStringValue(node, 'description', namespaces.gpx);

        var balloonStyle = defaultValue(entity.balloonStyle, styleEntity.balloonStyle);

        var background = Color.WHITE;
        var foreground = Color.BLACK;
        var text = description;

        if (defined(balloonStyle)) {
            background = defaultValue(balloonStyle.bgColor, Color.WHITE);
            foreground = defaultValue(balloonStyle.textColor, Color.BLACK);
            text = defaultValue(balloonStyle.text, description);
        }

        var value;
        if (defined(text)) {
            text = text.replace('$[name]', defaultValue(entity.name, ''));
            text = text.replace('$[description]', defaultValue(description, ''));
            text = text.replace('$[address]', defaultValue(gpxData.address, ''));
            text = text.replace('$[Snippet]', defaultValue(gpxData.snippet, ''));
            text = text.replace('$[id]', entity.id);

            //While not explicitly defined by the OGC spec, in Google Earth
            //The appearance of geDirections adds the directions to/from links
            //We simply replace this string with nothing.
            text = text.replace('$[geDirections]', '');

            if (defined(extendedData)) {
                var matches = text.match(/\$\[.+?\]/g);
                if (matches !== null) {
                    for (i = 0; i < matches.length; i++) {
                        var token = matches[i];
                        var propertyName = token.substr(2, token.length - 3);
                        var isDisplayName = /\/displayName$/.test(propertyName);
                        propertyName = propertyName.replace(/\/displayName$/, '');

                        value = extendedData[propertyName];
                        if (defined(value)) {
                            value = isDisplayName ? value.displayName : value.value;
                        }
                        if (defined(value)) {
                            text = text.replace(token, defaultValue(value, ''));
                        }
                    }
                }
            }
        } else if (defined(extendedData)) {
            //If no description exists, build a table out of the extended data
            keys = Object.keys(extendedData);
            if (keys.length > 0) {
                text = '<table class="cesium-infoBox-defaultTable cesium-infoBox-defaultTable-lighter"><tbody>';
                for (i = 0; i < keys.length; i++) {
                    key = keys[i];
                    value = extendedData[key];
                    text += '<tr><th>' + defaultValue(value.displayName, key) + '</th><td>' + defaultValue(value.value, '') + '</td></tr>';
                }
                text += '</tbody></table>';
            }
        }

        if (!defined(text)) {
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

        //Rewrite any KMZ embedded urls
        if (defined(uriResolver) && uriResolver.keys.length > 1) {
            replaceAttributes(scratchDiv, 'a', 'href', uriResolver);
            replaceAttributes(scratchDiv, 'img', 'src', uriResolver);
        }

        var tmp = '<div class="cesium-infoBox-description-lighter" style="';
        tmp += 'overflow:auto;';
        tmp += 'word-wrap:break-word;';
        tmp += 'background-color:' + background.toCssColorString() + ';';
        tmp += 'color:' + foreground.toCssColorString() + ';';
        tmp += '">';
        tmp += scratchDiv.innerHTML + '</div>';
        scratchDiv.innerHTML = '';

        //Set the final HTML as the description.
        entity.description = tmp;
    }

    function processFeature(dataSource, parent, featureNode, entityCollection, styleCollection, sourceUri, uriResolver) {
        var entity = getOrCreateEntity(featureNode, entityCollection);
        var gpxData = entity.gpx;
        var styleEntity = computeFinalStyle(entity, dataSource, featureNode, styleCollection, sourceUri, uriResolver);

        var name = queryStringValue(featureNode, 'name', namespaces.gpx);
        entity.name = name;
        entity.parent = parent;

        var availability = processTimeSpan(featureNode);
        if (!defined(availability)) {
            availability = processTimeStamp(featureNode);
        }
        entity.availability = availability;

        var visibility = queryBooleanValue(featureNode, 'visibility', namespaces.gpx);
        entity.show = defaultValue(visibility, true);
        //var open = queryBooleanValue(featureNode, 'open', namespaces.gpx);

        var authorNode = queryFirstNode(featureNode, 'author', namespaces.atom);
        var author = gpxData.author;
        author.name = queryStringValue(authorNode, 'name', namespaces.atom);
        author.uri = queryStringValue(authorNode, 'uri', namespaces.atom);
        author.email = queryStringValue(authorNode, 'email', namespaces.atom);

        var linkNode = queryFirstNode(featureNode, 'link', namespaces.atom);
        var link = gpxData.link;
        link.href = queryStringAttribute(linkNode, 'href');
        link.hreflang = queryStringAttribute(linkNode, 'hreflang');
        link.rel = queryStringAttribute(linkNode, 'rel');
        link.type = queryStringAttribute(linkNode, 'type');
        link.title = queryStringAttribute(linkNode, 'title');
        link.length = queryStringAttribute(linkNode, 'length');

        gpxData.address = queryStringValue(featureNode, 'address', namespaces.gpx);
        gpxData.phoneNumber = queryStringValue(featureNode, 'phoneNumber', namespaces.gpx);
        gpxData.snippet = queryStringValue(featureNode, 'Snippet', namespaces.gpx);

        processExtendedData(featureNode, entity);
        processDescription(featureNode, entity, styleEntity, uriResolver);

        return {
            entity : entity,
            styleEntity : styleEntity
        };
    }

    var complexTypes = {
              wpt: processWpt
//            Point : processPoint,
//            LineString : processLineStringOrLinearRing,
//            LinearRing : processLineStringOrLinearRing,
//            Polygon : processPolygon,
//            Track : processTrack,
//            MultiTrack : processMultiTrack,
//            MultiGeometry : processMultiGeometry
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

//    function processFolder(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver) {
//        var r = processFeature(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver);
//        processDocument(dataSource, r.entity, node, entityCollection, styleCollection, sourceUri, uriResolver);
//    }

    function processPlacemark(dataSource, parent, placemark, entityCollection, styleCollection, sourceUri, uriResolver) {
        var r = processFeature(dataSource, parent, placemark, entityCollection, styleCollection, sourceUri, uriResolver);
        var entity = r.entity;
        var styleEntity = r.styleEntity;

        var hasGeometry = false;
        var childNodes = placemark.childNodes;
        for (var i = 0, len = childNodes.length; i < len && !hasGeometry; i++) {
            var childNode = childNodes.item(i);
            var geometryProcessor = complexTypes[childNode.localName];
            if (defined(geometryProcessor)) {
                geometryProcessor(dataSource, childNode, entity, styleEntity);
                hasGeometry = true;
            }
        }

        if (!hasGeometry) {
            entity.merge(styleEntity);
            processPositionGraphics(dataSource, entity, styleEntity);
        }
    }

    function processGroundOverlay(dataSource, parent, groundOverlay, entityCollection, styleCollection, sourceUri, uriResolver) {
        var r = processFeature(dataSource, parent, groundOverlay, entityCollection, styleCollection, sourceUri, uriResolver);
        var entity = r.entity;
        var styleEntity = r.stylEntity;

        var geometry;
        var isLatLonQuad = false;

        var positions = readCoordinates(queryFirstNode(groundOverlay, 'LatLonQuad', namespaces.gx));
        if (defined(positions)) {
            geometry = createDefaultPolygon();
            geometry.hierarchy = new PolygonHierarchy(positions);
            entity.polygon = geometry;
            isLatLonQuad = true;
        } else {
            geometry = new RectangleGraphics();
            entity.rectangle = geometry;

            var latLonBox = queryFirstNode(groundOverlay, 'LatLonBox', namespaces.gpx);
            if (defined(latLonBox)) {
                var west = queryNumericValue(latLonBox, 'west', namespaces.gpx);
                var south = queryNumericValue(latLonBox, 'south', namespaces.gpx);
                var east = queryNumericValue(latLonBox, 'east', namespaces.gpx);
                var north = queryNumericValue(latLonBox, 'north', namespaces.gpx);

                if (defined(west)) {
                    west = CesiumMath.negativePiToPi(CesiumMath.toRadians(west));
                }
                if (defined(south)) {
                    south = CesiumMath.negativePiToPi(CesiumMath.toRadians(south));
                }
                if (defined(east)) {
                    east = CesiumMath.negativePiToPi(CesiumMath.toRadians(east));
                }
                if (defined(north)) {
                    north = CesiumMath.negativePiToPi(CesiumMath.toRadians(north));
                }
                geometry.coordinates = new Rectangle(west, south, east, north);

                var rotation = queryNumericValue(latLonBox, 'rotation', namespaces.gpx);
                if (defined(rotation)) {
                    geometry.rotation = CesiumMath.toRadians(rotation);
                }
            }
        }

        var material;
        var iconNode = queryFirstNode(groundOverlay, 'Icon', namespaces.gpx);
        var href = queryStringValue(iconNode, 'href', namespaces.gpx);
        if (defined(href)) {
            if (isLatLonQuad) {
                window.console.log('GPX - gx:LatLonQuad Icon does not support texture projection.');
            }
            geometry.material = resolveHref(href, dataSource._proxy, sourceUri, uriResolver);
        } else {
            geometry.material = queryColorValue(groundOverlay, 'color', namespaces.gpx);
        }

        var altitudeMode = queryStringValue(groundOverlay, 'altitudeMode', namespaces.gpx);

        var altitude;
        if (defined(altitudeMode)) {
            if (altitudeMode === 'absolute') {
                //Use height above ellipsoid until we support MSL.
                geometry.height = queryNumericValue(groundOverlay, 'altitude', namespaces.gpx);
            } else if (altitudeMode === 'clampToGround') {
                //Just use the default of 0 until we support terrain
            } else {
                window.console.log('GPX - Unknown altitudeMode: ' + altitudeMode);
            }
        } else {
            altitudeMode = queryStringValue(groundOverlay, 'altitudeMode', namespaces.gx);
            if (altitudeMode === 'relativeToSeaFloor') {
                window.console.log('GPX - altitudeMode relativeToSeaFloor is currently not supported, treating as absolute.');
                geometry.height = queryNumericValue(groundOverlay, 'altitude', namespaces.gpx);
            } else if (altitudeMode === 'clampToSeaFloor') {
                window.console.log('GPX - altitudeMode clampToSeaFloor is currently not supported, treating as clampToGround.');
            } else if (defined(altitudeMode)) {
                window.console.log('GPX - Unknown altitudeMode: ' + altitudeMode);
            }
        }
    }

    function processUnsupported(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver) {
        window.console.log('GPX - Unsupported feature: ' + node.localName);
    }

    function processNetworkLink(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver) {
        var r = processFeature(dataSource, parent, node, entityCollection, styleCollection, sourceUri, uriResolver);
        var networkEntity = r.entity;

        var link = queryFirstNode(node, 'Link', namespaces.gpx);
        if (defined(link)) {
            var linkUrl = queryStringValue(link, 'href', namespaces.gpx);
            if (defined(linkUrl)) {
                linkUrl = resolveHref(linkUrl, undefined, sourceUri, uriResolver);
                var networkLinkSource = new GpxDataSource(dataSource._proxy);
                var promise = when(networkLinkSource.load(linkUrl), function() {
                    var entities = networkLinkSource.entities.values;
                    for (var i = 0; i < entities.length; i++) {
                        dataSource._entityCollection.suspendEvents();
                        entities[i].parent = networkEntity;
                        dataSource._entityCollection.add(entities[i]);
                        dataSource._entityCollection.resumeEvents();
                    }
                });

                dataSource._promises.push(promise);
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

    function loadKmz(dataSource, blob, sourceUri) {
        var deferred = when.defer();
        zip.createReader(new zip.BlobReader(blob), function(reader) {
            reader.getEntries(function(entries) {
                var promises = [];
                var foundGPX = false;
                var uriResolver = {};
                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];
                    if (!entry.directory) {
                        var innerDefer = when.defer();
                        promises.push(innerDefer.promise);
                        if (!foundGPX && /\.gpx$/i.test(entry.filename)) {
                            //Only the first GPX file found in the zip is used.
                            //https://developers.google.com/gpx/documentation/kmzarchives
                            foundGPX = true;
                            loadXmlFromZip(reader, entry, uriResolver, innerDefer);
                        } else {
                            loadDataUriFromZip(reader, entry, uriResolver, innerDefer);
                        }
                    }
                }
                when.all(promises).then(function() {
                    reader.close();
                    if (!defined(uriResolver.gpx)) {
                        deferred.reject(new RuntimeError('KMZ file does not contain a GPX document.'));
                        return;
                    }
                    uriResolver.keys = Object.keys(uriResolver);
                    return loadGpx(dataSource, uriResolver.gpx, sourceUri, uriResolver);
                }).then(deferred.resolve).otherwise(deferred.reject);
            });
        }, function(e) {
            deferred.reject(e);
        });

        return deferred;
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
                        return loadKmz(that, dataToLoad, sourceUri);
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