/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var moduleIds = [];
var parameters = [];
var assignments = [];

var nonIdentifierRegexp = /[^0-9a-zA-Z_$]/g;

forEachFile('sourcefiles', function(relativePath, file) {
    "use strict";

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
});

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

writeFileContents(attributes.get('output'), contents);
