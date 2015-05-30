/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/definedNotNull',
        '../Core/defineProperties',
        '../Core/deprecationWarning',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/getFilenameFromUri',
        '../Core/loadJson',
        '../Core/PinBuilder',
        '../Core/PolygonHierarchy',
        '../Core/RuntimeError',
        '../Scene/VerticalOrigin',
        '../ThirdParty/topojson',
        '../ThirdParty/when',
        './BillboardGraphics',
        './CallbackProperty',
        './ColorMaterialProperty',
        './ConstantPositionProperty',
        './ConstantProperty',
        './DataSource',
        './EntityCollection',
        './PolygonGraphics',
        './PolylineGraphics'
    ], function(
        Cartesian3,
        Color,
        createGuid,
        defaultValue,
        defined,
        definedNotNull,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        Event,
        getFilenameFromUri,
        loadJson,
        PinBuilder,
        PolygonHierarchy,
        RuntimeError,
        VerticalOrigin,
        topojson,
        when,
        BillboardGraphics,
        CallbackProperty,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        DataSource,
        EntityCollection,
        PolygonGraphics,
        PolylineGraphics) {
    "use strict";

    var parser = new DOMParser();

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

    function loadGml() {
        ;
    }

    var GmlDataSource = function(name) {
        this._name = name;
        this._changed = new Event();
        this._error = new Event();
        this._isLoading = false;
        this._loading = new Event();
        this._entityCollection = new EntityCollection();
        this._promises = [];
        this._pinBuilder = new PinBuilder();
    };

    GmlDataSource.load = function(data, options) {
        return new GmlDataSource().load(data, options);
    };

    GmlDataSource.prototype.load = function(data, options) {
        if (!defined(data)) {
            throw new DeveloperError('data is required.');
        }
        DataSource.setLoading(this, true);
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
                    var gml;
                    var error;
                    try {
                        gml = parser.parseFromString(text, 'application/xml');
                    } catch (e) {
                        error = e.toString();
                    }

                    //The parse succeeds on Chrome and Firefox, but the error
                    //handling is different in each.
                    if (defined(error) || gml.body || gml.documentElement.tagName === 'parsererror') {
                        //Firefox has error information as the firstChild nodeValue.
                        var msg = defined(error) ? error : gml.documentElement.firstChild.nodeValue;

                        //Chrome has it in the body text.
                        if (!msg) {
                            msg = gml.body.innerText;
                        }

                        //Return the error
                        throw new RuntimeError(msg);
                    }
                    return loadGml(that, Gml, sourceUri, undefined);
                });
            } else {
                return when(loadGml(that, dataToLoad, sourceUri, undefined));
            }
        }).otherwise(function(error) {
            DataSource.setLoading(that, false);
            that._error.raiseEvent(that, error);
            window.console.log(error);
            return when.reject(error);
        });

    };

    return GmlDataSource;
});