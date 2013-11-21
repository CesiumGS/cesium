/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var contents = '';
var map = '/*global define*/\n' +
          'define(function() {\n' +
          '    return {\n' +
          '        \'*\' : {\n';
var insertComma = false;

forEachFile('sourcefiles', function(relativePath, file) {
    "use strict";

    var moduleName = relativePath.replace('\\', '/');
    moduleName = moduleName.substring(0, moduleName.lastIndexOf('.'));
    var name = moduleName.substring(moduleName.lastIndexOf('/') + 1);

    contents += 'define(\'' + moduleName + '\', [], function() {\n' +
               '    return Cesium.' + name + ';\n' +
               '});\n\n';
    map += (insertComma ? ',\n' : '') + '            \'' + moduleName + '\' : \'Stubs/Cesium\'';

    if (!insertComma) {
        insertComma = true;
    }
});

map += '\n        }\n' +
       '    }\n' +
       '});';

writeFileContents(attributes.get('stuboutput'), contents);
writeFileContents(attributes.get('mapoutput'), map);
