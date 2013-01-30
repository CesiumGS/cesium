define(["dojo/_base/lang"], function(lang) {

	var ascii85 = lang.getObject("dojox.encoding.ascii85", true);

	var c = function(input, length, result){
		var i, j, n, b = [0, 0, 0, 0, 0];
		for(i = 0; i < length; i += 4){
			n = ((input[i] * 256 + input[i+1]) * 256 + input[i+2]) * 256 + input[i+3];
			if(!n){
				result.push("z");
			}else{
				for(j = 0; j < 5; b[j++] = n % 85 + 33, n = Math.floor(n / 85));
			}
			result.push(String.fromCharCode(b[4], b[3], b[2], b[1], b[0]));
		}
	};

	ascii85.encode = function(input){
		// summary:
		//		encodes input data in ascii85 string
		// input: Array
		//		an array of numbers (0-255) to encode
		var result = [], reminder = input.length % 4, length = input.length - reminder;
		c(input, length, result);
		if(reminder){
			var t = input.slice(length);
			while(t.length < 4){ t.push(0); }
			c(t, 4, result);
			var x = result.pop();
			if(x == "z"){ x = "!!!!!"; }
			result.push(x.substr(0, reminder + 1));
		}
		return result.join("");	// String
	};

	ascii85.decode = function(input){
		// summary:
		//		decodes the input string back to array of numbers
		// input: String
		//		the input string to decode
		var n = input.length, r = [], b = [0, 0, 0, 0, 0], i, j, t, x, y, d;
		for(i = 0; i < n; ++i){
			if(input.charAt(i) == "z"){
				r.push(0, 0, 0, 0);
				continue;
			}
			for(j = 0; j < 5; ++j){ b[j] = input.charCodeAt(i + j) - 33; }
			d = n - i;
			if(d < 5){
				for(j = d; j < 4; b[++j] = 0);
				b[d] = 85;
			}
			t = (((b[0] * 85 + b[1]) * 85 + b[2]) * 85 + b[3]) * 85 + b[4];
			x = t & 255;
			t >>>= 8;
			y = t & 255;
			t >>>= 8;
			r.push(t >>> 8, t & 255, y, x);
			for(j = d; j < 5; ++j, r.pop());
			i += 4;
		}
		return r;
	};

	return ascii85;
});
