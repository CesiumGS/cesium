/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/loadArrayBuffer',
        '../Core/JulianDate',
        '../ThirdParty/when',
        './CallbackProperty'
    ], function(
        BoundingRectangle,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        loadArrayBuffer,
        JulianDate,
        when,
        CallbackProperty) {
    "use strict";

    /**
     * Base64Reader
     *
     * Construct it with a string in Base64 format, and then
     * read bytes using the nextByte method. The data ends when
     * nextByte returns null.
     */
    var Base64Reader = function(bytes) {
        this._i = 0;
        this._bytes = bytes;
    };

    Base64Reader.prototype.nextByte = function() {
        return this._bytes[this._i++];
    };

    /**
     * BlockReader
     *
     * Reads a stream of bytes from a GIF data block.
     */
    var BlockReader = function(input) {
        this.input = input;
        this.n     = 0;
        this.end   = false;
    };

    BlockReader.prototype.nextByte = function() {
        if (this.n-- === 0) {
            this.n = this.input.nextByte();
            if (this.n-- === 0) {
                this.end = true; return null; }
        }
        return this.input.nextByte();
    };

    BlockReader.prototype.skip = function() {
        while (! this.end) { this.nextByte(); }
    };

    /**
     * BitChunkReader
     *
     * Provides a stream of data by groups of bits.
     */
    var BitChunkReader = function(input) {
        this.input   = input;
        this.buffer  = 0;
        this.nbuffer = 0;
    };

    BitChunkReader.prototype.readBits = function(bits) {
        var read = 0;
        var ans  = 0;
        while (read < bits) {
            if (this.nbuffer === 0) {
                this.buffer  = this.input.nextByte();
                this.nbuffer = 8;
            }
            var n = Math.min(bits - read, this.nbuffer);
            ans |= (this.buffer & ((1 << n) - 1)) << read;
            read += n;
            this.nbuffer -= n;
            this.buffer >>= n;
        }
        return ans;
    };

    /**
     * LZWReader
     *
     * Provides a decoder for the LZW-compression mechanism
     */
    var LZWReader = function(input, codeSize) {
        this.input    = new BitChunkReader(input);
        this.codeSize = codeSize;
        this.bits     = codeSize + 1;
        this.CC       = 1 << codeSize;
        this.EOI      = this.CC + 1;
        this.stack    = [];
        this.table    = [];
        this.ntable   = 0;
        this.oldCode  = null;
    };

    LZWReader.prototype.initTable = function() {
        this.table = [];
        for (var i = 0; i < this.CC; ++i) {
            this.table[i] = [ i, -1, i ]; }
        this.bits    = this.codeSize + 1;
        this.maxElem = 1 << this.bits;
        this.ntable  = this.CC + 2;
        this.oldCode = null;
    };

    LZWReader.prototype.read = function() {
        var code = this.input.readBits(this.bits);
        if (code === this.EOI) { this.stack.push(null); return; }
        if (code === this.CC) {
            this.initTable();
            code = this.input.readBits(this.bits);
        }
        if (this.oldCode === null) {
            this.oldCode = code;
            this.stack.push(this.table[code][0]);
            return;
        }
        var i;
        if (code < this.ntable) {
            for (i = code; i >= 0; i = this.table[i][1]) {
                this.stack.push(this.table[i][0]); }
            this.table[this.ntable++] = [
                this.table[code][2], this.oldCode,
                this.table[this.oldCode][2] ];
        }
        else {
            var K = this.table[this.oldCode][2];
            this.table[this.ntable++] = [ K, this.oldCode, K ];
            for (i = code; i >= 0; i = this.table[i][1]) {
                this.stack.push(this.table[i][0]); }
        }
        this.oldCode = code;
        if (this.ntable === this.maxElem) {
            this.maxElem = 1 << (++this.bits);
            if (this.bits > 12) { this.bits = 12; }
        }
    };

    LZWReader.prototype.nextByte = function() {
        if (this.stack.length === 0) { this.read(); }
        return this.stack.pop();
    };

    /**
     * GIFReader
     *
     * The main class to read data from a GIF data stream.
     * Create the object passing it a reader (e.g. a
     * Base64Reader), and then call the getImages method, which
     * returns an array of objects of type PImage, which you can
     * draw in the canvas with the standard image() function.
     */
    var GIFReader = function(input) {
        this.input    = new Base64Reader(new Uint8Array(input));
        this.width    = 0;
        this.height   = 0;
        this.gct      = null;
        this.gctf     = false;
        this.gctSize  = 0;
        this.bgIndex  = 0;
        this.hasTrans = false;
        this.transIdx = 0;
        this.images   = [];
        this.delays = [];
        this.disposals = [];
    };

    GIFReader.interlacing = [
        [ 0, 8 ],
        [ 4, 8 ],
        [ 2, 4 ],
        [ 1, 2 ],
        [ 0, 0 ]
    ];

    GIFReader.prototype.assert = function(v) {
        if (! v) { throw 'GIF error - is the data correct?'; }
    };

    GIFReader.prototype.nextByte = function() {
        var b = this.input.nextByte();
        this.assert(b !== null);
        return b;
    };

    GIFReader.prototype.nextBytes = function(len) {
        var bytes = [];
        for (var i = 0; i < len; ++i) {
            bytes.push(this.nextByte()); }
        return bytes;
    };

    GIFReader.prototype.assertBytes = function(bytes) {
        var inBytes = this.nextBytes(bytes.length);
        for (var i = 0; i < bytes.length; ++i) {
            this.assert(inBytes[i] === bytes[i]); }
    };

    GIFReader.prototype.readInt16 = function() {
        var b = this.nextBytes(2);
        return b[0] | (b[1] << 8);
    };

    GIFReader.prototype.readColorTable = function(sz) {
        var total = 1 << sz;
        var table = [];
        for (var i = 0; i < total; ++i) {
            var rgba = this.nextBytes(3);
            rgba.push(0xff);
            table.push(rgba);
        }
        return table;
    };

    GIFReader.prototype.graphicControl = function() {
        this.assert(this.nextByte() === 4);
        var flags     = this.nextByte();
        this.disposals.push(flags);
        this.delays.push(this.readInt16());
        this.transIdx = this.nextByte();
        this.assert(this.nextByte() === 0);

        this.hasTrans = !!(flags & 0x1);
    };

    GIFReader.prototype.blockExtension = function() {
        var label = this.nextByte();
        if (label === 249) { this.graphicControl(); return; }
        var blockReader = new BlockReader(this);
        blockReader.skip();
    };

    GIFReader.prototype.blockImage = function() {
        var left = this.readInt16();
        var top  = this.readInt16();
        var w    = this.readInt16();
        var h    = this.readInt16();

        var flags = this.nextByte();
        var lctf   = !!(flags & 0x80);
        var ilace  = !!(flags & 0x40);
        var ctSize = (flags & 0x07) + 1;

        var lct = null;
        if (lctf) { lct = this.readColorTable(ctSize); }

        var ct = lctf ? lct : this.gct;

        if (this.hasTrans) { ct[this.transIdx][3] = 0; }

        var img = document.createElement('canvas');
        img.width = this.width;
        img.height = this.height;
        var ctx = img.getContext("2d");
        var pix = ctx.createImageData(w, h);

        var codeSize = this.nextByte();
        var blockReader = new BlockReader(this);
        var lzwReader = new LZWReader(blockReader, codeSize);
        var row = 0, col = 0, ilp = 0;
        while (true) {
            var b = lzwReader.nextByte();
            if (b === null) { break; }
            var idx = (row * w + col) * 4;
            pix.data[idx] = ct[b][0];
            pix.data[idx + 1] = ct[b][1];
            pix.data[idx + 2] = ct[b][2];
            pix.data[idx + 3] = ct[b][3];
            if (++col >= w) {
                col = 0;
                if (ilace) {
                    row += GIFReader.interlacing[ilp][1];
                    if (row >= h) {
                        row = GIFReader.interlacing[++ilp][0]; }
                }
                else { ++row; }
            }
        }
        blockReader.skip();

        ctx.putImageData(pix, left, top);
        this.images.push(img);
    };

    GIFReader.prototype.getImages = function() {
        this.assertBytes([ 71, 73, 70, 56 ]);
        var b = this.nextByte();
        this.assert(b === 55 || b === 57);
        this.assertBytes([ 97 ]);

        this.width  = this.readInt16();
        this.height = this.readInt16();

        b = this.nextByte();
        this.gctf    = !!(b & 0x80);
        this.gctSize = (b & 0x07) + 1;
        this.bgIndex = this.nextByte();

        this.nextByte();

        if (this.gctf) {
            this.gct = this.readColorTable(this.gctSize); }

        while (true) {
            b = this.nextByte();
            if      (b === 59) { break; }
            else if (b === 33) { this.blockExtension(); }
            else if (b === 44) { this.blockImage(); }
            else               { this.assert(false); }
        }
        return this.images;
    };





    var defaultEpoch = JulianDate.now();

    var BillboardAnimator = function(options) {
        if (!defined(options)) {
            throw new DeveloperError();
        }

        var atlas = options.atlas;
        var frameWidth = options.frameWidth;
        var frameHeight = options.frameHeight;
        var imagesPerRow = options.imagesPerRow;
        var frameRate = options.frameRate;
        var numberOfFrames = options.numberOfFrames;
        var useSceneTime = defaultValue(options.useSceneTime, true);
        var epoch = defaultValue(options.epoch, defaultEpoch);

        var numberOfCols = Math.ceil(numberOfFrames / imagesPerRow);

        this._image = atlas;
        this._imageSubRegion = new CallbackProperty(function(time, result) {
            var secondsElapsed;
            if (useSceneTime) {
                secondsElapsed = Math.abs(JulianDate.secondsDifference(time, epoch));
            } else {
                secondsElapsed = Math.abs(JulianDate.secondsDifference(JulianDate.now(), epoch));
            }

            var frame = Math.floor((secondsElapsed * frameRate)) % numberOfFrames;
            if (!defined(BoundingRectangle)) {
                result = new BoundingRectangle();
            }

            result.x = (frame % imagesPerRow) * frameWidth;
            //Flip Y since bounding rectangle coordinates start in lower-left
            result.y = (numberOfCols - Math.floor(frame / imagesPerRow) - 1) * frameHeight;
            result.width = frameWidth;
            result.height = frameHeight;

            return result;
        }, true);
    };

    BillboardAnimator.fromImages = function(options) {
        var images = options.images;
        var frameRate = options.frameRate;

        var frameWidth = images[0].width;
        var frameHeight = images[0].height;
        var numberOfFrames = images.length;
        var useSceneTime = options.useSceneTime;
        var epoch = options.epoch;
        var hasTrans = defaultValue(options.hasTrans, false);

        //Compute Best Fit
        var numberOfRows = 1;
        var numberOfColumns = numberOfFrames;

        var currentRow = 1;
        var currentColumn = numberOfFrames;
        var lowerDifference = Number.MAX_VALUE;
        while (currentColumn > 0) {
            var totalHeight = currentRow * frameHeight;
            var totalWidth = currentColumn * frameWidth;
            var tmp = Math.abs(totalHeight - totalWidth);
            if (tmp < lowerDifference) {
                numberOfRows = currentRow;
                numberOfColumns = currentColumn;
                lowerDifference = tmp;
            }
            if (currentRow === numberOfFrames) {
                break;
            }
            currentRow++;
            currentColumn = Math.ceil(numberOfFrames / currentRow);
        }

        //Create an atlas
        var canvas = document.createElement('canvas');
        canvas.width = frameWidth * numberOfColumns;
        canvas.height = frameHeight * numberOfRows;
        var context2D = canvas.getContext("2d");

        var row = 0;
        var col = 0;
        for (var i = 0; i < numberOfFrames; i++) {
            if (col === numberOfColumns) {
                row++;
                col = 0;
            }
            var x = col++ * frameWidth;
            var y = row * frameHeight;
            if (hasTrans) {
                for (var q = 0; q <= i; q++) {
                    context2D.drawImage(images[q], x, y);
                }
            } else {
                context2D.drawImage(images[i], x, y);
            }
        }

        return new BillboardAnimator({
            atlas : canvas,
            frameWidth : frameWidth,
            frameHeight : frameHeight,
            imagesPerRow : numberOfColumns,
            frameRate : frameRate,
            numberOfFrames : numberOfFrames,
            useSceneTime : useSceneTime,
            epoch : epoch
        });
    };

    BillboardAnimator.fromGif = function(options) {
        var url = options.url;
        return when(loadArrayBuffer(url), function(arrayBuffer) {
            var foo = new GIFReader(arrayBuffer);
            var images = foo.getImages();
            var delay = foo.delays[0];
            var calculatedFrameRate = delay === 0 ? 10 : Math.ceil(1000 / (delay * images.length));

            return BillboardAnimator.fromImages({
                images : images,
                frameRate : defaultValue(options.frameRate, calculatedFrameRate),
                hasTrans : foo.disposals[0] !== 9
            });
        });
    };

    defineProperties(BillboardAnimator.prototype, {
        image : {
            get : function() {
                return this._image;
            }
        },
        imageSubRegion : {
            get : function() {
                return this._imageSubRegion;
            }
        }
    });

    return BillboardAnimator;
});