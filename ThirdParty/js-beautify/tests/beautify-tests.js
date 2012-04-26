/*global js_beautify */


opts = {
    indent_size: 4,
    indent_char: ' ',
    preserve_newlines: true,
    jslint_happy: false,
    keep_array_indentation: false,
    brace_style: 'collapse'
}

function test_beautifier(input)
{
    return js_beautify(input, opts);
}

var sanitytest;

// test the input on beautifier with the current flag settings
// does not check the indentation / surroundings as bt() does
function test_fragment(input, expected)
{
    expected = expected || input;
    sanitytest.expect(input, expected);
}



// test the input on beautifier with the current flag settings
// test both the input as well as { input } wrapping
function bt(input, expectation)
{
    var wrapped_input, wrapped_expectation;

    expectation = expectation || input;
    test_fragment(input, expectation);

    // test also the returned indentation
    // e.g if input = "asdf();"
    // then test that this remains properly formatted as well:
    // {
    //     asdf();
    //     indent;
    // }

    if (opts.indent_size === 4 && input) {
        wrapped_input = '{\n' + input + '\nfoo=bar;}';
        wrapped_expectation = '{\n' + expectation.replace(/^(.+)$/mg, '    $1') + '\n    foo = bar;\n}';
        test_fragment(wrapped_input, wrapped_expectation);
    }

}

// test the input on beautifier with the current flag settings,
// but dont't
function bt_braces(input, expectation)
{
    var braces_ex = opts.brace_style;
    opts.brace_style = 'expand';
    bt(input, expectation);
    opts.brace_style = braces_ex;
}

function run_beautifier_tests(test_obj)
{
    sanitytest = test_obj || new SanityTest();
    sanitytest.test_function(test_beautifier, 'js_beautify');

    opts.indent_size       = 4;
    opts.indent_char       = ' ';
    opts.preserve_newlines = true;
    opts.jslint_happy      = false;
    opts.keep_array_indentation = false;
    opts.brace_style       = "collapse";


    bt('');
    bt('return .5');
    test_fragment('    return .5');
    bt('a        =          1', 'a = 1');
    bt('a=1', 'a = 1');
    bt("a();\n\nb();", "a();\n\nb();");
    bt('var a = 1 var b = 2', "var a = 1\nvar b = 2");
    bt('var a=1, b=c[d], e=6;', 'var a = 1,\n    b = c[d],\n    e = 6;');
    bt('a = " 12345 "');
    bt("a = ' 12345 '");
    bt('if (a == 1) b = 2;', "if (a == 1) b = 2;");
    bt('if(1){2}else{3}', "if (1) {\n    2\n} else {\n    3\n}");
    bt('if (foo) bar();\nelse\ncar();', 'if (foo) bar();\nelse car();');
    bt('if(1||2);', 'if (1 || 2);');
    bt('(a==1)||(b==2)', '(a == 1) || (b == 2)');
    bt('var a = 1 if (2) 3;', "var a = 1\nif (2) 3;");
    bt('a = a + 1');
    bt('a = a == 1');
    bt('/12345[^678]*9+/.match(a)');
    bt('a /= 5');
    bt('a = 0.5 * 3');
    bt('a *= 10.55');
    bt('a < .5');
    bt('a <= .5');
    bt('a<.5', 'a < .5');
    bt('a<=.5', 'a <= .5');
    bt('a = 0xff;');
    bt('a=0xff+4', 'a = 0xff + 4');
    bt('a = [1, 2, 3, 4]');
    bt('F*(g/=f)*g+b', 'F * (g /= f) * g + b');
    bt('a.b({c:d})', "a.b({\n    c: d\n})");
    bt('a.b\n(\n{\nc:\nd\n}\n)', "a.b({\n    c: d\n})");
    bt('a=!b', 'a = !b');
    bt('a?b:c', 'a ? b : c');
    bt('a?1:2', 'a ? 1 : 2');
    bt('a?(b):c', 'a ? (b) : c');
    bt('x={a:1,b:w=="foo"?x:y,c:z}', 'x = {\n    a: 1,\n    b: w == "foo" ? x : y,\n    c: z\n}');
    bt('x=a?b?c?d:e:f:g;', 'x = a ? b ? c ? d : e : f : g;');
    bt('x=a?b?c?d:{e1:1,e2:2}:f:g;', 'x = a ? b ? c ? d : {\n    e1: 1,\n    e2: 2\n} : f : g;');
    bt('function void(void) {}');
    bt('if(!a)foo();', 'if (!a) foo();');
    bt('a=~a', 'a = ~a');
    bt('a;/*comment*/b;', "a; /*comment*/\nb;");
    bt('a;/* comment */b;', "a; /* comment */\nb;");
    test_fragment('a;/*\ncomment\n*/b;', "a;\n/*\ncomment\n*/\nb;"); // simple comments don't get touched at all
    bt('a;/**\n* javadoc\n*/b;', "a;\n/**\n * javadoc\n */\nb;");
    bt('a;/*\n* javadoc\n*/b;', "a;\n/*\n * javadoc\n */\nb;"); // comment blocks detected and reindented even w/o javadoc starter
    bt('if(a)break;', "if (a) break;");
    bt('if(a){break}', "if (a) {\n    break\n}");
    bt('if((a))foo();', 'if ((a)) foo();');
    bt('for(var i=0;;)', 'for (var i = 0;;)');
    bt('a++;', 'a++;');
    bt('for(;;i++)', 'for (;; i++)');
    bt('for(;;++i)', 'for (;; ++i)');
    bt('return(1)', 'return (1)');
    bt('try{a();}catch(b){c();}finally{d();}', "try {\n    a();\n} catch (b) {\n    c();\n} finally {\n    d();\n}");
    bt('(xx)()'); // magic function call
    bt('a[1]()'); // another magic function call
    bt('if(a){b();}else if(c) foo();', "if (a) {\n    b();\n} else if (c) foo();");
    bt('switch(x) {case 0: case 1: a(); break; default: break}', "switch (x) {\ncase 0:\ncase 1:\n    a();\n    break;\ndefault:\n    break\n}");
    bt('switch(x){case -1:break;case !y:break;}', 'switch (x) {\ncase -1:\n    break;\ncase !y:\n    break;\n}');
    bt('a !== b');
    bt('if (a) b(); else c();', "if (a) b();\nelse c();");
    bt("// comment\n(function something() {})"); // typical greasemonkey start
    bt("{\n\n    x();\n\n}"); // was: duplicating newlines
    bt('if (a in b) foo();');
    //  bt('var a, b');
    bt('{a:1, b:2}', "{\n    a: 1,\n    b: 2\n}");
    bt('a={1:[-1],2:[+1]}', 'a = {\n    1: [-1],\n    2: [+1]\n}');
    bt('var l = {\'a\':\'1\', \'b\':\'2\'}', "var l = {\n    'a': '1',\n    'b': '2'\n}");
    bt('if (template.user[n] in bk) foo();');
    bt('{{}/z/}', "{\n    {}\n    /z/\n}");
    bt('return 45', "return 45");
    bt('If[1]', "If[1]");
    bt('Then[1]', "Then[1]");
    bt('a = 1e10', "a = 1e10");
    bt('a = 1.3e10', "a = 1.3e10");
    bt('a = 1.3e-10', "a = 1.3e-10");
    bt('a = -1.3e-10', "a = -1.3e-10");
    bt('a = 1e-10', "a = 1e-10");
    bt('a = e - 10', "a = e - 10");
    bt('a = 11-10', "a = 11 - 10");
    bt("a = 1;// comment\n", "a = 1; // comment");
    bt("a = 1; // comment\n", "a = 1; // comment");
    bt("a = 1;\n // comment\n", "a = 1;\n// comment");

    bt('o = [{a:b},{c:d}]', 'o = [{\n    a: b\n}, {\n    c: d\n}]');

    bt("if (a) {\n    do();\n}"); // was: extra space appended
    bt("if\n(a)\nb();", "if (a) b();"); // test for proper newline removal

    bt("if (a) {\n// comment\n}else{\n// comment\n}", "if (a) {\n    // comment\n} else {\n    // comment\n}"); // if/else statement with empty body
    bt("if (a) {\n// comment\n// comment\n}", "if (a) {\n    // comment\n    // comment\n}"); // multiple comments indentation
    bt("if (a) b() else c();", "if (a) b()\nelse c();");
    bt("if (a) b() else if c() d();", "if (a) b()\nelse if c() d();");

    bt("{}");
    bt("{\n\n}");
    bt("do { a(); } while ( 1 );", "do {\n    a();\n} while (1);");
    bt("do {} while (1);");
    bt("do {\n} while (1);", "do {} while (1);");
    bt("do {\n\n} while (1);");
    bt("var a = x(a, b, c)");
    bt("delete x if (a) b();", "delete x\nif (a) b();");
    bt("delete x[x] if (a) b();", "delete x[x]\nif (a) b();");
    bt("for(var a=1,b=2)", "for (var a = 1, b = 2)");
    bt("for(var a=1,b=2,c=3)", "for (var a = 1, b = 2, c = 3)");
    bt("for(var a=1,b=2,c=3;d<3;d++)", "for (var a = 1, b = 2, c = 3; d < 3; d++)");
    bt("function x(){(a||b).c()}", "function x() {\n    (a || b).c()\n}");
    bt("function x(){return - 1}", "function x() {\n    return -1\n}");
    bt("function x(){return ! a}", "function x() {\n    return !a\n}");

    // a common snippet in jQuery plugins
    bt("settings = $.extend({},defaults,settings);", "settings = $.extend({}, defaults, settings);");

    bt('{xxx;}()', '{\n    xxx;\n}()');

    bt("a = 'a'\nb = 'b'");
    bt("a = /reg/exp");
    bt("a = /reg/");
    bt('/abc/.test()');
    bt('/abc/i.test()');
    bt("{/abc/i.test()}", "{\n    /abc/i.test()\n}");
    bt('var x=(a)/a;', 'var x = (a) / a;');

    bt('x != -1', 'x != -1');

    bt('for (; s-->0;)', 'for (; s-- > 0;)');
    bt('for (; s++>0;)', 'for (; s++ > 0;)');
    bt('a = s++>s--;', 'a = s++ > s--;');
    bt('a = s++>--s;', 'a = s++ > --s;');

    bt('{x=#1=[]}', '{\n    x = #1=[]\n}');
    bt('{a:#1={}}', '{\n    a: #1={}\n}');
    bt('{a:#1#}', '{\n    a: #1#\n}');

    test_fragment('{a:1},{a:2}', '{\n    a: 1\n}, {\n    a: 2\n}');
    test_fragment('var ary=[{a:1}, {a:2}];', 'var ary = [{\n    a: 1\n}, {\n    a: 2\n}];');

    test_fragment('{a:#1', '{\n    a: #1'); // incomplete
    test_fragment('{a:#', '{\n    a: #'); // incomplete

    test_fragment('}}}', '}\n}\n}'); // incomplete

    test_fragment('<!--\nvoid();\n// -->', '<!--\nvoid();\n// -->');

    test_fragment('a=/regexp', 'a = /regexp'); // incomplete regexp

    bt('{a:#1=[],b:#1#,c:#999999#}', '{\n    a: #1=[],\n    b: #1#,\n    c: #999999#\n}');

    bt("a = 1e+2");
    bt("a = 1e-2");
    bt("do{x()}while(a>1)", "do {\n    x()\n} while (a > 1)");

    bt("x(); /reg/exp.match(something)", "x();\n/reg/exp.match(something)");

    test_fragment("something();(", "something();\n(");
    test_fragment("#!she/bangs, she bangs\nf=1", "#!she/bangs, she bangs\n\nf = 1");
    test_fragment("#!she/bangs, she bangs\n\nf=1", "#!she/bangs, she bangs\n\nf = 1");
    test_fragment("#!she/bangs, she bangs\n\n/* comment */", "#!she/bangs, she bangs\n\n/* comment */");
    test_fragment("#!she/bangs, she bangs\n\n\n/* comment */", "#!she/bangs, she bangs\n\n\n/* comment */");
    test_fragment("#", "#");
    test_fragment("#!", "#!");

    bt("function namespace::something()");

    test_fragment("<!--\nsomething();\n-->", "<!--\nsomething();\n-->");
    test_fragment("<!--\nif(i<0){bla();}\n-->", "<!--\nif (i < 0) {\n    bla();\n}\n-->");

    test_fragment("<!--\nsomething();\n-->\n<!--\nsomething();\n-->", "<!--\nsomething();\n-->\n<!--\nsomething();\n-->");
    test_fragment("<!--\nif(i<0){bla();}\n-->\n<!--\nif(i<0){bla();}\n-->", "<!--\nif (i < 0) {\n    bla();\n}\n-->\n<!--\nif (i < 0) {\n    bla();\n}\n-->");

    bt('{foo();--bar;}', '{\n    foo();\n    --bar;\n}');
    bt('{foo();++bar;}', '{\n    foo();\n    ++bar;\n}');
    bt('{--bar;}', '{\n    --bar;\n}');
    bt('{++bar;}', '{\n    ++bar;\n}');

    // regexps
    bt('a(/abc\\/\\/def/);b()', "a(/abc\\/\\/def/);\nb()");
    bt('a(/a[b\\[\\]c]d/);b()', "a(/a[b\\[\\]c]d/);\nb()");
    test_fragment('a(/a[b\\[', "a(/a[b\\["); // incomplete char class
    // allow unescaped / in char classes
    bt('a(/[a/b]/);b()', "a(/[a/b]/);\nb()");

    bt('a=[[1,2],[4,5],[7,8]]', "a = [\n    [1, 2],\n    [4, 5],\n    [7, 8]\n]");
    bt('a=[a[1],b[4],c[d[7]]]', "a = [a[1], b[4], c[d[7]]]");
    bt('[1,2,[3,4,[5,6],7],8]', "[1, 2, [3, 4, [5, 6], 7], 8]");

    bt('[[["1","2"],["3","4"]],[["5","6","7"],["8","9","0"]],[["1","2","3"],["4","5","6","7"],["8","9","0"]]]',
        '[\n    [\n        ["1", "2"],\n        ["3", "4"]\n    ],\n    [\n        ["5", "6", "7"],\n        ["8", "9", "0"]\n    ],\n    [\n        ["1", "2", "3"],\n        ["4", "5", "6", "7"],\n        ["8", "9", "0"]\n    ]\n]');

    bt('{[x()[0]];indent;}', '{\n    [x()[0]];\n    indent;\n}');

    bt('return ++i', 'return ++i');
    bt('return !!x', 'return !!x');
    bt('return !x', 'return !x');
    bt('return [1,2]', 'return [1, 2]');
    bt('return;', 'return;');
    bt('return\nfunc', 'return\nfunc');
    bt('catch(e)', 'catch (e)');

    bt('var a=1,b={foo:2,bar:3},c=4;', 'var a = 1,\n    b = {\n        foo: 2,\n        bar: 3\n    },\n    c = 4;');

    // inline comment
    bt('function x(/*int*/ start, /*string*/ foo)', 'function x( /*int*/ start, /*string*/ foo)');

    // javadoc comment
    bt('/**\n* foo\n*/', '/**\n * foo\n */');
    bt('{\n/**\n* foo\n*/\n}', '{\n    /**\n     * foo\n     */\n}');

    bt('var a,b,c=1,d,e,f=2;', 'var a, b, c = 1,\n    d, e, f = 2;');
    bt('var a,b,c=[],d,e,f=2;', 'var a, b, c = [],\n    d, e, f = 2;');

    bt('do/regexp/;\nwhile(1);', 'do /regexp/;\nwhile (1);'); // hmmm

    bt('var a = a,\na;\nb = {\nb\n}', 'var a = a,\n    a;\nb = {\n    b\n}');

    bt('var a = a,\n    /* c */\n    b;');
    bt('var a = a,\n    // c\n    b;');

    bt('foo.("bar");'); // weird element referencing


    bt('if (a) a()\nelse b()\nnewline()');
    bt('if (a) a()\nnewline()');
    bt('a=typeof(x)', 'a = typeof(x)');
    bt('var a = function() {\n        return null;\n    },\n    b = false;');

    bt('var a = function() {\n        func1()\n    }');
    bt('var a = function() {\n        func1()\n    }\nvar b = function() {\n        func2()\n    }');



    opts.jslint_happy = true; 

    bt('a=typeof(x)', 'a = typeof (x)');
    bt('x();\n\nfunction(){}', 'x();\n\nfunction () {}');
    bt('function () {\n    var a, b, c, d, e = [],\n        f;\n}');
    test_fragment("// comment 1\n(function()", "// comment 1\n(function ()"); // typical greasemonkey start
    bt("var a1, b1, c1, d1 = 0, c = function() {}, d = '';", "var a1, b1, c1, d1 = 0,\n    c = function () {},\n    d = '';");
    bt('var o1=$.extend(a);function(){alert(x);}', 'var o1 = $.extend(a);\n\nfunction () {\n    alert(x);\n}');

    opts.jslint_happy = false;

    test_fragment("// comment 2\n(function()", "// comment 2\n(function()"); // typical greasemonkey start
    bt("var a2, b2, c2, d2 = 0, c = function() {}, d = '';", "var a2, b2, c2, d2 = 0,\n    c = function() {},\n    d = '';");
    bt('var o2=$.extend(a);function(){alert(x);}', 'var o2 = $.extend(a);\n\nfunction() {\n    alert(x);\n}');

    bt('{"x":[{"a":1,"b":3},7,8,8,8,8,{"b":99},{"a":11}]}', '{\n    "x": [{\n        "a": 1,\n        "b": 3\n    },\n    7, 8, 8, 8, 8,\n    {\n        "b": 99\n    }, {\n        "a": 11\n    }]\n}');

    bt('{"1":{"1a":"1b"},"2"}', '{\n    "1": {\n        "1a": "1b"\n    },\n    "2"\n}');
    bt('{a:{a:b},c}', '{\n    a: {\n        a: b\n    },\n    c\n}');

    bt('{[y[a]];keep_indent;}', '{\n    [y[a]];\n    keep_indent;\n}');

    bt('if (x) {y} else { if (x) {y}}', 'if (x) {\n    y\n} else {\n    if (x) {\n        y\n    }\n}');

    bt('if (foo) one()\ntwo()\nthree()');
    bt('if (1 + foo() && bar(baz()) / 2) one()\ntwo()\nthree()');
    bt('if (1 + foo() && bar(baz()) / 2) one();\ntwo();\nthree();');

    opts.indent_size = 1;
    opts.indent_char = ' ';
    bt('{ one_char() }', "{\n one_char()\n}");

    bt('var a,b=1,c=2', 'var a, b = 1,\n c = 2');

    opts.indent_size = 4;
    opts.indent_char = ' ';
    bt('{ one_char() }', "{\n    one_char()\n}");

    opts.indent_size = 1;
    opts.indent_char = "\t";
    bt('{ one_char() }', "{\n\tone_char()\n}");
    bt('x = a ? b : c; x;', 'x = a ? b : c;\nx;');

    opts.indent_size = 4;
    opts.indent_char = ' ';

    opts.preserve_newlines = false;
    bt('var\na=dont_preserve_newlines;', 'var a = dont_preserve_newlines;');

    // make sure the blank line between function definitions stays
    // even when preserve_newlines = false
    bt('function foo() {\n    return 1;\n}\n\nfunction foo() {\n    return 1;\n}');
    bt('function foo() {\n    return 1;\n}\nfunction foo() {\n    return 1;\n}',
       'function foo() {\n    return 1;\n}\n\nfunction foo() {\n    return 1;\n}'
      );
    bt('function foo() {\n    return 1;\n}\n\n\nfunction foo() {\n    return 1;\n}',
       'function foo() {\n    return 1;\n}\n\nfunction foo() {\n    return 1;\n}'
      );


    opts.preserve_newlines = true;
    bt('var\na=do_preserve_newlines;', 'var\na = do_preserve_newlines;');

    opts.keep_array_indentation = true;

    // do not like keep_array_indentation at all
    test_fragment('var a = [\n// comment:\n{\n foo:bar\n}\n];', 'var a = [\n    // comment:\n    {\n    foo: bar\n}\n];')

    bt('var x = [{}\n]', 'var x = [{}\n]');
    bt('var x = [{foo:bar}\n]', 'var x = [{\n    foo: bar\n}\n]');
    bt("a = ['something',\n'completely',\n'different'];\nif (x);", "a = ['something',\n    'completely',\n    'different'];\nif (x);");
    bt("a = ['a','b','c']", "a = ['a', 'b', 'c']");
    bt("a = ['a',   'b','c']", "a = ['a', 'b', 'c']");

    bt("x = [{'a':0}]", "x = [{\n    'a': 0\n}]");

    bt('{a([[a1]], {b;});}', '{\n    a([[a1]], {\n        b;\n    });\n}');

    bt('a = //comment\n/regex/;');

    test_fragment('/*\n * X\n */');
    test_fragment('/*\r\n * X\r\n */', '/*\n * X\n */');

    bt('if (a)\n{\nb;\n}\nelse\n{\nc;\n}', 'if (a) {\n    b;\n} else {\n    c;\n}');


    opts.brace_style = 'expand';

    bt('var a=1,b={foo:2,bar:3},c=4;', 'var a = 1,\n    b = {\n        foo: 2,\n        bar: 3\n    },\n    c = 4;');
    bt('if (a)\n{\nb;\n}\nelse\n{\nc;\n}', 'if (a)\n{\n    b;\n}\nelse\n{\n    c;\n}');
    test_fragment('if (foo) {', 'if (foo)\n{');
    test_fragment('foo {', 'foo\n{');
    test_fragment('return {', 'return {'); // return needs the brace. maybe something else as well: feel free to report.
    // test_fragment('return\n{', 'return\n{'); // can't support this?, but that's an improbable and extreme case anyway.
    test_fragment('return;\n{', 'return;\n{');

    bt('if (a)\n{\nb;\n}\nelse\n{\nc;\n}', 'if (a)\n{\n    b;\n}\nelse\n{\n    c;\n}');
    bt('var foo = {}');
    bt('if (a)\n{\nb;\n}\nelse\n{\nc;\n}', 'if (a)\n{\n    b;\n}\nelse\n{\n    c;\n}');
    test_fragment('if (foo) {', 'if (foo)\n{');
    test_fragment('foo {', 'foo\n{');
    test_fragment('return {', 'return {'); // return needs the brace. maybe something else as well: feel free to report.
    // test_fragment('return\n{', 'return\n{'); // can't support this?, but that's an improbable and extreme case anyway.
    test_fragment('return;\n{', 'return;\n{');


    opts.brace_style = 'collapse';

    bt('if (a)\n{\nb;\n}\nelse\n{\nc;\n}', 'if (a) {\n    b;\n} else {\n    c;\n}');
    test_fragment('if (foo) {', 'if (foo) {');
    test_fragment('foo {', 'foo {');
    test_fragment('return {', 'return {'); // return needs the brace. maybe something else as well: feel free to report.
    // test_fragment('return\n{', 'return\n{'); // can't support this?, but that's an improbable and extreme case anyway.
    test_fragment('return;\n{', 'return; {');

    bt('if (foo) bar();\nelse break');
    bt('function x() {\n    foo();\n}zzz', 'function x() {\n    foo();\n}\nzzz');
    bt('a: do {} while (); xxx', 'a: do {} while ();\nxxx');

    bt('var a = new function();');
    test_fragment('new function');
    bt('var a =\nfoo', 'var a = foo');

    opts.brace_style = "end-expand";

    bt('if(1){2}else{3}', "if (1) {\n    2\n}\nelse {\n    3\n}");
    bt('try{a();}catch(b){c();}finally{d();}', "try {\n    a();\n}\ncatch (b) {\n    c();\n}\nfinally {\n    d();\n}");
    bt('if(a){b();}else if(c) foo();', "if (a) {\n    b();\n}\nelse if (c) foo();");
    bt("if (a) {\n// comment\n}else{\n// comment\n}", "if (a) {\n    // comment\n}\nelse {\n    // comment\n}"); // if/else statement with empty body
    bt('if (x) {y} else { if (x) {y}}', 'if (x) {\n    y\n}\nelse {\n    if (x) {\n        y\n    }\n}');
    bt('if (a)\n{\nb;\n}\nelse\n{\nc;\n}', 'if (a) {\n    b;\n}\nelse {\n    c;\n}');

    test_fragment('    /*\n* xx\n*/\n// xx\nif (foo) {\n    bar();\n}', '    /*\n     * xx\n     */\n    // xx\n    if (foo) {\n        bar();\n    }')


    return sanitytest;
}
