define(["dojo/main", "doh/main", "dojo/data/util/filter", "dojo/data/util/sorter"], function(dojo, doh){

doh.register("tests.data.utils",
	[
		function testWildcardFilter_1(t){
			var pattern = "ca*";
			var values = ["ca", "california", "Macca", "Macca*b", "Macca\\b"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testWildcardFilter_2(t){
			var pattern = "*ca";
			var values = ["ca", "california", "Macca", "Macca*b", "Macca\\b"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testWildcardFilter_3(t){
			var pattern = "*ca*";
			var values = ["ca", "california", "Macca", "Macca*b", "Macca\\b"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testWildcardFilter_4(t){
			//Try and match <anything>c<anything>a*b
			var pattern = "*c*a\\*b*";
			var values = ["ca", "california", "Macca", "Macca*b", "Macca\\b"];

			t.assertFalse(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testWildcardFilter_5(t){
			var pattern = "*c*a\\\\*b";
			var values = ["ca", "california", "Macca", "Macca*b", "Macca\\b"];

			t.assertFalse(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testWildcardFilter_caseInsensitive(t){
			var pattern = "ca*";
			var values = ["CA", "california", "Macca", "Macca*b", "Macca\\b"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern, true))!== null);
			t.assertTrue(values[1].match(dojo.data.util.filter.patternToRegExp(pattern, true))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern, true))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern, true))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern, true))!== null);
		},
		function testSingleChar_1(t){
			var pattern = "bob?le";
			var values = ["bobble", "boble", "foo", "bobBle", "bar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testSingleChar_2(t){
			var pattern = "?ob?le";
			var values = ["bobble", "cob1le", "foo", "bobBle", "bar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testBracketChar(t){
			//Make sure we don't treat this as regexp
			var pattern = "*[*]*";
			var values = ["bo[b]ble", "cob1le", "foo", "[bobBle]", "b[]ar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testBraceChar(t){
			//Make sure we don't treat this as regexp
			var pattern = "*{*}*";
			var values = ["bo{b}ble", "cob1le", "foo", "{bobBle}", "b{}ar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testParenChar(t){
			//Make sure we don't treat this as regexp
			var pattern = "*(*)*";
			var values = ["bo(b)ble", "cob1le", "foo", "{bobBle}", "b()ar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testPlusChar(t){
			//Make sure we don't treat this as regexp, so match anything with a + in it.
			var pattern = "*+*";
			var values = ["bo+ble", "cob1le", "foo", "{bobBle}", "b{}ar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testPeriodChar(t){
			//Make sure we don't treat this as regexp, so match anything with a period
			var pattern = "*.*";
			var values = ["bo.ble", "cob1le", "foo", "{bobBle}", "b{}ar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testBarChar(t){
			//Make sure we don't treat this as regexp, so match anything with a pipe bar
			var pattern = "*|*";
			var values = ["bo.ble", "cob|le", "foo", "{bobBle}", "b{}ar"];

			t.assertFalse(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testDollarSignChar(t){
			//Make sure we don't treat this as regexp, so match anything with a $ in it
			var pattern = "*$*";
			var values = ["bo$ble", "cob$le", "foo", "{bobBle}", "b{}ar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testCarrotChar(t){
			//Make sure we don't treat this as regexp, so match anything with a ^ in it
			var pattern = "*^*";
			var values = ["bo$ble", "cob$le", "f^oo", "{bobBle}", "b{}ar"];

			t.assertFalse(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertTrue(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testEscapeChar(t){
			//Make sure we escape properly, so match this single word.
			var pattern = "bob\*ble";
			var values = ["bob*ble", "cob$le", "f^oo", "{bobBle}", "b{}ar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		},
		function testAbsoluteMatch(t){
			var pattern = "bobble";
			var values = ["bobble", "cob$le", "f^oo", "{bobBle}", "b{}ar"];

			t.assertTrue(values[0].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[1].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[2].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[3].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
			t.assertFalse(values[4].match(dojo.data.util.filter.patternToRegExp(pattern))!== null);
		}
	]
);

});

