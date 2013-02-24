define(["dojo/_base/lang"], function(lang){
	var d = lang.getObject("dojox.encoding.digests", true);

	//TODO: see if it makes sense to meld this into one with the
	//	crypto base enums
	d.outputTypes={
		// summary:
		//		Enumeration for input and output encodings.
		Base64:0, Hex:1, String:2, Raw:3
	};

	//	word-based addition
	d.addWords=function(/* word */a, /* word */b){
		// summary:
		//		add a pair of words together with rollover
		var l=(a&0xFFFF)+(b&0xFFFF);
		var m=(a>>16)+(b>>16)+(l>>16);
		return (m<<16)|(l&0xFFFF);	//	word
	};

	//	word-based conversion method, for efficiency sake;
	//	most digests operate on words, and this should be faster
	//	than the encoding version (which works on bytes).
	var chrsz=8;	//	16 for Unicode
	var mask=(1<<chrsz)-1;

	d.stringToWord=function(/* string */s){
		// summary:
		//		convert a string to a word array
		var wa=[];
		for(var i=0, l=s.length*chrsz; i<l; i+=chrsz){
			wa[i>>5]|=(s.charCodeAt(i/chrsz)&mask)<<(i%32);
		}
		return wa;	//	word[]
	};

	d.wordToString=function(/* word[] */wa){
		// summary:
		//		convert an array of words to a string
		var s=[];
		for(var i=0, l=wa.length*32; i<l; i+=chrsz){
			s.push(String.fromCharCode((wa[i>>5]>>>(i%32))&mask));
		}
		return s.join("");	//	string
	};

	d.wordToHex=function(/* word[] */wa){
		// summary:
		//		convert an array of words to a hex tab
		var h="0123456789abcdef", s=[];
		for(var i=0, l=wa.length*4; i<l; i++){
			s.push(h.charAt((wa[i>>2]>>((i%4)*8+4))&0xF)+h.charAt((wa[i>>2]>>((i%4)*8))&0xF));
		}
		return s.join("");	//	string
	};

	d.wordToBase64=function(/* word[] */wa){
		// summary:
		//		convert an array of words to base64 encoding, should be more efficient
		//		than using dojox.encoding.base64
		var p="=", tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", s=[];
		for(var i=0, l=wa.length*4; i<l; i+=3){
			var t=(((wa[i>>2]>>8*(i%4))&0xFF)<<16)|(((wa[i+1>>2]>>8*((i+1)%4))&0xFF)<<8)|((wa[i+2>>2]>>8*((i+2)%4))&0xFF);
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

	return d;
});
