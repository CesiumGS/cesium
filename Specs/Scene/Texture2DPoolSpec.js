/*global defineSuite*/
defineSuite([
         'Scene/Texture2DPool',
         'Core/destroyObject'
     ], function(
         Texture2DPool,
         destroyObject) {
    "use strict";
    /*global jasmine,it,expect,beforeEach,afterEach*/

    var fakeContext;
    var pool;

    beforeEach(function() {
        fakeContext = jasmine.createSpyObj('Context', ['createTexture2D']);
        fakeContext.createTexture2D.andCallFake(function(description) {
            return {
                getWidth : function() {
                    return description.width;
                },
                getHeight : function() {
                    return description.height;
                },
                isDestroyed : function() {
                    return false;
                },
                destroy : function() {
                    return destroyObject(this);
                }
            };
        });

        pool = new Texture2DPool(fakeContext);
    });

    it('throws when constructed without context', function() {
        expect(function() {
            return new Texture2DPool();
        }).toThrow();
    });

    it('creates textures from the context on demand', function() {
        var description = {
            width : 1,
            height : 1
        };

        var texture = pool.createTexture2D(description);
        expect(fakeContext.createTexture2D).toHaveBeenCalledWith(description);
        expect(texture).toBeDefined();
    });

    it('creates textures of different sizes', function() {
        var texture1 = pool.createTexture2D({
            width : 1,
            height : 1
        });
        expect(texture1.getWidth()).toEqual(1);

        var texture2 = pool.createTexture2D({
            width : 2,
            height : 2
        });
        expect(texture2.getWidth()).toEqual(2);
    });

    it('returns textures to the pool when they are destroyed', function() {
        var texture1 = pool.createTexture2D({
            width : 1,
            height : 1
        });
        texture1.destroy();

        var texture2 = pool.createTexture2D({
            width : 1,
            height : 1
        });

        expect(fakeContext.createTexture2D.callCount).toEqual(1);
        expect(texture2 === texture1).toEqual(true);
    });

    it('destroys free textures when the pool is destroyed', function() {
        var texture1 = pool.createTexture2D({
            width : 1,
            height : 1
        });
        texture1.destroy();

        pool.destroy();
        expect(pool.isDestroyed()).toEqual(true);
        expect(texture1.isDestroyed()).toEqual(true);
    });
});