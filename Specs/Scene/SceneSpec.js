/*global defineSuite*/
defineSuite([
         'Scene/Scene',
         'Core/Color',
         'Renderer/DrawCommand',
         'Renderer/CommandLists',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         Scene,
         Color,
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

    it('isDestroyed', function() {
        var s = createScene();
        expect(s.isDestroyed()).toEqual(false);
        destroyScene(s);
        expect(s.isDestroyed()).toEqual(true);
    });
}, 'WebGL');
