defineSuite([
        'Scene/PostProcessStageCollection',
        'Core/Color',
        'Scene/PostProcessStage',
        'Specs/createScene'
    ], function(
        PostProcessStageCollection,
        Color,
        PostProcessStage,
        createScene) {
    'use strict';

    var scene;

    beforeAll(function() {
        scene = createScene();
        scene.postProcessStages.fxaa.enabled = false;
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        scene.postProcessStages.removeAll();
        scene.postProcessStages.fxaa.enabled = false;
        scene.postProcessStages.bloom.enabled = false;
        scene.postProcessStages.ambientOcclusion.enabled = false;
    });

    it('constructs', function() {
        var stages = new PostProcessStageCollection();
        expect(stages.ready).toEqual(false);
        expect(stages.fxaa).toBeDefined();
        expect(stages.ambientOcclusion).toBeDefined();
        expect(stages.bloom).toBeDefined();
        expect(stages.length).toEqual(0);
        expect(stages.outputTexture).not.toBeDefined();
    });

    it('adds stages', function() {
        expect(scene).toRender([0, 0, 0, 255]);

        scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        expect(scene.postProcessStages.length).toEqual(1);

        scene.renderForSpecs();
        expect(scene).toRender([255, 255, 0, 255]);

        scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'uniform sampler2D colorTexture;\n' +
                             'varying vec2 v_textureCoordinates;\n' +
                             'void main() {\n' +
                             '    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
                             '    gl_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n' +
                             '}'
        }));
        expect(scene.postProcessStages.length).toEqual(2);

        scene.renderForSpecs();
        expect(scene).toRender([255, 0, 255, 255]);
    });

    it('throws when adding the same stage', function() {
        var stage = new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        });
        expect(function() {
            scene.postProcessStages.add(stage);
            scene.postProcessStages.add(stage);
        }).toThrowDeveloperError();
    });

    it('removes a single stage', function() {
        var stage1 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        scene.renderForSpecs();
        expect(scene).toRender([255, 255, 0, 255]);

        scene.postProcessStages.remove(stage1);
        scene.renderForSpecs();
        expect(scene).toRender([0, 0, 0, 255]);
    });

    it('removes stages', function() {
        expect(scene).toRender([0, 0, 0, 255]);

        var stage1 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        var stage2 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'uniform sampler2D colorTexture;\n' +
                             'varying vec2 v_textureCoordinates;\n' +
                             'void main() {\n' +
                             '    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
                             '    gl_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n' +
                             '}'
        }));
        expect(scene.postProcessStages.length).toEqual(2);

        scene.renderForSpecs();
        expect(scene).toRender([255, 0, 255, 255]);

        scene.postProcessStages.remove(stage1);
        expect(scene.postProcessStages.length).toEqual(1);
        expect(scene.postProcessStages.contains(stage1)).toEqual(false);
        expect(scene.postProcessStages.contains(stage2)).toEqual(true);
        expect(stage1.isDestroyed()).toEqual(true);

        scene.renderForSpecs();
        expect(scene).toRender([0, 0, 255, 255]);

        scene.postProcessStages.remove(stage2);
        expect(scene.postProcessStages.length).toEqual(0);
        expect(scene.postProcessStages.contains(stage2)).toEqual(false);
        expect(stage2.isDestroyed()).toEqual(true);

        scene.renderForSpecs();
        expect(scene).toRender([0, 0, 0, 255]);

        expect(scene.postProcessStages.remove(stage1)).toEqual(false);
    });

    it('gets stages at index', function() {
        var stage1 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        var stage2 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'uniform sampler2D colorTexture;\n' +
                             'varying vec2 v_textureCoordinates;\n' +
                             'void main() {\n' +
                             '    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
                             '    gl_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n' +
                             '}'
        }));
        expect(scene.postProcessStages.length).toEqual(2);

        expect(scene.postProcessStages.get(0)).toEqual(stage1);
        expect(scene.postProcessStages.get(1)).toEqual(stage2);
        expect(scene.postProcessStages.remove(stage1)).toEqual(true);
        expect(scene.postProcessStages.get(0)).toEqual(stage2);
    });

    it('throws when get index is invalid', function() {
        expect(function() {
            return scene.postProcessStages.get(0);
        }).toThrowDeveloperError();

        scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        expect(function() {
            return scene.postProcessStages.get(-1);
        }).toThrowDeveloperError();
        expect(function() {
            return scene.postProcessStages.get(1);
        }).toThrowDeveloperError();
    });

    it('removes all', function() {
        expect(scene).toRender([0, 0, 0, 255]);

        var stage1 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        var stage2 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'uniform sampler2D colorTexture;\n' +
                             'varying vec2 v_textureCoordinates;\n' +
                             'void main() {\n' +
                             '    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
                             '    gl_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n' +
                             '}'
        }));
        expect(scene.postProcessStages.length).toEqual(2);

        scene.renderForSpecs();
        expect(scene).toRender([255, 0, 255, 255]);

        scene.postProcessStages.removeAll();
        expect(scene.postProcessStages.length).toEqual(0);
        expect(scene.postProcessStages.contains(stage1)).toEqual(false);
        expect(scene.postProcessStages.contains(stage2)).toEqual(false);
        expect(stage1.isDestroyed()).toEqual(true);
        expect(stage2.isDestroyed()).toEqual(true);

        scene.renderForSpecs();
        expect(scene).toRender([0, 0, 0, 255]);

        expect(scene.postProcessStages.remove(stage1)).toEqual(false);
    });

    it('gets by stage name', function() {
        var stage1 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        var stage2 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'uniform sampler2D colorTexture;\n' +
                             'varying vec2 v_textureCoordinates;\n' +
                             'void main() {\n' +
                             '    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
                             '    gl_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n' +
                             '}'
        }));

        expect(scene.postProcessStages.getStageByName(stage1.name)).toEqual(stage1);
        expect(scene.postProcessStages.getStageByName(stage2.name)).toEqual(stage2);
        expect(scene.postProcessStages.getStageByName('invalid')).not.toBeDefined();
    });

    it('gets the output texture by stage name', function() {
        var stage1 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }'
        }));
        var stage2 = scene.postProcessStages.add(new PostProcessStage({
            fragmentShader : 'uniform sampler2D colorTexture;\n' +
                             'varying vec2 v_textureCoordinates;\n' +
                             'void main() {\n' +
                             '    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n' +
                             '    gl_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n' +
                             '}'
        }));
        scene.postProcessStages.fxaa.enabled = true;

        scene.renderForSpecs();

        expect(scene.postProcessStages.getOutputTexture(stage1.name)).toBeDefined();
        expect(scene.postProcessStages.getOutputTexture(stage2.name)).toBeDefined();
        expect(scene.postProcessStages.getOutputTexture(scene.postProcessStages.fxaa.name)).toBeDefined();
        expect(scene.postProcessStages.getOutputTexture(scene.postProcessStages.fxaa.name)).toEqual(scene.postProcessStages.getOutputTexture(stage1.name));

        scene.postProcessStages.remove(stage1);
        expect(scene.postProcessStages.getOutputTexture(stage1.name)).not.toBeDefined();
    });

    it('destroys', function() {
        var stages = new PostProcessStageCollection();
        var stage = stages.add(new PostProcessStage({
            fragmentShader : 'void main() { gl_FragColor = vec4(1.0); }'
        }));
        expect(stages.isDestroyed()).toEqual(false);
        stages.destroy();
        expect(stages.isDestroyed()).toEqual(true);
        expect(stage.isDestroyed()).toEqual(true);
    });

}, 'WebGL');
