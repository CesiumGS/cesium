/*global defineSuite*/
defineSuite([
        'Scene/Materials/Material',
        '../Specs/renderMaterial',
        '../Specs/createContext',
        '../Specs/destroyContext',
        'Renderer/PixelFormat'
    ], function(
        Material,
        renderMaterial,
        createContext,
        destroyContext,
        PixelFormat) {
    "use strict";
    /*global it,waitsFor,expect*/

    var greenImage;
    var blueImage;

    it('initialize suite', function() {
        greenImage = new Image();
        greenImage.src = './Data/Images/Green.png';

        blueImage = new Image();
        blueImage.src = './Data/Images/Blue.png';

        waitsFor(function() {
            return greenImage.complete && blueImage.complete;
        }, 'Load .png file(s) for texture test.', 3000);
    });

    it('renders a diffuse composite material', function() {
        var context = createContext();

        var greenTexture = context.createTexture2D({
            source : greenImage
        });
        var blueTexture = context.createTexture2D({
           source : blueImage
        });
        var pixel = renderMaterial(new Material({
            'materials' : [{
                'id' : 'diffuseMap1',
                'type' : 'DiffuseMapMaterial',
                'texture' : greenTexture
            },
            {
                'id' : 'diffuseMap2',
                'type' : 'DiffuseMapMaterial',
                'texture' : blueTexture
            }],
            'components' : {
                'diffuse' : '(diffuseMap1.diffuse + diffuseMap2.diffuse) / 2.0'
            }
        }), context);

        expect((pixel[0] === 0) || (pixel[0] === 1)).toEqual(true); // Workaround:  Firefox on Windows
        expect((pixel[1] === 127) || (pixel[1] === 128)).toEqual(true);
        expect((pixel[2] === 127) || (pixel[2] === 128)).toEqual(true);
        expect(pixel[3]).toEqual(255);

        destroyContext(context);
    });

    it('renders an alpha composite material', function() {
        var context = createContext();

        var pixel = renderMaterial(new Material({
            'materials' : [],
            'components' : {
                'alpha' : '0.5'
            }
        }), context);

        expect(pixel).not.toEqual([0,0,0,0]);

        destroyContext(context);
    });

    it('throws with invalid channel length', function() {
        expect(function() {
            var context = createContext();
            var greenTexture = context.createTexture2D({
                source : greenImage
            });
            return new Material({
                'materials' : [{
                    'id' : 'diffuseMap1',
                    'type' : 'DiffuseMapMaterial',
                    'texture' : greenTexture,
                    'channels' : 'rrggbb'
                }],
                'components' : {
                    'diffuse' : 'diffuseMap1'
                }
            });
        }).toThrow();
    });

    it('throws with invalid channel values', function() {
        expect(function() {
            var context = createContext();
            var greenTexture = context.createTexture2D({
                source : greenImage
            });
            return new Material({
                'materials' : [{
                    'id' : 'diffuseMap1',
                    'type' : 'DiffuseMapMaterial',
                    'texture' : greenTexture,
                    'channels' : 'inv'
                }],
                'components' : {
                    'diffuse' : 'diffuseMap1'
                }
            });
        }).toThrow();
    });
});
