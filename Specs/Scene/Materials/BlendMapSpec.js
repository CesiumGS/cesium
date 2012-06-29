/*global defineSuite*/
defineSuite([
        'Scene/Materials/BlendMap',
        'Scene/Materials/CompositeMaterial',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        BlendMap,
        CompositeMaterial,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,waitsFor,expect*/

    var greenImage;
    var blueImage;
    var grayImage;

    it("initialize suite", function() {
        greenImage = new Image();
        greenImage.src = "./Data/Images/Green.png";

        blueImage = new Image();
        blueImage.src = "./Data/Images/Blue.png";

        grayImage = new Image();
        grayImage.src = "./Data/Images/Gray.png";

        waitsFor(function() {
            return greenImage.complete && blueImage.complete && grayImage.complete;
        }, "Load .png file(s) for texture test.", 3000);
    });

    it("draws a composite material with a blend map", function() {
        var context = createContext();

        var greenTexture = context.createTexture2D({
            source : greenImage
        });
        var blueTexture = context.createTexture2D({
           source : blueImage
        });
        var grayTexture = context.createTexture2D({
            source : grayImage
        });
        var pixel = renderMaterial(new CompositeMaterial({
            'materials' : [{
                'id' : 'diffuseMap1',
                'type' : 'DiffuseMapMaterial',
                'texture' : greenTexture
            },
            {
                'id' : 'diffuseMap2',
                'type' : 'DiffuseMapMaterial',
                'texture' : blueTexture
            },
            {
                'id' : 'blender',
                'type' : 'BlendMap',
                'texture' : grayTexture
            }],
            'components' : {
                'diffuse' : 'mix(diffuseMap1.diffuse, diffuseMap2.diffuse, blender)',
            }
        }), context);

        expect((pixel[0] === 0) || (pixel[0] === 1)).toEqual(true); // Workaround:  Firefox on Windows
        expect((pixel[1] === 127) || (pixel[1] === 128)).toEqual(true);
        expect((pixel[2] === 127) || (pixel[2] === 128)).toEqual(true);
        expect(pixel[3]).toEqual(255);

        destroyContext(context);
    });
});
