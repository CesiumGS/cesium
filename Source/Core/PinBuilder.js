/*global define*/
define([
        '../ThirdParty/when',
        './buildModuleUrl',
        './Color',
        './defined',
        './loadImage',
        './loadXML',
        './writeTextToCanvas'
    ], function(
        when,
        buildModuleUrl,
        Color,
        defined,
        loadImage,
        loadXML,
        writeTextToCanvas) {
    "use strict";

    var PinBuilder = function() {
        this._cache = {};
    };

    PinBuilder.prototype.fromColor = function(color, size) {
        if (!defined(color)) {
        }
        if (!defined(size)) {
        }
        return createPin(undefined, undefined, size, color, this._cache);
    };

    PinBuilder.prototype.fromUrl = function(url, color, size) {
        if (!defined(url)) {
        }
        if (!defined(color)) {
        }
        if (!defined(size)) {
        }
        return createPin(url, undefined, size, color, this._cache);
    };

    PinBuilder.prototype.fromMakiIconId = function(id, color, size) {
        if (!defined(id)) {
        }
        if (!defined(color)) {
        }
        if (!defined(size)) {
        }
        return createPin(buildModuleUrl('Assets/Textures/maki/' + id + '.png'), undefined, size, color, this._cache);
    };

    PinBuilder.prototype.fromText = function(text, color, size) {
        if (!defined(text)) {
        }
        if (!defined(color)) {
        }
        if (!defined(size)) {
        }
        return createPin(undefined, text, size, color, this._cache);
    };

    var colorScratch = new Color();

    //This function (except for the 3 commented lines) was auto-generated from an online tool,
    //http://www.professorcloud.com/svg-to-canvas/, using Assets/Textures/pin.svg as input.
    //The reason we simply can't load and draw the SVG directly to the canvas is because
    //it taints the canvas in Internet Explorer (and possibly some other browsers); making
    //it impossible to create a WebGL texture from the result.
    function drawPin(context2D, size, color) {
        context2D.save();
        context2D.scale(size / 24, size / 24); //Added to auto-generated code to scale up to desired size.
        context2D.fillStyle = color.toCssColorString(); //Modified from auto-generated code.
        context2D.strokeStyle = color.brighten(0.5, colorScratch).toCssColorString(); //Modified from auto-generated code.
        context2D.lineWidth = 0.846;
        context2D.beginPath();
        context2D.moveTo(6.72, 0.422);
        context2D.lineTo(17.28, 0.422);
        context2D.bezierCurveTo(18.553, 0.422, 19.577, 1.758, 19.577, 3.415);
        context2D.lineTo(19.577, 10.973);
        context2D.bezierCurveTo(19.577, 12.63, 18.553, 13.966, 17.282, 13.966);
        context2D.lineTo(14.386, 14.008);
        context2D.lineTo(11.826, 23.578);
        context2D.lineTo(9.614, 14.008);
        context2D.lineTo(6.719, 13.965);
        context2D.bezierCurveTo(5.446, 13.983, 4.422, 12.629, 4.422, 10.972);
        context2D.lineTo(4.422, 3.416);
        context2D.bezierCurveTo(4.423, 1.76, 5.447, 0.423, 6.718, 0.423);
        context2D.closePath();
        context2D.fill();
        context2D.stroke();
        context2D.restore();
    }

    //This function takes an image or canvas and uses it as a template
    //to "stamp" the pin with a white image outlined in black.  The color
    //values of the input image are ignored completely and only the alpha
    //values are used.
    function drawIcon(context2D, image, size) {
        //Size is the largest image that looks good inside of pin box.
        var imageSize = size / 2.5;
        var sizeX = imageSize;
        var sizeY = imageSize;

        if (image.width > image.height) {
            sizeY = imageSize * (image.height / image.width);
        } else if (image.width < image.height) {
            sizeX = imageSize * (image.width / image.height);
        }

        //x and y are the center of the pin box
        var x = (size - sizeX) / 2;
        var y = ((7 / 24) * size) - (sizeY / 2);

        context2D.globalCompositeOperation = 'destination-out';
        context2D.drawImage(image, x - 1, y, sizeX, sizeY);
        context2D.drawImage(image, x, y - 1, sizeX, sizeY);
        context2D.drawImage(image, x + 1, y, sizeX, sizeY);
        context2D.drawImage(image, x, y + 1, sizeX, sizeY);

        context2D.globalCompositeOperation = 'destination-over';
        context2D.fillStyle = Color.BLACK.toCssColorString();
        context2D.fillRect(x - 1, y - 1, sizeX + 1, sizeY + 1);

        context2D.globalCompositeOperation = 'destination-out';
        context2D.drawImage(image, x, y, sizeX, sizeY);

        context2D.globalCompositeOperation = 'destination-over';
        context2D.fillStyle = Color.WHITE.toCssColorString();
        context2D.fillRect(x, y, sizeX, sizeY);
    }

    function createPin(url, label, color, size, cache) {
        //Use the parameters as a unique ID for caching.
        var id = JSON.stringify({
            url : url,
            label : label,
            color : color,
            size : size
        });

        //If the promise is already in our cache, return it.
        var item = cache[id];
        if (defined(item)) {
            return item;
        }

        //Otherwise, create a deferred promise and add it to the cache.
        var deferred = when.defer();
        cache[id] = deferred.promise;

        //If it's a new item, draw the canvas which we will resolve our promise too.
        var canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        var context2D = canvas.getContext("2d");
        drawPin(context2D, size, color);

        if (defined(url)) {
            //If we have an image url, load it and then stamp the pin.
            when(loadImage(url), function(image) {
                drawIcon(context2D, image, size);
                deferred.resolve(canvas);
            }).otherwise(function(e) {
                deferred.reject(e);
            });
        } else if (defined(label)) {
            //If we have a label, write it to a canvas and then stamp the pin.
            when(writeTextToCanvas(label, {
                font : 'bold ' + size + 'px sans-serif',
                fill : true,
                fillColor : Color.WHITE,
                strokWidth : 1
            }), function(image) {
                drawIcon(context2D, image, size);
                deferred.resolve(canvas);
            }).otherwise(function(e) {
                deferred.reject(e);
            });
        } else {
            //If we are using a blank pin, resolve immediately.
            deferred.resolve(canvas);
        }

        return deferred.promise;
    }

    return PinBuilder;
});