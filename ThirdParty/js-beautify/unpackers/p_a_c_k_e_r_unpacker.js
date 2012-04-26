//
// Unpacker for Dean Edward's p.a.c.k.e.r, a part of javascript beautifier
// written by Einar Lielmanis <einar@jsbeautifier.org>
//
// Coincidentally, it can defeat a couple of other eval-based compressors.
//
// usage:
//
// if (P_A_C_K_E_R.detect(some_string)) {
//     var unpacked = P_A_C_K_E_R.unpack(some_string);
// }
// 
//

var P_A_C_K_E_R = {
    detect: function (str) {
        return P_A_C_K_E_R._starts_with(str.toLowerCase().replace(/ +/g, ''), 'eval(function(') ||
               P_A_C_K_E_R._starts_with(str.toLowerCase().replace(/ +/g, ''), 'eval((function(') ;
    },

    unpack: function (str) {
        var unpacked_source = '';
        if (P_A_C_K_E_R.detect(str)) {
            try {
                eval('unpacked_source = ' + str.substring(4) + ';')
                if (typeof unpacked_source == 'string' && unpacked_source) {
                    str = unpacked_source;
                }
            } catch (error) {
                // well, it failed. we'll just return the original, instead of crashing on user.
            }
        }
        return str;
    },

    _starts_with: function (str, what) {
        return str.substr(0, what.length) === what;
    },

    run_tests: function (sanity_test) {
        var t = sanity_test || new SanityTest();
        t.test_function(P_A_C_K_E_R.detect, "P_A_C_K_E_R.detect");
        t.expect('', false);
        t.expect('var a = b', false);
        t.expect('eval(function(p,a,c,k,e,r', true);
        t.expect('eval ( function(p, a, c, k, e, r', true);
        t.test_function(P_A_C_K_E_R.unpack, 'P_A_C_K_E_R.unpack');
        t.expect("eval(function(p,a,c,k,e,r){e=String;if(!''.replace(/^/,String)){while(c--)r[c]=k[c]||c;k=[function(e){return r[e]}];e=function(){return'\\\\w+'};c=1};while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c]);return p}('0 2=1',3,3,'var||a'.split('|'),0,{}))",
            'var a=1');

        var starts_with_a = function(what) { return P_A_C_K_E_R._starts_with(what, 'a'); }
        t.test_function(starts_with_a, "P_A_C_K_E_R._starts_with(?, a)");
        t.expect('abc', true);
        t.expect('bcd', false);
        t.expect('a', true);
        t.expect('', false);
        return t;
    }


}
