/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var demos = [];
var output = attributes.get('output');
forEachFile('demos', function(relativePath, file) {
    "use strict";

    var demo = relativePath.substring(0, relativePath.lastIndexOf('.')).replace('\\', '/');
    var demoFile = readFileContents(file);
    var descriptionIndex = demoFile.indexOf('<meta name="description" ');
    var i = descriptionIndex;
    while(demoFile.charAt(i) != '>'){
        i++;
    }
    var descriptionEnd = i;
    var description = demoFile.substring(descriptionIndex+33, descriptionEnd);
    var desc = description.substring(description.indexOf('\"')+1, description.lastIndexOf('\"'));
    var labelIndex = demoFile.indexOf('<meta name="cesium-sandcastle-labels" ');
    i = labelIndex;
    while(demoFile.charAt(i) != '>'){
        i++;
    }
    var labelEnd = i;
    var label = demoFile.substring(labelIndex+46, labelEnd);
    var labelText = label.substring(label.indexOf('\"')+1, label.lastIndexOf('\"'));
    java.lang.System.out.println(labelText);
    var demoObject = {
        name : String(demo),
        date : file.lastModified(),
        description: desc,
        labels: labelText
    };

    demos.push(JSON.stringify(demoObject, null, 2));
});
var contents = '\
// This file is automatically rebuilt by the Cesium build process.\n\
var gallery_demos = [' + demos.join(', ') + '];';

writeFileContents(output, contents);
