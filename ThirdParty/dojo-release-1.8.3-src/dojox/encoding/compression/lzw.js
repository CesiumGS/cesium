define([
	"dojo/_base/lang",	// dojo.extend
	"../bits"
], function(lang, bits) {

	var lzw = lang.getObject("dojox.encoding.compression.lzw", true);

	var _bits = function(x){
		var w = 1;
		for(var v = 2; x >= v; v <<= 1, ++w);
		return w;
	};

	lzw.Encoder = function(n){
		this.size = n;
		this.init();
	};

	lang.extend(lzw.Encoder, {
		init: function(){
			this.dict = {};
			for(var i = 0; i < this.size; ++i){
				this.dict[String.fromCharCode(i)] = i;
			}
			this.width = _bits(this.code = this.size);
			this.p = "";
		},
		encode: function(value, stream){
			var c = String.fromCharCode(value), p = this.p + c, r = 0;
			// if already in the dictionary
			if(p in this.dict){
				this.p = p;
				return r;
			}
			stream.putBits(this.dict[this.p], this.width);
			// if we need to increase the code length
			if((this.code & (this.code + 1)) == 0){
				stream.putBits(this.code++, r = this.width++);
			}
			// add new string
			this.dict[p] = this.code++;
			this.p = c;
			return r + this.width;
		},
		flush: function(stream){
			if(this.p.length == 0){
				return 0;
			}
			stream.putBits(this.dict[this.p], this.width);
			this.p = "";
			return this.width;
		}
	});

	lzw.Decoder = function(n){
		this.size = n;
		this.init();
	};

	lang.extend(lzw.Decoder, {
		init: function(){
			this.codes = new Array(this.size);
			for(var i = 0; i < this.size; ++i){
				this.codes[i] = String.fromCharCode(i);
			}
			this.width = _bits(this.size);
			this.p = -1;
		},
		decode: function(stream){
			var c = stream.getBits(this.width), v;
			if(c < this.codes.length){
				v = this.codes[c];
				if(this.p >= 0){
					this.codes.push(this.codes[this.p] + v.substr(0, 1));
				}
			}else{
				if((c & (c + 1)) == 0){
					this.codes.push("");
					++this.width;
					return "";
				}
				var x = this.codes[this.p];
				v = x + x.substr(0, 1);
				this.codes.push(v);
			}
			this.p = c;
			return v;
		}
	});

	return lzw;
});
