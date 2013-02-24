define(["./_base"], function(dxd) {

/*	A port of Paul Johnstone's MD5 implementation
 *	http://pajhome.org.uk/crypt/md5/index.html
 *
 *	Copyright (C) Paul Johnston 1999 - 2002.
 *	Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * 	Distributed under the BSD License
 *
 *	Dojo port by Tom Trenka
 */

	var chrsz=8;

	//	MD5 rounds functions
	function R(n,c){ return (n<<c)|(n>>>(32-c)); }
	function C(q,a,b,x,s,t){ return dxd.addWords(R(dxd.addWords(dxd.addWords(a, q), dxd.addWords(x, t)), s), b); }
	function FF(a,b,c,d,x,s,t){ return C((b&c)|((~b)&d),a,b,x,s,t); }
	function GG(a,b,c,d,x,s,t){ return C((b&d)|(c&(~d)),a,b,x,s,t); }
	function HH(a,b,c,d,x,s,t){ return C(b^c^d,a,b,x,s,t); }
	function II(a,b,c,d,x,s,t){ return C(c^(b|(~d)),a,b,x,s,t); }

	//	the core MD5 rounds method
	function core(x,len){
		x[len>>5]|=0x80<<((len)%32);
		x[(((len+64)>>>9)<<4)+14]=len;
		var a= 1732584193;
		var b=-271733879;
		var c=-1732584194;
		var d= 271733878;
		for(var i=0; i<x.length; i+=16){
			var olda=a;
			var oldb=b;
			var oldc=c;
			var oldd=d;

			a=FF(a,b,c,d,x[i+ 0],7 ,-680876936);
			d=FF(d,a,b,c,x[i+ 1],12,-389564586);
			c=FF(c,d,a,b,x[i+ 2],17, 606105819);
			b=FF(b,c,d,a,x[i+ 3],22,-1044525330);
			a=FF(a,b,c,d,x[i+ 4],7 ,-176418897);
			d=FF(d,a,b,c,x[i+ 5],12, 1200080426);
			c=FF(c,d,a,b,x[i+ 6],17,-1473231341);
			b=FF(b,c,d,a,x[i+ 7],22,-45705983);
			a=FF(a,b,c,d,x[i+ 8],7 , 1770035416);
			d=FF(d,a,b,c,x[i+ 9],12,-1958414417);
			c=FF(c,d,a,b,x[i+10],17,-42063);
			b=FF(b,c,d,a,x[i+11],22,-1990404162);
			a=FF(a,b,c,d,x[i+12],7 , 1804603682);
			d=FF(d,a,b,c,x[i+13],12,-40341101);
			c=FF(c,d,a,b,x[i+14],17,-1502002290);
			b=FF(b,c,d,a,x[i+15],22, 1236535329);

			a=GG(a,b,c,d,x[i+ 1],5 ,-165796510);
			d=GG(d,a,b,c,x[i+ 6],9 ,-1069501632);
			c=GG(c,d,a,b,x[i+11],14, 643717713);
			b=GG(b,c,d,a,x[i+ 0],20,-373897302);
			a=GG(a,b,c,d,x[i+ 5],5 ,-701558691);
			d=GG(d,a,b,c,x[i+10],9 , 38016083);
			c=GG(c,d,a,b,x[i+15],14,-660478335);
			b=GG(b,c,d,a,x[i+ 4],20,-405537848);
			a=GG(a,b,c,d,x[i+ 9],5 , 568446438);
			d=GG(d,a,b,c,x[i+14],9 ,-1019803690);
			c=GG(c,d,a,b,x[i+ 3],14,-187363961);
			b=GG(b,c,d,a,x[i+ 8],20, 1163531501);
			a=GG(a,b,c,d,x[i+13],5 ,-1444681467);
			d=GG(d,a,b,c,x[i+ 2],9 ,-51403784);
			c=GG(c,d,a,b,x[i+ 7],14, 1735328473);
			b=GG(b,c,d,a,x[i+12],20,-1926607734);

			a=HH(a,b,c,d,x[i+ 5],4 ,-378558);
			d=HH(d,a,b,c,x[i+ 8],11,-2022574463);
			c=HH(c,d,a,b,x[i+11],16, 1839030562);
			b=HH(b,c,d,a,x[i+14],23,-35309556);
			a=HH(a,b,c,d,x[i+ 1],4 ,-1530992060);
			d=HH(d,a,b,c,x[i+ 4],11, 1272893353);
			c=HH(c,d,a,b,x[i+ 7],16,-155497632);
			b=HH(b,c,d,a,x[i+10],23,-1094730640);
			a=HH(a,b,c,d,x[i+13],4 , 681279174);
			d=HH(d,a,b,c,x[i+ 0],11,-358537222);
			c=HH(c,d,a,b,x[i+ 3],16,-722521979);
			b=HH(b,c,d,a,x[i+ 6],23, 76029189);
			a=HH(a,b,c,d,x[i+ 9],4 ,-640364487);
			d=HH(d,a,b,c,x[i+12],11,-421815835);
			c=HH(c,d,a,b,x[i+15],16, 530742520);
			b=HH(b,c,d,a,x[i+ 2],23,-995338651);

			a=II(a,b,c,d,x[i+ 0],6 ,-198630844);
			d=II(d,a,b,c,x[i+ 7],10, 1126891415);
			c=II(c,d,a,b,x[i+14],15,-1416354905);
			b=II(b,c,d,a,x[i+ 5],21,-57434055);
			a=II(a,b,c,d,x[i+12],6 , 1700485571);
			d=II(d,a,b,c,x[i+ 3],10,-1894986606);
			c=II(c,d,a,b,x[i+10],15,-1051523);
			b=II(b,c,d,a,x[i+ 1],21,-2054922799);
			a=II(a,b,c,d,x[i+ 8],6 , 1873313359);
			d=II(d,a,b,c,x[i+15],10,-30611744);
			c=II(c,d,a,b,x[i+ 6],15,-1560198380);
			b=II(b,c,d,a,x[i+13],21, 1309151649);
			a=II(a,b,c,d,x[i+ 4],6 ,-145523070);
			d=II(d,a,b,c,x[i+11],10,-1120210379);
			c=II(c,d,a,b,x[i+ 2],15, 718787259);
			b=II(b,c,d,a,x[i+ 9],21,-343485551);

			a=dxd.addWords(a, olda);
			b=dxd.addWords(b, oldb);
			c=dxd.addWords(c, oldc);
			d=dxd.addWords(d, oldd);
		}
		return [a,b,c,d];
	}

	function hmac(data, key){
		var wa=dxd.stringToWord(key);
		if(wa.length>16){
			wa=core(wa, key.length*chrsz);
		}
		var l=[], r=[];
		for(var i=0; i<16; i++){
			l[i]=wa[i]^0x36363636;
			r[i]=wa[i]^0x5c5c5c5c;
		}
		var h=core(l.concat(dxd.stringToWord(data)), 512+data.length*chrsz);
		return core(r.concat(h), 640);
	}

	//	public function
	dxd.MD5=function(/* string */data, /* dojox.encoding.digests.outputTypes? */outputType){
		// summary:
		//		computes the digest of data, and returns the result according to type outputType
		var out=outputType || dxd.outputTypes.Base64;
		var wa=core(dxd.stringToWord(data), data.length*chrsz);
		switch(out){
			case dxd.outputTypes.Raw:{
				return wa;	//	word[]
			}
			case dxd.outputTypes.Hex:{
				return dxd.wordToHex(wa);	//	string
			}
			case dxd.outputTypes.String:{
				return dxd.wordToString(wa);	//	string
			}
			default:{
				return dxd.wordToBase64(wa);	//	string
			}
		}
	};

	//	make this private, for later use with a generic HMAC calculator.
	dxd.MD5._hmac=function(/* string */data, /* string */key, /* dojox.encoding.digests.outputTypes? */outputType){
		// summary:
		//		computes the digest of data, and returns the result according to type outputType
		var out=outputType || dxd.outputTypes.Base64;
		var wa=hmac(data, key);
		switch(out){
			case dxd.outputTypes.Raw:{
				return wa;	//	word[]
			}
			case dxd.outputTypes.Hex:{
				return dxd.wordToHex(wa);	//	string
			}
			case dxd.outputTypes.String:{
				return dxd.wordToString(wa);	//	string
			}
			default:{
				return dxd.wordToBase64(wa);	//	string
			}
		}
	};

	return dxd.MD5;
});
