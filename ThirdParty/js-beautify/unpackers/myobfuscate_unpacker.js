//
// simple unpacker/deobfuscator for scripts messed up with myobfuscate.com
// You really don't want to obfuscate your scripts there: they're tracking
// your unpackings, your script gets turned into something like this,
// as of 2011-04-25:
/*

    var _escape = 'your_script_escaped';
    var _111 = document.createElement('script');
    _111.src = 'http://api.www.myobfuscate.com/?getsrc=ok' +
        '&ref=' + encodeURIComponent(document.referrer) +
        '&url=' + encodeURIComponent(document.URL);
    var 000 = document.getElementsByTagName('head')[0];
    000.appendChild(_111);
    document.write(unescape(_escape));

*/
//
// written by Einar Lielmanis <einar@jsbeautifier.org>
//
// usage:
//
// if (MyObfuscate.detect(some_string)) {
//     var unpacked = MyObfuscate.unpack(some_string);
// }
//
//

var MyObfuscate = {
    detect: function (str) {
        return /^var _?[0O1lI]{3}\=('|\[).*\)\)\);/.test(str);
    },

    unpack: function (str) {
        if (MyObfuscate.detect(str)) {
            var modified_source = str.replace(';eval(', ';unpacked_source = (');
            var unpacked_source = '';
            eval(modified_source);
            if (unpacked_source) {
                if (MyObfuscate.starts_with(unpacked_source, 'var _escape')) {
                    // fetch the urlencoded stuff from the script,
                    var matches = /'([^']*)'/.exec(unpacked_source);
                    var unescaped = unescape(matches[1]);
                    if (MyObfuscate.starts_with(unescaped, '<script>')) {
                        unescaped = unescaped.substr(8, unescaped.length - 8);
                    }
                    if (MyObfuscate.ends_with(unescaped, '</script>')) {
                        unescaped = unescaped.substr(0, unescaped.length - 9);
                    }
                    unpacked_source = unescaped;
                }
            }
            return unpacked_source ? "// Unpacker warning: be careful when using myobfuscate.com for your projects:\n" +
                    "// scripts obfuscated by the free online version call back home.\n" +
                    "\n//\n" + unpacked_source : str;
        }
        return str;
    },

    starts_with: function (str, what) {
        return str.substr(0, what.length) === what;
    },

    ends_with: function (str, what) {
        return str.substr(str.length - what.length, what.length) === what;
    },

    run_tests: function (sanity_test) {
        var t = sanity_test || new SanityTest();

        return t;
    }


}
