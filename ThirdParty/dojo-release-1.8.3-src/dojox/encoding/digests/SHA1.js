define(["./_base"], function(dxd){

/*
 * A port of Paul Johnstone's SHA1 implementation
 *
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 *
 * Dojo port by Tom Trenka
 */

	var chrsz=8,	//	change to 16 for unicode.
		mask=(1<<chrsz)-1;

	function R(n,c){ return (n<<c)|(n>>>(32-c)); }
	function FT(t,b,c,d){
		if(t<20){ return (b&c)|((~b)&d); }
		if(t<40){ return b^c^d; }
		if(t<60){ return (b&c)|(b&d)|(c&d); }
		return b^c^d;
	}
	function KT(t){ return (t<20)?1518500249:(t<40)?1859775393:(t<60)?-1894007588:-899497514; }

	function core(x,len){
		x[len>>5]|=0x80<<(24-len%32);
		x[((len+64>>9)<<4)+15]=len;

		var w=new Array(80), a=1732584193, b=-271733879, c=-1732584194, d=271733878, e=-1009589776;
		for(var i=0; i<x.length; i+=16){
			var olda=a, oldb=b, oldc=c, oldd=d, olde=e;
			for(var j=0;j<80;j++){
				if(j<16){ w[j]=x[i+j]; }
				else { w[j]=R(w[j-3]^w[j-8]^w[j-14]^w[j-16],1); }
				var t = dxd.addWords(dxd.addWords(R(a,5),FT(j,b,c,d)),dxd.addWords(dxd.addWords(e,w[j]),KT(j)));
				e=d; d=c; c=R(b,30); b=a; a=t;
			}
			a=dxd.addWords(a,olda);
			b=dxd.addWords(b,oldb);
			c=dxd.addWords(c,oldc);
			d=dxd.addWords(d,oldd);
			e=dxd.addWords(e,olde);
		}
		return [a, b, c, d, e];
	}

	function hmac(data, key){
		var wa=toWord(key);
		if(wa.length>16){ wa=core(wa, key.length*chrsz); }

		var ipad=new Array(16), opad=new Array(16);
		for(var i=0;i<16;i++){
			ipad[i]=wa[i]^0x36363636;
			opad[i]=wa[i]^0x5c5c5c5c;
		}

		var hash=core(ipad.concat(toWord(data)),512+data.length*chrsz);
		return core(opad.concat(hash), 512+160);
	}

	function toWord(s){
		var wa=[];
		for(var i=0, l=s.length*chrsz; i<l; i+=chrsz){
			wa[i>>5]|=(s.charCodeAt(i/chrsz)&mask)<<(32-chrsz-i%32);
		}
		return wa;	//	word[]
	}

	function toHex(wa){
		//	slightly different than the common one.
		var h="0123456789abcdef", s=[];
		for(var i=0, l=wa.length*4; i<l; i++){
			s.push(h.charAt((wa[i>>2]>>((3-i%4)*8+4))&0xF), h.charAt((wa[i>>2]>>((3-i%4)*8))&0xF));
		}
		return s.join("");	//	string
	}

	function _toString(wa){
		var s=[];
		for(var i=0, l=wa.length*32; i<l; i+=chrsz){
			s.push(String.fromCharCode((wa[i>>5]>>>(32-chrsz-i%32))&mask));
		}
		return s.join("");	//	string
	}

	function toBase64(/* word[] */wa){
		// summary:
		//		convert an array of words to base64 encoding, should be more efficient
		//		than using dojox.encoding.base64
		var p="=", tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", s=[];
		for(var i=0, l=wa.length*4; i<l; i+=3){
			var t=(((wa[i>>2]>>8*(3-i%4))&0xFF)<<16)|(((wa[i+1>>2]>>8*(3-(i+1)%4))&0xFF)<<8)|((wa[i+2>>2]>>8*(3-(i+2)%4))&0xFF);
			for(var j=0; j<4; j++){
				if(i*8+j*6>wa.length*32){
					s.push(p);
				} else {
					s.push(tab.charAt((t>>6*(3-j))&0x3F));
				}
			}
		}
		return s.join("");	//	string
	};

	//	public function
	dxd.SHA1=function(/* String */data, /* dojox.encoding.digests.outputTypes? */outputType){
		// summary:
		//		Computes the SHA1 digest of the data, and returns the result according to output type.
		var out=outputType||dxd.outputTypes.Base64;
		var wa=core(toWord(data), data.length*chrsz);
		switch(out){
			case dxd.outputTypes.Raw:{
				return wa;	//	word[]
			}
			case dxd.outputTypes.Hex:{
				return toHex(wa);	//	string
			}
			case dxd.outputTypes.String:{
				return _toString(wa);	//	string
			}
			default:{
				return toBase64(wa);	//	string
			}
		}
	}

	//	make this private, for later use with a generic HMAC calculator.
	dxd.SHA1._hmac=function(/* string */data, /* string */key, /* dojox.encoding.digests.outputTypes? */outputType){
		// summary:
		//		computes the digest of data, and returns the result according to type outputType
		var out=outputType || dxd.outputTypes.Base64;
		var wa=hmac(data, key);
		switch(out){
			case dxd.outputTypes.Raw:{
				return wa;	//	word[]
			}
			case dxd.outputTypes.Hex:{
				return toHex(wa);	//	string
			}
			case dxd.outputTypes.String:{
				return _toString(wa);	//	string
			}
			default:{
				return toBase64(wa);	//	string
			}
		}
	};

	return dxd.SHA1;
});
