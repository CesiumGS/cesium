define(['doh', '../../compression/lzw', '../../bits'], function(doh, dcl, dcb){
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
	
	var encode = function(msg){
		var x = new dcb.OutputStream(), encoder = new dcl.Encoder(128);
		dojo.forEach(s2b(msg), function(v){ encoder.encode(v, x); });
		encoder.flush(x);
		console.debug("bits =", x.getWidth());
		return x.getBuffer();
	};
	
	var decode = function(n, buf){
		var x = new dcb.InputStream(buf, buf.length * 8), decoder = new dcl.Decoder(128), t = [], w = 0;
		while(w < n){
			var v = decoder.decode(x);
			t.push(v);
			w += v.length;
		}
		return t.join("");
	};

	doh.register("dojox.encoding.tests.compression.lzw", [
		function testLzwMsg1(t){ t.assertEqual(msg1, decode(msg1.length, encode(msg1))); },
		function testLzwMsg2(t){ t.assertEqual(msg2, decode(msg2.length, encode(msg2))); },
		function testLzwMsg3(t){ t.assertEqual(msg3, decode(msg3.length, encode(msg3))); },
		function testLzwMsg4(t){ t.assertEqual(msg4, decode(msg4.length, encode(msg4))); }
	]);
});
