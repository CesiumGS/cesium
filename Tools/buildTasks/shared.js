/*global importClass,project,attributes,elements,java,Packages*/
importClass(java.io.File); /*global File*/
importClass(java.io.FileReader); /*global FileReader*/
importClass(java.io.FileWriter); /*global FileWriter*/
importClass(Packages.org.apache.tools.ant.util.FileUtils); /*global FileUtils*/

function forEachFile(filesetName, func) {
    "use strict";

    var filesets = elements.get(filesetName);
    for ( var i = 0, filesetsLen = filesets.size(); i < filesetsLen; ++i) {
        var fileset = filesets.get(i);
        var basedir = fileset.getDir(project);
        var filenames = fileset.getDirectoryScanner(project).getIncludedFiles();

        for ( var j = 0, filenamesLen = filenames.length; j < filenamesLen; ++j) {
            var relativePath = filenames[j];
            var file = new File(basedir, relativePath);

            func(relativePath, file);
        }
    }
}

function readFileContents(file) {
    "use strict";

    var reader = new FileReader(file);
    var contents = String(FileUtils.readFully(reader));
    reader.close();

    return contents;
}

function writeFileContents(filename, contents, writeIfUnchanged) {
    "use strict";

    var previousContents;
    var file = new File(filename);
    if (!writeIfUnchanged) {
        if (file.exists()) {
            previousContents = readFileContents(file);
        }
    }

    if (previousContents !== String(contents)) {
        var writer = new FileWriter(file);
        writer.write(contents);
        writer.close();
    }
}