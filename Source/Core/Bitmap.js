define([], function() {
    'use strict';

    function Bitmap(imageData) {
        var width = imageData.width;
        var height = imageData.height;
        var data = imageData.data;

        this.width = width;
        this.height = height;

        this.data = data;

        this.channelCount = data.length / (width * height);
    }

    Bitmap.prototype.texture2D = function(textureCoordinates, result) {
        var data = this.data;
        var width = this.width;
        var channelCount = this.channelCount;
        var y = Math.floor(textureCoordinates.y * this.height);
        var x = Math.floor(textureCoordinates.x * width);

        var index = (y * width + x) * channelCount;
        result.red = data[index];
        result.green = data[index + 1];
        result.blue = data[index + 2];
        result.alpha = channelCount === 4 ? data[index] : 255;

        return result;
    };

    Bitmap.prototype.writePixel = function(pixelCoordinates, color) {
        var data = this.data;
        var width = this.width;
        var channelCount = this.channelCount;
        var y = pixelCoordinates.y;
        var x = pixelCoordinates.x;

        var index = (y * width + x) * channelCount;
        data[index] = color.red;
        data[index + 1] = color.green;
        data[index + 2] = color.blue;
        if (channelCount === 4) {
            data[index + 3] = color.alpha;
        }
    }

    Bitmap.prototype.clear = function() {
        this.data.fill(0);
    };

    return Bitmap;
});
