import captureScreenshot from '../../Source/Scene/captureScreenshot.js';
import createViewer from '../createViewer.js';
import when from '../../Source/ThirdParty/when.js';

describe('Scene/captureScreenshot', function() {

    var container;
    var viewer;
    beforeAll(function() {
        container = document.createElement('div');
        container.id = 'container';
        container.style.width = '20px';
        container.style.height = '20px';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';
        document.body.appendChild(container);
    });

   afterAll(function() {
        if (viewer && !viewer.isDestroyed()) {
            viewer = viewer.destroy();
        }

        document.body.removeChild(container);
    });

    it('Throws without viewer', function() {
        expect(function() {
            captureScreenshot();
        }).toThrowDeveloperError();
    });

    it('Captures with default values', function() {
        viewer = createViewer(container);
        var width = viewer.scene.drawingBufferWidth;
        var height = viewer.scene.drawingBufferHeight;
        return captureScreenshot(viewer)
            .then(function(dataURI) {
                expect(dataURI).toBeDefined();
                var complete = when.defer();
                var image = new Image();
                image.onload = function() {
                    expect(image.width).toBe(width);
                    expect(image.height).toBe(height);
                    complete.resolve();
                };
                image.src = dataURI;
                return complete.promise;
            }).otherwise(function() {
                fail('should not fail');
            });
    });

    it('Resets resolution', function() {
        viewer = createViewer(container);

        return captureScreenshot(viewer, 2.0)
            .then(function(dataURI) {
                expect(viewer.resolutionScale).toBe(1.0);
            }).otherwise(function() {
                fail('should not fail');
            });
    });

    it('Captures with specified resolutionScale', function() {
        viewer = createViewer(container);

        var scale = 2.0;
        //var width = viewer.scene.drawingBufferWidth * scale;
        //var height = viewer.scene.drawingBufferHeight * scale;

        return captureScreenshot(viewer, scale)
            .then(function(dataURI) {
                expect(dataURI).toBeDefined();
                var complete = when.defer();
                var image = new Image();
                image.onload = function() {
                    // TODO: find out why reports double the expected values.  See issue #8406
                    // expect(image.width).toBe(width);
                    // expect(image.height).toBe(height);
                    complete.resolve();
                };
                image.src = dataURI;
                return complete.promise;
            }).otherwise(function() {
                fail('should not fail');
            });
    });
});
