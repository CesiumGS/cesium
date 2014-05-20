/**
 * SyntaxHighlighter
 * http://alexgorbatchev.com/SyntaxHighlighter
 *
 * SyntaxHighlighter is donationware. If you are using it, please donate.
 * http://alexgorbatchev.com/SyntaxHighlighter/donate.html
 *
 * @version
 * 3.0.83 (July 02 2010)
 * 
 * @copyright
 * Copyright (C) 2004-2010 Alex Gorbatchev.
 *
 * @license
 * Dual licensed under the MIT and GPL licenses.
 */
(function()
{
	// CommonJS
	typeof(require) != 'undefined' ? SyntaxHighlighter = require('shCore').SyntaxHighlighter : null;
    
	function Brush()
	{
		var keywords =	'break case catch continue ' +
						'default delete do else false  ' +
						'for function if in instanceof ' +
						'new null return super switch ' +
						'this throw true try typeof var while with' +
						// GLSL keywords
						'attribute const uniform varying ' +
                        'layout centroid flat smooth ' +
                        'noperspective break continue do ' +
                        'for while switch case default if ' +
                        'else in out inout float int void ' +
                        'bool true false invariant discard ' +
                        'return mat2 mat3 mat4 mat2x2 mat2x3 ' +
                        'mat2x4 mat3x2 mat3x3 mat3x4 mat4x2 ' +
                        'mat4x3 mat4x4 vec2 vec3 vec4 ivec2 ' +
                        'ivec3 ivec4 bvec2 bvec3 bvec4 uint ' +
                        'uvec2 uvec3 uvec4 lowp mediump highp ' +
                        'precision sampler1D sampler2D sampler3D ' +
                        'samplerCube sampler1DShadow ' +
                        'sampler2DShadow samplerCubeShadow ' +
                        'sampler1DArray sampler2DArray ' +
                        'sampler1DArrayShadow sampler2DArrayShadow ' +
                        'isampler1D isampler2D isampler3D ' +
                        'isamplerCube isampler1DArray ' +
                        'isampler2DArray usampler1D usampler2D ' +
                        'usampler3D usamplerCube usampler1DArray ' +
                        'usampler2DArray sampler2DRect ' +
                        'sampler2DRectShadow isampler2DRect ' +
                        'usampler2DRect samplerBuffer ' +
                        'isamplerBuffer usamplerBuffer sampler2DMS ' +
                        'isampler2DMS usampler2DMS ' +
                        'sampler2DMSArray isampler2DMSArray ' +
                        'usampler2DMSArray struct ' +
                        'radians degrees sin cos tan asin acos atan ' +
                        'atan sinh cosh tanh asinh acosh atanh pow ' +
                        'exp log exp2 log2 sqrt inversesqrt abs sign ' +
                        'floor trunc round roundEven ceil fract mod modf ' +
                        'min max clamp mix step smoothstep isnan isinf ' +
                        'floatBitsToInt floatBitsToUint intBitsToFloat ' +
                        'uintBitsToFloat length distance dot cross ' +
                        'normalize faceforward reflect refract ' +
                        'matrixCompMult outerProduct transpose ' +
                        'determinant inverse lessThan lessThanEqual ' +
                        'greaterThan greaterThanEqual equal notEqual ' +
                        'any all not textureSize texture textureProj ' +
                        'textureLod textureOffset texelFetch ' +
                        'texelFetchOffset textureProjOffset ' +
                        'textureLodOffset textureProjLod ' +
                        'textureProjLodOffset textureGrad ' +
                        'textureGradOffset textureProjGrad ' +
                        'textureProjGradOffset texture1D texture1DProj ' +
                        'texture1DProjLod texture2D texture2DProj ' +
                        'texture2DLod texture2DProjLod texture3D ' +
                        'texture3DProj texture3DLod texture3DProjLod ' +
                        'textureCube textureCubeLod shadow1D shadow2D ' +
                        'shadow1DProj shadow2DProj shadow1DLod ' +
                        'shadow2DLod shadow1DProjLod shadow2DProjLod ' +
                        'dFdx dFdy fwidth noise1 noise2 noise3 noise4 ' +
                        'EmitVertex EndPrimitive' +
                        'gl_VertexID gl_InstanceID gl_Position ' +
                        'gl_PointSize gl_ClipDistance gl_PerVertex ' +
                        'gl_Layer gl_ClipVertex gl_FragCoord ' +
                        'gl_FrontFacing gl_ClipDistance gl_FragColor ' +
                        'gl_FragData gl_MaxDrawBuffers gl_FragDepth ' +
                        'gl_PointCoord gl_PrimitiveID ' +
                        'gl_MaxVertexAttribs gl_MaxVertexUniformComponents ' +
                        'gl_MaxVaryingFloats gl_MaxVaryingComponents ' +
                        'gl_MaxVertexOutputComponents ' +
                        'gl_MaxGeometryInputComponents ' +
                        'gl_MaxGeometryOutputComponents ' +
                        'gl_MaxFragmentInputComponents ' +
                        'gl_MaxVertexTextureImageUnits ' +
                        'gl_MaxCombinedTextureImageUnits ' +
                        'gl_MaxTextureImageUnits ' +
                        'gl_MaxFragmentUniformComponents ' +
                        'gl_MaxDrawBuffers gl_MaxClipDistances ' +
                        'gl_MaxGeometryTextureImageUnits ' +
                        'gl_MaxGeometryOutputVertices ' +
                        'gl_MaxGeometryOutputVertices ' +
                        'gl_MaxGeometryTotalOutputComponents ' +
                        'gl_MaxGeometryUniformComponents ' +
                        'gl_MaxGeometryVaryingComponents gl_DepthRange';
                        
		var links = document.links;
        var numLinks = links.length;
        var symbols = [];
        for (var i =0; i < numLinks; i++) {
            var currentLink = links[i].href;
            var start = currentLink.lastIndexOf("/");
            var end = currentLink.lastIndexOf(".html");
            var symbolName = currentLink.slice(start + 1.0, end);
            var periodIndex = symbolName.indexOf(".");
            if(periodIndex !== -1) {
                symbolName = symbolName.slice(periodIndex + 1.0);
            }
            if (start !== -1) {
                symbols.push(symbolName);
            }
        }
		
        var numSymbols = symbols.length;
        var symbolKeywords = "";
        for (i = 0; i < numSymbols; i++) {
            if(symbols[i] !== "") {
                symbolKeywords += symbols[i] + " ";
            }
        }
                
        var r = SyntaxHighlighter.regexLib;
        var agi_model = "agi_model";
        this.regexList = [
            { regex: r.multiLineDoubleQuotedString,                 css: 'string' },            // double quoted strings
            { regex: r.multiLineSingleQuotedString,                 css: 'string' },            // single quoted strings
            { regex: r.singleLineCComments,                         css: 'comments' },          // one line comments
            { regex: r.multiLineCComments,                          css: 'comments' },          // multiline comments
            { regex: /\s*#.*/gm,                                    css: 'preprocessor' },      // preprocessor tags like #region and #endregion
            { regex: new RegExp(this.getKeywords(keywords), 'gm'),  css: 'keyword' },           // keywords
            { regex: new RegExp(this.getKeywords(symbolKeywords), 'gm'),  css: 'symbol'}      // symbol
            ];
	
		this.forHtmlScript(r.scriptScriptTags);
	};

	Brush.prototype	= new SyntaxHighlighter.Highlighter();
	Brush.aliases	= ['js', 'jscript', 'javascript'];

	SyntaxHighlighter.brushes.JScript = Brush;

	// CommonJS
	typeof(exports) != 'undefined' ? exports.Brush = Brush : null;
})();
