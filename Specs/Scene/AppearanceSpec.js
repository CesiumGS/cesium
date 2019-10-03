import { WebGLConstants } from '../../Source/Cesium.js';
import { Appearance } from '../../Source/Cesium.js';
import { BlendingState } from '../../Source/Cesium.js';
import { Material } from '../../Source/Cesium.js';

describe('Scene/Appearance', function() {

    it('constructor', function() {
        var material = Material.fromType('Color');
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
            renderState : renderState,
            translucent : false,
            closed : true
        });

        expect(appearance.material).toBe(material);
        expect(appearance.vertexShaderSource).toBe(vs);
        expect(appearance.fragmentShaderSource).toBe(fs);
        expect(appearance.renderState).toBe(renderState);
        expect(appearance.translucent).toEqual(false);
        expect(appearance.closed).toEqual(true);
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
        var material = Material.fromType('Color');
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
        expect(renderState.cull.face).toEqual(WebGLConstants.BACK);
    });

    it('isTranslucent', function() {
        var appearance = new Appearance({
            translucent : false
        });

        expect(appearance.isTranslucent()).toEqual(false);
        appearance.translucent = true;
        expect(appearance.isTranslucent()).toEqual(true);

        appearance.material = Material.fromType('Color');
        appearance.material.translucent = false;
        expect(appearance.isTranslucent()).toEqual(false);
        appearance.material.translucent = true;
        expect(appearance.isTranslucent()).toEqual(true);
    });

    it('getRenderState', function() {
        var appearance = new Appearance({
            translucent : false,
            closed : true,
            renderState : Appearance.getDefaultRenderState(false, true)
        });

        var rs = appearance.getRenderState();
        expect(rs.depthMask).toEqual(true);
        expect(rs.blending).not.toBeDefined();

        appearance.translucent = true;
        rs = appearance.getRenderState();
        expect(rs.depthMask).toEqual(false);
        expect(rs.blending).toBe(BlendingState.ALPHA_BLEND);
    });
});
