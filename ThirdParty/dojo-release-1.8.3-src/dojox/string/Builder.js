define(["dojo/_base/lang"], 
  function(lang){
	lang.getObject("string", true, dojox).Builder = 
	  function(/*String?*/str){
		// summary:
		//		A fast buffer for creating large strings.

		//	N.B. the public nature of the internal buffer is no longer
		//	needed because the IE-specific fork is no longer needed--TRT.
		var b = "";

		// length: Number
		//		The current length of the internal string.
		this.length = 0;
		
		this.append = function(/* String... */s){
			// summary:
			//		Append all arguments to the end of the buffer
			if(arguments.length>1){
				/*
					This is a loop unroll was designed specifically for Firefox;
					it would seem that static index access on an Arguments
					object is a LOT faster than doing dynamic index access.
					Therefore, we create a buffer string and take advantage
					of JS's switch fallthrough.  The peformance of this method
					comes very close to straight up string concatenation (+=).

					If the arguments object length is greater than 9, we fall
					back to standard dynamic access.

					This optimization seems to have no real effect on either
					Safari or Opera, so we just use it for all.

					It turns out also that this loop unroll can increase performance
					significantly with Internet Explorer, particularly when
					as many arguments are provided as possible.

					Loop unroll per suggestion from Kris Zyp, implemented by
					Tom Trenka.

					Note: added empty string to force a string cast if needed.
				 */
				var tmp="", l=arguments.length;
				switch(l){
					case 9: tmp=""+arguments[8]+tmp;
					case 8: tmp=""+arguments[7]+tmp;
					case 7: tmp=""+arguments[6]+tmp;
					case 6: tmp=""+arguments[5]+tmp;
					case 5: tmp=""+arguments[4]+tmp;
					case 4: tmp=""+arguments[3]+tmp;
					case 3: tmp=""+arguments[2]+tmp;
					case 2: {
						b+=""+arguments[0]+arguments[1]+tmp;
						break;
					}
					default: {
						var i=0;
						while(i<arguments.length){
							tmp += arguments[i++];
						}
						b += tmp;
					}
				}
			} else {
				b += s;
			}
			this.length = b.length;
			return this;	//	dojox.string.Builder
		};
		
		this.concat = function(/*String...*/s){
			// summary:
			//		Alias for append.
			return this.append.apply(this, arguments);	//	dojox.string.Builder
		};
		
		this.appendArray = function(/*Array*/strings) {
			// summary:
			//		Append an array of items to the internal buffer.

			//	Changed from String.prototype.concat.apply because of IE.
			return this.append.apply(this, strings);	//	dojox.string.Builder
		};
		
		this.clear = function(){
			// summary:
			//		Remove all characters from the buffer.
			b = "";
			this.length = 0;
			return this;	//	dojox.string.Builder
		};
		
		this.replace = function(/* String */oldStr, /* String */ newStr){
			// summary:
			//		Replace instances of one string with another in the buffer.
			b = b.replace(oldStr,newStr);
			this.length = b.length;
			return this;	//	dojox.string.Builder
		};
		
		this.remove = function(/* Number */start, /* Number? */len){
			// summary:
			//		Remove len characters starting at index start.  If len
			//		is not provided, the end of the string is assumed.
			if(len===undefined){ len = b.length; }
			if(len == 0){ return this; }
			b = b.substr(0, start) + b.substr(start+len);
			this.length = b.length;
			return this;	//	dojox.string.Builder
		};
		
		this.insert = function(/* Number */index, /* String */str){
			// summary:
			//		Insert string str starting at index.
			if(index == 0){
				b = str + b;
			}else{
				b = b.slice(0, index) + str + b.slice(index);
			}
			this.length = b.length;
			return this;	//	dojox.string.Builder
		};
		
		this.toString = function(){
			// summary:
			//		Return the string representation of the internal buffer.
			return b;	//	String
		};

		//	initialize the buffer.
		if(str){ this.append(str); }
	};
	return dojox.string.Builder;
});
