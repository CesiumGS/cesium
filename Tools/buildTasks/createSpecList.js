/*global importClass,project,attributes,elements,java,Packages*/
/*jshint multistr:true*/
importClass(java.io.File); /*global File*/
importClass(java.io.FileReader); /*global FileReader*/
importClass(java.io.FileWriter); /*global FileWriter*/
importClass(Packages.org.apache.tools.ant.util.FileUtils); /*global FileUtils*/

var specs = [];

var specFilesets = elements.get('specs');
for ( var i = 0, len = specFilesets.size(); i < len; ++i) {
    var specFileset = specFilesets.get(i);
    var basedir = specFileset.getDir(project);
    var specFilenames = specFileset.getDirectoryScanner(project).getIncludedFiles();

    for ( var j = 0, len2 = specFilenames.length; j < len2; ++j) {
        var relativePath = specFilenames[j];
        var spec = relativePath.substring(0, relativePath.lastIndexOf('.')).replace('\\', '/');
        specs.push("'Specs/" + spec + "'");
    }
}

var output = attributes.get('output');
if (new File(output).exists()) {
    var reader = new FileReader(output);
    var oldContents = String(FileUtils.readFully(reader));
    reader.close();
}

var contents = 'var specs = [' + specs.join(',') + '];';

if (oldContents !== contents) {
    var writer = new FileWriter(output);
    writer.write(contents);
    writer.close();
}