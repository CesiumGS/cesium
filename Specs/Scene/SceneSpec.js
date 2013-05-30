/*global defineSuite*/
defineSuite([
         'Core/Color',
         'Core/Cartesian3',
         'Core/BoundingSphere',
         'Renderer/DrawCommand',
         'Renderer/CommandLists',
         'Specs/createScene',
         'Specs/destroyScene'
     ], 'Scene/Scene', function(
         Color,
         Cartesian3,
         BoundingSphere,
         DrawCommand,
         CommandLists,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('get canvas', function() {
        expect(scene.getCanvas()).toBeDefined();
    });

    it('get context', function() {
        expect(scene.getContext()).toBeDefined();
    });

    it('get primitives', function() {
        expect(scene.getPrimitives()).toBeDefined();
    });

    it('get camera', function() {
        expect(scene.getCamera()).toBeDefined();
    });

    it('get uniform state', function() {
        expect(scene.getUniformState()).toBeDefined();
    });

    it('get animations', function() {
        expect(scene.getAnimations()).toBeDefined();
    });

    it('draws background color', function() {
        scene.initializeFrame();
        scene.render();
        expect(scene.getContext().readPixels()).toEqual([0, 0, 0, 255]);

        scene.backgroundColor = Color.BLUE;
        scene.initializeFrame();
        scene.render();
        expect(scene.getContext().readPixels()).toEqual([0, 0, 255, 255]);
    });

    function getMockPrimitive(command) {
        return {
            update : function(context, frameState, commandList) {
                var commandLists = new CommandLists();
                commandLists.colorList.push(command);
                commandList.push(commandLists);
            },
            destroy : function() {
            }
        };
    }

    it('debugCommandFilter filters commands', function() {
        var c = new DrawCommand();
        c.execute = function() {};
        spyOn(c, 'execute');

        scene.getPrimitives().add(getMockPrimitive(c));

        scene.debugCommandFilter = function(command) {
            return command !== c;   // Do not execute command
        };

        scene.initializeFrame();
        scene.render();
        expect(c.execute).not.toHaveBeenCalled();

        scene.getPrimitives().removeAll();
        scene.debugCommandFilter = undefined;
    });

    it('debugCommandFilter does not filter commands', function() {
        var c = new DrawCommand();
        c.execute = function() {};
        spyOn(c, 'execute');

        scene.getPrimitives().add(getMockPrimitive(c));

        expect(scene.debugCommandFilter).toBeUndefined();
        scene.initializeFrame();
        scene.render();
        expect(c.execute).toHaveBeenCalled();

        scene.getPrimitives().removeAll();
    });

    it('debugShowBoundingVolume draws a bounding sphere', function() {
        var c = new DrawCommand();
        c.execute = function() {};
        c.debugShowBoundingVolume = true;
        c.boundingVolume = new BoundingSphere(Cartesian3.ZERO, 7000000.0);

        scene.getPrimitives().add(getMockPrimitive(c));

        scene.initializeFrame();
        scene.render();
        expect(scene.getContext().readPixels()[0]).not.toEqual(0);  // Red bounding sphere

        scene.getPrimitives().removeAll();
    });

    it('isDestroyed', function() {
        var s = createScene();
        expect(s.isDestroyed()).toEqual(false);
        destroyScene(s);
        expect(s.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
