define(['doh', '../../compression/splay', '../../bits'], function(doh, Splay, dcb){
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
		var x = new dcb.OutputStream(), encoder = new Splay(256);
		dojo.forEach(s2b(msg), function(v){ encoder.encode(v, x); });
		console.debug("bits =", x.getWidth());
		return x.getBuffer();
	};
	
	var decode = function(n, buf){
		var x = new dcb.InputStream(buf, buf.length * 8), decoder = new Splay(256), t = [];
		for(var i = 0; i < n; ++i){ t.push(decoder.decode(x)); }
		return b2s(t);
	};

	doh.register("dojox.encoding.tests.compression.splay", [
		function testSplayMsg1(t){ t.assertEqual(msg1, decode(msg1.length, encode(msg1))); },
		function testSplayMsg2(t){ t.assertEqual(msg2, decode(msg2.length, encode(msg2))); },
		function testSplayMsg3(t){ t.assertEqual(msg3, decode(msg3.length, encode(msg3))); },
		function testSplayMsg4(t){ t.assertEqual(msg4, decode(msg4.length, encode(msg4))); }
	]);
});
