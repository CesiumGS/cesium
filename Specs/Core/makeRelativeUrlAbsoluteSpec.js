/*global defineSuite*/
defineSuite(['Core/makeRelativeUrlAbsolute'
            ], function(
              makeRelativeUrlAbsolute) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    /******************************************************************************
    uri_tests.js - tests for URI functions

      Author (original): Mike J. Brown <mike at skew.org>
      Version: 2011-12-14

      History:
      2007-01-04 - Initial version.
      2011-12-14 - Improved support for non-String-type result objects; + 5 tests.

      License: Unrestricted use with any modifications permitted, so long as:
      1. Modifications are attributed to their author(s);
      2. The original author remains credited;
      3. Additions derived from other code libraries are credited to their sources
      and used under the terms of their licenses.

    *******************************************************************************/

    /*
    Tests of URI reference resolution to absolute form

    Based on code from 4Suite XML:
    http://cvs.4suite.org/viewcvs/4Suite/test/Lib/test_uri.py?view=markup
    */

    var BASE_URI0 = "http://a/b/c/d;p?q";
    var BASE_URI1 = "http://a/b/c/d;p?q=1/2";
    var BASE_URI2 = "http://a/b/c/d;p=1/2?q";
    var BASE_URI3 = "fred:///s//a/b/c";
    var BASE_URI4 = "http:///s//a/b/c";

    // [ref, base, expected]
    var absolutizeTestCases = [
        // Cases posted to the uri@w3.org list by Graham Klyne
        // http://lists.w3.org/Archives/Public/uri/2004Feb/0108.html
        // (1) base is invalid because it contains #frag, but can still be processed according to spec
        ["", "http://example.com/path?query#frag", "http://example.com/path?query"],
        // (2)
        // http://lists.w3.org/Archives/Public/uri/2004Feb/0114.html
        ["../c",  "foo:a/b", "foo:c"], // Graham Klyne & Adam Costello expect foo:c, spec calls for foo:/c
        ["foo:.", "foo:a",   "foo:"],
        ["/foo/../../../bar", "zz:abc", "zz:/bar"],
        ["/foo/../bar",       "zz:abc", "zz:/bar"],
        ["foo/../../../bar",  "zz:abc", "zz:bar"],
        ["foo/../bar",        "zz:abc", "zz:bar"],
        ["zz:.",              "zz:abc", "zz:"],
        ["/."      , BASE_URI0, "http://a/"],
        ["/.foo"   , BASE_URI0, "http://a/.foo"],
        [".foo"    , BASE_URI0, "http://a/b/c/.foo"],

        // http://gbiv.com/protocols/uri/test/rel_examples1.html
        // examples from RFC 2396
        ["g:h"     , BASE_URI0, "g:h"],
        ["g"       , BASE_URI0, "http://a/b/c/g"],
        ["./g"     , BASE_URI0, "http://a/b/c/g"],
        ["g/"      , BASE_URI0, "http://a/b/c/g/"],
        ["/g"      , BASE_URI0, "http://a/g"],
        ["//g"     , BASE_URI0, "http://g"],
        // changed with RFC 2396bis
        //["?y"      , BASE_URI0, "http://a/b/c/d;p?y"],
        ["?y"      , BASE_URI0, "http://a/b/c/d;p?y"],
        ["g?y"     , BASE_URI0, "http://a/b/c/g?y"],
        // changed with RFC 2396bis
        //["#s"      , BASE_URI0, CURRENT_DOC_URI + "#s"],
        ["#s"      , BASE_URI0, "http://a/b/c/d;p?q#s"],
        ["g#s"     , BASE_URI0, "http://a/b/c/g#s"],
        ["g?y#s"   , BASE_URI0, "http://a/b/c/g?y#s"],
        [";x"      , BASE_URI0, "http://a/b/c/;x"],
        ["g;x"     , BASE_URI0, "http://a/b/c/g;x"],
        ["g;x?y#s" , BASE_URI0, "http://a/b/c/g;x?y#s"],
        // changed with RFC 2396bis
        //(""       , BASE_URI0, CURRENT_DOC_URI),
        [""     , BASE_URI0, "http://a/b/c/d;p?q"],
        ["."       , BASE_URI0, "http://a/b/c/"],
        ["./"      , BASE_URI0, "http://a/b/c/"],
        [".."      , BASE_URI0, "http://a/b/"],
        ["../"     , BASE_URI0, "http://a/b/"],
        ["../g"    , BASE_URI0, "http://a/b/g"],
        ["../.."   , BASE_URI0, "http://a/"],
        ["../../"  , BASE_URI0, "http://a/"],
        ["../../g" , BASE_URI0, "http://a/g"],
        ["../../../g", BASE_URI0, ["http://a/../g", "http://a/g"]],
        ["../../../../g", BASE_URI0, ["http://a/../../g", "http://a/g"]],
        // changed with RFC 2396bis
        //["/./g", BASE_URI0, "http://a/./g"],
        ["/./g", BASE_URI0, "http://a/g"],
        // changed with RFC 2396bis
        //["/../g", BASE_URI0, "http://a/../g"],
        ["/../g", BASE_URI0, "http://a/g"],
        ["g.", BASE_URI0, "http://a/b/c/g."],
        [".g", BASE_URI0, "http://a/b/c/.g"],
        ["g..", BASE_URI0, "http://a/b/c/g.."],
        ["..g", BASE_URI0, "http://a/b/c/..g"],
        ["./../g", BASE_URI0, "http://a/b/g"],
        ["./g/.", BASE_URI0, "http://a/b/c/g/"],
        ["g/./h", BASE_URI0, "http://a/b/c/g/h"],
        ["g/../h", BASE_URI0, "http://a/b/c/h"],
        ["g;x=1/./y", BASE_URI0, "http://a/b/c/g;x=1/y"],
        ["g;x=1/../y", BASE_URI0, "http://a/b/c/y"],
        ["g?y/./x", BASE_URI0, "http://a/b/c/g?y/./x"],
        ["g?y/../x", BASE_URI0, "http://a/b/c/g?y/../x"],
        ["g#s/./x", BASE_URI0, "http://a/b/c/g#s/./x"],
        ["g#s/../x", BASE_URI0, "http://a/b/c/g#s/../x"],
        ["http:g", BASE_URI0, ["http:g", "http://a/b/c/g"]],
        ["http:", BASE_URI0, ["http:", BASE_URI0]],

        // not sure where this one originated
        ["/a/b/c/./../../g", BASE_URI0, "http://a/a/g"],

        // http://gbiv.com/protocols/uri/test/rel_examples2.html
        // slashes in base URI"s query args
        ["g"       , BASE_URI1, "http://a/b/c/g"],
        ["./g"     , BASE_URI1, "http://a/b/c/g"],
        ["g/"      , BASE_URI1, "http://a/b/c/g/"],
        ["/g"      , BASE_URI1, "http://a/g"],
        ["//g"     , BASE_URI1, "http://g"],
        // changed in RFC 2396bis
        //("?y"      , BASE_URI1, "http://a/b/c/?y"),
        ["?y"      , BASE_URI1, "http://a/b/c/d;p?y"],
        ["g?y"     , BASE_URI1, "http://a/b/c/g?y"],
        ["g?y/./x" , BASE_URI1, "http://a/b/c/g?y/./x"],
        ["g?y/../x", BASE_URI1, "http://a/b/c/g?y/../x"],
        ["g#s"     , BASE_URI1, "http://a/b/c/g#s"],
        ["g#s/./x" , BASE_URI1, "http://a/b/c/g#s/./x"],
        ["g#s/../x", BASE_URI1, "http://a/b/c/g#s/../x"],
        ["./"      , BASE_URI1, "http://a/b/c/"],
        ["../"     , BASE_URI1, "http://a/b/"],
        ["../g"    , BASE_URI1, "http://a/b/g"],
        ["../../"  , BASE_URI1, "http://a/"],
        ["../../g" , BASE_URI1, "http://a/g"],

        // http://gbiv.com/protocols/uri/test/rel_examples3.html
        // slashes in path params
        // all of these changed in RFC 2396bis
        ["g"       , BASE_URI2, "http://a/b/c/d;p=1/g"],
        ["./g"     , BASE_URI2, "http://a/b/c/d;p=1/g"],
        ["g/"      , BASE_URI2, "http://a/b/c/d;p=1/g/"],
        ["g?y"     , BASE_URI2, "http://a/b/c/d;p=1/g?y"],
        [";x"      , BASE_URI2, "http://a/b/c/d;p=1/;x"],
        ["g;x"     , BASE_URI2, "http://a/b/c/d;p=1/g;x"],
        ["g;x=1/./y", BASE_URI2, "http://a/b/c/d;p=1/g;x=1/y"],
        ["g;x=1/../y", BASE_URI2, "http://a/b/c/d;p=1/y"],
        ["./"      , BASE_URI2, "http://a/b/c/d;p=1/"],
        ["../"     , BASE_URI2, "http://a/b/c/"],
        ["../g"    , BASE_URI2, "http://a/b/c/g"],
        ["../../"  , BASE_URI2, "http://a/b/"],
        ["../../g" , BASE_URI2, "http://a/b/g"],

        // http://gbiv.com/protocols/uri/test/rel_examples4.html
        // double and triple slash, unknown scheme
        ["g:h"     , BASE_URI3, "g:h"],
        ["g"       , BASE_URI3, "fred:///s//a/b/g"],
        ["./g"     , BASE_URI3, "fred:///s//a/b/g"],
        ["g/"      , BASE_URI3, "fred:///s//a/b/g/"],
        ["/g"      , BASE_URI3, "fred:///g"],  // may change to fred:///s//a/g
        ["//g"     , BASE_URI3, "fred://g"],   // may change to fred:///s//g
        ["//g/x"   , BASE_URI3, "fred://g/x"], // may change to fred:///s//g/x
        ["///g"    , BASE_URI3, "fred:///g"],
        ["./"      , BASE_URI3, "fred:///s//a/b/"],
        ["../"     , BASE_URI3, "fred:///s//a/"],
        ["../g"    , BASE_URI3, "fred:///s//a/g"],
        ["../../"  , BASE_URI3, "fred:///s//"],    // may change to fred:///s//a/../
        ["../../g" , BASE_URI3, "fred:///s//g"],   // may change to fred:///s//a/../g
        ["../../../g", BASE_URI3, "fred:///s/g"],  // may change to fred:///s//a/../../g
        ["../../../../g", BASE_URI3, "fred:///g"], // may change to fred:///s//a/../../../g

        // http://gbiv.com/protocols/uri/test/rel_examples5.html
        // double and triple slash, well-known scheme
        ["g:h"     , BASE_URI4, "g:h"],
        ["g"       , BASE_URI4, "http:///s//a/b/g"],
        ["./g"     , BASE_URI4, "http:///s//a/b/g"],
        ["g/"      , BASE_URI4, "http:///s//a/b/g/"],
        ["/g"      , BASE_URI4, "http:///g"],  // may change to http:///s//a/g
        ["//g"     , BASE_URI4, "http://g"],   // may change to http:///s//g
        ["//g/x"   , BASE_URI4, "http://g/x"], // may change to http:///s//g/x
        ["///g"    , BASE_URI4, "http:///g"],
        ["./"      , BASE_URI4, "http:///s//a/b/"],
        ["../"     , BASE_URI4, "http:///s//a/"],
        ["../g"    , BASE_URI4, "http:///s//a/g"],
        ["../../"  , BASE_URI4, "http:///s//"],    // may change to http:///s//a/../
        ["../../g" , BASE_URI4, "http:///s//g"],   // may change to http:///s//a/../g
        ["../../../g", BASE_URI4, "http:///s/g"],  // may change to http:///s//a/../../g
        ["../../../../g", BASE_URI4, "http:///g"], // may change to http:///s//a/../../../g

        // http://www.w3.org/2000/10/swap/uripath.py
        // version "$Id: uripath.py,v 1.21 2007/06/26 02:36:16 syosi Exp $"
        // 1. Dan Connelly's cases
        ["bar:abc", "foo:xyz", "bar:abc"],
        ["../abc", "http://example/x/y/z", "http://example/x/abc"],
        ["http://example/x/abc", "http://example2/x/y/z", "http://example/x/abc"],
        ["../r", "http://ex/x/y/z", "http://ex/x/r"],
        // This next one is commented out in uripath.py - why?
        // ["../../r", "http://ex/x/y/z", "http://ex/r"],
        ["q/r", "http://ex/x/y", "http://ex/x/q/r"],
        ["q/r#s", "http://ex/x/y", "http://ex/x/q/r#s"],
        ["q/r#s/t", "http://ex/x/y", "http://ex/x/q/r#s/t"],
        ["ftp://ex/x/q/r", "http://ex/x/y", "ftp://ex/x/q/r"],
        ["", "http://ex/x/y", "http://ex/x/y"],
        ["", "http://ex/x/y/", "http://ex/x/y/"],
        ["", "http://ex/x/y/pdq", "http://ex/x/y/pdq"],
        ["z/", "http://ex/x/y/", "http://ex/x/y/z/"],
        ["#Animal", "file:/swap/test/animal.rdf", "file:/swap/test/animal.rdf#Animal"],
        ["../abc", "file:/e/x/y/z", "file:/e/x/abc"],
        ["/example/x/abc", "file:/example2/x/y/z", "file:/example/x/abc"],
        ["../r", "file:/ex/x/y/z", "file:/ex/x/r"],
        ["/r", "file:/ex/x/y/z", "file:/r"],
        ["q/r", "file:/ex/x/y", "file:/ex/x/q/r"],
        ["q/r#s", "file:/ex/x/y", "file:/ex/x/q/r#s"],
        ["q/r#", "file:/ex/x/y", "file:/ex/x/q/r#"],
        ["q/r#s/t", "file:/ex/x/y", "file:/ex/x/q/r#s/t"],
        ["ftp://ex/x/q/r", "file:/ex/x/y", "ftp://ex/x/q/r"],
        ["", "file:/ex/x/y", "file:/ex/x/y"],
        ["", "file:/ex/x/y/", "file:/ex/x/y/"],
        ["", "file:/ex/x/y/pdq", "file:/ex/x/y/pdq"],
        ["z/", "file:/ex/x/y/", "file:/ex/x/y/z/"],
        ["file://meetings.example.com/cal#m1", "file:/devel/WWW/2000/10/swap/test/reluri-1.n3", "file://meetings.example.com/cal#m1"],
        ["file://meetings.example.com/cal#m1", "file:/home/connolly/w3ccvs/WWW/2000/10/swap/test/reluri-1.n3", "file://meetings.example.com/cal#m1"],
        ["./#blort", "file:/some/dir/foo", "file:/some/dir/#blort"],
        ["./#", "file:/some/dir/foo", "file:/some/dir/#"],
        // 2. Graham Klyne's cases - see below.
        // 3. Ryan Lee's case
        ["./", "http://example/x/abc.efg", "http://example/x/"],

        //
        // Graham Klyne's tests
        // <http://www.ninebynine.org/Software/HaskellUtils/Network/UriTest.xls> dated 2004-04-20
        //
        // Relative01-31 are identical to Connolly's cases, except these:
        ["//example/x/abc", "http://example2/x/y/z", "http://example/x/abc"],     // Relative03
        ["/r", "http://ex/x/y/z", "http://ex/r"],                                 // Relative05
        // Relative32-49
        ["./q:r", "http://ex/x/y", "http://ex/x/q:r"],
        ["./p=q:r", "http://ex/x/y", "http://ex/x/p=q:r"],
        ["?pp/rr", "http://ex/x/y?pp/qq", "http://ex/x/y?pp/rr"],
        ["y/z", "http://ex/x/y?pp/qq", "http://ex/x/y/z"],
        ["local/qual@domain.org#frag", "mailto:local", "mailto:local/qual@domain.org#frag"],
        ["more/qual2@domain2.org#frag", "mailto:local/qual1@domain1.org", "mailto:local/more/qual2@domain2.org#frag"],
        ["y?q", "http://ex/x/y?q", "http://ex/x/y?q"],
        ["/x/y?q", "http://ex?p", "http://ex/x/y?q"],
        ["c/d",  "foo:a/b", "foo:a/c/d"],
        ["/c/d", "foo:a/b", "foo:/c/d"],
        ["", "foo:a/b?c#d", "foo:a/b?c"],
        ["b/c", "foo:a", "foo:b/c"],
        ["../b/c", "foo:/a/y/z", "foo:/a/b/c"],
        ["./b/c", "foo:a", "foo:b/c"],
        ["/./b/c", "foo:a", "foo:/b/c"],
        ["../../d", "foo://a//b/c", "foo://a/d"],
        [".", "foo:a", "foo:"],
        ["..", "foo:a", "foo:"],
        //
        // Relative50-57 (cf. TimBL comments:
        //  http://lists.w3.org/Archives/Public/uri/2003Feb/0028.html,
        //  http://lists.w3.org/Archives/Public/uri/2003Jan/0008.html)
        // 50, 53, 55, 56 are also in http://www.w3.org/2000/10/swap/uripath.py
        ["abc", "http://example/x/y%2Fz", "http://example/x/abc"],
        ["../../x%2Fabc", "http://example/a/x/y/z", "http://example/a/x%2Fabc"],
        ["../x%2Fabc", "http://example/a/x/y%2Fz", "http://example/a/x%2Fabc"],
        ["abc", "http://example/x%2Fy/z", "http://example/x%2Fy/abc"],
        ["q%3Ar", "http://ex/x/y", "http://ex/x/q%3Ar"],
        ["/x%2Fabc", "http://example/x/y%2Fz", "http://example/x%2Fabc"],
        ["/x%2Fabc", "http://example/x/y/z", "http://example/x%2Fabc"],
        //["/x%2Fabc", "http://example/x/y%2Fz", "http://example/x%2Fabc"], // same as 55

        //
        // Relative70-77
        ["local2@domain2", "mailto:local1@domain1?query1", "mailto:local2@domain2"],
        ["local2@domain2?query2", "mailto:local1@domain1", "mailto:local2@domain2?query2"],
        ["local2@domain2?query2", "mailto:local1@domain1?query1", "mailto:local2@domain2?query2"],
        ["?query2", "mailto:local@domain?query1", "mailto:local@domain?query2"],
        ["local@domain?query2", "mailto:?query1", "mailto:local@domain?query2"],
        ["?query2", "mailto:local@domain?query1", "mailto:local@domain?query2"],
        ["http://example/a/b?c/../d", "foo:bar", "http://example/a/b?c/../d"],
        ["http://example/a/b#c/../d", "foo:bar", "http://example/a/b#c/../d"],
        //
        // Relative82-88
        ["http:this", "http://example.org/base/uri", "http:this"],
        ["http:this", "http:base", "http:this"],
        [".//g", "f:/a", "f://g"],
        ["b/c//d/e", "f://example.org/base/a", "f://example.org/base/b/c//d/e"],
        ["m2@example.ord/c2@example.org", "mid:m@example.ord/c@example.org", "mid:m@example.ord/m2@example.ord/c2@example.org"],
        ["mini1.xml", "file:///C:/DEV/Haskell/lib/HXmlToolbox-3.01/examples/", "file:///C:/DEV/Haskell/lib/HXmlToolbox-3.01/examples/mini1.xml"],
        ["../b/c", "foo:a/y/z", "foo:a/b/c"],

        // Mike Brown 2011-12-14
        // testing Merge Paths routine in STD 66
        ["b", "foo:", "foo:b"],
        ["b", "foo://a", "foo://a/b"],
        ["b", "foo://a?q", "foo://a/b"],
        ["b?q", "foo://a", "foo://a/b?q"],
        ["b?q", "foo://a?r", "foo://a/b?q"]
    ];

    /*
    testAbsolutize(absolutizeFunc, testCases)

    Given a function intended to resolve URI references to absolute form and an
    array of test case arrays, this function conducts unit tests and returns an
    array of results.

    absolutizeFunc must be a function that takes as arguments a URI reference
    string and a base URI string, in that order, and must return a string
    result or throw an Error.

    testCases must be an array in which each item is an array consisting of a URI
    reference string, a base URI string, and an expected result string (or array
    of strings, if there is more than one acceptable result).

    The array of results returned by this function will consist of a copy of the
    testCases array, but with a boolean indicator of success or failure inserted
    before the first item, and the result or error string:
    [success, uriRef, baseUri, expectedUri, result]
    */
    function testAbsolutize(absolutizeFunc, testCases) {
        // IE6 doesn't have Array.indexOf()
        if (! [].indexOf) {
            Array.prototype.indexOf = function(v) {
                var l = this.length;
                for(var i = l; i-- && this[i] !== v;) {
                }
                return i;
            };
        }
        var results = [];
        var numcases = testCases.length;
        for (var i = 0; i < numcases; i++) {
            var testcase = testCases[i];
            var uriRef=testcase[0], baseUri=testcase[1], expectedUri=testcase[2];
            var res, success;
            try {
                res = absolutizeFunc(baseUri, uriRef);
                // in a couple cases, there's more than one correct result
                if (expectedUri instanceof Array) {
                    success = (expectedUri.indexOf(res.toString()) !== -1);
                } else {
                    success = (expectedUri === res);
                }
            } catch(ex) {
                res = "ERROR: " + String(ex);
                success = false;
            }
            results.push([success, uriRef, baseUri, expectedUri, res]);
        }
        return results;
    }

    it('passes tests from http://skew.org/uri/uri_tests.html#absoluteizeURI', function() {
        var results = testAbsolutize(makeRelativeUrlAbsolute, absolutizeTestCases);
        for (var i = 0; i < results.length; ++i) {
            expect(results[i][0]).toBe(true);
        }
    });
});
