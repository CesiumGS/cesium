define([ 'dojo/_base/lang', './_base'], function(lang){

dojox.uuid.generateTimeBasedUuid = function(/*String?*/ node){
	// summary:
	//		This function generates time-based UUIDs, meaning "version 1" UUIDs.
	// description:
	//		For more info, see
	//		http://www.webdav.org/specs/draft-leach-uuids-guids-01.txt
	//		http://www.infonuovo.com/dma/csdocs/sketch/instidid.htm
	//		http://kruithof.xs4all.nl/uuid/uuidgen
	//		http://www.opengroup.org/onlinepubs/009629399/apdxa.htm#tagcjh_20
	//		http://jakarta.apache.org/commons/sandbox/id/apidocs/org/apache/commons/id/uuid/clock/Clock.html
	// node:
	//		A 12-character hex string representing either a pseudo-node or
	//		hardware-node (an IEEE 802.3 network node).  A hardware-node
	//		will be something like "017bf397618a", always with the first bit
	//		being 0.  A pseudo-node will be something like "f17bf397618a",
	//		always with the first bit being 1.
	// examples:
	//		string = dojox.uuid.generateTimeBasedUuid();
	//		string = dojox.uuid.generateTimeBasedUuid("017bf397618a");
	//		dojox.uuid.generateTimeBasedUuid.setNode("017bf397618a");
	//		string = dojox.uuid.generateTimeBasedUuid(); // the generated UUID has node == "017bf397618a"
	var uuidString = dojox.uuid.generateTimeBasedUuid._generator.generateUuidString(node);
	return uuidString; // String
};

dojox.uuid.generateTimeBasedUuid.isValidNode = function(/*String?*/ node){
	var HEX_RADIX = 16;
	var integer = parseInt(node, HEX_RADIX);
	var valid = lang.isString(node) && node.length == 12 && isFinite(integer);
	return valid; // Boolean
};

dojox.uuid.generateTimeBasedUuid.setNode = function(/*String?*/ node){
	// summary:
	//		Sets the 'node' value that will be included in generated UUIDs.
	// node: A 12-character hex string representing a pseudoNode or hardwareNode.
	dojox.uuid.assert((node === null) || this.isValidNode(node));
	this._uniformNode = node;
};

dojox.uuid.generateTimeBasedUuid.getNode = function(){
	// summary:
	//		Returns the 'node' value that will be included in generated UUIDs.
	return this._uniformNode; // String (a 12-character hex string representing a pseudoNode or hardwareNode)
};

	
dojox.uuid.generateTimeBasedUuid._generator = new function(){
	// Number of hours between October 15, 1582 and January 1, 1970:
	this.GREGORIAN_CHANGE_OFFSET_IN_HOURS = 3394248;
	
	// Number of seconds between October 15, 1582 and January 1, 1970:
	//	 dojox.uuid.generateTimeBasedUuid.GREGORIAN_CHANGE_OFFSET_IN_SECONDS = 12219292800;
	
	// --------------------------------------------------
	// Private variables:
	var _uuidPseudoNodeString = null;
	var _uuidClockSeqString = null;
	var _dateValueOfPreviousUuid = null;
	var _nextIntraMillisecondIncrement = 0;
	var _cachedMillisecondsBetween1582and1970 = null;
	var _cachedHundredNanosecondIntervalsPerMillisecond = null;
	
	// --------------------------------------------------
	// Private constants:
	var HEX_RADIX = 16;

	function _carry(/* array */ arrayA){
		// summary:
		//		Given an array which holds a 64-bit number broken into 4 16-bit
		//		elements, this method carries any excess bits (greater than 16-bits)
		//		from each array element into the next.
		// arrayA: An array with 4 elements, each of which is a 16-bit number.
		arrayA[2] += arrayA[3] >>> 16;
		arrayA[3] &= 0xFFFF;
		arrayA[1] += arrayA[2] >>> 16;
		arrayA[2] &= 0xFFFF;
		arrayA[0] += arrayA[1] >>> 16;
		arrayA[1] &= 0xFFFF;
		dojox.uuid.assert((arrayA[0] >>> 16) === 0);
	}

	function _get64bitArrayFromFloat(/* float */ x){
		// summary:
		//		Given a floating point number, this method returns an array which
		//		holds a 64-bit number broken into 4 16-bit elements.
		var result = new Array(0, 0, 0, 0);
		result[3] = x % 0x10000;
		x -= result[3];
		x /= 0x10000;
		result[2] = x % 0x10000;
		x -= result[2];
		x /= 0x10000;
		result[1] = x % 0x10000;
		x -= result[1];
		x /= 0x10000;
		result[0] = x;
		return result; // Array with 4 elements, each of which is a 16-bit number.
	}

	function _addTwo64bitArrays(/* array */ arrayA, /* array */ arrayB){
		// summary:
		//		Takes two arrays, each of which holds a 64-bit number broken into 4
		//		16-bit elements, and returns a new array that holds a 64-bit number
		//		that is the sum of the two original numbers.
		// arrayA: An array with 4 elements, each of which is a 16-bit number.
		// arrayB: An array with 4 elements, each of which is a 16-bit number.
		dojox.uuid.assert(lang.isArray(arrayA));
		dojox.uuid.assert(lang.isArray(arrayB));
		dojox.uuid.assert(arrayA.length == 4);
		dojox.uuid.assert(arrayB.length == 4);
	
		var result = new Array(0, 0, 0, 0);
		result[3] = arrayA[3] + arrayB[3];
		result[2] = arrayA[2] + arrayB[2];
		result[1] = arrayA[1] + arrayB[1];
		result[0] = arrayA[0] + arrayB[0];
		_carry(result);
		return result; // Array with 4 elements, each of which is a 16-bit number.
	}

	function _multiplyTwo64bitArrays(/* array */ arrayA, /* array */ arrayB){
		// summary:
		//		Takes two arrays, each of which holds a 64-bit number broken into 4
		//		16-bit elements, and returns a new array that holds a 64-bit number
		//		that is the product of the two original numbers.
		// arrayA: An array with 4 elements, each of which is a 16-bit number.
		// arrayB: An array with 4 elements, each of which is a 16-bit number.
		dojox.uuid.assert(lang.isArray(arrayA));
		dojox.uuid.assert(lang.isArray(arrayB));
		dojox.uuid.assert(arrayA.length == 4);
		dojox.uuid.assert(arrayB.length == 4);
	
		var overflow = false;
		if(arrayA[0] * arrayB[0] !== 0){ overflow = true; }
		if(arrayA[0] * arrayB[1] !== 0){ overflow = true; }
		if(arrayA[0] * arrayB[2] !== 0){ overflow = true; }
		if(arrayA[1] * arrayB[0] !== 0){ overflow = true; }
		if(arrayA[1] * arrayB[1] !== 0){ overflow = true; }
		if(arrayA[2] * arrayB[0] !== 0){ overflow = true; }
		dojox.uuid.assert(!overflow);
	
		var result = new Array(0, 0, 0, 0);
		result[0] += arrayA[0] * arrayB[3];
		_carry(result);
		result[0] += arrayA[1] * arrayB[2];
		_carry(result);
		result[0] += arrayA[2] * arrayB[1];
		_carry(result);
		result[0] += arrayA[3] * arrayB[0];
		_carry(result);
		result[1] += arrayA[1] * arrayB[3];
		_carry(result);
		result[1] += arrayA[2] * arrayB[2];
		_carry(result);
		result[1] += arrayA[3] * arrayB[1];
		_carry(result);
		result[2] += arrayA[2] * arrayB[3];
		_carry(result);
		result[2] += arrayA[3] * arrayB[2];
		_carry(result);
		result[3] += arrayA[3] * arrayB[3];
		_carry(result);
		return result; // Array with 4 elements, each of which is a 16-bit number.
	}

	function _padWithLeadingZeros(/* string */ string, /* int */ desiredLength){
		// summary:
		//		Pads a string with leading zeros and returns the result.
		// string: A string to add padding to.
		// desiredLength: The number of characters the return string should have.

		// examples:
		//		result = _padWithLeadingZeros("abc", 6);
		//		dojox.uuid.assert(result == "000abc");
		while(string.length < desiredLength){
			string = "0" + string;
		}
		return string; // string
	}

	function _generateRandomEightCharacterHexString() {
		// summary:
		//		Returns a randomly generated 8-character string of hex digits.

		// FIXME: This probably isn't a very high quality random number.
	
		// Make random32bitNumber be a randomly generated floating point number
		// between 0 and (4,294,967,296 - 1), inclusive.
		var random32bitNumber = Math.floor( (Math.random() % 1) * Math.pow(2, 32) );
	
		var eightCharacterString = random32bitNumber.toString(HEX_RADIX);
		while(eightCharacterString.length < 8){
			eightCharacterString = "0" + eightCharacterString;
		}
		return eightCharacterString; // String (an 8-character hex string)
	}
	
	this.generateUuidString = function(/*String?*/ node){
		// summary:
		//		Generates a time-based UUID, meaning a version 1 UUID.
		// description:
		//		JavaScript code running in a browser doesn't have access to the
		//		IEEE 802.3 address of the computer, so if a node value isn't
		//		supplied, we generate a random pseudonode value instead.
		// node: An optional 12-character string to use as the node in the new UUID.
		if(node){
			dojox.uuid.assert(dojox.uuid.generateTimeBasedUuid.isValidNode(node));
		}else{
			if(dojox.uuid.generateTimeBasedUuid._uniformNode){
				node = dojox.uuid.generateTimeBasedUuid._uniformNode;
			}else{
				if(!_uuidPseudoNodeString){
					var pseudoNodeIndicatorBit = 0x8000;
					var random15bitNumber = Math.floor( (Math.random() % 1) * Math.pow(2, 15) );
					var leftmost4HexCharacters = (pseudoNodeIndicatorBit | random15bitNumber).toString(HEX_RADIX);
					_uuidPseudoNodeString = leftmost4HexCharacters + _generateRandomEightCharacterHexString();
				}
				node = _uuidPseudoNodeString;
			}
		}
		if(!_uuidClockSeqString){
			var variantCodeForDCEUuids = 0x8000; // 10--------------, i.e. uses only first two of 16 bits.
			var random14bitNumber = Math.floor( (Math.random() % 1) * Math.pow(2, 14) );
			_uuidClockSeqString = (variantCodeForDCEUuids | random14bitNumber).toString(HEX_RADIX);
		}
	
		// Maybe we should think about trying to make the code more readable to
		// newcomers by creating a class called "WholeNumber" that encapsulates
		// the methods and data structures for working with these arrays that
		// hold 4 16-bit numbers?  And then these variables below have names
		// like "wholeSecondsPerHour" rather than "arraySecondsPerHour"?
		var now = new Date();
		var millisecondsSince1970 = now.valueOf(); // milliseconds since midnight 01 January, 1970 UTC.
		var nowArray = _get64bitArrayFromFloat(millisecondsSince1970);
		if(!_cachedMillisecondsBetween1582and1970){
			var arraySecondsPerHour = _get64bitArrayFromFloat(60 * 60);
			var arrayHoursBetween1582and1970 = _get64bitArrayFromFloat(dojox.uuid.generateTimeBasedUuid._generator.GREGORIAN_CHANGE_OFFSET_IN_HOURS);
			var arraySecondsBetween1582and1970 = _multiplyTwo64bitArrays(arrayHoursBetween1582and1970, arraySecondsPerHour);
			var arrayMillisecondsPerSecond = _get64bitArrayFromFloat(1000);
			_cachedMillisecondsBetween1582and1970 = _multiplyTwo64bitArrays(arraySecondsBetween1582and1970, arrayMillisecondsPerSecond);
			_cachedHundredNanosecondIntervalsPerMillisecond = _get64bitArrayFromFloat(10000);
		}
		var arrayMillisecondsSince1970 = nowArray;
		var arrayMillisecondsSince1582 = _addTwo64bitArrays(_cachedMillisecondsBetween1582and1970, arrayMillisecondsSince1970);
		var arrayHundredNanosecondIntervalsSince1582 = _multiplyTwo64bitArrays(arrayMillisecondsSince1582, _cachedHundredNanosecondIntervalsPerMillisecond);
	
		if(now.valueOf() == _dateValueOfPreviousUuid){
			arrayHundredNanosecondIntervalsSince1582[3] += _nextIntraMillisecondIncrement;
			_carry(arrayHundredNanosecondIntervalsSince1582);
			_nextIntraMillisecondIncrement += 1;
			if (_nextIntraMillisecondIncrement == 10000) {
				// If we've gotten to here, it means we've already generated 10,000
				// UUIDs in this single millisecond, which is the most that the UUID
				// timestamp field allows for.  So now we'll just sit here and wait
				// for a fraction of a millisecond, so as to ensure that the next
				// time this method is called there will be a different millisecond
				// value in the timestamp field.
				while (now.valueOf() == _dateValueOfPreviousUuid) {
					now = new Date();
				}
			}
		}else{
			_dateValueOfPreviousUuid = now.valueOf();
			_nextIntraMillisecondIncrement = 1;
		}
	
		var hexTimeLowLeftHalf  = arrayHundredNanosecondIntervalsSince1582[2].toString(HEX_RADIX);
		var hexTimeLowRightHalf = arrayHundredNanosecondIntervalsSince1582[3].toString(HEX_RADIX);
		var hexTimeLow = _padWithLeadingZeros(hexTimeLowLeftHalf, 4) + _padWithLeadingZeros(hexTimeLowRightHalf, 4);
		var hexTimeMid = arrayHundredNanosecondIntervalsSince1582[1].toString(HEX_RADIX);
		hexTimeMid = _padWithLeadingZeros(hexTimeMid, 4);
		var hexTimeHigh = arrayHundredNanosecondIntervalsSince1582[0].toString(HEX_RADIX);
		hexTimeHigh = _padWithLeadingZeros(hexTimeHigh, 3);
		var hyphen = "-";
		var versionCodeForTimeBasedUuids = "1"; // binary2hex("0001")
		var resultUuid = hexTimeLow + hyphen + hexTimeMid + hyphen +
					versionCodeForTimeBasedUuids + hexTimeHigh + hyphen +
					_uuidClockSeqString + hyphen + node;
		resultUuid = resultUuid.toLowerCase();
		return resultUuid; // String (a 36 character string, which will look something like "b4308fb0-86cd-11da-a72b-0800200c9a66")
	}

}();

return dojox.uuid.generateTimeBasedUuid;

});
