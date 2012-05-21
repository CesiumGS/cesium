/*global defineSuite*/
defineSuite([
         'Scene/Texture2DPool',
         'Core/destroyObject'
     ], function(
         Texture2DPool,
         destroyObject) {
    "use strict";
    /*global it,expect,beforeEach,afterEach*/

    var tWidth = 256;
    var tHeight = 256;

    var MockTexture = function(width, height) {
        this.width = width || tWidth;
        this.height = height || tHeight;

        this.getWidth = function() {
            return this.width;
        };

        this.getHeight = function() {
            return this.height;
        };

        this.isDestroyed = function() {
            return false;
        };

        this.destroy = function() {
            return destroyObject(this);
        };
    };

    var pool;
    beforeEach(function() {
        pool = new Texture2DPool(tWidth, tHeight);
    });

    it("construction without width throws", function() {
        expect(function() {
            return new Texture2DPool();
        }).toThrow();
    });

    it("construction without height throws", function() {
        expect(function() {
            return new Texture2DPool(256);
        }).toThrow();
    });

    it("getWidth and getHeight", function() {
        var width = 512;
        var height = 1024;

        var pool = new Texture2DPool(width, height);
        expect(pool.getWidth()).toEqual(width);
        expect(pool.getHeight()).toEqual(height);
    });

    it("add throws when widths aren't equal", function() {
        expect(function() {
            pool.add(new MockTexture(tWidth + 1));
        }).toThrow();
    });

    it("add throws when heights aren't equal", function() {
        expect(function() {
            pool.add(new MockTexture(tWidth, tHeight + 1));
        }).toThrow();
    });

    it("add", function() {
        pool.add(new MockTexture());
        expect(pool.size()).toEqual(1);

        pool.add(new MockTexture(), false);
        expect(pool.size()).toEqual(2);
        expect(pool.getNumInUse()).toEqual(2);

        pool.add(new MockTexture(), true);
        pool.add(new MockTexture(), true);
        expect(pool.size()).toEqual(4);
        expect(pool.getNumInUse()).toEqual(2);
    });

    it("remove", function() {
        var textures = [];
        for ( var i = 0; i < 4; ++i) {
            var texture = new MockTexture();
            textures.push(texture);
            pool.add(texture);
        }

        expect(pool.size()).toEqual(textures.length);
        expect(pool.getNumInUse()).toEqual(textures.length);

        pool.remove(textures[1]);
        expect(pool.size()).toEqual(textures.length);
        expect(pool.getNumInUse()).toEqual(textures.length - 1);

        pool.remove(textures[0]);
        expect(pool.size()).toEqual(textures.length);
        expect(pool.getNumInUse()).toEqual(textures.length - 2);

        pool.remove(textures[3]);
        expect(pool.size()).toEqual(textures.length);
        expect(pool.getNumInUse()).toEqual(textures.length - 3);

        pool.remove(textures[2]);
        expect(pool.size()).toEqual(textures.length);
        expect(pool.getNumInUse()).toEqual(textures.length - 4);
    });

    it("removeAll", function() {
        var textures = [];
        for ( var i = 0; i < 8; ++i) {
            var texture = new MockTexture();
            textures.push(texture);
            pool.add(texture);
        }

        expect(pool.size()).toEqual(textures.length);
        expect(pool.getNumInUse()).toEqual(textures.length);

        pool.removeAll();
        expect(pool.size()).toEqual(textures.length);
        expect(pool.getNumInUse()).toEqual(0);
    });

    it("hasAvailable", function() {
        expect(pool.hasAvailable()).toEqual(false);

        var mockTexture = new MockTexture();
        pool.add(mockTexture, true);
        expect(pool.hasAvailable()).toEqual(true);

        var texture = pool.getTexture();
        expect(texture).toEqual(mockTexture);
        expect(pool.hasAvailable()).toEqual(false);
    });

    it("getTexture", function() {
        var texture = pool.getTexture();
        expect(texture === null).toEqual(true);

        var length = 8;

        for ( var i = 0; i < length; ++i) {
            pool.add(new MockTexture(), true);
        }

        expect(pool.size()).toEqual(length);
        expect(pool.getNumInUse()).toEqual(0);

        for ( var j = 0; j < length; ++j) {
            texture = pool.getTexture();

            expect(texture !== null).toEqual(true);
            expect(pool.size()).toEqual(length);
            expect(pool.getNumInUse()).toEqual(j + 1);
        }
    });

    it("destroy", function() {
        var textures = [];
        for ( var i = 0; i < 8; ++i) {
            var texture = new MockTexture();
            textures.push(texture);
            pool.add(texture);
        }

        expect(pool.isDestroyed()).toEqual(false);
        pool.destroy();
        expect(pool.isDestroyed()).toEqual(true);

        for ( var j = 0; j < textures.length; ++j) {
            expect(textures[j].isDestroyed()).toEqual(true);
        }
    });
});