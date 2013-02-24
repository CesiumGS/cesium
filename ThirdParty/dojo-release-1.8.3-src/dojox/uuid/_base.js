define(['dojo/_base/kernel', 'dojo/_base/lang'], function(dojo){

dojo.getObject("uuid", true, dojox);

// Public constants:
dojox.uuid.NIL_UUID = "00000000-0000-0000-0000-000000000000";
dojox.uuid.version = {
	//	Enumeration for the different UUID versions.
	UNKNOWN: 0,
	TIME_BASED: 1,
	DCE_SECURITY: 2,
	NAME_BASED_MD5: 3,
	RANDOM: 4,
	NAME_BASED_SHA1: 5 };
dojox.uuid.variant = {
	//	Enumeration for the different UUID variants.
	NCS: "0",
	DCE: "10",
	MICROSOFT: "110",
	UNKNOWN: "111" };

dojox.uuid.assert = function(/*Boolean*/ booleanValue, /*String?*/ message){
	// summary:
	//		Throws an exception if the assertion fails.
	// description:
	//		If the asserted condition is true, this method does nothing. If the
	//		condition is false, we throw an error with a error message.
	// booleanValue: Must be true for the assertion to succeed.
	// message: A string describing the assertion.
	// throws: Throws an Error if 'booleanValue' is false.
	if(!booleanValue){
		if(!message){
			message = "An assert statement failed.\n" +
			"The method dojox.uuid.assert() was called with a 'false' value.\n";
		}
		throw new Error(message);
	}
};

dojox.uuid.generateNilUuid = function(){
	// summary:
	//		This function returns the Nil UUID: "00000000-0000-0000-0000-000000000000".
	// description:
	//		The Nil UUID is described in section 4.1.7 of
	//		RFC 4122: http://tools.ietf.org/html/rfc4122#section-4.1.7
	// examples:
	//		var string = dojox.uuid.generateNilUuid();
	return dojox.uuid.NIL_UUID; // String
};

dojox.uuid.isValid = function(/*String*/ uuidString){
	// summary:
	//		Returns true if the UUID was initialized with a valid value.
	uuidString = uuidString.toString();
	var valid = (dojo.isString(uuidString) &&
		(uuidString.length == 36) &&
		(uuidString == uuidString.toLowerCase()));
	if(valid){
		var arrayOfParts = uuidString.split("-");
		valid = ((arrayOfParts.length == 5) &&
			(arrayOfParts[0].length == 8) &&
			(arrayOfParts[1].length == 4) &&
			(arrayOfParts[2].length == 4) &&
			(arrayOfParts[3].length == 4) &&
			(arrayOfParts[4].length == 12));
		var HEX_RADIX = 16;
		for (var i in arrayOfParts) {
			var part = arrayOfParts[i];
			var integer = parseInt(part, HEX_RADIX);
			valid = valid && isFinite(integer);
		}
	}
	return valid; // boolean
};

dojox.uuid.getVariant = function(/*String*/ uuidString){
	// summary:
	//		Returns a variant code that indicates what type of UUID this is.
	//		Returns one of the enumerated dojox.uuid.variant values.
	// example:
	//		var variant = dojox.uuid.getVariant("3b12f1df-5232-4804-897e-917bf397618a");
	//		dojox.uuid.assert(variant == dojox.uuid.variant.DCE);
	// example:
	//	|	"3b12f1df-5232-4804-897e-917bf397618a"
	//	|                   ^
	//	|                   |
	//	|       (variant "10__" == DCE)
	if(!dojox.uuid._ourVariantLookupTable){
		var variant = dojox.uuid.variant;
		var lookupTable = [];

		lookupTable[0x0] = variant.NCS;       // 0000
		lookupTable[0x1] = variant.NCS;       // 0001
		lookupTable[0x2] = variant.NCS;       // 0010
		lookupTable[0x3] = variant.NCS;       // 0011

		lookupTable[0x4] = variant.NCS;       // 0100
		lookupTable[0x5] = variant.NCS;       // 0101
		lookupTable[0x6] = variant.NCS;       // 0110
		lookupTable[0x7] = variant.NCS;       // 0111

		lookupTable[0x8] = variant.DCE;       // 1000
		lookupTable[0x9] = variant.DCE;       // 1001
		lookupTable[0xA] = variant.DCE;       // 1010
		lookupTable[0xB] = variant.DCE;       // 1011

		lookupTable[0xC] = variant.MICROSOFT; // 1100
		lookupTable[0xD] = variant.MICROSOFT; // 1101
		lookupTable[0xE] = variant.UNKNOWN;   // 1110
		lookupTable[0xF] = variant.UNKNOWN;   // 1111
		
		dojox.uuid._ourVariantLookupTable = lookupTable;
	}

	uuidString = uuidString.toString();
	var variantCharacter = uuidString.charAt(19);
	var HEX_RADIX = 16;
	var variantNumber = parseInt(variantCharacter, HEX_RADIX);
	dojox.uuid.assert((variantNumber >= 0) && (variantNumber <= 16));
	return dojox.uuid._ourVariantLookupTable[variantNumber]; // dojox.uuid.variant
};

dojox.uuid.getVersion = function(/*String*/ uuidString){
	// summary:
	//		Returns a version number that indicates what type of UUID this is.
	//		Returns one of the enumerated dojox.uuid.version values.
	// example:
	//		var version = dojox.uuid.getVersion("b4308fb0-86cd-11da-a72b-0800200c9a66");
	//		dojox.uuid.assert(version == dojox.uuid.version.TIME_BASED);
	// exceptions:
	//		Throws an Error if this is not a DCE Variant UUID.
	var errorMessage = "dojox.uuid.getVersion() was not passed a DCE Variant UUID.";
	dojox.uuid.assert(dojox.uuid.getVariant(uuidString) == dojox.uuid.variant.DCE, errorMessage);
	uuidString = uuidString.toString();
	
		// "b4308fb0-86cd-11da-a72b-0800200c9a66"
		//			      ^
		//			      |
		//		 (version 1 == TIME_BASED)
	var versionCharacter = uuidString.charAt(14);
	var HEX_RADIX = 16;
	var versionNumber = parseInt(versionCharacter, HEX_RADIX);
	return versionNumber; // dojox.uuid.version
};

dojox.uuid.getNode = function(/*String*/ uuidString){
	// summary:
	//		If this is a version 1 UUID (a time-based UUID), getNode() returns a
	//		12-character string with the "node" or "pseudonode" portion of the UUID,
	//		which is the rightmost 12 characters.
	// exceptions:
	//		Throws an Error if this is not a version 1 UUID.
	var errorMessage = "dojox.uuid.getNode() was not passed a TIME_BASED UUID.";
	dojox.uuid.assert(dojox.uuid.getVersion(uuidString) == dojox.uuid.version.TIME_BASED, errorMessage);

	uuidString = uuidString.toString();
	var arrayOfStrings = uuidString.split('-');
	var nodeString = arrayOfStrings[4];
	return nodeString; // String (a 12-character string, which will look something like "917bf397618a")
};

dojox.uuid.getTimestamp = function(/*String*/ uuidString, /*String?*/ returnType){
	// summary:
	//		If this is a version 1 UUID (a time-based UUID), this method returns
	//		the timestamp value encoded in the UUID.  The caller can ask for the
	//		timestamp to be returned either as a JavaScript Date object or as a
	//		15-character string of hex digits.
	// returnType:
	//		Any of these five values: "string", String, "hex", "date", Date
	// returns:
	//		Returns the timestamp value as a JavaScript Date object or a 15-character string of hex digits.
	// examples:
	//		var uuidString = "b4308fb0-86cd-11da-a72b-0800200c9a66";
	//		var date, string, hexString;
	//		date   = dojox.uuid.getTimestamp(uuidString);         // returns a JavaScript Date
	//		date   = dojox.uuid.getTimestamp(uuidString, Date);     //
	//		string = dojox.uuid.getTimestamp(uuidString, String);   // "Mon, 16 Jan 2006 20:21:41 GMT"
	//		hexString = dojox.uuid.getTimestamp(uuidString, "hex"); // "1da86cdb4308fb0"
	// exceptions:
	//		Throws an Error if this is not a version 1 UUID.
	var errorMessage = "dojox.uuid.getTimestamp() was not passed a TIME_BASED UUID.";
	dojox.uuid.assert(dojox.uuid.getVersion(uuidString) == dojox.uuid.version.TIME_BASED, errorMessage);
	
	uuidString = uuidString.toString();
	if(!returnType){returnType = null};
	switch(returnType){
		case "string":
		case String:
			return dojox.uuid.getTimestamp(uuidString, Date).toUTCString(); // String (e.g. "Mon, 16 Jan 2006 20:21:41 GMT")
			break;
		case "hex":
			// Return a 15-character string of hex digits containing the
			// timestamp for this UUID, with the high-order bits first.
			var arrayOfStrings = uuidString.split('-');
			var hexTimeLow = arrayOfStrings[0];
			var hexTimeMid = arrayOfStrings[1];
			var hexTimeHigh = arrayOfStrings[2];
		
			// Chop off the leading "1" character, which is the UUID
			// version number for time-based UUIDs.
			hexTimeHigh = hexTimeHigh.slice(1);
		
			var timestampAsHexString = hexTimeHigh + hexTimeMid + hexTimeLow;
			dojox.uuid.assert(timestampAsHexString.length == 15);
			return timestampAsHexString; // String (e.g. "1da86cdb4308fb0")
			break;
		case null: // no returnType was specified, so default to Date
		case "date":
		case Date:
			// Return a JavaScript Date object.
			var GREGORIAN_CHANGE_OFFSET_IN_HOURS = 3394248;
			var HEX_RADIX = 16;
		
			var arrayOfParts = uuidString.split('-');
			var timeLow = parseInt(arrayOfParts[0], HEX_RADIX);
			var timeMid = parseInt(arrayOfParts[1], HEX_RADIX);
			var timeHigh = parseInt(arrayOfParts[2], HEX_RADIX);
			var hundredNanosecondIntervalsSince1582 = timeHigh & 0x0FFF;
			hundredNanosecondIntervalsSince1582 <<= 16;
			hundredNanosecondIntervalsSince1582 += timeMid;
			// What we really want to do next is shift left 32 bits, but the
			// result will be too big to fit in an int, so we'll multiply by 2^32,
			// and the result will be a floating point approximation.
			hundredNanosecondIntervalsSince1582 *= 0x100000000;
			hundredNanosecondIntervalsSince1582 += timeLow;
			var millisecondsSince1582 = hundredNanosecondIntervalsSince1582 / 10000;
		
			// Again, this will be a floating point approximation.
			// We can make things exact later if we need to.
			var secondsPerHour = 60 * 60;
			var hoursBetween1582and1970 = GREGORIAN_CHANGE_OFFSET_IN_HOURS;
			var secondsBetween1582and1970 = hoursBetween1582and1970 * secondsPerHour;
			var millisecondsBetween1582and1970 = secondsBetween1582and1970 * 1000;
			var millisecondsSince1970 = millisecondsSince1582 - millisecondsBetween1582and1970;
		
			var timestampAsDate = new Date(millisecondsSince1970);
			return timestampAsDate; // Date
			break;
		default:
			// we got passed something other than a valid returnType
			dojox.uuid.assert(false, "dojox.uuid.getTimestamp was not passed a valid returnType: " + returnType);
			break;
	}
};

return dojox.uuid;

});
