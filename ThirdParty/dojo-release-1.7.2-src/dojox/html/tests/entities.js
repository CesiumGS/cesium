dojo.provide("dojox.html.tests.entities");
dojo.require("dojox.html.entities");

doh.register("dojox.html.tests.entities",
	[
		{
			name: "Encode:  Basic HTML Entities",
			runTest: function(t) {
				//	summary:
				//		Simple test of basic encoding of characters considered HTML entities
				//	description:
				//		Simple test of basic encoding of characters considered HTML entities
				var txt = "This is some \" text \" with & entities inside it that <need to be escaped>";
				var expected = "This is some &quot; text &quot; with &amp; entities inside it that &lt;need to be escaped&gt;";
				var encodedTxt = dojox.html.entities.encode(txt);
				doh.assertEqual(expected, encodedTxt);
			}
		},
		{
			name: "Decode:  Basic HTML Entities",
			runTest: function(t) {
				//	summary:
				//		Simple test of basic encoding of characters considered HTML entities
				//	description:
				//		Simple test of basic encoding of characters considered HTML entities
				var txt = "This is some &quot; text &quot; with &amp; entities inside it that &lt;need to be escaped&gt;";
				var expected = "This is some \" text \" with & entities inside it that <need to be escaped>";
				var decodedTxt = dojox.html.entities.decode(txt);
				doh.assertEqual(expected, decodedTxt);
			}
		},
		{
			name: "Encode:  Basic Latin Entities",
			runTest: function(t) {
				//	summary:
				//		Simple test of basic encoding of characters considered Latin type entities
				//	description:
				//		Simple test of basic encoding of characters considered Latin type entities
				var txt = "";
				var expected = "";
				var map = dojox.html.entities.latin;
				var i;
				for(i = 0; i < map.length; i++){
					txt += map[i][0];
					expected += "&" + map[i][1] + ";";
				}
				var encodedTxt = dojox.html.entities.encode(txt);
				doh.assertEqual(expected, encodedTxt);
			}
		},
		{
			name: "Decode:  Basic Latin Entities",
			runTest: function(t) {
				//	summary:
				//		Simple test of basic decoding of characters considered Latin type entities
				//	description:
				//		Simple test of basic decoding of characters considered Latin type entities
					  var txt = "";
					  var expected = "";
					  var map = dojox.html.entities.latin;
					  var i;
					  for(i = 0; i < map.length; i++){
						  txt += "&" + map[i][1] + ";";
						  expected += map[i][0];
					  }
					  var decodedTxt = dojox.html.entities.decode(txt);
					  doh.assertEqual(expected, decodedTxt);
			}
		},
		{
			name: "Encode:  Custom entity map",
			runTest: function(t) {
				//	summary:
				//		Simple test of basic encoding using a custom map instead of the default ones.
				//	description:
				//		Simple test of basic encoding using a custom map instead of the default ones.
				var txt = "This is some \" text with & entities inside it that <need to be escaped>";
				var expected = "This is some &quot; text with & entities inside it that <need to be escaped>";
				var encodedTxt = dojox.html.entities.encode(txt, [["\"", "quot"]]);
				doh.assertEqual(expected, encodedTxt);
			}
		},
		{
			name: "Decode:  Custom entity map",
			runTest: function(t) {
				//	summary:
				//		Simple test of basic decoding using a custom map instead of the default ones.
				//	description:
				//		Simple test of basic decoding using a custom map instead of the default ones.
				var txt = "This is some &quot; text with & entities inside it that <need to be escaped>";
				var expected = "This is some \" text with & entities inside it that <need to be escaped>";
				var decodedTxt = dojox.html.entities.decode(txt, [["\"", "quot"]]);
				doh.assertEqual(expected, decodedTxt);
			}
		}
	]
);
