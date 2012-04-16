/*
    Copyright (c) 2010 Ariya Hidayat <ariya.hidayat@gmail.com>
    Copyright (c) 2009 Einar Lielmanis
    Copyright (c) 2010 Nicolas Ferrero <ferrero.nicolas@gmail.com>
    
    Permission is hereby granted, free of charge, to any person
    obtaining a copy of this software and associated documentation
    files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use,
    copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
    OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
    OTHER DEALINGS IN THE SOFTWARE.
 */

#include <QtScript>

#include <iostream>

static QString readFile(const QString &fileName)
{
    QFile file;
    file.setFileName(fileName);
    if (!file.open(QFile::ReadOnly)) {
        return QString();
    }
    QString content = file.readAll();
    file.close();
    return content;
}

static void usage(char *progname)
{
    std::cerr << "Usage: " << progname << " [options] source-file\n";
    std::cerr << "[options]\n";
    std::cerr << " --indent-size                or -s: Indentation size. (default 4)\n";
    std::cerr << " --indent-char                or -c: Character to indent with. (default space)\n";
    std::cerr << " --disable-preserve-newlines  or -d: Do not preserve existing line breaks.\n";
    std::cerr << " --indent-level               or -l: Initial indentation level, you probably won't need this ever. (default 0)\n";
    std::cerr << " --space-after-anon-function  or -f: Space is added between \"function ()\", otherwise the common \"function()\" output is used.\n";
    std::cerr << " --braces-on-own-line         or -b: ANSI / Allman brace style, each opening/closing brace gets its own line.\n";
    std::cerr << " --keep-array-indentation     or -k: Keep array indentation.\n";
    std::cerr << " --help                       or -h: Prints this help statement.\n";
}

int main(int argc, char **argv)
{
    QCoreApplication app(argc, argv);
    QScriptEngine engine;
    QScriptValue options = engine.newObject();
    QString source;
    
    for (int argpos = 1; argpos < app.argc(); ++argpos) {
        if (app.argv()[argpos][0] != '-') {
            source = readFile(QString::fromLocal8Bit(app.argv()[argpos]));
            
        } else if (strcmp(app.argv()[argpos], "--indent-size") == 0 ||
                   strcmp(app.argv()[argpos], "-s") == 0) {
            options.setProperty("indent_size", app.argv()[argpos+1]);
              
        } else if (strcmp(app.argv()[argpos], "--indent-char") == 0 ||
                   strcmp(app.argv()[argpos], "-c") == 0) {
            options.setProperty("indent_char", app.argv()[argpos+1]);
              
        } else if (strcmp(app.argv()[argpos], "--disable-preserve-newlines") == 0 ||
                   strcmp(app.argv()[argpos], "-d") == 0) {
            options.setProperty("preserve_newlines", false);
        
        } else if (strcmp(app.argv()[argpos], "--indent-level") == 0 ||
                   strcmp(app.argv()[argpos], "-l") == 0) {
            options.setProperty("indent_level", app.argv()[argpos+1]);
        
        } else if (strcmp(app.argv()[argpos], "--space-after-anon-function") == 0 ||
                   strcmp(app.argv()[argpos], "-f") == 0) {
            options.setProperty("space_after_anon_function", true); 
              
        } else if (strcmp(app.argv()[argpos], "--braces-on-own-line") == 0 ||
                   strcmp(app.argv()[argpos], "-b") == 0) {
            options.setProperty("braces_on_own_line", true);      
              
        } else if (strcmp(app.argv()[argpos], "--keep-array-indentation") == 0 ||
                   strcmp(app.argv()[argpos], "-k") == 0) {
            options.setProperty("keep_array_indentation", true);   
              
        } else if (strcmp(app.argv()[argpos], "--help") == 0 ||
                   strcmp(app.argv()[argpos], "-h") == 0) {
            usage(app.argv()[0]);
            return -1;
        }
    }
    
    if (source.isEmpty()) {
        usage(app.argv()[0]);
        return -1;
    }
    
    QString script = readFile(":/beautify.js");
    
    if (!script.isEmpty()) {
        engine.evaluate(script);
        engine.globalObject().setProperty("source", QScriptValue(source));
        engine.globalObject().setProperty("options", options);
        QScriptValue result = engine.evaluate("js_beautify(source, options);");
        std::cout << qPrintable(result.toString()) << std::endl;
    }

    return 0;
}

