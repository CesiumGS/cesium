define(['dojo/_base/lang', './_base'], function(dojo, uuid){

dojox.uuid.Uuid = function(/*String?*/ input){
	// summary:
	//		This is the constructor for the Uuid class.  The Uuid class offers
	//		methods for inspecting existing UUIDs.
	// input: A 36-character string that conforms to the UUID spec.
	// examples:
	//		var uuid;
	//		uuid = new dojox.uuid.Uuid("3b12f1df-5232-4804-897e-917bf397618a");
	//		uuid = new dojox.uuid.Uuid(); // "00000000-0000-0000-0000-000000000000"
	//		uuid = new dojox.uuid.Uuid(dojox.uuid.generateRandomUuid());
	//		uuid = new dojox.uuid.Uuid(dojox.uuid.generateTimeBasedUuid());
	//		dojox.uuid.Uuid.setGenerator(dojox.uuid.generateRandomUuid);
	//		uuid = new dojox.uuid.Uuid();
	//		dojox.uuid.assert(!uuid.isEqual(dojox.uuid.NIL_UUID));
	this._uuidString = dojox.uuid.NIL_UUID;
	if(input){
		dojox.uuid.assert(dojo.isString(input));
		this._uuidString = input.toLowerCase();
		dojox.uuid.assert(this.isValid());
	}else{
		var ourGenerator = dojox.uuid.Uuid.getGenerator();
		if(ourGenerator){
			this._uuidString = ourGenerator();
			dojox.uuid.assert(this.isValid());
		}
	}
};

dojox.uuid.Uuid.compare = function(/*dojox.uuid.Uuid*/ uuidOne, /*dojox.uuid.Uuid*/ uuidTwo){
	// summary:
	//		Given two UUIDs to compare, this method returns 0, 1, or -1.
	// description:
	//		This method is designed to be used by sorting routines, like the
	//		JavaScript built-in Array sort() method. This implementation is
	//		intended to match the sample implementation in IETF RFC 4122:
	//		http://www.ietf.org/rfc/rfc4122.txt
	// uuidOne: Any object that has toString() method that returns a 36-character string that conforms to the UUID spec.
	// uuidTwo: Any object that has toString() method that returns a 36-character string that conforms to the UUID spec.

	// examples:
	//		var uuid;
	//		var generator = dojox.uuid.TimeBasedGenerator;
	//		var a = new dojox.uuid.Uuid(generator);
	//		var b = new dojox.uuid.Uuid(generator);
	//		var c = new dojox.uuid.Uuid(generator);
	//		var array = new Array(a, b, c);
	//		array.sort(dojox.uuid.Uuid.compare);
	var uuidStringOne = uuidOne.toString();
	var uuidStringTwo = uuidTwo.toString();
	if (uuidStringOne > uuidStringTwo) return 1;   // integer
	if (uuidStringOne < uuidStringTwo) return -1;  // integer
	return 0; // integer (either 0, 1, or -1)
};

dojox.uuid.Uuid.setGenerator = function(/*Function?*/ generator){
	// summary:
	//		Sets the default generator, which will be used by the
	//		"new dojox.uuid.Uuid()" constructor if no parameters
	//		are passed in.
	// generator: A UUID generator function, such as dojox.uuid.generateTimeBasedUuid.
	dojox.uuid.assert(!generator || dojo.isFunction(generator));
	dojox.uuid.Uuid._ourGenerator = generator;
};

dojox.uuid.Uuid.getGenerator = function(){
	// summary:
	//		Returns the default generator.  See setGenerator().
	return dojox.uuid.Uuid._ourGenerator; // generator (A UUID generator, such as dojox.uuid.TimeBasedGenerator).
};

dojox.uuid.Uuid.prototype.toString = function(){
	// summary:
	//		This method returns a standard 36-character string representing
	//		the UUID, such as "3b12f1df-5232-4804-897e-917bf397618a".
	return this._uuidString; // string
};

dojox.uuid.Uuid.prototype.compare = function(/*dojox.uuid.Uuid*/ otherUuid){
	// summary:
	//		Compares this UUID to another UUID, and returns 0, 1, or -1.
	// description:
	//		This implementation is intended to match the sample implementation
	//		in IETF RFC 4122: http://www.ietf.org/rfc/rfc4122.txt
	// otherUuid: Any object that has toString() method that returns a 36-character string that conforms to the UUID spec.
	return dojox.uuid.Uuid.compare(this, otherUuid); // integer (either 0, 1, or -1)
};

dojox.uuid.Uuid.prototype.isEqual = function(/*dojox.uuid.Uuid*/ otherUuid){
	// summary:
	//		Returns true if this UUID is equal to the otherUuid, or false otherwise.
	// otherUuid: Any object that has toString() method that returns a 36-character string that conforms to the UUID spec.
	return (this.compare(otherUuid) == 0); // boolean
};

dojox.uuid.Uuid.prototype.isValid = function(){
	// summary:
	//		Returns true if the UUID was initialized with a valid value.
	return dojox.uuid.isValid(this);
};

dojox.uuid.Uuid.prototype.getVariant = function(){
	// summary:
	//		Returns a variant code that indicates what type of UUID this is.
	//		Returns one of the enumerated dojox.uuid.variant values.

	// example:
	//		var uuid = new dojox.uuid.Uuid("3b12f1df-5232-4804-897e-917bf397618a");
	//		var variant = uuid.getVariant();
	//		dojox.uuid.assert(variant == dojox.uuid.variant.DCE);
	// example:
	// | "3b12f1df-5232-4804-897e-917bf397618a"
	// |                     ^
	// |                     |
	// |         (variant "10__" == DCE)
	return dojox.uuid.getVariant(this);
};

dojox.uuid.Uuid.prototype.getVersion = function(){
	// summary:
	//		Returns a version number that indicates what type of UUID this is.
	//		Returns one of the enumerated dojox.uuid.version values.
	// example:
	//		var uuid = new dojox.uuid.Uuid("b4308fb0-86cd-11da-a72b-0800200c9a66");
	//		var version = uuid.getVersion();
	//		dojox.uuid.assert(version == dojox.uuid.version.TIME_BASED);
	// exceptions:
	//		Throws an Error if this is not a DCE Variant UUID.
	if(!this._versionNumber){
		this._versionNumber = dojox.uuid.getVersion(this);
	}
	return this._versionNumber; // dojox.uuid.version
};

dojox.uuid.Uuid.prototype.getNode = function(){
	// summary:
	//		If this is a version 1 UUID (a time-based UUID), getNode() returns a
	//		12-character string with the "node" or "pseudonode" portion of the UUID,
	//		which is the rightmost 12 characters.
	// exceptions:
	//		Throws an Error if this is not a version 1 UUID.
	if (!this._nodeString) {
		this._nodeString = dojox.uuid.getNode(this);
	}
	return this._nodeString; // String (a 12-character string, which will look something like "917bf397618a")
};

dojox.uuid.Uuid.prototype.getTimestamp = function(/*String?*/ returnType){
	// summary:
	//		If this is a version 1 UUID (a time-based UUID), this method returns
	//		the timestamp value encoded in the UUID.  The caller can ask for the
	//		timestamp to be returned either as a JavaScript Date object or as a
	//		15-character string of hex digits.
	// returnType: Any of these five values: "string", String, "hex", "date", Date
	// returns:
	//		Returns the timestamp value as a JavaScript Date object or a 15-character string of hex digits.
	// examples:
	//		var uuid = new dojox.uuid.Uuid("b4308fb0-86cd-11da-a72b-0800200c9a66");
	//		var date, string, hexString;
	//		date   = uuid.getTimestamp();         // returns a JavaScript Date
	//		date   = uuid.getTimestamp(Date);     //
	//		string = uuid.getTimestamp(String);   // "Mon, 16 Jan 2006 20:21:41 GMT"
	//		hexString = uuid.getTimestamp("hex"); // "1da86cdb4308fb0"
	// exceptions:
	//		Throws an Error if this is not a version 1 UUID.
	if(!returnType){returnType = null};
	switch(returnType){
		case "string":
		case String:
			return this.getTimestamp(Date).toUTCString(); // String (e.g. "Mon, 16 Jan 2006 20:21:41 GMT")
			break;
		case "hex":
			// Return a 15-character string of hex digits containing the
			// timestamp for this UUID, with the high-order bits first.
			if (!this._timestampAsHexString) {
				this._timestampAsHexString = dojox.uuid.getTimestamp(this, "hex");
			}
			return this._timestampAsHexString; // String (e.g. "1da86cdb4308fb0")
			break;
		case null: // no returnType was specified, so default to Date
		case "date":
		case Date:
			// Return a JavaScript Date object.
			if (!this._timestampAsDate) {
				this._timestampAsDate = dojox.uuid.getTimestamp(this, Date);
			}
			return this._timestampAsDate; // Date
			break;
		default:
			// we got passed something other than a valid returnType
			dojox.uuid.assert(false, "The getTimestamp() method dojox.uuid.Uuid was passed a bogus returnType: " + returnType);
			break;
	}
};

return dojox.uuid.Uuid;

});
