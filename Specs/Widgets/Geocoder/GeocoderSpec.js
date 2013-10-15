/*global defineSuite*/
defineSuite([
         'Widgets/Geocoder/Geocoder',
         'Specs/EventHelper',
         'Specs/createScene',
         'Specs/destroyScene'
     ], function(
         Geocoder,
         EventHelper,
         createScene,
         destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('can create and destroy', function() {
        var container = document.createElement('div');
        container.id = 'testContainer';
        document.body.appendChild(container);

        var scene = createScene();
        var widget = new Geocoder({
            container : 'testContainer',
            scene : scene
        });
        expect(widget.container).toBe(container);
        expect(widget.isDestroyed()).toEqual(false);
        expect(container.children.length).not.toEqual(0);
        widget.destroy();
        expect(container.children.length).toEqual(0);
        expect(widget.isDestroyed()).toEqual(true);

        document.body.removeChild(container);

        destroyScene(scene);
    });

    it('constructor throws with no scene', function() {
        expect(function() {
            return new Geocoder({
                container : document.body
            });
        }).toThrow();
    });

    it('constructor throws with no element', function() {
        var scene = createScene();
        expect(function() {
            return new Geocoder({
                scene : scene
            });
        }).toThrow();
        destroyScene(scene);
    });

    it('constructor throws with string element that does not exist', function() {
        var scene = createScene();
        expect(function() {
            return new Geocoder({
                container : 'does not exist',
                scene : scene
            });
        }).toThrow();
        destroyScene(scene);
    });
}, 'WebGL');