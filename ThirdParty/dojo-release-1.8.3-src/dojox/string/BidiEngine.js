define(["dojo/_base/lang", "dojo/_base/declare"], 
  function(lang,declare){
lang.getObject("string", true, dojox);

declare("dojox.string.BidiEngine", null, {
	// summary:
	//		This class provides a bidi transformation engine, i.e.
	//		functions for reordering and shaping bidi text.
	// description:
	//		Bidi stands for support for languages with a bidirectional script. 
	//
	//		Usually Unicode Bidi Algorithm used by OS platform (and web browsers) is capable of properly transforming
	//		Bidi text and as a result it is adequately displayed on the screen. However, in some situations, 
	//		Unicode Bidi Algorithm is not invoked or is not properly applied. This may occur in situation in which software
	//		responsible for rendering the text is not leveraging Unicode Bidi Algorithm implemented by OS (e.g. dojox.GFX renderers).
	//
	//		Bidi engine provided in this class implements Unicode Bidi Algorithm as specified at
	//		http://www.unicode.org/reports/tr9/.
	//
	//		For more information on basic Bidi concepts please read
	//		"Bidirectional script support - A primer" available from
	//		http://www.ibm.com/developerworks/websphere/library/techarticles/bidi/bidigen.html.
	//
	//		As of February 2011, Bidi engine has following limitations:
	//
	//		1. No support for following numeric shaping options:
	//		    - H - Hindi,
	//		    - C - Contextual,
	//		    - N - Nominal.
	//		2. No support for following shaping options:
	//		    - I - Initial shaping,
	//		    - M - Middle shaping,
	//		    - F - Final shaping,
	//		    - B - Isolated shaping.
	//		3. No support for source-to-target or/and target-to-source maps.
	//		4. No support for LRE/RLE/LRO/RLO/PDF (they are handled like neutrals).
	//		5. No support for Windows compatibility.
	//		6. No support for  insert/remove marks.
	//		7. No support for code pages (currently only UTF-8 is supported. Ideally we should convert from any code page to UTF-8).
	
	bidiTransform: function (/*String*/text, /*String*/formatIn, /*String*/formatOut){
		// summary:
		//		Central public API for Bidi engine. Transforms the text according to formatIn, formatOut parameters.
		//		If formatIn or formatOut parametrs are not valid throws an exception.
		// inputText:
		//		Input text subject to application of Bidi transformation.
		// formatIn:
		//		Input Bidi layout in which inputText is passed to the function.
		// formatOut:
		//		Output Bidi layout to which inputText should be transformed.
		// description:
		//		Both formatIn and formatOut parameters are 5 letters long strings. 
		//		For example - "ILYNN". Each letter is associated with specific attribute of Bidi layout. 
		//		Possible and default values for each one of the letters are provided below:
		//
		//		First letter:
		//
		//		- Letter position/index:
		//			1
		//		- Letter meaning:
		//			Ordering Schema.
		//		- Possible values:
		//			- I - Implicit (Logical).
		//			- V - Visual.
		//		- Default value:
		//			I
		//
		//		Second letter:
		//
		//		- Letter position/index:
		//			2
		//		- Letter meaning:
		//			Orientation.
		//		- Possible values:
		//			- L - Left To Right.
		//			- R - Right To Left.
		//			- C - Contextual Left to Right.
		//			- D - Contextual Right to Left.
		//		- Default value:
		//			L		
		//
		//		Third letter:
		//
		//		- Letter position/index:
		//			3
		//		- Letter meaning:
		//			Symmetric Swapping.
		//		- Possible values:
		//			- Y - Symmetric swapping is on.
		//			- N - Symmetric swapping is off.
		//		- Default value:
		//			Y		
		//
		//		Fourth letter:
		//
		//		- Letter position/index:
		//			4
		//		- Letter meaning:
		//			Shaping.
		//		- Possible values:
		//			- S - Text is shaped.
		//			- N - Text is not shaped.
		//		- Default value:
		//			N				
		//
		//		Fifth letter:
		//
		//		- Letter position/index:
		//			5
		//		- Letter meaning:
		//			Numeric Shaping.
		//		- Possible values:
		//			- N - Nominal.
		//		- Default value:
		//			N				
		//
		//		The output of this function is original text (passed via first argument) transformed from input Bidi layout (second argument)
		//		to output Bidi layout (last argument). 
		//
		//		Sample call:
		//	|	mytext = bidiTransform("HELLO WORLD", "ILYNN", "VLYNN");
		//		In this case, "HELLO WORLD" text is transformed from Logical - LTR to Visual - LTR Bidi layout with 
		//		default values for symmetric swapping (Yes), shaping (Not shaped) and numeric shaping (Nominal).
		// returns: String
		//		Original text transformed from input Bidi layout (second argument)
		//		to output Bidi layout (last argument).
		//		Throws an exception if the bidi layout strings are not valid.
		// tags:
		//		public
		
		if(!text){
			return '';
		}
		if(!formatIn && !formatOut){
			return text;
		}

		// regex for format validation
		// Allowed values for format string are:
		// 1st letter- I, V
		// 2nd letter- L, R, C, D
		// 3rd letter- Y, N
		// 4th letter- S, N
		// 5th letter- N
		var validFormat = /^[(I|V)][(L|R|C|D)][(Y|N)][(S|N)][N]$/;
		if(!validFormat.test(formatIn) || !validFormat.test(formatOut)){
			throw new Error("dojox.string.BidiEngine: the bidi layout string is wrong!");
		}

		if(formatIn == formatOut){
			return text;
		}

		var orientIn = getOrientation(formatIn.charAt(1))
			, orientOut = getOrientation(formatOut.charAt(1))
			, os_in = (formatIn.charAt(0) == 'I') ? 'L' : formatIn.charAt(0)
			, os_out = (formatOut.charAt(0) == 'I') ? 'L' : formatOut.charAt(0)
			, inFormat = os_in + orientIn
			, outFormat = os_out + orientOut
			, swap = formatIn.charAt(2) + formatOut.charAt(2)
			;

		if(inFormat){
			bdx.defInFormat = inFormat;
		}
		if(outFormat){
			bdx.defOutFormat = outFormat;
		}
		if(swap){
			bdx.defSwap = swap;
		}
		
		var stage1_text = doBidiReorder(text, os_in + orientIn, os_out + orientOut, formatIn.charAt(2) + formatOut.charAt(2))
			, isRtl = false;

		if(formatOut.charAt(1) == 'R'){
			isRtl = true;
		}else if(formatOut.charAt(1) == 'C' || formatOut.charAt(1) == 'D'){
			isRtl = this.checkContextual(stage1_text);
		}
		if(formatIn.charAt(3) == formatOut.charAt(3)){
			return stage1_text;
		}else if(formatOut.charAt(3) == 'S'){
			return shape(isRtl, stage1_text, true);
		}
		if(formatOut.charAt(3) == 'N'){
			return deshape(stage1_text, isRtl, true);
		}
	},
	checkContextual: function(/*String*/text){
		// summary:
		//		Determine the base direction of a bidi text according
		//		to its first strong directional character.
		// text: 
		//		The text to check.
		// returns: /*String*/
		//		"ltr" or "rtl" according to the first strong character.
		//		If there is no strong character, returns the value of the
		//		document dir property.
		// tags:
		//		public		
		var dir = firstStrongDir(text);
		if(dir != "ltr" && dir != "rtl"){
			dir = document.dir.toLowerCase();
			if(dir != "ltr" && dir != "rtl"){dir = "ltr";}
		}
		return dir;
	},
	hasBidiChar: function(/*String*/text){
		// summary:
		//		Return true if text contains RTL directed character.
		// text:
		//		The source string.
		// description:
		//		Iterates over the text string, letter by letter starting from its beginning,
		//		searching for RTL directed character. 
		//		Return true if found else false. Needed for vml transformation.
		// returns: /*Boolean*/
		//		true - if text has a RTL directed character.
		//		false - otherwise. 
		// tags:
		//		public

		var type = null, uc = null,	hi = null;
		for(var i = 0; i < text.length; i++){
			uc = text.charAt(i).charCodeAt(0);
			hi = MasterTable[uc >> 8];
			type = hi < TBBASE ? hi : UnicodeTable[hi - TBBASE][uc & 0xFF];
			if(type == UBAT_R || type == UBAT_AL){
				return true;
			}
			if(type == UBAT_B){
				break;
			}
		}
		return false;
	}	

});


function doBidiReorder(/*String*/text, /*String*/inFormat,
						/*String*/outFormat, /*String*/swap){
	// summary:
	//		Reorder the source text according to the bidi attributes
	//		of source and result.
	// text:
	//		The text to reorder.
	// inFormat:
	//		Ordering scheme and base direction of the source text.
	//		Can be "LLTR", "LRTL", "LCLR", "LCRL", "VLTR", "VRTL",
	//		"VCLR", "VCRL".
	//		The first letter is "L" for logical ordering scheme,
	//		"V" for visual ordering scheme.
	//		The other letters specify the base direction.
	//		"CLR" means contextual direction defaulting to LTR if
	//		there is no strong letter.
	//		"CRL" means contextual direction defaulting to RTL if
	//		there is no strong letter.
	//		The initial value is "LLTR", if none, the initial value is used.
	// outFormat:
	//		Required ordering scheme and base direction of the
	//		result. Has the same format as inFormat.
	//		If none, the initial value "VLTR" is used.
	// swap:
	//		Symmetric swapping attributes of source and result.
	//		The allowed values can be "YN", "NY", "YY" and "NN".
	//		The first letter reflects the symmetric swapping attribute
	//		of the source, the second letter that of the result.	
	// returns:
	//		Text reordered according to source and result attributes.

	if(inFormat == undefined){
		inFormat = bdx.defInFormat;
	}
	if(outFormat == undefined){
		outFormat = bdx.defOutFormat;
	}
	if(swap == undefined){
		swap = bdx.defSwap;
	}
	if(inFormat == outFormat){
		return text;
	}
	var dir, inOrdering = inFormat.substring(0,1)
		, inOrientation = inFormat.substring(1,4)
		, outOrdering = outFormat.substring(0,1)
		, outOrientation = outFormat.substring(1,4)
		;
	if(inOrientation.charAt(0) == "C"){
		dir = firstStrongDir(text);
		if(dir == "ltr" || dir == "rtl"){
			inOrientation = dir.toUpperCase();
		}else{
			inOrientation = inFormat.charAt(2) == "L" ? "LTR" : "RTL";
		}
		inFormat = inOrdering + inOrientation;
	}
	if(outOrientation.charAt(0) == "C"){
		dir = firstStrongDir(text);
		if(dir == "rtl"){
			outOrientation = "RTL";
		}else if(dir == "ltr"){
			dir = lastStrongDir(text);
			outOrientation = dir.toUpperCase();
		}else{
			outOrientation = outFormat.charAt(2) == "L" ? "LTR" : "RTL";
		}
		outFormat = outOrdering + outOrientation;
	}
	if(inFormat == outFormat){
		return text;
	}
	bdx.inFormat = inFormat;
	bdx.outFormat = outFormat;
	bdx.swap = swap;
	if((inOrdering == "L") && (outFormat == "VLTR")){ //core cases
		//cases: LLTR->VLTR, LRTL->VLTR
		if(inOrientation == "LTR"){
			bdx.dir = LTR;
			return doReorder(text);
		}
		if(inOrientation == "RTL"){
			bdx.dir = RTL;
			return doReorder(text);
		}
	}
	if((inOrdering == "V") && (outOrdering == "V")){
		//inOrientation != outOrientation
		//cases: VRTL->VLTR, VLTR->VRTL
		return invertStr(text);
	}
	if((inOrdering == "L") && (outFormat == "VRTL")){
		//cases: LLTR->VRTL, LRTL->VRTL
		if(inOrientation == "LTR"){
			bdx.dir = LTR;
			text = doReorder(text);
		}else{
			//inOrientation == RTL
			bdx.dir = RTL;
			text = doReorder(text);
		}
		return invertStr(text);
	}
	if((inFormat == "VLTR") && (outFormat == "LLTR")){
		//case: VLTR->LLTR
		bdx.dir = LTR;
		return doReorder(text);
	}
	if((inOrdering == "V") && (outOrdering == "L") && (inOrientation != outOrientation)){
		//cases: VLTR->LRTL, VRTL->LLTR
		text = invertStr(text);

		return (inOrientation == "RTL") ? doBidiReorder(text, "LLTR","VLTR", swap) : doBidiReorder(text, "LRTL","VRTL", swap);
	}
	if((inFormat == "VRTL") && (outFormat == "LRTL")){
		//case VRTL->LRTL
		return doBidiReorder(text, "LRTL","VRTL", swap);
	}
	if((inOrdering == "L") && (outOrdering == "L")){
		//inOrientation != outOrientation
		//cases: LRTL->LLTR, LLTR->LRTL
		var saveSwap = bdx.swap;
		bdx.swap = saveSwap.substr(0, 1) + "N";
		if(inOrientation == "RTL"){
			//LRTL->LLTR
			bdx.dir = RTL;
			text = doReorder(text);
			bdx.swap = "N" + saveSwap.substr(1, 2);
			bdx.dir = LTR;
			text = doReorder(text);
		}else{ //LLTR->LRTL
			bdx.dir = LTR;
			text = doReorder(text);
			bdx.swap = "N" + saveSwap.substr(1, 2);
			text = doBidiReorder(text, "VLTR","LRTL", bdx.swap);
		}
		return text;
	}

}

function shape(/*boolean*/rtl, /*String*/text, /*boolean*/compress){
	// summary:
	//		Shape the source text.
	// rtl:
	//		Flag indicating if the text is in RTL direction (logical
	//		direction for Arabic words).
	// text:
	//		The text to shape.
	// compress:
	//		A flag indicates to insert extra space after the lam alef compression
	//		to preserve the buffer size or not insert an extra space which will lead
	//		to decrease the buffer size. This option can be:
	//
	//		- true (default) to not insert extra space after compressing Lam+Alef into one character Lamalef
	//		- false to insert an extra space after compressed Lamalef to preserve the buffer size
	// returns:
	//		text shaped.
	// tags:
	//		private.
	
	if(text.length == 0){
		return;
	}
	if(rtl == undefined){
		rtl = true;
	}
	if(compress == undefined){
		compress = true;
	}
	text = new String(text);
	
	var str06 = text.split("")
		, Ix = 0
		, step = +1
		, nIEnd = str06.length
		;
	if(!rtl){
		Ix = str06.length - 1;
		step = -1;
		nIEnd = 1;
	}
	var previousCursive = 0, compressArray = [], compressArrayIndx = 0;
	for(var index = Ix; index * step < nIEnd; index = index + step){
		if(isArabicAlefbet(str06[index]) || isArabicDiacritics(str06[index])){
			// Arabic letter Lam
			if(str06[index] == '\u0644'){
				if(isNextAlef(str06, (index + step), step, nIEnd)){
					str06[index] = (previousCursive == 0) ? getLamAlefFE(str06[index + step], LamAlefInialTableFE) : getLamAlefFE(str06[index + step], LamAlefMedialTableFE);
					index += step;
					setAlefToSpace(str06, index, step, nIEnd);
					if(compress){
						compressArray[compressArrayIndx] = index;
						compressArrayIndx++;
					}
					previousCursive = 0;
					continue;
				}
			}
			var currentChr = str06[index];
			if(previousCursive == 1){
				// if next is Arabic
				//Character is in medial form
				// else character is in final form
				str06[index] = (isNextArabic(str06, (index + step), step, nIEnd)) ? 
					getMedialFormCharacterFE(str06[index]) : getFormCharacterFE(str06[index], FinalForm);
			}else{
				if(isNextArabic(str06, (index + step), step, nIEnd) == true){
					//character is in Initial form
					str06[index] = getFormCharacterFE(str06[index],InitialForm);
				}else{
					str06[index] = getFormCharacterFE(str06[index], IsolatedForm);
				}
			}
			//exam if the current character is cursive
			if(!isArabicDiacritics(currentChr)){
				previousCursive = 1;
			}
			if(isStandAlonCharacter(currentChr) == true){
				previousCursive = 0;
			}
		}else{
			previousCursive = 0;
		}
	}
	var outBuf = "";
	for(idx = 0; idx < str06.length; idx++){
		if(!(compress && indexOf(compressArray, compressArray.length, idx) > -1)){
			outBuf += str06[idx];
		}
	}
	return outBuf;
}

function firstStrongDir(/*String*/text){
	// summary:
	//		Return the first strong character direction
	// text:
	//		The source string.
	// description:
	//		Iterates over the text string, letter by letter starting from its beginning,
	//		searching for first "strong" character. 
	//		Returns if strong character was found with the direction defined by this 
	//		character, if no strong character was found returns an empty string.
	// returns: String
	//		"ltr" - if the first strong character is Latin.
	//		"rtl" - if the first strong character is RTL directed character.
	//		"" - if the strong character wasn't found.
	// tags:
	//		private

	var type = null, uc = null, hi = null;
	for(var i = 0; i < text.length; i++){
		uc = text.charAt(i).charCodeAt(0);
		hi = MasterTable[uc >> 8];
		type = hi < TBBASE ? hi : UnicodeTable[hi - TBBASE][uc & 0xFF];
		if(type == UBAT_R || type == UBAT_AL){
			return "rtl";
		}
		if(type == UBAT_L){
			return	"ltr";
		}
		if(type == UBAT_B){
			break;
		}
	}
	return "";
}

function lastStrongDir(text){
	// summary:
	//		Return the last strong character direction
	// text:
	//		The source string.
	// description:
	//		Iterates over the text string, letter by letter starting from its end,
	//		searching for first (from the end) "strong" character. 
	//		Returns if strong character was found with the direction defined by this 
	//		character, if no strong character was found returns an empty string.
	// tags:
	//		private		
	var type = null;
	for(var i = text.length - 1; i >= 0; i--){
		type = getCharacterType(text.charAt(i));
		if(type == UBAT_R || type == UBAT_AL){
			return "rtl";
		}
		if(type == UBAT_L){
			return	"ltr";
		}
		if(type == UBAT_B){
			break;
		}
	}
	return "";
}

function deshape(/*String*/text, /*boolean*/rtl, /*boolean*/consume_next_space){
	// summary:
	//		deshape the source text.
	// text:
	//		the text to be deshape.
	// rtl:
	//		flag indicating if the text is in RTL direction (logical
	//		direction for Arabic words).
	// consume_next_space:
	//		flag indicating whether to consume the space next to the 
	//		the lam alef if there is a space followed the Lamalef character to preserve the buffer size. 
	//		In case there is no space next to the lam alef the buffer size will be increased due to the
	//		expansion of the lam alef one character into lam+alef two characters
	// returns:
	//		text deshaped.
	if(text.length == 0){
		return;
	}
	if(consume_next_space == undefined){
		consume_next_space = true;
	}
	if(rtl == undefined){
		rtl = true;
	}
	text = new String(text);

	var outBuf = "", strFE = [], textBuff = "";
	if(consume_next_space){
		for(var j = 0; j < text.length; j++){
			if(text.charAt(j) == ' '){
				if(rtl){
					if(j > 0){
						if(text.charAt(j - 1) >= '\uFEF5' && text.charAt(j - 1) <= '\uFEFC'){
							continue;
						}
					}
				}else{
					if(j+1 < text.length){
						if(text.charAt(j + 1) >= '\uFEF5' && text.charAt(j + 1) <= '\uFEFC'){
							continue;
						}
					}				
				}
			}
			textBuff += text.charAt(j);
		}
	}else{
		textBuff = new String(text);
	}
	strFE = textBuff.split("");
	for(var i = 0; i < textBuff.length; i++){
		if(strFE[i] >= '\uFE70' && strFE[i] < '\uFEFF'){
			var chNum = textBuff.charCodeAt(i);
			if(strFE[i] >= '\uFEF5' && strFE[i] <= '\uFEFC'){
				//expand the LamAlef
				if(rtl){
					//Lam + Alef
					outBuf += '\u0644';
					outBuf += AlefTable[parseInt((chNum - 65269) / 2)];
				}else{
					outBuf += AlefTable[parseInt((chNum - 65269) / 2)];
					outBuf += '\u0644';
				}
			}else{
				outBuf += FETo06Table[chNum - 65136];
			}
		}else{
			outBuf += strFE[i];
		}
	}
	return outBuf;
}

function doReorder(str){
	// summary:
	//		Helper to the doBidiReorder. Manages the UBA.
	// str:
	//		the string to reorder.
	// returns:
	//		text reordered according to source and result attributes.
	// tags: 
	//		private	
	var chars = str.split(""), levels = [];

	computeLevels(chars, levels);
	swapChars(chars, levels);
	invertLevel(2, chars, levels);
	invertLevel(1, chars, levels);
	return chars.join("");
}

function computeLevels(chars, levels){
	var len = chars.length
		, impTab = bdx.dir ? impTab_RTL : impTab_LTR
		, prevState = null, newClass = null, newLevel = null, newState = 0
		, action = null, cond = null, condPos = -1, i = null, ix = null
		, types = []
		, classes = []
		;
	bdx.hiLevel = bdx.dir;
	bdx.lastArabic = false;
	bdx.hasUBAT_AL = false,
	bdx.hasUBAT_B = false;
	bdx.hasUBAT_S = false;
	for(i = 0; i < len; i++){
		types[i] = getCharacterType(chars[i]);
	}
	for(ix = 0; ix < len; ix++){
		prevState = newState;
		classes[ix] = newClass = getCharClass(chars, types, classes, ix);
		newState = impTab[prevState][newClass];
		action = newState & 0xF0;
		newState &= 0x0F;
		levels[ix] = newLevel = impTab[newState][ITIL];
		if(action > 0){
			if(action == 0x10){	// set conditional run to level 1
				for(i = condPos; i < ix; i++){
					levels[i] = 1;
				}
				condPos = -1;
			}else{	// 0x20 confirm the conditional run
				condPos = -1;
			}
		}
		cond = impTab[newState][ITCOND];
		if(cond){
			if(condPos == -1){
				condPos = ix;
			}
		}else{	// unconditional level
			if(condPos > -1){
				for(i = condPos; i < ix; i++){
					levels[i] = newLevel;
				}
				condPos = -1;
			}
		}
		if(types[ix] == UBAT_B){
			levels[ix] = 0;
		}
		bdx.hiLevel |= newLevel;
	}
	if(bdx.hasUBAT_S){
		for(i = 0; i < len; i++){
			if(types[i] == UBAT_S){
				levels[i] = bdx.dir;
				for(var j = i - 1; j >= 0; j--){
					if(types[j] == UBAT_WS){
						levels[j] = bdx.dir;
					}else{
						break;
					}
				}
			}
		}
	}
}

function swapChars(chars, levels){
	// summary:
	//		Swap characters with symmetrical mirroring as all kinds of parenthesis.
	//		(When needed).
	// chars:
	//		The source string as Array of characters.
	// levels:
	//		An array (like hash) of flags for each character in the source string,
	//		that defines if swapping should be applied on the following character.
	// description:
	//		First checks if the swapping should be applied, if not returns, else 
	//		uses the levels "hash" to find what characters should be swapped.
	// tags:
	//		private	

	if(bdx.hiLevel == 0 || bdx.swap.substr(0, 1) == bdx.swap.substr(1, 2)){
		return;
	}

	//console.log("bdx.hiLevel == 0: " + bdx.hiLevel + "bdx.swap[0]: "+ bdx.swap[0] +" bdx.swap[1]: " +bdx.swap[1]);
	for(var i = 0; i < chars.length; i++){
		if(levels[i] == 1){chars[i] = getMirror(chars[i]);}
	}
}

function getCharacterType(ch){
	// summary:
	//		Return the type of the character.
	// ch:
	//		The character to be checked.

	// description:
	//		Check the type of the character according to MasterTable,
	//		type = LTR, RTL, neutral,Arabic-Indic digit etc.
	// tags:
	//		private			
	var uc = ch.charCodeAt(0)
		, hi = MasterTable[uc >> 8];
	return (hi < TBBASE) ? hi : UnicodeTable[hi - TBBASE][uc & 0xFF];
}

function invertStr(str){
	// summary:
	//		Return the reversed string.
	// str:
	//		The string to be reversed.
	// description:
	//		Reverse the string str.
	// tags:
	//		private					
	var chars = str.split("");
	chars.reverse();
	return chars.join("");
}

function indexOf(cArray, cLength, idx){
	var counter = -1;
	for(var i = 0; i < cLength; i++){
		if(cArray[i] == idx){
			return i;
		}
	}
	return -1;
}

function isArabicAlefbet(c){
	for(var i = 0; i < ArabicAlefBetIntervalsBegine.length; i++){
		if(c >= ArabicAlefBetIntervalsBegine[i] && c <= ArabicAlefBetIntervalsEnd[i]){
			return true;
		}
	}
	return false;
}

function isNextArabic(str06, index, step, nIEnd){
	while(((index) * step) < nIEnd && isArabicDiacritics(str06[index])){
		index += step;
	}
	if(((index) * step) < nIEnd && isArabicAlefbet(str06[index])){
		return true;
	}
	return false;
}

function isNextAlef(str06, index, step, nIEnd){
	while(((index) * step) < nIEnd && isArabicDiacritics(str06[index])){
		index += step;
	}
	var c = ' ';
	if(((index) * step) < nIEnd){
		c = str06[index];
	}else{
		return false;
	}
	for(var i = 0; i < AlefTable.length; i++){
		if(AlefTable[i] == c){
			return true;
		}
	}
	return false;
}

function invertLevel(lev, chars, levels){
	if(bdx.hiLevel < lev){
		return;
	}
	if(lev == 1 && bdx.dir == RTL && !bdx.hasUBAT_B){
		chars.reverse();
		return;
	}
	var len = chars.length, start = 0, end, lo, hi, tmp;
	while(start < len){
		if(levels[start] >= lev){
			end = start + 1;
			while(end < len && levels[end] >= lev){
				end++;
			}
			for(lo = start, hi = end - 1 ; lo < hi; lo++, hi--){
				tmp = chars[lo];
				chars[lo] = chars[hi];
				chars[hi] = tmp;
			}
			start = end;
		}
		start++;
	}
}

function getCharClass(chars, types, classes, ix){
	// summary:
	//		Return the class if ix character in chars.
	// chars:
	//		The source string as Array of characters.
	// types:
	//		Array of types, for each character in chars.
	// classes:
	//		Array of classes that already been solved. 
	// ix:
	//		the index of checked character.
	// tags:
	//		private				
	var cType = types[ix], wType, nType, len, i;
	switch(cType){
		case UBAT_L:
		case UBAT_R:
			bdx.lastArabic = false;
		case UBAT_ON:
		case UBAT_AN:
			return cType;
		case UBAT_EN:
			return bdx.lastArabic ? UBAT_AN : UBAT_EN;
		case UBAT_AL:
			bdx.lastArabic = true;
			bdx.hasUBAT_AL = true;
			return UBAT_R;
		case UBAT_WS:
			return UBAT_ON;
		case UBAT_CS:
			if(ix < 1 || (ix + 1) >= types.length ||
				((wType = classes[ix - 1]) != UBAT_EN && wType != UBAT_AN) ||
				((nType = types[ix + 1]) != UBAT_EN && nType != UBAT_AN)){
				return UBAT_ON;
			}
			if(bdx.lastArabic){nType = UBAT_AN;}
			return nType == wType ? nType : UBAT_ON;
		case UBAT_ES:
			wType = ix > 0 ? classes[ix - 1] : UBAT_B;
			if(wType == UBAT_EN && (ix + 1) < types.length && types[ix + 1] == UBAT_EN){
				return UBAT_EN;
			}
			return UBAT_ON;
		case UBAT_ET:
			if(ix > 0 && classes[ix - 1] == UBAT_EN){
				return UBAT_EN;
			}
			if(bdx.lastArabic){
				return UBAT_ON;
			}
			i = ix + 1;
			len = types.length;
			while(i < len && types[i] == UBAT_ET){
				i++;
			}
			if(i < len && types[i] == UBAT_EN){
				return UBAT_EN;
			}
			return UBAT_ON;
		case UBAT_NSM:
			if(bdx.inFormat == "VLTR"){	// visual to implicit transformation
				len = types.length;
				i = ix + 1;
				while(i < len && types[i] == UBAT_NSM){
					i++;
				}
				if(i < len){
					var c = chars[ix]
						, rtlCandidate = (c >= 0x0591 && c <= 0x08FF) || c == 0xFB1E
						;
					wType = types[i];
					if(rtlCandidate && (wType == UBAT_R || wType == UBAT_AL)){
						return UBAT_R;
					}
				}
			}
			if(ix < 1 || (wType = types[ix - 1]) == UBAT_B){
				return UBAT_ON;
			}
			return classes[ix - 1];
		case UBAT_B:
			lastArabic = false;
			bdx.hasUBAT_B = true;
			return bdx.dir;
		case UBAT_S:
			bdx.hasUBAT_S = true;
			return UBAT_ON;
		case UBAT_LRE:
		case UBAT_RLE:
		case UBAT_LRO:
		case UBAT_RLO:
		case UBAT_PDF:
			lastArabic = false;
		case UBAT_BN:
			return UBAT_ON;
	}
}

function getMirror(c){
	// summary:
	//		Calculates the mirrored character of c
	// c:
	//		The character to be mirrored.
	// tags:
	//		private					
	var mid, low = 0, high = SwapTable.length - 1;

	while(low <= high){
		mid = Math.floor((low + high) / 2);
		if(c < SwapTable[mid][0]){
			high = mid - 1;
		}else if(c > SwapTable[mid][0]){
			low = mid + 1;
		}else{
			return SwapTable[mid][1];
		}
	}
	return c;
}

function isStandAlonCharacter(c){
	for(var i = 0; i < StandAlonForm.length; i++){
		if(StandAlonForm[i] == c){
			return true;
		}
	}
	return false;
}

function getMedialFormCharacterFE(c){
	for(var i = 0; i < BaseForm.length; i++){
		if(c == BaseForm[i]){
			return MedialForm[i];
		}
	}
	return c;
}

function getFormCharacterFE(/*char*/ c, /*char[]*/formArr){
	for(var i = 0; i < BaseForm.length; i++){
		if(c == BaseForm[i]){
			return formArr[i];
		}
	}
	return c;
}

function isArabicDiacritics(c){
	return	(c >= '\u064b' && c <= '\u0655') ? true : false;
}

function getOrientation(/*Char*/ oc){
	if(oc == 'L'){
		return "LTR";
	}
	if(oc == 'R'){
		return "RTL";
	}
	if(oc == 'C'){
		return "CLR";
	}
	if(oc == 'D'){
		return "CRL";
	}
}

function setAlefToSpace(str06, index, step, nIEnd){
	while(((index) * step) < nIEnd && isArabicDiacritics(str06[index])){
		index += step;
	}
	if(((index) * step) < nIEnd){
		str06[index] = ' ';
		return true;
	}
	return false;
}

function getLamAlefFE(alef06, LamAlefForm){
	for(var i = 0; i < AlefTable.length; i++){
		if(alef06 == AlefTable[i]){
			return LamAlefForm[i];
		}
	}
	return alef06;
}

function LamAlef(alef){
	// summary:
	//		If the alef variable is an ARABIC ALEF letter,
	//		return the LamAlef code associated with the specific 
	//		alef character.
	// alef:
	//		The alef code type.
	// description:
	//		If "alef" is an ARABIC ALEF letter, identify which alef is it,
	//		using AlefTable, then return the LamAlef associated with it.
	// tags:
	//		private			
	for(var i = 0; i < AlefTable.length; i++){
		if(AlefTable[i] == alef){
			return AlefTable[i];
		}
	}
	return 0;
}

var	bdx = {
		dir: 0,
		defInFormat: "LLTR",
		defoutFormat: "VLTR",
		defSwap: "YN",
		inFormat: "LLTR",
		outFormat: "VLTR",
		swap: "YN",
		hiLevel: 0,
		lastArabic: false,
		hasUBAT_AL: false,
		hasBlockSep: false,
		hasSegSep: false
};

var ITIL = 5;

var ITCOND = 6;

var LTR = 0;

var RTL = 1;

/****************************************************************************/
/* Array in which directional characters are replaced by their symmetric.	*/
/****************************************************************************/
var SwapTable = [
	[ "\u0028", "\u0029" ],	/* Round brackets					*/
	[ "\u0029", "\u0028" ],
	[ "\u003C", "\u003E" ],	/* Less than/greater than			*/
	[ "\u003E", "\u003C" ],
	[ "\u005B", "\u005D" ],	/* Square brackets					*/
	[ "\u005D", "\u005B" ],
	[ "\u007B", "\u007D" ],	/* Curly brackets					*/
	[ "\u007D", "\u007B" ],
	[ "\u00AB", "\u00BB" ],	/* Double angle quotation marks	*/
	[ "\u00BB", "\u00AB" ],
	[ "\u2039", "\u203A" ],	/* single angle quotation mark		*/
	[ "\u203A", "\u2039" ],
	[ "\u207D", "\u207E" ],	/* Superscript parentheses			*/
	[ "\u207E", "\u207D" ],
	[ "\u208D", "\u208E" ],	/* Subscript parentheses			*/
	[ "\u208E", "\u208D" ],
	[ "\u2264", "\u2265" ],	/* Less/greater than or equal		*/
	[ "\u2265", "\u2264" ],
	[ "\u2329", "\u232A" ],	/* Angle brackets					*/
	[ "\u232A", "\u2329" ],
	[ "\uFE59", "\uFE5A" ],	/* Small round brackets			*/
	[ "\uFE5A", "\uFE59" ],
	[ "\uFE5B", "\uFE5C" ],	/* Small curly brackets			*/
	[ "\uFE5C", "\uFE5B" ],
	[ "\uFE5D", "\uFE5E" ],	/* Small tortoise shell brackets	*/
	[ "\uFE5E", "\uFE5D" ],
	[ "\uFE64", "\uFE65" ],	/* Small less than/greater than	*/
	[ "\uFE65", "\uFE64" ]
];
var AlefTable = ['\u0622', '\u0623', '\u0625', '\u0627'];

var AlefTableFE = [0xFE81, 0xFE82, 0xFE83, 0xFE84, 0xFE87, 0xFE88, 0xFE8D, 0xFE8E];

var LamTableFE = [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0];

var LamAlefInialTableFE = ['\ufef5', '\ufef7', '\ufef9', '\ufefb'];

var LamAlefMedialTableFE = ['\ufef6', '\ufef8', '\ufefa', '\ufefc'];
/**
 * Arabic Characters in the base form
 */
var BaseForm = ['\u0627', '\u0628', '\u062A', '\u062B', '\u062C', '\u062D', '\u062E', '\u062F', '\u0630', '\u0631', '\u0632', '\u0633', '\u0634', '\u0635', '\u0636', '\u0637', '\u0638', '\u0639', '\u063A', '\u0641', '\u0642', '\u0643', '\u0644', '\u0645', '\u0646', '\u0647', '\u0648', '\u064A', '\u0625', '\u0623', '\u0622', '\u0629', '\u0649', '\u06CC', '\u0626', '\u0624', '\u064B', '\u064C', '\u064D', '\u064E', '\u064F', '\u0650', '\u0651', '\u0652', '\u0621'];

/**
 * Arabic shaped characters in Isolated form
 */
var IsolatedForm = ['\uFE8D', '\uFE8F', '\uFE95', '\uFE99', '\uFE9D', '\uFEA1', '\uFEA5', '\uFEA9', '\uFEAB', '\uFEAD', '\uFEAF', '\uFEB1', '\uFEB5', '\uFEB9', '\uFEBD', '\uFEC1', '\uFEC5', '\uFEC9', '\uFECD', '\uFED1', '\uFED5', '\uFED9', '\uFEDD', '\uFEE1', '\uFEE5', '\uFEE9', '\uFEED', '\uFEF1', '\uFE87', '\uFE83', '\uFE81', '\uFE93', '\uFEEF', '\uFBFC', '\uFE89', '\uFE85', '\uFE70', '\uFE72', '\uFE74', '\uFE76', '\uFE78', '\uFE7A', '\uFE7C', '\uFE7E', '\uFE80'];

/**
 * Arabic shaped characters in Final form
 */
var FinalForm = ['\uFE8E', '\uFE90', '\uFE96', '\uFE9A', '\uFE9E', '\uFEA2', '\uFEA6', '\uFEAA', '\uFEAC', '\uFEAE', '\uFEB0', '\uFEB2', '\uFEB6', '\uFEBA', '\uFEBE', '\uFEC2', '\uFEC6', '\uFECA', '\uFECE', '\uFED2', '\uFED6', '\uFEDA', '\uFEDE', '\uFEE2', '\uFEE6', '\uFEEA', '\uFEEE', '\uFEF2', '\uFE88', '\uFE84', '\uFE82', '\uFE94', '\uFEF0', '\uFBFD', '\uFE8A', '\uFE86', '\uFE70', '\uFE72', '\uFE74', '\uFE76', '\uFE78', '\uFE7A', '\uFE7C', '\uFE7E', '\uFE80'];

/**
 * Arabic shaped characters in Media form
 */
var MedialForm = ['\uFE8E', '\uFE92', '\uFE98', '\uFE9C', '\uFEA0', '\uFEA4', '\uFEA8', '\uFEAA', '\uFEAC', '\uFEAE', '\uFEB0', '\uFEB4', '\uFEB8', '\uFEBC', '\uFEC0', '\uFEC4', '\uFEC8', '\uFECC', '\uFED0', '\uFED4', '\uFED8', '\uFEDC', '\uFEE0', '\uFEE4', '\uFEE8', '\uFEEC', '\uFEEE', '\uFEF4', '\uFE88', '\uFE84', '\uFE82', '\uFE94', '\uFEF0', '\uFBFF', '\uFE8C', '\uFE86', '\uFE71', '\uFE72', '\uFE74', '\uFE77', '\uFE79', '\uFE7B', '\uFE7D', '\uFE7F', '\uFE80'];

/**
 * Arabic shaped characters in Initial form
 */
var InitialForm = ['\uFE8D', '\uFE91', '\uFE97', '\uFE9B', '\uFE9F', '\uFEA3', '\uFEA7', '\uFEA9', '\uFEAB', '\uFEAD', '\uFEAF', '\uFEB3', '\uFEB7', '\uFEBB', '\uFEBF', '\uFEC3', '\uFEC7', '\uFECB', '\uFECF', '\uFED3', '\uFED7', '\uFEDB', '\uFEDF', '\uFEE3', '\uFEE7', '\uFEEB', '\uFEED', '\uFEF3', '\uFE87', '\uFE83', '\uFE81', '\uFE93', '\uFEEF', '\uFBFE', '\uFE8B', '\uFE85', '\uFE70', '\uFE72', '\uFE74', '\uFE76', '\uFE78', '\uFE7A', '\uFE7C', '\uFE7E', '\uFE80'];

/**
 * Arabic characters that couldn't join to the next character
 */
var StandAlonForm = ['\u0621', '\u0627', '\u062F', '\u0630', '\u0631', '\u0632', '\u0648', '\u0622', '\u0629', '\u0626', '\u0624', '\u0625', '\u0675', '\u0623'];

var FETo06Table = ['\u064B', '\u064B', '\u064C', '\u061F', '\u064D', '\u061F', '\u064E', '\u064E', '\u064F', '\u064F', '\u0650', '\u0650', '\u0651', '\u0651', '\u0652', '\u0652', '\u0621', '\u0622', '\u0622', '\u0623', '\u0623', '\u0624', '\u0624', '\u0625', '\u0625', '\u0626', '\u0626', '\u0626', '\u0626', '\u0627', '\u0627', '\u0628', '\u0628', '\u0628', '\u0628', '\u0629', '\u0629', '\u062A', '\u062A', '\u062A', '\u062A', '\u062B', '\u062B', '\u062B', '\u062B', '\u062C', '\u062C', '\u062C', '\u062c', '\u062D', '\u062D', '\u062D', '\u062D', '\u062E', '\u062E', '\u062E', '\u062E', '\u062F', '\u062F', '\u0630', '\u0630', '\u0631', '\u0631', '\u0632', '\u0632', '\u0633', '\u0633', '\u0633', '\u0633', '\u0634', '\u0634', '\u0634', '\u0634', '\u0635', '\u0635', '\u0635', '\u0635', '\u0636', '\u0636', '\u0636', '\u0636', '\u0637', '\u0637', '\u0637', '\u0637', '\u0638', '\u0638', '\u0638', '\u0638', '\u0639', '\u0639', '\u0639', '\u0639', '\u063A', '\u063A', '\u063A', '\u063A', '\u0641', '\u0641', '\u0641', '\u0641', '\u0642', '\u0642', '\u0642', '\u0642', '\u0643', '\u0643', '\u0643', '\u0643', '\u0644', '\u0644', '\u0644', '\u0644', '\u0645', '\u0645', '\u0645', '\u0645', '\u0646', '\u0646', '\u0646', '\u0646', '\u0647', '\u0647', '\u0647', '\u0647', '\u0648', '\u0648', '\u0649', '\u0649', '\u064A', '\u064A', '\u064A', '\u064A', '\uFEF5', '\uFEF6', '\uFEF7', '\uFEF8', '\uFEF9', '\uFEFA', '\uFEFB', '\uFEFC', '\u061F', '\u061F', '\u061F'];

var ArabicAlefBetIntervalsBegine = ['\u0621', '\u0641'];

var ArabicAlefBetIntervalsEnd = ['\u063A', '\u064a'];

var Link06 = [
	1			+ 32 + 256 * 0x11,
	1			+ 32 + 256 * 0x13,
	1			+ 256 * 0x15,
	1			+ 32 + 256 * 0x17,
	1 + 2		+ 256 * 0x19,
	1			+ 32 + 256 * 0x1D,
	1 + 2		+ 256 * 0x1F,
	1			+ 256 * 0x23,
	1 + 2		+ 256 * 0x25,
	1 + 2		+ 256 * 0x29,
	1 + 2		+ 256 * 0x2D,
	1 + 2		+ 256 * 0x31,
	1 + 2		+ 256 * 0x35,
	1			+ 256 * 0x39,
	1			+ 256 * 0x3B,
	1			+ 256 * 0x3D,
	1			+ 256 * 0x3F,
	1 + 2		+ 256 * 0x41,
	1 + 2		+ 256 * 0x45,
	1 + 2		+ 256 * 0x49,
	1 + 2		+ 256 * 0x4D,
	1 + 2		+ 256 * 0x51,
	1 + 2		+ 256 * 0x55,
	1 + 2		+ 256 * 0x59,
	1 + 2		+ 256 * 0x5D,
	0, 0, 0, 0, 0,	/* 0x63B - 0x63F */
	1 + 2,
	1 + 2		+ 256 * 0x61,
	1 + 2		+ 256 * 0x65,
	1 + 2		+ 256 * 0x69,
	1 + 2		+ 16 + 256 * 0x6D,
	1 + 2		+ 256 * 0x71,
	1 + 2		+ 256 * 0x75,
	1 + 2		+ 256 * 0x79,
	1			+ 256 * 0x7D,
	1			+ 256 * 0x7F,
	1 + 2		+ 256 * 0x81,
	4, 4, 4, 4,
	4, 4, 4, 4, 	/* 0x64B - 0x652 */
	0, 0, 0, 0, 0,
	0, 0, 0, 0, 	/* 0x653 - 0x65B */
	1			+ 256 * 0x85,
	1			+ 256 * 0x87,
	1			+ 256 * 0x89,
	1			+ 256 * 0x8B,
	0, 0, 0, 0, 0,
	0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0,/* 0x660 - 0x66F */
	4,
	0,
	1			+ 32,
	1			+ 32,
	0,
	1			+ 32,
	1, 1,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2,
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	1, 1, 1, 1, 1, 1, 1, 1,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1,
	1+2,
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	1+2,
	1,
	1+2, 1+2, 1+2, 1+2,
	1, 1
];

var LinkFE = [
	1 + 2,
	1 + 2,
	1 + 2, 0, 1+ 2, 0, 1+ 2,
	1 + 2,
	1+ 2, 1 + 2, 1+2, 1 + 2,
	1+ 2, 1 + 2, 1+2, 1 + 2,
	0, 0 + 32, 1 + 32, 0 + 32,
	1 + 32, 0, 1, 0 + 32,
	1 + 32, 0, 2, 1 + 2,
	1, 0 + 32, 1 + 32, 0,
	2, 1 + 2, 1, 0,
	1, 0, 2, 1 + 2,
	1, 0, 2, 1 + 2,
	1, 0, 2, 1 + 2,
	1, 0, 2, 1 + 2,
	1, 0, 2, 1 + 2,
	1, 0, 1, 0,
	1, 0, 1, 0,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0 + 16, 2 + 16, 1 + 2 +16,
	1 + 16, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 1, 0,
	1, 0, 2, 1+2,
	1, 0, 1, 0,
	1, 0, 1, 0,
	1
];
var	impTab_LTR = [
					/*		L,		R,		EN,		AN,		N,		IL,		Cond */
	/* 0 LTR text	*/	[	0,		3,		0,		1,		0,		0,		0	],
	/* 1 LTR+AN		*/	[	0,		3,		0,		1,		2,		2,		0	],
	/* 2 LTR+AN+N	*/	[	0,		3,		0,		0x11,	2,		0,		1	],
	/* 3 RTL text	*/	[	0,		3,		5,		5,		4,		1,		0	],
	/* 4 RTL cont	*/	[	0,		3,		0x15,	0x15,	4,		0,		1	],
	/* 5 RTL+EN/AN	*/	[	0,		3,		5,		5,		4,		2,		0	]
];
var impTab_RTL = [
					/*		L,		R,		EN,		AN,		N,		IL,		Cond */
	/* 0 RTL text	*/	[	2,		0,		1,		1,		0,		1,		0	],
	/* 1 RTL+EN/AN	*/	[	2,		0,		1,		1,		0,		2,		0	],
	/* 2 LTR text	*/	[	2,		0,		2,		1,		3,		2,		0	],
	/* 3 LTR+cont	*/	[	2,		0,		2,		0x21,	3,		1,		1	]
];

var UBAT_L	= 0; /* left to right				*/
var UBAT_R	= 1; /* right to left				*/
var UBAT_EN = 2; /* European digit				*/
var UBAT_AN = 3; /* Arabic-Indic digit			*/
var UBAT_ON = 4; /* neutral						*/
var UBAT_B	= 5; /* block separator				*/
var UBAT_S	= 6; /* segment separator			*/
var UBAT_AL = 7; /* Arabic Letter				*/
var UBAT_WS = 8; /* white space					*/
var UBAT_CS = 9; /* common digit separator		*/
var UBAT_ES = 10; /* European digit separator	*/
var UBAT_ET = 11; /* European digit terminator	*/
var UBAT_NSM = 12; /* Non Spacing Mark			*/
var UBAT_LRE = 13; /* LRE						*/
var UBAT_RLE = 14; /* RLE						*/
var UBAT_PDF = 15; /* PDF						*/
var UBAT_LRO = 16; /* LRO						*/
var UBAT_RLO = 17; /* RLO						*/
var UBAT_BN	= 18; /* Boundary Neutral			*/

var TBBASE = 100;

var TB00 = TBBASE + 0;
var TB05 = TBBASE + 1;
var TB06 = TBBASE + 2;
var TB07 = TBBASE + 3;
var TB20 = TBBASE + 4;
var TBFB = TBBASE + 5;
var TBFE = TBBASE + 6;
var TBFF = TBBASE + 7;

var L	= UBAT_L;
var R	= UBAT_R;
var EN	= UBAT_EN;
var AN	= UBAT_AN;
var ON	= UBAT_ON;
var B	= UBAT_B;
var S	= UBAT_S;
var AL	= UBAT_AL;
var WS	= UBAT_WS;
var CS	= UBAT_CS;
var ES	= UBAT_ES;
var ET	= UBAT_ET;
var NSM	= UBAT_NSM;
var LRE	= UBAT_LRE;
var RLE	= UBAT_RLE;
var PDF	= UBAT_PDF;
var LRO	= UBAT_LRO;
var RLO	= UBAT_RLO;
var BN	= UBAT_BN;

var MasterTable = [
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	TB00,	L	,	L	,	L	,	L	,	TB05,	TB06,	TB07,	R	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*1-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*2-*/	TB20,	ON	,	ON	,	ON	,	L	,	ON	,	L	,	ON	,	L	,	ON	,	ON	,	ON	,	L	,	L	,	ON	,	ON	,
	/*3-*/	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,	L	,	ON	,
	/*5-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*6-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*7-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*8-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*9-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,
	/*A-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,
	/*B-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*C-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*D-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,	L	,	ON	,	ON	,	L	,	L	,	ON	,	ON	,	L	,
	/*E-*/	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*F-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,	L	,	L	,	TBFB,	AL	,	AL	,	TBFE,	TBFF
];

delete TB00;
delete TB05;
delete TB06;
delete TB07;
delete TB20;
delete TBFB;
delete TBFE;
delete TBFF;

var UnicodeTable = [
	[ /*	Table 00: Unicode 00xx */
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	S	,	B	,	S	,	WS	,	B	,	BN	,	BN	,
	/*1-*/	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	B	,	B	,	B	,	S	,
	/*2-*/	WS	,	ON	,	ON	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ES	,	CS	,	ES	,	CS	,	CS	,
	/*3-*/	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	CS	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*5-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*6-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*7-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	BN	,
	/*8-*/	BN	,	BN	,	BN	,	BN	,	BN	,	B	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,
	/*9-*/	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,
	/*A-*/	CS	,	ON	,	ET	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	L	,	ON	,	ON	,	BN	,	ON	,	ON	,
	/*B-*/	ET	,	ET	,	EN	,	EN	,	ON	,	L	,	ON	,	ON	,	ON	,	EN	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*C-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*D-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*E-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*F-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L
	],
	[ /*	Table 01: Unicode 05xx */
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*1-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*2-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	 , ON	,	ON	,
	/*3-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*4-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*5-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*6-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*7-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*8-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*9-*/	ON	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*A-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*B-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	R	,	NSM	,
	/*C-*/	R	,	NSM	,	NSM	,	R	,	NSM	,	NSM	,	R	,	NSM	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*D-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*E-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*F-*/	R	,	R	,	R	,	R	,	R	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON
	],
	[ /*	Table 02: Unicode 06xx */
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	AN	,	AN	,	AN	,	AN	,	ON	,	ON	,	ON	,	ON	,	AL	,	ET	,	ET	,	AL	,	CS	,	AL	,	ON	,	ON	,
	/*1-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	AL	,	ON	,	ON	,	AL	,	AL	,
	/*2-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*3-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*4-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*5-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*6-*/	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	ET	,	AN	,	AN	,	AL	,	AL	,	AL	,
	/*7-*/	NSM	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*8-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*9-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*A-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*B-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*C-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*D-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	AN	,	ON	,	NSM	,
	/*E-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	AL	,	AL	,	NSM	,	NSM	,	ON	,	NSM	,	NSM	,	NSM	,	NSM	,	AL	,	AL	,
	/*F-*/	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL
	],
	[	/*	Table	03:	Unicode	07xx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	ON	,	AL	,
	/*1-*/	AL	,	NSM	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*2-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*3-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*4-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	ON	,	ON	,	AL	,	AL	,	AL	,
	/*5-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*6-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*7-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*8-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*9-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*A-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*B-*/	NSM	,	AL	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*C-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*D-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*E-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*F-*/	NSM	,	NSM	,	NSM	,	NSM	,	R	,	R	,	ON	,	ON	,	ON	,	ON	,	R	,	ON	,	ON	,	ON	,	ON	,	ON
	],
	[	/*	Table	04:	Unicode	20xx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	BN	,	BN	,	BN	,	L	,	R	,
	/*1-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*2-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	WS	,	B	,	LRE	,	RLE	,	PDF	,	LRO	,	RLO	,	CS	,
	/*3-*/	ET	,	ET	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	ON	,	ON	,	ON	,	CS	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*5-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	WS	,
	/*6-*/	BN	,	BN	,	BN	,	BN	,	BN	,	ON	,	ON	,	ON	,	ON	,	ON	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,
	/*7-*/	EN	,	L	,	ON	,	ON	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	ES	,	ES	,	ON	,	ON	,	ON	,	L	,
	/*8-*/	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	ES	,	ES	,	ON	,	ON	,	ON	,	ON	,
	/*9-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,
	/*A-*/	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,
	/*B-*/	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*C-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*D-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*E-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*F-*/	NSM	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON
	],
	[	/*	Table	05:	Unicode	FBxx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*1-*/	ON	,	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	R	,	NSM	,	R	,
	/*2-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	ES	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*3-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	ON	,	R	,	R	,	R	,	R	,	R	,	ON	,	R	,	ON	,
	/*4-*/	R	,	R	,	ON	,	R	,	R	,	ON	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*5-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*6-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*7-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*8-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*9-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*A-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*B-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*C-*/	AL	,	AL	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*D-*/	ON	,	ON	,	ON	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*E-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*F-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL
	],
	[	/*	Table	06:	Unicode	FExx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*1-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*2-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*3-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*5-*/	CS	,	ON	,	CS	,	ON	,	ON	,	CS	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ET	,
	/*6-*/	ON	,	ON	,	ES	,	ES	,	ON	,	ON	,	ON	,	ON	,	ON	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*7-*/	AL	,	AL	,	AL	,	AL	,	AL	,	ON	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*8-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*9-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*A-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*B-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*C-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*D-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*E-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*F-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	ON	,	ON	,	BN
	],
	[	/*	Table	07:	Unicode	FFxx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	ON	,	ON	,	ON	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ES	,	CS	,	ES	,	CS	,	CS	,
	/*1-*/	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	CS	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*2-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*3-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*5-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*6-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*7-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*8-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*9-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*A-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*B-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,
	/*C-*/	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*D-*/	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	L	,	L	,	L	,	ON	,	ON	,	ON	,
	/*E-*/	ET	,	ET	,	ON	,	ON	,	ON	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*F-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON
	]
];

delete L;
delete R;
delete EN;
delete AN;
delete ON;
delete B;
delete S;
delete AL;
delete WS;
delete CS;
delete ES;
delete ET;
delete NSM;
delete LRE;
delete RLE;
delete PDF;
delete LRO;
delete RLO;
delete BN;

return dojox.string.BidiEngine;
});
