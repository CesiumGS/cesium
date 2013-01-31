define(["dojo/_base/lang"], function(lang) {
	var easy64 = lang.getObject("dojox.encoding.easy64", true);
	var c = function(input, length, result){
		for(var i = 0; i < length; i += 3){
			result.push(
				String.fromCharCode((input[i] >>> 2) + 33),
				String.fromCharCode(((input[i] & 3) << 4) + (input[i + 1] >>> 4) + 33),
				String.fromCharCode(((input[i + 1] & 15) << 2) + (input[i + 2] >>> 6) + 33),
				String.fromCharCode((input[i + 2] & 63) + 33)
			);
		}
	};

	easy64.encode = function(input){
		// summary:
		//		encodes input data in easy64 string
		// input: Array
		//		an array of numbers (0-255) to encode
		var result = [], reminder = input.length % 3, length = input.length - reminder;
		c(input, length, result);
		if(reminder){
			var t = input.slice(length);
			while(t.length < 3){ t.push(0); }
			c(t, 3, result);
			for(var i = 3; i > reminder; result.pop(), --i);
		}
		return result.join("");	// String
	};

	easy64.decode = function(input){
		// summary:
		//		decodes the input string back to array of numbers
		// input: String
		//		the input string to decode
		var n = input.length, r = [], b = [0, 0, 0, 0], i, j, d;
		for(i = 0; i < n; i += 4){
			for(j = 0; j < 4; ++j){ b[j] = input.charCodeAt(i + j) - 33; }
			d = n - i;
			for(j = d; j < 4; b[++j] = 0);
			r.push(
				(b[0] << 2) + (b[1] >>> 4),
				((b[1] & 15) << 4) + (b[2] >>> 2),
				((b[2] & 3) << 6) + b[3]
			);
			for(j = d; j < 4; ++j, r.pop());
		}
		return r;
	};

	return easy64;
});
