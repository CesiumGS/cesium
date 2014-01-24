/*global defineSuite*/
defineSuite([
         'Scene/TexturePool',
         'Core/destroyObject'
     ], function(
         TexturePool,
         destroyObject) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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

        pool = new TexturePool();
    });

    it('can be constructed', function() {
        return new TexturePool();
    });

    it('creates textures from the context on demand', function() {
        var description = {
            width : 1,
            height : 1
        };

        var texture = pool.createTexture2D(fakeContext, description);
        expect(fakeContext.createTexture2D).toHaveBeenCalledWith(description);
        expect(texture).toBeDefined();
    });

    it('creates textures of different sizes', function() {
        var texture1 = pool.createTexture2D(fakeContext, {
            width : 1,
            height : 1
        });
        expect(texture1.getWidth()).toEqual(1);

        var texture2 = pool.createTexture2D(fakeContext, {
            width : 2,
            height : 2
        });
        expect(texture2.getWidth()).toEqual(2);
    });

    it('returns textures to the pool when they are destroyed', function() {
        var texture1 = pool.createTexture2D(fakeContext, {
            width : 1,
            height : 1
        });
        texture1.destroy();

        var texture2 = pool.createTexture2D(fakeContext, {
            width : 1,
            height : 1
        });

        expect(fakeContext.createTexture2D.callCount).toEqual(1);
        expect(texture2 === texture1).toEqual(true);
    });

    it('destroys free textures when the pool is destroyed', function() {
        var texture1 = pool.createTexture2D(fakeContext, {
            width : 1,
            height : 1
        });
        texture1.destroy();

        pool.destroy();
        expect(pool.isDestroyed()).toEqual(true);
        expect(texture1.isDestroyed()).toEqual(true);
    });

    it('does not allow the pool to grow beyond 8 textures', function() {
        var textures = [];
        var i;
        for (i = 0; i < 12; ++i) {
            textures.push(pool.createTexture2D(fakeContext, {
                width : 1,
                height : 1
            }));
        }

        var notDestroyed = 0;
        for (i = 0; i < textures.length; ++i) {
            textures[i].destroy();
            if (!textures[i].isDestroyed()) {
                ++notDestroyed;
            }
        }

        expect(notDestroyed).toEqual(8);
    });

    it('createTexture2D throws if description is not supplied', function() {
        expect(function() {
            pool.createTexture2D(fakeContext);
        }).toThrowDeveloperError();
    });

    it('is destroyable', function() {
        expect(pool.isDestroyed()).toEqual(false);
        pool.destroy();
        expect(pool.isDestroyed()).toEqual(true);
    });
});