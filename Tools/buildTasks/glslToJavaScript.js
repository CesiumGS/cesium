/*global importClass,project,attributes,elements,java,Packages*/
/*jshint multistr:true*/
importClass(java.io.File); /*global File*/
importClass(java.io.FileReader); /*global FileReader*/
importClass(java.io.FileWriter); /*global FileWriter*/
importClass(java.io.StringReader); /*global StringReader*/
importClass(java.util.HashSet); /*global HashSet*/
importClass(Packages.org.apache.tools.ant.util.FileUtils); /*global FileUtils*/
importClass(Packages.org.apache.tools.ant.filters.StripJavaComments); /*global StripJavaComments*/

var stripComments = String('true').equals(attributes.get('stripcomments'));

// collect all currently existing JS files into a set, later we will remove the ones
// we still are using from the set, then delete any files remaining in the set.
var leftOverJsFiles = new HashSet();
var existingJsFilesets = elements.get('existingjsfiles');
for ( var i = 0, len = existingJsFilesets.size(); i < len; ++i) {
    var existingJsFileset = existingJsFilesets.get(i);

    var basedir = existingJsFileset.getDir(project);
    var existingJsFilenames = existingJsFileset.getDirectoryScanner(project).getIncludedFiles();

    for ( var j = 0; j < existingJsFilenames.length; ++j) {
        leftOverJsFiles.add(new File(basedir, existingJsFilenames[j]).getAbsolutePath());
    }
}

var glslFilesets = elements.get('glslfiles');
for ( var i = 0, len = glslFilesets.size(); i < len; ++i) {
    var glslFileset = glslFilesets.get(i);

    var basedir = glslFileset.getDir(project);
    var glslFilenames = glslFileset.getDirectoryScanner(project).getIncludedFiles();

    for ( var j = 0; j < glslFilenames.length; ++j) {
        var glslFilename = glslFilenames[j];

        var glslFile = new File(basedir, glslFilename);
        var jsFile = new File(basedir, glslFilename.replace('.glsl', '.js'));
        leftOverJsFiles.remove(jsFile.getAbsolutePath());

        var reader = new FileReader(glslFile);
        var contents = String(FileUtils.readFully(reader));
        reader.close();

        contents = contents.replace(/\r\n/gm, '\n');

        var copyrightComments = '';
        var extractedCopyrightComments = contents.match(/\/\*\!(?:.|\n)*?\*\//gm);
        if (extractedCopyrightComments) {
            copyrightComments = extractedCopyrightComments.join('\n') + '\n';
        }

        if (stripComments) {
            contents = String(FileUtils.readFully(new StripJavaComments(new StringReader(contents))));
            contents = contents.replace(/\s+$/gm, '').replace(/^\s+/gm, '').replace(/\n+/gm, '\n');
            contents += '\n';
        }

        contents = contents.split('"').join('\\"').replace(/\n/gm, '\\n\\\n');
        contents = copyrightComments + '\
// This file is automatically rebuilt by the Cesium build process.\n\
/*global define*/\n\
define(function() {\n\
    "use strict";\n\
    return "' + contents + '";\n\
});';

        if (new File(jsFile).exists()) {
            var reader = new FileReader(jsFile);
            var oldContents = String(FileUtils.readFully(reader));
            reader.close();
        }

        if (oldContents !== contents) {
            var writer = new FileWriter(jsFile);
            writer.write(contents);
            writer.close();
        }
    }
}

// delete any left over JS files from old shaders
for ( var it = leftOverJsFiles.iterator(); it.hasNext();) {
    new File(it.next())['delete']();
}