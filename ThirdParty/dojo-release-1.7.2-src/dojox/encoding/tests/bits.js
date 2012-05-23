define(['doh', '../bits'], function(doh, dcb){
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
	
	var testOut = function(msg){
		var a = new dcb.OutputStream();
		for(var i = 0; i < msg.length; ++i){
			var v = msg.charCodeAt(i);
			var j = Math.floor(Math.random() * 7) + 1;
			a.putBits(v >>> (8 - j), j);
			a.putBits(v, 8 - j);
		}
		return b2s(a.getBuffer());
	};

	var testIn = function(msg){
		var a = new dcb.InputStream(s2b(msg), msg.length * 8);
		var r = [];
		for(var i = 0; i < msg.length; ++i){
			var j = Math.floor(Math.random() * 7) + 1;
			r.push((a.getBits(j) << (8 - j)) | a.getBits(8 - j));
		}
		return b2s(r);
	};
	
	var test = function(msg){
		var a = new dcb.InputStream(s2b(msg), msg.length * 8);
		var o = new dcb.OutputStream();
		while(a.getWidth() > 0){
			var w = Math.min(a.getWidth(), 3);
			o.putBits(a.getBits(w), w);
		}
		return b2s(o.getBuffer());
	};

	doh.register("dojox.encoding.tests.bits", [
		function testBitsOut1(t){ t.assertEqual(msg1, testOut(msg1)); },
		function testBitsOut2(t){ t.assertEqual(msg2, testOut(msg2)); },
		function testBitsOut3(t){ t.assertEqual(msg3, testOut(msg3)); },
		function testBitsOut4(t){ t.assertEqual(msg4, testOut(msg4)); },
		function testBitsIn1(t){ t.assertEqual(msg1, testIn(msg1)); },
		function testBitsIn2(t){ t.assertEqual(msg2, testIn(msg2)); },
		function testBitsIn3(t){ t.assertEqual(msg3, testIn(msg3)); },
		function testBitsIn4(t){ t.assertEqual(msg4, testIn(msg4)); },
		function testBits1(t){ t.assertEqual(msg1, test(msg1)); },
		function testBits2(t){ t.assertEqual(msg2, test(msg2)); },
		function testBits3(t){ t.assertEqual(msg3, test(msg3)); },
		function testBits4(t){ t.assertEqual(msg4, test(msg4)); }
	]);
});
