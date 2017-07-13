define([
        '../Core/defined',
        '../Core/DeveloperError',
    ], function(
        defined,
        DeveloperError) {
    'use strict';

    /**
     * A function to port GLSL shaders from GLSL ES 1.00 to GLSL ES 3.00
     *
     * This function is nowhere near comprehensive or complete. It just
     * handles some common cases.
     *
     * Note that this function requires the presence of the
     * "#define OUTPUT_DECLARATION" line that is appended
     * by ShaderSource.
     *
     * @private
     */
    function glslModernizeShaderText(source, isFragmentShader) {
        var outputDeclarationRegex = /#define OUTPUT_DECLARATION/;
        var splitSource = source.split('\n');

        if (source.search(/#version 300 es/g) !== -1) {
            return source;
        }
        
        var outputDeclarationLine = -1;
        var number;
        for (number = 0; number < splitSource.length; ++number) {
            var line = splitSource[number];
            if (outputDeclarationRegex.exec(line)) {
                outputDeclarationLine = number;
                break;
            }
        };

        if (outputDeclarationLine === -1) {
            throw new DeveloperError('Could not find a #define OUTPUT_DECLARATION nor a main function!');
        }

        // Note that this fails if your string looks like
        // searchString[singleCharacter]searchString
        function replaceInSource(str, replacement, strIsRegex) {
            var regex = str;
            if ((strIsRegex === undefined) || strIsRegex === false) {
                var regexStr = "(^|[^\\w])(" + str + ")($|[^\\w])";
                regex = new RegExp(regexStr, 'g');
            }
            
            for (var number = 0; number < splitSource.length; ++number) {
                var line = splitSource[number];
                if (strIsRegex) {
                    splitSource[number] = line.replace(regex, replacement);
                } else {
                    splitSource[number] = line.replace(regex, "$1" + replacement + "$3");
                }
            }
        }
        
        function findInSource(str) {
            var regexStr = "(^|[^\\w])(" + str + ")($|[^\\w])";
            var regex = new RegExp(regexStr, 'g');
            for (var number = 0; number < splitSource.length; ++number) {
                var line = splitSource[number];
                if (regex.test(line)) {
                    return true;
                }
            }
            return false;
        }

        function compileSource() {
            var wholeSource = "";
            for (var number = 0; number < splitSource.length; ++number) {
                wholeSource += splitSource[number] + "\n";
            }
            return wholeSource;
        }
  
        function setAdd(variable, set1) {
            if (set1.indexOf(variable) === -1)
                set1.push(variable);
        }
  
        function setUnion(set1, set2) {
            for (var a = 0; a < set2.length; ++a) {
                setAdd(set2[a], set1);
            }
        }

        function getVariablePreprocessorBranch(variablesThatWeCareAbout) {
            var variableMap = {};
            var negativeMap = {};
            
            for (var a = 0; a < variablesThatWeCareAbout.length; ++a) {
                var variableThatWeCareAbout = variablesThatWeCareAbout[a];
                variableMap[variableThatWeCareAbout] = [null];
            }
            
            var stack = [];
            for (var i = 0; i < splitSource.length; ++i) {
                var line = splitSource[i];
                var hasIF = /(#ifdef|#if)/g.test(line);
                var hasELSE = /#else/g.test(line);
                var hasENDIF = /#endif/g.test(line);
                
                if (hasIF) {
                    stack.push(line);
                } else if (hasELSE) {
                    var top = stack[stack.length - 1];
                    var op = top.replace("ifdef", "ifndef");
                    if (/if/g.test(op)) {
                        op = op.replace(/(#if\s+)(\S*)([^]*)/, "$1!($2)$3");
                    }
                    stack.pop();
                    stack.push(op);
                    
                    negativeMap[top] = op;
                    negativeMap[op] = top;
                } else if (hasENDIF) {
                    stack.pop();
                } else if (!/layout/g.test(line)) {
                    for (a = 0; a < variablesThatWeCareAbout.length; ++a) {
                        var care = variablesThatWeCareAbout[a];
                        if (line.indexOf(care) !== -1) {
                            if (variableMap[care].length === 1 && variableMap[care][0] === null) {
                                variableMap[care] = stack.slice();
                            } else {
                                variableMap[care] = variableMap[care].filter(function(x) { return stack.indexOf(x) >= 0; });
                            }
                        }
                    }
                }
            }
            
            // This code is probably no longer needed... it was used to handle
            // removing negative conditions
            for (var care in variableMap) {
                if (variableMap.hasOwnProperty(care)) {
                    var entry = variableMap[care];
                    var toDelete = [];
                    for (var b = 0; b < entry.length; ++b) {
                        var item = entry[b];
                        if (entry.indexOf(negativeMap[item]) !== -1) {
                            toDelete.push(item);
                            toDelete.push(negativeMap[item]);
                        }
                    }
                    
                    for (var c = 0; c < toDelete.length; ++c) {
                        var ind = entry.indexOf(toDelete[c]);
                        if (ind !== -1) {
                            entry.splice(ind, 1);
                        }
                    }
                }
            }
          
            for (var care in variableMap) {
                if (variableMap.hasOwnProperty(care)) {
                    if (variableMap.length === 1 && variableMap[0] === null) {
                        variableMap.splice(0, 1);
                    }
                }
            }
          
            return variableMap;
        }

        function removeExtension(name) {
            var regex = "#extension\\s+GL_" + name + "\\s+:\\s+[a-zA-Z0-9]+\\s*$";
            replaceInSource(new RegExp(regex, "g"), "", true);
        }

        var variableSet = [];

        for (var i = 0; i < 10; i++) {
            var fragDataString = "gl_FragData\\[" + i + "\\]";
            var newOutput = 'czm_out' + i;
            var regex = new RegExp(fragDataString, "g");
            if (regex.test(source)) {
                setAdd(newOutput, variableSet);
                replaceInSource(fragDataString, newOutput);
                splitSource.splice(outputDeclarationLine, 0, "layout(location = " + i + ") out vec4 " + newOutput + ";");
                outputDeclarationLine += 1;
            }
        }

        var czmFragColor = "czm_fragColor";
        if (findInSource("gl_FragColor")) {
            setAdd(czmFragColor, variableSet);
            replaceInSource("gl_FragColor", czmFragColor);
            splitSource.splice(outputDeclarationLine, 0, "layout(location = 0) out vec4 czm_fragColor;");
            outputDeclarationLine += 1;
        }
        
        var variableMap = getVariablePreprocessorBranch(variableSet);
        var lineAdds = {};
        for (var c = 0; c < splitSource.length; c++) {
            var l = splitSource[c];
            for (var care in variableMap) {
                if (variableMap.hasOwnProperty(care)) {
                    var matchVar = new RegExp("(layout)[^]+(out)[^]+(" + care + ")[^]+", "g");
                    if (matchVar.exec(l) !== null) {
                        lineAdds[l] = care;
                    }
                }
            }
        }
  
        for (var layoutDeclaration in lineAdds) {
            if (lineAdds.hasOwnProperty(layoutDeclaration)) {
                var variableName = lineAdds[layoutDeclaration];
                var lineNumber = splitSource.indexOf(layoutDeclaration);
                var entry = variableMap[variableName];
                var depth = entry.length;
                var d;
                for (d = 0; d < depth; d++) {
                    splitSource.splice(lineNumber, 0, entry[d]);
                }
                lineNumber += depth + 1;
                for (d = depth - 1; d >= 0; d--) {
                    splitSource.splice(lineNumber, 0, "#endif //" + entry[d]);
                }
            }
        }

        var versionThree = "#version 300 es";
        var foundVersion = false;
        for (number = 0; number < splitSource.length; number++) {
            if (/#version/.test(splitSource[number])) {
                splitSource[number] = versionThree;
                foundVersion = true;
            }
        }

        if (!foundVersion) {
            splitSource.splice(0, 0, versionThree);
        }

        removeExtension("EXT_draw_buffers");
        removeExtension("EXT_frag_depth");

        replaceInSource("texture2D", "texture");
        replaceInSource("texture3D", "texture");
        replaceInSource("textureCube", "texture");
        replaceInSource("gl_FragDepthEXT", "gl_FragDepth");

        if (isFragmentShader) {
            replaceInSource("varying", "in");
        } else {
            replaceInSource("attribute", "in");
            replaceInSource("varying", "out");
        }

        return compileSource();
    }

    return glslModernizeShaderText;
});
