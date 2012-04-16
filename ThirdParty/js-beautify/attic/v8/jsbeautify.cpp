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

#include <v8.h>
#include <string.h>
#include <stdlib.h>
#include "beautify.h"

#define BUF_SIZE 1024

using namespace v8;

Handle<String> readFile(const char* name)
{
    FILE *file = stdin;
    int len = 0;
    char *buf;
    Handle<String> result;

    if (name)
    {
        file = fopen(name, "rb");

        if (file == NULL)
        {
            return Handle<String>();
        }

        fseek(file, 0, SEEK_END);
        len = ftell(file);
        rewind(file);
        buf = new char[len + 1];
        buf[len] = '\0';
        fread(buf, 1, len, file);
        fclose(file);
        result = String::New(buf);
        delete[] buf;
    }
    else
    {
        char c;
        buf = (char*)malloc(BUF_SIZE + 1);
        int buf_size = BUF_SIZE + 1;

        while ((c = getchar()) != EOF)
        {
            buf[len++] = c;

            if (len == buf_size)
            {
                buf_size <<= 1;
                buf = (char*)realloc(buf, buf_size);
            }
        }

        buf[len] = '\0';
        result = String::New(buf);
        free(buf);
    }

    return result;
}

void writeFile(Handle<Value> result, const char* name)
{
    if (result.IsEmpty() || result->IsUndefined())
    {
        return;
    }

    FILE* file = stdout;

    if (name)
    {
        file = fopen(name, "wt");

        if (file == NULL)
        {
            return;
        }
    }

    String::Utf8Value str(result);
    fprintf(file, "%s\n", *str);

    if (name)
    {
        fclose(file);
    }
}

static void usage(char* progname)
{
    printf("Usage:  %s [options] source-file\n", progname);
    printf("[options]\n");
    printf(" --overwrite                       : Overwrite source-file (use with care!)\n");
    printf(" --indent-size                or -s: Indentation size. (default 4)\n");
    printf(" --indent-char                or -c: Character to indent with. (default space)\n");
    printf(" --disable-preserve-newlines  or -d: Do not preserve existing line breaks.\n");
    printf(" --indent-level               or -l: Initial indentation level, you probably won't need this ever. (default 0)\n");
    printf(" --space-after-anon-function  or -f: Space is added between \"function ()\", otherwise the common \"function()\" output is used.\n");
    printf(" --braces-on-own-line         or -b: ANSI / Allman brace style, each opening/closing brace gets its own line.\n");
    printf(" --keep-array-indentation     or -k: Keep array indentation.\n");
    printf(" --help                       or -h: Prints this help statement.\n");
}

int main(int argc, char* argv[])
{
    Handle<String> source;
    HandleScope handle_scope;
    Handle<ObjectTemplate> global = ObjectTemplate::New();
    Handle<ObjectTemplate> options = ObjectTemplate::New();
    bool overwrite = false;
    const char* output = 0;

    for (int argpos = 1; argpos < argc; ++argpos)
    {
        if (argv[argpos][0] != '-')
        {
            source = readFile(argv[argpos]);
            output = argv[argpos];
        }
        else if (strcmp(argv[argpos], "--stdin") == 0)
        {
            source = readFile(0);
        }
        else if (strcmp(argv[argpos], "--overwrite") == 0)
        {
            overwrite = true;
        }
        else if (strcmp(argv[argpos], "--indent-size") == 0 ||
                 strcmp(argv[argpos], "-s") == 0)
        {
            options->Set("indent_size", String::New(argv[argpos+1]));
        }
        else if (strcmp(argv[argpos], "--indent-char") == 0 ||
                 strcmp(argv[argpos], "-c") == 0)
        {
            options->Set("indent_char", String::New(argv[argpos+1]));
        }
        else if (strcmp(argv[argpos], "--disable-preserve-newlines") == 0 ||
                 strcmp(argv[argpos], "-d") == 0)
        {
            options->Set("preserve_newlines", Boolean::New(false));
        }
        else if (strcmp(argv[argpos], "--indent-level") == 0 ||
                 strcmp(argv[argpos], "-l") == 0)
        {
            options->Set("indent_level",  String::New(argv[argpos+1]));
        }
        else if (strcmp(argv[argpos], "--space-after-anon-function") == 0 ||
                 strcmp(argv[argpos], "-f") == 0)
        {
            options->Set("space_after_anon_function", Boolean::New(true));
        }
        else if (strcmp(argv[argpos], "--braces-on-own-line") == 0 ||
                 strcmp(argv[argpos], "-b") == 0)
        {
            options->Set("braces_on_own_line", Boolean::New(true));
        }
        else if (strcmp(argv[argpos], "--keep-array-indentation") == 0 ||
                 strcmp(argv[argpos], "-k") == 0)
        {
            options->Set("keep_array_indentation", Boolean::New(true));
        }
        else if (strcmp(argv[argpos], "--help") == 0 ||
                 strcmp(argv[argpos], "-h") == 0)
        {
            usage(argv[0]);
            return -1;
        }
    }

    if (source.IsEmpty())
    {
        usage(argv[0]);
        return -1;
    }

    global->Set("source", source);
    global->Set("options", options);
    Handle<Context> context = Context::New(NULL, global);
    Context::Scope context_scope(context);
    Handle<Script> beautifyScript = Script::Compile(String::New(beautify_code));
    beautifyScript->Run();
    Handle<Script> runnerScript = Script::Compile(String::New("js_beautify(source, options);"));
    Handle<Value> result = runnerScript->Run();
    writeFile(result, overwrite ? output : 0);
    return 0;
}

