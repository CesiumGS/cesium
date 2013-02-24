define(['doh', '../easy64'], function(doh, dce){
	var msg1 = "The rain in Spain falls mainly on the plain.";
	var msg2 = "The rain in Spain falls mainly on the plain.1";
	var msg3 = "The rain in Spain falls mainly on the plain.ab";
	var msg4 = "The rain in Spain falls mainly on the plain.!@#";
	
	var s2b = function(s){
		var b = [];
		for(var i = 0; i < s.length; ++i){
			b.push(s.charCodeAt(i));
		}
		return b;
	};

	var b2s = function(b){
		var s = [];
		dojo.forEach(b, function(c){ s.push(String.fromCharCode(c)); });
		return s.join("");
	};

	doh.register("dojox.encoding.tests.easy64", [
		function testEasyMsg1(t){ t.assertEqual(msg1, b2s(dce.decode(dce.encode(s2b(msg1))))); },
		function testEasyMsg2(t){ t.assertEqual(msg2, b2s(dce.decode(dce.encode(s2b(msg2))))); },
		function testEasyMsg3(t){ t.assertEqual(msg3, b2s(dce.decode(dce.encode(s2b(msg3))))); },
		function testEasyMsg4(t){ t.assertEqual(msg4, b2s(dce.decode(dce.encode(s2b(msg4))))); }
	]);
});
