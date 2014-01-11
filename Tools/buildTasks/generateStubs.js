/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var contents = '\
/*global define,Cesium*/\n\
(function() {\n\
"use strict";\n\
/*jshint sub:true*/\n';
var modulePathMappings = [];

forEachFile('sourcefiles', function(relativePath, file) {
    "use strict";

    var moduleId = relativePath.replace('\\', '/');
    moduleId = moduleId.substring(0, moduleId.lastIndexOf('.'));

    var baseName = file.getName();
    var propertyName = baseName.substring(0, baseName.lastIndexOf('.'));
    propertyName = "['" + String(propertyName) + "']";

    contents += '\
define(\'' + moduleId + '\', function() {\n\
    return Cesium' + propertyName + ';\n\
});\n\n';

    modulePathMappings.push('        \'' + moduleId + '\' : \'../Stubs/Cesium\'');
});

contents += '})();';

var paths = '\
/*global define*/\n\
define(function() {\n\
    "use strict";\n\
    return {\n' + modulePathMappings.join(',\n') + '\n\
    };\n\
});';

writeFileContents(attributes.get('stuboutput'), contents);
writeFileContents(attributes.get('pathsoutput'), paths);
