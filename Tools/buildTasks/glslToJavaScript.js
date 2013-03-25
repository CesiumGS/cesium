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

forEachFile('glslfiles', function(relativePath, file) {
    "use strict";
    var glslFile = file;
    var jsFile = new File(file.getParent(), file.getName().replace('.glsl', '.js'));

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