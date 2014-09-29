/*global define*/
define([
        '../ThirdParty/when',
        './buildModuleUrl',
        './Color',
        './defined',
        './loadImage',
        './loadXML'
    ], function(
        when,
        buildModuleUrl,
        Color,
        defined,
        loadImage,
        loadXML) {
    "use strict";

    var PinBuilder = function() {
        this._cache = {};
        this._serializer = new XMLSerializer();
        this._pinPromise = loadXML(buildModuleUrl('Assets/Textures/pin.svg'));
    };

    PinBuilder.prototype.fromColor = function(color, size) {
        if (!defined(size)) {
        }
        if (!defined(color)) {
        }
        return createPin(undefined, size, color, this._pinPromise, this._cache, this._serializer);
    };

    PinBuilder.prototype.fromUrl = function(url, color, size) {
        if (!defined(url)) {
        }
        if (!defined(size)) {
        }
        if (!defined(color)) {
        }
        return createPin(url, size, color, this._pinPromise, this._cache, this._serializer);
    };

    PinBuilder.prototype.fromMakiName = function(name, color, size) {
        if (!defined(name)) {
        }
        if (!defined(size)) {
        }
        if (!defined(color)) {
        }
        return createPin(buildModuleUrl('Assets/Textures/maki/' + name + '.png'), size, color, this._pinPromise, this._cache, this._serializer);
    };

    var colorScratch;

    function loadBase(xml, size, color, serializer) {
        var baseDiv = document.createElement('div');
        var baseDoc = xml;

        var shape = baseDoc.getElementsByTagName("svg")[0];
        shape.setAttribute("width", size);
        shape.setAttribute("height", size);

        var par = baseDiv.ownerDocument.importNode(baseDoc.documentElement, true);
        document.body.appendChild(par);

        var path = par.getElementsByTagName('path')[0];
        path.setAttribute("fill", color.toCssColorString());

        var stroke = path.getAttribute("stroke");
        colorScratch = color.clone(colorScratch);
        colorScratch.red = Math.min(1.0, colorScratch.red + 0.5);
        colorScratch.green = Math.min(1.0, colorScratch.green + 0.5);
        colorScratch.blue = Math.min(1.0, colorScratch.blue + 0.5);
        path.setAttribute("stroke", colorScratch.toCssColorString());

        xml = serializer.serializeToString(par);

        document.body.removeChild(par);

        return 'data:image/svg+xml;base64,' + btoa(xml);
    }

    function createPin(url, color, size, pinPromise, cache, serializer) {
        var id = JSON.stringify({
            url : url,
            size : size,
            color : color
        });

        var item = cache[id];
        if (defined(item)) {
            return item;
        }
        var deferred = when.defer();
        cache[id] = deferred.promise;

        if (defined(url)) {
            when.all([pinPromise, loadImage(url)], function(images) {
                var baseImage = new Image();
                baseImage.onload = function() {
                    var iconImage = images[1];

                    var canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    var ctx = canvas.getContext("2d");

                    ctx.globalCompositeOperation = 'source-over';
                    ctx.drawImage(baseImage, 0, 0);

                    var shrink = (size / 15);
                    size = (size / 2) - shrink;
                    var x = (size / 2) + shrink;
                    var y = (size / 3) + (shrink / 2);

                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.drawImage(iconImage, x - 1, y, size, size);
                    ctx.drawImage(iconImage, x, y - 1, size, size);
                    ctx.drawImage(iconImage, x + 1, y, size, size);
                    ctx.drawImage(iconImage, x, y + 1, size, size);

                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = Color.BLACK.toCssColorString();
                    ctx.fillRect(x - 1, y - 1, size + 1, size + 1);

                    ctx.globalCompositeOperation = 'destination-out';
                    ctx.drawImage(iconImage, x, y, size, size);

                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = Color.WHITE.toCssColorString();
                    ctx.fillRect(x, y, size, size);

                    deferred.resolve(canvas);
                };
                baseImage.src = loadBase(images[0], size, color, serializer);
            }).otherwise(function(e) {
                deferred.reject(e);
            });
        } else {
            when(pinPromise, function(image) {
                var baseImage = new Image();
                baseImage.onload = function() {
                    var canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    var ctx = canvas.getContext("2d");
                    ctx.drawImage(baseImage, 0, 0);
                    deferred.resolve(canvas);
                };
                baseImage.src = loadBase(image, size, color, serializer);
            }).otherwise(function(e) {
                deferred.reject(e);
            });
        }
        return deferred.promise;
    }

    return PinBuilder;
});