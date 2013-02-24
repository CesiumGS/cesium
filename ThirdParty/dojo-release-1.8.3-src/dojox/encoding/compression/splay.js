define([
	"dojo/_base/lang",	// dojo.extend
	"../bits"
], function(lang, bits) {
	var compression = lang.getObject("dojox.encoding.compression", true);

	compression.Splay = function(n){
		this.up = new Array(2 * n + 1);
		this.left = new Array(n);
		this.right = new Array(n);
		this.reset();
	};

	lang.extend(compression.Splay, {
		reset: function(){
			for(var i = 1; i < this.up.length; this.up[i] = Math.floor((i - 1) / 2), ++i);
			for(var i = 0; i < this.left.length; this.left[i] = 2 * i + 1, this.right[i] = 2 * i + 2, ++i);
		},
		splay: function(i){
			var a = i + this.left.length;
			do{
				var c = this.up[a];
				if(c){	// root
					// rotated pair
					var d = this.up[c];
					// swap descendants
					var b = this.left[d];
					if(c == b){
						b = this.right[d];
						this.right[d] = a;
					} else {
						this.left[d] = a;
					}
					this[a == this.left[c] ? "left" : "right"][c] = b;
					this.up[a] = d;
					this.up[b] = c;
					a = d;
				}else{
					a = c;
				}
			}while(a);	// root
		},
		encode: function(value, stream){
			var s = [], a = value + this.left.length;
			do{
				s.push(this.right[this.up[a]] == a);
				a = this.up[a];
			}while(a);	// root
			this.splay(value);
			var l = s.length;
			while(s.length){ stream.putBits(s.pop() ? 1 : 0, 1); }
			return	l;
		},
		decode: function(stream){
			var a = 0;	// root;
			do{
				a = this[stream.getBits(1) ? "right" : "left"][a];
			}while(a < this.left.length);
			a -= this.left.length;
			this.splay(a);
			return	a;
		}
	});


	return compression.Splay;
});
