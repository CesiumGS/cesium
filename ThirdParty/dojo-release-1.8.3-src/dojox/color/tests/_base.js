dojo.provide("dojox.color.tests._base");
dojo.require("dojox.color");

/************************************************************
 *	Note that some color translations are not exact,
 *	due to the need to round calculations in translation.
 *
 *	These tests work with grey, the primary colors and
 *	one secondary color to ensure that extreme calculation
 *	is correct.
 ************************************************************/

tests.register("dojox.color.tests._base", [
	function testStaticMethods(t){
		//	fromCmy
		t.assertEqual(dojox.color.fromCmy({ c:50, m:50, y:50}), new dojo.Color({ r:128, g:128, b:128 }));
		t.assertEqual(dojox.color.fromCmy({ c:0, m:100, y:100}), new dojo.Color({ r:255, g:0, b:0 }));
		t.assertEqual(dojox.color.fromCmy({ c:100, m:0, y:100}), new dojo.Color({ r:0, g:255, b:0 }));
		t.assertEqual(dojox.color.fromCmy({ c:100, m:100, y:0}), new dojo.Color({ r:0, g:0, b:255 }));
		t.assertEqual(dojox.color.fromCmy({ c:0, m:0, y:100}), new dojo.Color({ r:255, g:255, b:0 }));

		//	fromCmyk
		t.assertEqual(dojox.color.fromCmyk({ c:0, m:0, y:0, b:50}), new dojo.Color({ r:128, g:128, b:128 }));
		t.assertEqual(dojox.color.fromCmyk({ c:0, m:100, y:100, b:0}), new dojo.Color({ r:255, g:0, b:0 }));
		t.assertEqual(dojox.color.fromCmyk({ c:100, m:0, y:100, b:0}), new dojo.Color({ r:0, g:255, b:0 }));
		t.assertEqual(dojox.color.fromCmyk({ c:100, m:100, y:0, b:0}), new dojo.Color({ r:0, g:0, b:255 }));
		t.assertEqual(dojox.color.fromCmyk({ c:0, m:0, y:100, b:0}), new dojo.Color({ r:255, g:255, b:0 }));

		//	fromHsl
		t.assertEqual(dojox.color.fromHsl({ h:0, s:0, l:50}), new dojo.Color({ r:128, g:128, b:128 }));
		t.assertEqual(dojox.color.fromHsl({ h:0, s:100, l:50}), new dojo.Color({ r:255, g:0, b:0 }));
		t.assertEqual(dojox.color.fromHsl({ h:120, s:100, l:50}), new dojo.Color({ r:0, g:255, b:0 }));
		t.assertEqual(dojox.color.fromHsl({ h:240, s:100, l:50}), new dojo.Color({ r:0, g:0, b:255 }));
		t.assertEqual(dojox.color.fromHsl({ h:60, s:100, l:50}), new dojo.Color({ r:255, g:255, b:0 }));

		//	fromHsv
		t.assertEqual(dojox.color.fromHsv({ h:0, s:0, v:50}), new dojo.Color({ r:128, g:128, b:128 }));
		t.assertEqual(dojox.color.fromHsv({ h:0, s:100, v:100}), new dojo.Color({ r:255, g:0, b:0 }));
		t.assertEqual(dojox.color.fromHsv({ h:120, s:100, v:100}), new dojo.Color({ r:0, g:255, b:0 }));
		t.assertEqual(dojox.color.fromHsv({ h:240, s:100, v:100}), new dojo.Color({ r:0, g:0, b:255 }));
		t.assertEqual(dojox.color.fromHsv({ h:60, s:100, v:100}), new dojo.Color({ r:255, g:255, b:0 }));
	},
	function testColorExtensions(t){
		var grey=new dojox.color.Color({ r:128, g:128, b:128 });
		var red=new dojox.color.Color({ r:255, g:0, b:0 });
		var green=new dojox.color.Color({ r:0, g:255, b:0 });
		var blue=new dojox.color.Color({ r:0, g:0, b:255 });
		var yellow=new dojox.color.Color({ r:255, g:255, b:0 });

		//	toCmy
		t.assertEqual(grey.toCmy(), { c:50, m:50, y:50 });
		t.assertEqual(red.toCmy(), { c:0, m:100, y:100 });
		t.assertEqual(green.toCmy(), { c:100, m:0, y:100 });
		t.assertEqual(blue.toCmy(), { c:100, m:100, y:0 });
		t.assertEqual(yellow.toCmy(), { c:0, m:0, y:100 });

		//	toCmyk
		t.assertEqual(grey.toCmyk(), { c:0, m:0, y:0, b:50 });
		t.assertEqual(red.toCmyk(), { c:0, m:100, y:100, b:0 });
		t.assertEqual(green.toCmyk(), { c:100, m:0, y:100, b:0 });
		t.assertEqual(blue.toCmyk(), { c:100, m:100, y:0, b:0 });
		t.assertEqual(yellow.toCmyk(), { c:0, m:0, y:100, b:0 });

		//	toHsl
		t.assertEqual(grey.toHsl(), { h:0, s:0, l:50 });
		t.assertEqual(red.toHsl(), { h:0, s:100, l:50 });
		t.assertEqual(green.toHsl(), { h:120, s:100, l:50 });
		t.assertEqual(blue.toHsl(), { h:240, s:100, l:50 });
		t.assertEqual(yellow.toHsl(), { h:60, s:100, l:50 });

		//	toHsv
		t.assertEqual(grey.toHsv(), { h:0, s:0, v:50 });
		t.assertEqual(red.toHsv(), { h:0, s:100, v:100 });
		t.assertEqual(green.toHsv(), { h:120, s:100, v:100 });
		t.assertEqual(blue.toHsv(), { h:240, s:100, v:100 });
		t.assertEqual(yellow.toHsv(), { h:60, s:100, v:100 });
	}
]);
