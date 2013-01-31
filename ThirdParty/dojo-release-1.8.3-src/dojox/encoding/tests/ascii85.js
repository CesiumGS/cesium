define(['doh', '../ascii85'], function(doh, dca){
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

	doh.register("dojox.encoding.tests.ascii85", [
		function testMsg1(t){ t.assertEqual(msg1, b2s(dca.decode(dca.encode(s2b(msg1))))); },
		function testMsg2(t){ t.assertEqual(msg2, b2s(dca.decode(dca.encode(s2b(msg2))))); },
		function testMsg3(t){ t.assertEqual(msg3, b2s(dca.decode(dca.encode(s2b(msg3))))); },
		function testMsg4(t){ t.assertEqual(msg4, b2s(dca.decode(dca.encode(s2b(msg4))))); }
	]);
});
