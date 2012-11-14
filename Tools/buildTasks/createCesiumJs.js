/*global importClass,project,attributes,elements,java,Packages*/
/*jshint multistr:true*/
importClass(java.io.File); /*global File*/
importClass(java.io.FileReader); /*global FileReader*/
importClass(java.io.FileWriter); /*global FileWriter*/
importClass(Packages.org.apache.tools.ant.util.FileUtils); /*global FileUtils*/

var moduleIds = [];
var parameters = [];
var assignments = [];

var nonIdentifierRegexp = /[^0-9a-zA-Z_$]/g;

var sourceFilesets = elements.get('sourcefiles');
for ( var i = 0, len = sourceFilesets.size(); i < len; ++i) {
    var sourceFileset = sourceFilesets.get(i);
    var basedir = sourceFileset.getDir(project);
    var sourceFilenames = sourceFileset.getDirectoryScanner(project).getIncludedFiles();

    for ( var j = 0; j < sourceFilenames.length; ++j) {
        var relativePath = sourceFilenames[j];
        var file = new File(basedir, relativePath);

        var moduleId = relativePath.replace('\\', '/');
        moduleId = moduleId.substring(0, moduleId.lastIndexOf('.'));

        var baseName = file.getName();
        var assignmentName = baseName.substring(0, baseName.lastIndexOf('.'));
        assignmentName = String(assignmentName).replace(nonIdentifierRegexp, '_');
        if (/Shaders\//.test(moduleId)) {
            assignmentName = '_shaders.' + assignmentName;
        }

        var parameterName = String(moduleId).replace(nonIdentifierRegexp, '_');

        moduleIds.push("'" + moduleId + "'");
        parameters.push(parameterName);
        assignments.push('Cesium.' + assignmentName + ' = ' + parameterName + ';');
    }
}

var output = attributes.get('output');
if (new File(output).exists()) {
    var reader = new FileReader(output);
    var oldContents = String(FileUtils.readFully(reader));
    reader.close();
}

var contents = '\
/*global define*/\n\
define([' + moduleIds.join(', ') + '], function(' + parameters.join(', ') + ') {\n\
  "use strict";\n\
  var Cesium = {\n\
    _shaders : {}\n\
  };\n\
  ' + assignments.join('\n  ') + '\n\
  return Cesium;\n\
});';

if (oldContents !== contents) {
    var writer = new FileWriter(output);
    writer.write(contents);
    writer.close();
}