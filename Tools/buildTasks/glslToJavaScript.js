/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

importClass(java.io.StringReader); /*global StringReader*/
importClass(java.util.HashSet); /*global HashSet*/
importClass(Packages.org.apache.tools.ant.filters.StripJavaComments); /*global StripJavaComments*/

var minify = /^true$/.test(attributes.get('minify'));

var minifyStateFilePath = attributes.get('minifystatefile');
writeFileContents(minifyStateFilePath, minify);

var minifyStateFileLastModified = new File(minifyStateFilePath).lastModified();

// collect all currently existing JS files into a set, later we will remove the ones
// we still are using from the set, then delete any files remaining in the set.
var leftOverJsFiles = new HashSet();

forEachFile('existingjsfiles', function(relativePath, file) {
    "use strict";
    leftOverJsFiles.add(file.getAbsolutePath());
});

var builtinFunctions = [];
var builtinConstants = [];
var builtinStructs = [];

forEachFile('glslfiles', function(relativePath, file) {
    "use strict";
    var glslFile = file;
    var jsFile = new File(file.getParent(), file.getName().replace('.glsl', '.js'));

    // identify built in functions, structs, and constants
    if(glslFile.getPath().indexOf('Builtin' + File.separator + 'Functions') != -1) {
        builtinFunctions.push(file.getName().replace('.glsl', ''));
    }
    else if(glslFile.getPath().indexOf('Builtin' + File.separator + 'Constants') != -1) {
        builtinConstants.push(file.getName().replace('.glsl', ''));
    }
    else if(glslFile.getPath().indexOf('Builtin' + File.separator + 'Structs') != -1) {
        builtinStructs.push(file.getName().replace('.glsl', ''));
    }

    leftOverJsFiles.remove(jsFile.getAbsolutePath());

    if (jsFile.exists() && jsFile.lastModified() > glslFile.lastModified() && jsFile.lastModified() > minifyStateFileLastModified) {
        return;
    }

    var contents = readFileContents(glslFile);
    contents = contents.replace(/\r\n/gm, '\n');

    var copyrightComments = '';
    var extractedCopyrightComments = contents.match(/\/\*\*(?:[^*\/]|\*(?!\/)|\n)*?@license(?:.|\n)*?\*\//gm);
    if (extractedCopyrightComments) {
        copyrightComments = extractedCopyrightComments.join('\n') + '\n';
    }

    if (minify) {
        contents = String(FileUtils.readFully(new StripJavaComments(new StringReader(contents))));
        contents = contents.replace(/\s+$/gm, '').replace(/^\s+/gm, '').replace(/\n+/gm, '\n');
        contents += '\n';
    }

    contents = contents.split('"').join('\\"').replace(/\n/gm, '\\n\\\n');
    contents = copyrightComments + '\
//This file is automatically rebuilt by the Cesium build process.\n\
/*global define*/\n\
define(function() {\n\
"use strict";\n\
return "' + contents + '";\n\
});';

    writeFileContents(jsFile.getAbsolutePath(), contents, true);
});

// delete any left over JS files from old shaders
for ( var it = leftOverJsFiles.iterator(); it.hasNext();) {
    new File(it.next())['delete']();
}


var GenerateBuiltinFile = function(builtinType, builtins) {
    var builtinFile = new File(project.getProperty('shadersDirectory') + '/Builtin', builtinType + '.js');

    var amdPath = '';
    var amdClassName = '';
    var builtinLookup = '';

    for (var i = 0; i < builtins.length; i++) {
        var builtin = builtins[i];

        if(i !== 0) {
            amdPath = amdPath + ',\n';
            amdClassName = amdClassName + ',\n';
            builtinLookup = builtinLookup + ',\n';
        }

        amdPath = amdPath + '        \'./' + builtinType + '/' + builtin + '\'';
        amdClassName = amdClassName + '        ' + builtin;
        builtinLookup = builtinLookup + '        ' + builtin + ' : ' + builtin;
    }

    contents = '\
    //This file is automatically rebuilt by the Cesium build process.\n\
    /*global define*/\n\
    define([\n' +
    amdPath +
    '\n    ], function(\n' +
    amdClassName +
    ') {\n\
        "use strict";\n\
        return {\n' + builtinLookup + '};\n\
    });';

    writeFileContents(builtinFile.getAbsolutePath(), contents, true);
};

// generate the JS file for Built-in GLSL Functions, Structs, and Constants
GenerateBuiltinFile('Functions', builtinFunctions);
GenerateBuiltinFile('Structs', builtinStructs);
GenerateBuiltinFile('Constants', builtinConstants);
