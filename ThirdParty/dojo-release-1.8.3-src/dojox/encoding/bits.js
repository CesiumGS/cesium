define([
	"dojo/_base/lang"	// dojo.extend
], function(lang) {
	var bits = lang.getObject("dojox.encoding.bits", true);

	bits.OutputStream = function(){
		this.reset();
	};

	lang.extend(bits.OutputStream, {
		reset: function(){
			this.buffer = [];
			this.accumulator = 0;
			this.available = 8;
		},
		putBits: function(value, width){
			while(width){
				var w = Math.min(width, this.available);
				var v = (w <= width ? value >>> (width - w) : value) << (this.available - w);
				this.accumulator |= v & (255 >>> (8 - this.available));
				this.available -= w;
				if(!this.available){
					this.buffer.push(this.accumulator);
					this.accumulator = 0;
					this.available = 8;
				}
				width -= w;
			}
		},
		getWidth: function(){
			return this.buffer.length * 8 + (8 - this.available);
		},
		getBuffer: function(){
			var b = this.buffer;
			if(this.available < 8){ b.push(this.accumulator & (255 << this.available)); }
			this.reset();
			return b;
		}
	});

	bits.InputStream = function(buffer, width){
		this.buffer = buffer;
		this.width = width;
		this.bbyte = this.bit = 0;
	};

	lang.extend(bits.InputStream, {
		getBits: function(width){
			var r = 0;
			while(width){
				var w = Math.min(width, 8 - this.bit);
				var v = this.buffer[this.bbyte] >>> (8 - this.bit - w);
				r <<= w;
				r |= v & ~(~0 << w);
				this.bit += w;
				if(this.bit == 8){
					++this.bbyte;
					this.bit = 0;
				}
				width -= w;
			}
			return r;
		},
		getWidth: function(){
			return this.width - this.bbyte * 8 - this.bit;
		}
	});


	return bits;
});
