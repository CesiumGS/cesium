/*global define*/
define([], function() {
    'use strict';

    /**
     * A function to port GLSL shaders from GLSL ES 1.00 to GLSL ES 2.00
     *
     * This function is nowhere near comprehensive or complete. It just
     * handles some common cases.
     *
     * @private
     */
    function glslModernize(source, isFragmentShader, first) {
        var mainFunctionRegex = /void\s+main\(\)/;
        var splitSource = source.split('\n');
        var mainFunctionLine;
        for (var number = 0; number < splitSource.length; number++) {
            var line = splitSource[number];
            if (mainFunctionRegex.exec(line)) {
                mainFunctionLine = number;
            }
        };

        function replaceInSource(regex, replacement) {
            for (var number = 0; number < splitSource.length; number++) {
                splitSource[number] = splitSource[number].replace(regex, replacement);
            }
        }

        function findInSource(regex) {
            for (var number = 0; number < splitSource.length; number++) {
                if (splitSource[number].search(regex) != -1) {
                    return true;
                }
            }
            return false;
        }

        function compileSource() {
            var wholeSource = "";
            for (var number = 0; number < splitSource.length; number++) {
                wholeSource += splitSource[number] + "\n";
            }
            return wholeSource;
        }

        function removeExtension(name) {
            var regex = "#extension\\s+GL_" + name + "\\s+:\\s+[a-zA-Z0-9]+\\s*$";
            replaceInSource(new RegExp(regex, "g"), "");
        }

        for (var i = 0; i < 10; i++) {
            var fragDataString = "gl_FragData\\[" + i + "\\]";
            var newOutput = 'czm_out' + i;
            var regex = new RegExp(fragDataString, "g");
            if (source.search(fragDataString) != -1) {
                replaceInSource(regex, newOutput);
                splitSource.splice(mainFunctionLine, 0,
                    "layout(location = " + i + ") out vec4 " +
                    newOutput + ";");
            }
        }

        if (findInSource(/gl_FragColor/)) {
            replaceInSource(/gl_FragColor/, "czm_fragColor");
            splitSource.splice(mainFunctionLine, 0, "layout(location = 0) out vec4 czm_fragColor");
        }

        if (first === true) {
            var versionThree = "#version 300 es";
            var foundVersion = false;
            for (var number = 0; number < splitSource.length; number++) {
                if (splitSource[number].search(/#version/) != -1) {
                    splitSource[number] = versionThree;
                    foundVersion = true;
                }
            }

            if (!foundVersion) {
                splitSource.splice(0, 0, versionThree);
            }
        }

        removeExtension("EXT_draw_buffers");
        removeExtension("EXT_frag_depth");

        replaceInSource(/texture2D/, "texture");

        if (isFragmentShader) {
            replaceInSource(/varying/, "in");
        } else {
            replaceInSource(/attribute/, "in");
            replaceInSource(/varying/, "out");
        }

        return compileSource();
    }

    return glslModernize;
});
