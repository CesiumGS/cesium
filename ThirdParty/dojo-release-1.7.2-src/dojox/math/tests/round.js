dojo.provide("dojox.math.tests.round");
dojo.require("dojox.math.round");

tests.register("dojox.math.tests.round",
	[
		{
			name: "round",
			runTest: function(t){
				t.is(0, dojox.math.round(0));
				t.is(1, dojox.math.round(0.5));
				t.is(-1, dojox.math.round(-0.5));
				t.is(0.1, dojox.math.round(0.05, 1));
				t.is(-0.1, dojox.math.round(-0.05, 1));
				t.is(1.1, dojox.math.round(1.05, 1));
				t.is(-1.1, dojox.math.round(-1.05, 1));
				t.is(-162.3, dojox.math.round(-162.295, 2));
				t.is(162.3, dojox.math.round(162.295, 2));
			}
		},
		{
			name: "round_multiple",
			runTest: function(t){
				t.is("123.455", dojox.math.round(123.4525, 2, 5));
				t.is("123.45", dojox.math.round(123.452, 2, 5));
				t.is("123.455", dojox.math.round(123.454, 2, 5));
				t.is("123.455", dojox.math.round(123.456, 2, 5));
				t.is("-123.45", dojox.math.round(-123.452, 2, 5));
				t.is("-123.455", dojox.math.round(-123.4525, 2, 5));
				t.is("-123.455", dojox.math.round(-123.454, 2, 5));
				t.is("-123.455", dojox.math.round(-123.456, 2, 5));
			}
		},
		{
			name: "round_speleotrove",
			runTest: function(t){
				// submitted Mike Cowlishaw (IBM, CCLA), see http://speleotrove.com/decimal/#testcases
				t.is(12345, dojox.math.round(12345 + -0.1), "radx200");
				t.is(12345, dojox.math.round(12345 + -0.01), "radx201");
				t.is(12345, dojox.math.round(12345 + -0.001), "radx202");
				t.is(12345, dojox.math.round(12345 + -0.00001), "radx203");
				t.is(12345, dojox.math.round(12345 + -0.000001), "radx204");
				t.is(12345, dojox.math.round(12345 + -0.0000001), "radx205");
				t.is(12345, dojox.math.round(12345 +  0), "radx206");
				t.is(12345, dojox.math.round(12345 +  0.0000001), "radx207");
				t.is(12345, dojox.math.round(12345 +  0.000001), "radx208");
				t.is(12345, dojox.math.round(12345 +  0.00001), "radx209");
				t.is(12345, dojox.math.round(12345 +  0.0001), "radx210");
				t.is(12345, dojox.math.round(12345 +  0.001), "radx211");
				t.is(12345, dojox.math.round(12345 +  0.01), "radx212");
				t.is(12345, dojox.math.round(12345 +  0.1), "radx213");

				t.is(12346, dojox.math.round(12346 +  0.49999), "radx215");
				t.is(12347, dojox.math.round(12346 +  0.5), "radx216");
				t.is(12347, dojox.math.round(12346 +  0.50001), "radx217");
				
				t.is(12345, dojox.math.round(12345 +  0.4), "radx220");
				t.is(12345, dojox.math.round(12345 +  0.49), "radx221");
				t.is(12345, dojox.math.round(12345 +  0.499), "radx222");
				t.is(12345, dojox.math.round(12345 +  0.49999), "radx223");
				t.is(12346, dojox.math.round(12345 +  0.5), "radx224");
				t.is(12346, dojox.math.round(12345 +  0.50001), "radx225");
				t.is(12346, dojox.math.round(12345 +  0.5001), "radx226");
				t.is(12346, dojox.math.round(12345 +  0.501), "radx227");
				t.is(12346, dojox.math.round(12345 +  0.51), "radx228");
				t.is(12346, dojox.math.round(12345 +  0.6), "radx229");
				
				//negatives
				t.is(-12345, dojox.math.round(-12345 + -0.1), "rsux200");
				t.is(-12345, dojox.math.round(-12345 + -0.01), "rsux201");
				t.is(-12345, dojox.math.round(-12345 + -0.001), "rsux202");
				t.is(-12345, dojox.math.round(-12345 + -0.00001), "rsux203");
				t.is(-12345, dojox.math.round(-12345 + -0.000001), "rsux204");
				t.is(-12345, dojox.math.round(-12345 + -0.0000001), "rsux205");
				t.is(-12345, dojox.math.round(-12345 +  0), "rsux206");
				t.is(-12345, dojox.math.round(-12345 +  0.0000001), "rsux207");
				t.is(-12345, dojox.math.round(-12345 +  0.000001), "rsux208");
				t.is(-12345, dojox.math.round(-12345 +  0.00001), "rsux209");
				t.is(-12345, dojox.math.round(-12345 +  0.0001), "rsux210");
				t.is(-12345, dojox.math.round(-12345 +  0.001), "rsux211");
				t.is(-12345, dojox.math.round(-12345 +  0.01), "rsux212");
				t.is(-12345, dojox.math.round(-12345 +  0.1), "rsux213");
				
				t.is(-12346, dojox.math.round(-12346 +  0.49999), "rsux215");
				t.is(-12346, dojox.math.round(-12346 +  0.5), "rsux216");
				t.is(-12345, dojox.math.round(-12346 +  0.50001   ), "rsux217");
				
				t.is(-12345, dojox.math.round(-12345 +  0.4), "rsux220");
				t.is(-12345, dojox.math.round(-12345 +  0.49), "rsux221");
				t.is(-12345, dojox.math.round(-12345 +  0.499), "rsux222");
				t.is(-12345, dojox.math.round(-12345 +  0.49999), "rsux223");
				t.is(-12345, dojox.math.round(-12345 +  0.5), "rsux224");
				t.is(-12344, dojox.math.round(-12345 +  0.50001), "rsux225");
				t.is(-12344, dojox.math.round(-12345 +  0.5001), "rsux226");
				t.is(-12344, dojox.math.round(-12345 +  0.501), "rsux227");
				t.is(-12344, dojox.math.round(-12345 +  0.51), "rsux228");
				t.is(-12344, dojox.math.round(-12345 +  0.6), "rsux229");
				
				t.is(12345, dojox.math.round(  12345 /  1), "rdvx401");
				t.is(12344, dojox.math.round(  12345 /  1.0001), "rdvx402");
				t.is(12333, dojox.math.round(  12345 /  1.001), "rdvx403");
				t.is(12223, dojox.math.round(  12345 /  1.01), "rdvx404");
				t.is(11223, dojox.math.round(  12345 /  1.1), "rdvx405");

				t.is(3088.8, dojox.math.round( 12355 /  4, 1), "rdvx406");
				t.is(3086.3, dojox.math.round( 12345 /  4, 1), "rdvx407");
				t.is(3088.7, dojox.math.round( 12355 /  4.0001, 1), "rdvx408");
				t.is(3086.2, dojox.math.round( 12345 /  4.0001, 1), "rdvx409");
				t.is(2519.4, dojox.math.round( 12345 /  4.9, 1), "rdvx410");
				t.is(2473.9, dojox.math.round( 12345 /  4.99, 1), "rdvx411");
				t.is(2469.5, dojox.math.round( 12345 /  4.999, 1), "rdvx412");
				t.is(2469.0, dojox.math.round( 12345 /  4.9999, 1), "rdvx413");
				t.is(2469, dojox.math.round( 12345 /  5, 1), "rdvx414");
				t.is(2469.0, dojox.math.round( 12345 /  5.0001, 1), "rdvx415");
				t.is(2468.5, dojox.math.round( 12345 /  5.001, 1), "rdvx416");
				t.is(2464.1, dojox.math.round( 12345 /  5.01, 1), "rdvx417");
				t.is(2420.6, dojox.math.round( 12345 /  5.1, 1), "rdvx418");

				t.is(12345, dojox.math.round(  12345 *  1), "rmux401");
				t.is(12346, dojox.math.round(  12345 *  1.0001), "rmux402");
				t.is(12357, dojox.math.round(  12345 *  1.001), "rmux403");
				t.is(12468, dojox.math.round(  12345 *  1.01), "rmux404");
				t.is(13580, dojox.math.round(  12345 *  1.1), "rmux405");
				t.is(49380, dojox.math.round(  12345 *  4), "rmux406");
				t.is(49381, dojox.math.round(  12345 *  4.0001), "rmux407");
				t.is(60491, dojox.math.round(  12345 *  4.9), "rmux408");
				t.is(61602, dojox.math.round(  12345 *  4.99), "rmux409");
				t.is(61713, dojox.math.round(  12345 *  4.999), "rmux410");
				t.is(61724, dojox.math.round(  12345 *  4.9999), "rmux411");
				t.is(61725, dojox.math.round(  12345 *  5), "rmux412");
				t.is(61726, dojox.math.round(  12345 *  5.0001), "rmux413");
				t.is(61737, dojox.math.round(  12345 *  5.001), "rmux414");
				t.is(61848, dojox.math.round(  12345 *  5.01), "rmux415");
/*
				t.is(1.4814E+5, dojox.math.round(  12345 *  12), "rmux416");
				t.is(1.6049E+5, dojox.math.round(  12345 *  13), "rmux417");
				t.is(1.4826E+5, dojox.math.round(  12355 *  12), "rmux418");
				t.is(1.6062E+5, dojox.math.round(  12355 *  13), "rmux419");
*/
			}
		}
	]
);
