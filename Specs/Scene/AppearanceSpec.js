/*global defineSuite*/
defineSuite([
         'Scene/Appearance',
         'Scene/Material',
         'Renderer/BlendingState',
         'Renderer/CullFace'
     ], function(
         Appearance,
         Material,
         BlendingState,
         CullFace) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor', function() {
        var material = Material.fromType(undefined, 'Color');
        var vs =
            'attribute vec3 position3DHigh;\n' +
            'attribute vec3 position3DLow;\n' +
            'attribute vec4 color;\n' +
            'varying vec4 v_color;\n' +
            'void main() {\n' +
            '    gl_Position = czm_modelViewProjectionRelativeToEye * czm_computePosition();\n' +
            '    v_color = color;\n' +
            '}\n';
        var fs =
            'varying vec4 v_color;\n' +
            'void main() {\n' +
            '    gl_FragColor = v_color;\n' +
            '}\n';
        var renderState = {
            depthTest : {
                enabled : true
            }
        };
        var appearance = new Appearance({
            material : material,
            vertexShaderSource : vs,
            fragmentShaderSource : fs,
            renderState : renderState
        });

        expect(appearance.material).toBe(material);
        expect(appearance.vertexShaderSource).toBe(vs);
        expect(appearance.fragmentShaderSource).toBe(fs);
        expect(appearance.renderState).toBe(renderState);
    });

    it('getFragmentShaderSource', function() {
        var fs =
            'varying vec4 v_color;\n' +
            'void main() {\n' +
            '    gl_FragColor = v_color;\n' +
            '}\n';
        var appearance = new Appearance({
            fragmentShaderSource : fs
        });

        expect(appearance.getFragmentShaderSource().indexOf(fs)).toBeGreaterThan(-1);
    });

    it('getFragmentShaderSource with material', function() {
        var material = Material.fromType(undefined, 'Color');
        var fs =
            'varying vec4 v_color;\n' +
            'void main() {\n' +
            '    gl_FragColor = v_color;\n' +
            '}\n';
        var appearance = new Appearance({
            material : material,
            fragmentShaderSource : fs
        });

        var fragmentSource = appearance.getFragmentShaderSource();
        expect(fragmentSource.indexOf(material.shaderSource)).toBeGreaterThan(-1);
        expect(fragmentSource.indexOf(fs)).toBeGreaterThan(-1);
    });

    it('getDefaultRenderState', function() {
        var renderState = Appearance.getDefaultRenderState(true, true);

        expect(renderState.depthTest).toBeDefined();
        expect(renderState.depthTest.enabled).toEqual(true);
        expect(renderState.depthMask).toEqual(false);
        expect(renderState.blending).toEqual(BlendingState.ALPHA_BLEND);
        expect(renderState.cull).toBeDefined();
        expect(renderState.cull.enabled).toEqual(true);
        expect(renderState.cull.face).toEqual(CullFace.BACK);
    });

});
