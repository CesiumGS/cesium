defineSuite([
        'Renderer/GLSLModernizer'
    ], function(
        glslModernizeShaderText) {
    'use strict';

    it ('adds version string', function() {
        var simple = '#define OUTPUT_DECLARATION \n' +
            'void main() \n' +
            '{ \n' +
            '} \n';
        var output = glslModernizeShaderText(simple, true);
        var expected = '#version 300 es\n' +
            '#define OUTPUT_DECLARATION \n' +
            'void main() \n' +
            '{ \n' +
            '} \n' +
            '\n';
        expect(output).toEqual(expected);
    });
});
