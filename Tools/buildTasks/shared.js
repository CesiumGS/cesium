/*global importClass,project,attributes,elements,java,Packages*/
importClass(java.io.File); /*global File*/
importClass(java.io.FileReader); /*global FileReader*/
importClass(java.io.FileWriter); /*global FileWriter*/
importClass(Packages.org.apache.tools.ant.util.FileUtils); /*global FileUtils*/

function forEachFile(elementName, func) {
    "use strict";

    var resourceCollections = elements.get(elementName);
    for (var i = 0, len = resourceCollections.size(); i < len; ++i) {
        var resourceCollection = resourceCollections.get(i);
        var iterator = resourceCollection.iterator();
        while (iterator.hasNext()) {
            var resource = iterator.next();
            func(resource.getName(), resource.getFile());
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

function loadJsHintOptionsFile(path) {
    "use strict";
    /*jshint evil:true*/
    return eval('(' + readFileContents(path) + ')');
}