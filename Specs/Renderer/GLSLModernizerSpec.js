defineSuite([
        'Renderer/GLSLModernizer'
    ], function(
        glslModernizeShaderText) {
    'use strict';

    it ('adds version string', function() {
        var simple =
            '#define OUTPUT_DECLARATION \n' +
            'void main() \n' +
            '{ \n' +
            '} \n';
        var output = glslModernizeShaderText(simple, true);
        var expected = '#version 300 es';
        expect(output.split('\n')[0]).toEqual(expected);
    });

    it ('removes extensions', function() {
        var extensions =
            '#define OUTPUT_DECLARATION \n' +
            '#extension GL_EXT_draw_buffers : enable \n' +
            'void main() \n' +
            '{ \n' +
            '} \n';
        var output = glslModernizeShaderText(extensions, true);
        var notExpected = '#extension GL_EXT_draw_buffers : enable \n';
        expect(output).not.toContain(notExpected);
    });

    it ('throws exception if no output declaration', function() {
         var noOutputDeclaration =
            'void main() \n' +
            '{ \n' +
            '} \n';
        var runFunc = function() {
            glslModernizeShaderText(noOutputDeclaration, true);
        };
        expect(runFunc).toThrow();
    });

    it ('creates layout qualifier for gl_FragColor', function() {
        var noQualifiers =
            '#define OUTPUT_DECLARATION \n' +
            'void main() \n' +
            '{ \n' +
            '    gl_FragColor = vec4(0.0); \n' +
            '} \n';
        var output = glslModernizeShaderText(noQualifiers, true);
        var expected = 'layout(location = 0) out vec4 czm_fragColor;';
        expect(output).toContain(expected);
    });

    it ('creates layout qualifier for gl_FragData', function() {
        var noQualifiers =
            '#define OUTPUT_DECLARATION \n' +
            'void main() \n' +
            '{ \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '} \n';
        var output = glslModernizeShaderText(noQualifiers, true);
        var expected = 'layout(location = 0) out vec4 czm_out0;';
        expect(output).toContain(expected);
    });

    it ('creates layout qualifier for MRT', function() {
        var noQualifiers =
            '#define OUTPUT_DECLARATION \n' +
            '#extension GL_EXT_draw_buffers : enable \n' +
            'void main() \n' +
            '{ \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '    gl_FragData[1] = vec4(1.0); \n' +
            '} \n';
        var output = glslModernizeShaderText(noQualifiers, true);
        var expected0 = 'layout(location = 0) out vec4 czm_out0;';
        var expected1 = 'layout(location = 1) out vec4 czm_out1;';
        expect(output).toContain(expected0);
        expect(output).toContain(expected1);
    });

    it ('creates layout qualifier under single condition', function() {
        var noQualifiers =
            '#define OUTPUT_DECLARATION \n' +
            '#define EXAMPLE_BRANCH \n' +
            'void main() \n' +
            '{ \n' +
            '    #ifdef EXAMPLE_BRANCH \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '    gl_FragData[1] = vec4(1.0); \n' +
            '    #endif //EXAMPLE_BRANCH \n' +
            '} \n';
        var output = glslModernizeShaderText(noQualifiers, true);
        var expected = '#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif';
        expect(output).toContain(expected);
    });
});
