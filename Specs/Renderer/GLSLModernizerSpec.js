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

    it ('creates single layout qualifier under single branch, single condition', function() {
        var noQualifiers =
            '#define OUTPUT_DECLARATION \n' +
            '#define EXAMPLE_BRANCH \n' +
            'void main() \n' +
            '{ \n' +
            '    #ifdef EXAMPLE_BRANCH \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '    #endif //EXAMPLE_BRANCH \n' +
            '} \n';
        var output = glslModernizeShaderText(noQualifiers, true);
        var expected = '#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif';
        expect(output).toContain(expected);
    });

    it ('creates multiple layout qualifiers under single branch, single condition', function() {
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
        var expected0 = '#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif';
        var expected1 = '#ifdef EXAMPLE_BRANCH \nlayout(location = 1) out vec4 czm_out1;\n#endif';
        expect(output).toContain(expected0);
        expect(output).toContain(expected1);
    });

    it ('creates multiple layout qualifiers under multiple branches, single condition (cancels)', function() {
        var noQualifiers =
            '#define OUTPUT_DECLARATION \n' +
            '#define EXAMPLE_BRANCH \n' +
            'void main() \n' +
            '{ \n' +
            '    #ifdef EXAMPLE_BRANCH \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '    gl_FragData[1] = vec4(1.0); \n' +
            '    #endif //EXAMPLE_BRANCH \n' +
            '    #ifndef EXAMPLE_BRANCH \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '    gl_FragData[1] = vec4(1.0); \n' +
            '    #endif //!EXAMPLE_BRANCH \n' +
            '} \n';
        var output = glslModernizeShaderText(noQualifiers, true);
        var notExpected = '#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif';
        expect(output).not.toContain(notExpected);
    });

    it ('creates single layout qualifier under multiple branches, multiple conditions (cancels)', function() {
        var noQualifiers =
            '#define OUTPUT_DECLARATION \n' +
            '#define EXAMPLE_BRANCH \n' +
            '#define EXAMPLE_BRANCH1 \n' +
            'void main() \n' +
            '{ \n' +
            '    #ifdef EXAMPLE_BRANCH \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '    #endif //EXAMPLE_BRANCH \n' +
            '    #ifdef EXAMPLE_BRANCH1 \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '    #endif //EXAMPLE_BRANCH1 \n' +
            '} \n';
        var output = glslModernizeShaderText(noQualifiers, true);
        var notExpected = '#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif';
        expect(output).not.toContain(notExpected);
    });

    it ('creates multiple layout qualifier under multiple branches, multiple conditions (cascades)', function() {
        var noQualifiers =
            '#define OUTPUT_DECLARATION \n' +
            '#define EXAMPLE_BRANCH \n' +
            '#define EXAMPLE_BRANCH1 \n' +
            'void main() \n' +
            '{ \n' +
            '    #ifdef EXAMPLE_BRANCH \n' +
            '    gl_FragData[0] = vec4(0.0); \n' +
            '    #ifdef EXAMPLE_BRANCH1 \n' +
            '    gl_FragData[1] = vec4(0.0); \n' +
            '    #endif //EXAMPLE_BRANCH1 \n' +
            '    #endif //EXAMPLE_BRANCH \n' +
            '} \n';
        var output = glslModernizeShaderText(noQualifiers, true);
        var expected0 = '#ifdef EXAMPLE_BRANCH \nlayout(location = 0) out vec4 czm_out0;\n#endif';
        var expected1 = ['#ifdef EXAMPLE_BRANCH \n#ifdef EXAMPLE_BRANCH1 \nlayout(location = 0) out vec4 czm_out0;\n#endif',
                         '#ifdef EXAMPLE_BRANCH1 \n#ifdef EXAMPLE_BRANCH0 \nlayout(location = 0) out vec4 czm_out0;\n#endif'];
        var containsExpected0 = ((output.indexOf(expected0[0]) !== -1) && (output.indexOf(expected0[1]) !== -1));
        expect(output).toContain(expected0);
        expect(containsExpected0).toBe(true);
    });
});
