define(["../main", "doh/main", "../colors"], function(dojo, doh){

	var verifyColor = function(t, source, expected){
		source	 = new dojo.Color(source);
		expected = new dojo.Color(expected);
		t.is(expected.toRgba(), source.toRgba());
		dojo.forEach(source.toRgba(), function(n){ t.is("number", typeof(n)); });
	};

	doh.register("tests.colors", [
		// all tests below are taken from #4.2 of the CSS3 Color Module
		function testColorEx01(t){ verifyColor(t, "black", [0, 0, 0]); },
		function testColorEx02(t){ verifyColor(t, "white", [255, 255, 255]); },
		function testColorEx03(t){ verifyColor(t, "maroon", [128, 0, 0]); },
		function testColorEx04(t){ verifyColor(t, "olive", [128, 128, 0]); },
		function testColorEx05(t){ verifyColor(t, "#f00", "red"); },
		function testColorEx06(t){ verifyColor(t, "#ff0000", "red"); },
		function testColorEx07(t){ verifyColor(t, "rgb(255, 0, 0)", "red"); },
		function testColorEx08(t){ verifyColor(t, "rgb(100%, 0%, 0%)", "red"); },
		function testColorEx09(t){ verifyColor(t, "rgb(300, 0, 0)", "red"); },
		function testColorEx10(t){ verifyColor(t, "rgb(255, -10, 0)", "red"); },
		function testColorEx11(t){ verifyColor(t, "rgb(110%, 0%, 0%)", "red"); },
		function testColorEx12(t){ verifyColor(t, "rgba(255, 0, 0, 1)", "red"); },
		function testColorEx13(t){ verifyColor(t, "rgba(100%, 0%, 0%, 1)", "red"); },
		function testColorEx14(t){ verifyColor(t, "rgba(0, 0, 255, 0.5)", [0, 0, 255, 0.5]); },
		function testColorEx15(t){ verifyColor(t, "rgba(100%, 50%, 0%, 0.1)", [255, 128, 0, 0.1]); },
		function testColorEx16(t){ verifyColor(t, "hsl(0, 100%, 50%)", "red"); },
		function testColorEx17(t){ verifyColor(t, "hsl(120, 100%, 50%)", "lime"); },
		function testColorEx18(t){ verifyColor(t, "hsl(120, 100%, 25%)", "green"); },
		function testColorEx19(t){ verifyColor(t, "hsl(120, 100%, 75%)", "#80ff80"); },
		function testColorEx20(t){ verifyColor(t, "hsl(120, 50%, 50%)", "#40c040"); },
		function testColorEx21(t){ verifyColor(t, "hsla(120, 100%, 50%, 1)", "lime"); },
		function testColorEx22(t){ verifyColor(t, "hsla(240, 100%, 50%, 0.5)", [0, 0, 255, 0.5]); },
		function testColorEx23(t){ verifyColor(t, "hsla(30, 100%, 50%, 0.1)", [255, 128, 0, 0.1]); },
		function testColorEx24(t){ verifyColor(t, "transparent", [0, 0, 0, 0]); },
		// all tests below test greyscale colors
		function testColorEx25(t){ verifyColor(t, dojo.colors.makeGrey(5), [5, 5, 5, 1]); },
		function testColorEx26(t){ verifyColor(t, dojo.colors.makeGrey(2, 0.3), [2, 2, 2, 0.3]); }
	]);

});

