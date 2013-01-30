define(['doh', 'dojo/_base/lang', '../_base', '../Uuid', '../generateRandomUuid', '../generateTimeBasedUuid'], function(doh, dojo, dxuuid, Uuid, generateRandomUuid, generateTimeBasedUuid){

var checkValidityOfUuidString = function(/*String*/uuidString){
	// summary:
	//		A helper function that's used by the registered test functions
	var NIL_UUID = "00000000-0000-0000-0000-000000000000";
	if (uuidString == NIL_UUID) {
		// We'll consider the Nil UUID to be valid, so now
		// we can just return, with not further checks.
		return;
	}
	
	doh.assertTrue(uuidString.length == 36); // UUIDs have 36 characters

	var validCharacters = "0123456789abcedfABCDEF-";
	var character;
	var position;
	for(var i = 0; i < 36; ++i){
		character = uuidString.charAt(i);
		position = validCharacters.indexOf(character);
		doh.assertTrue(position != -1); // UUIDs have only valid characters
	}

	var arrayOfParts = uuidString.split("-");
	doh.assertTrue(arrayOfParts.length == 5); // UUIDs have 5 sections separated by 4 hyphens
	doh.assertTrue(arrayOfParts[0].length == 8); // Section 0 has 8 characters
	doh.assertTrue(arrayOfParts[1].length == 4); // Section 1 has 4 characters
	doh.assertTrue(arrayOfParts[2].length == 4); // Section 2 has 4 characters
	doh.assertTrue(arrayOfParts[3].length == 4); // Section 3 has 4 characters
	doh.assertTrue(arrayOfParts[4].length == 12); // Section 4 has 8 characters

	// check to see that the "UUID variant code" starts with the binary bits '10'
	var section3 = arrayOfParts[3];
	var HEX_RADIX = 16;
	var hex3 = parseInt(section3, HEX_RADIX);
	var binaryString = hex3.toString(2);
	// alert("section3 = " + section3 + "\n binaryString = " + binaryString);
	doh.assertTrue(binaryString.length == 16); // section 3 has 16 bits
	doh.assertTrue(binaryString.charAt(0) == '1'); // first bit of section 3 is 1
	doh.assertTrue(binaryString.charAt(1) == '0'); // second bit of section 3 is 0
}

var checkValidityOfTimeBasedUuidString = function(/*String*/uuidString){
	// summary:
	//		A helper function that's used by the registered test functions
	checkValidityOfUuidString(uuidString);
	var arrayOfParts = uuidString.split("-");
	var section2 = arrayOfParts[2];
	doh.assertTrue(section2.charAt(0) == "1"); // Section 2 starts with a 1
}

var checkForPseudoNodeBitInTimeBasedUuidString = function(/*String*/uuidString){
	// summary:
	//		A helper function that's used by the registered test functions
	var arrayOfParts = uuidString.split("-");
	var section4 = arrayOfParts[4];
	var firstChar = section4.charAt(0);
	var HEX_RADIX = 16;
	var hexFirstChar = parseInt(firstChar, HEX_RADIX);
	var binaryString = hexFirstChar.toString(2);
	var firstBit;
	if(binaryString.length == 4){
		firstBit = binaryString.charAt(0);
	}else{
		firstBit = '0';
	}
	doh.assertTrue(firstBit == '1'); // first bit of section 4 is 1
}

doh.register("dojox.uuid.tests.uuid",
	[
		/*
		function test_uuid_performance(){
			var start = new Date();
			var startMS = start.valueOf();
			var nowMS = startMS;
			var i;
			var now;
			var numTrials = 100000;
		
			while(nowMS == startMS){
				now = new Date();
				nowMS = now.valueOf();
			}
			
			startMS = nowMS;
			for(i = 0; i < numTrials; ++i){
				var a = dojox.uuid.LightweightGenerator.generate();
			}
			now = new Date();
			nowMS = now.valueOf();
			var elapsedMS = nowMS - startMS;
			// dojo.log.debug("created " + numTrials + " UUIDs in " + elapsedMS + " milliseconds");
		},
		*/

		function test_uuid_capitalization(){
			var randomLowercaseString = "3b12f1df-5232-4804-897e-917bf397618a";
			var randomUppercaseString = "3B12F1DF-5232-4804-897E-917BF397618A";
			
			var timebasedLowercaseString = "b4308fb0-86cd-11da-a72b-0800200c9a66";
			var timebasedUppercaseString = "B4308FB0-86CD-11DA-A72B-0800200C9A66";
			
			var uuidRL = new Uuid(randomLowercaseString);
			var uuidRU = new Uuid(randomUppercaseString);
			
			var uuidTL = new Uuid(timebasedLowercaseString);
			var uuidTU = new Uuid(timebasedUppercaseString);
			
			doh.assertTrue(uuidRL.isEqual(uuidRU));
			doh.assertTrue(uuidRU.isEqual(uuidRL));
			
			doh.assertTrue(uuidTL.isEqual(uuidTU));
			doh.assertTrue(uuidTU.isEqual(uuidTL));
		},
	
		function test_uuid_constructor(){
			var uuid, uuidToo;
			
			var nilUuid = '00000000-0000-0000-0000-000000000000';
			uuid = new Uuid();
			doh.assertTrue(uuid == nilUuid); // 'new dojox.uuid.Uuid()' returns the Nil UUID
			
			var randomUuidString = "3b12f1df-5232-4804-897e-917bf397618a";
			uuid = new Uuid(randomUuidString);
			doh.assertTrue(uuid.isValid());
			doh.assertTrue(uuid.getVariant() == dxuuid.variant.DCE);
			doh.assertTrue(uuid.getVersion() == dxuuid.version.RANDOM);
			uuidToo = new Uuid(new String(randomUuidString));
			doh.assertTrue(uuid.isEqual(uuidToo));
		
			var timeBasedUuidString = "b4308fb0-86cd-11da-a72b-0800200c9a66";
			uuid = new Uuid(timeBasedUuidString);
			doh.assertTrue(uuid.isValid());
			doh.assertTrue(uuid.getVariant() == dxuuid.variant.DCE);
			doh.assertTrue(uuid.getVersion() == dxuuid.version.TIME_BASED);
			doh.assertTrue(uuid.getNode() == "0800200c9a66");
			var timestamp = uuid.getTimestamp();
			var date = uuid.getTimestamp(Date);
			var dateString = uuid.getTimestamp(String);
			var hexString = uuid.getTimestamp("hex");
			var now = new Date();
			doh.assertTrue(timestamp.valueOf() == date.valueOf());
			doh.assertTrue(hexString == "1da86cdb4308fb0");
			doh.assertTrue(timestamp < now);
		},
		
		function test_uuid_generators(){
			var generators = [
				dxuuid.generateNilUuid,
				generateRandomUuid,
				generateTimeBasedUuid
			];
			
			for(var i in generators){
				var generator = generators[i];
				var uuidString = generator();

				doh.assertTrue((typeof uuidString) == 'string');
				checkValidityOfUuidString(uuidString);

				var uuid = new Uuid(uuidString);
				if(generator != dxuuid.generateNilUuid){
					doh.assertTrue(uuid.getVariant() == dxuuid.variant.DCE);
				}

				doh.assertTrue(uuid.isEqual(uuid));
				doh.assertTrue(uuid.compare(uuid) == 0);
				doh.assertTrue(Uuid.compare(uuid, uuid) == 0);
				checkValidityOfUuidString(uuid.toString());
				doh.assertTrue(uuid.toString().length == 36);
		
				if(generator != dxuuid.generateNilUuid){
					var uuidStringOne = generator();
					var uuidStringTwo = generator();
					doh.assertTrue(uuidStringOne != uuidStringTwo);
					
					Uuid.setGenerator(generator);
					var uuidOne = new Uuid();
					var uuidTwo = new Uuid();
					doh.assertTrue(generator === Uuid.getGenerator());
					Uuid.setGenerator(null);
					doh.assertTrue(uuidOne != uuidTwo);
					doh.assertTrue(!uuidOne.isEqual(uuidTwo));
					doh.assertTrue(!uuidTwo.isEqual(uuidOne));
					
					var oneVsTwo = Uuid.compare(uuidOne, uuidTwo); // either 1 or -1
					var twoVsOne = Uuid.compare(uuidTwo, uuidOne); // either -1 or 1
					doh.assertTrue(oneVsTwo + twoVsOne == 0);
					doh.assertTrue(oneVsTwo != 0);
					doh.assertTrue(twoVsOne != 0);
					
					doh.assertTrue(!uuidTwo.isEqual(uuidOne));
				}
				
				if(generator == generateRandomUuid){
					doh.assertTrue(uuid.getVersion() == dxuuid.version.RANDOM);
				}
				
				if(generator == generateTimeBasedUuid){
					checkValidityOfTimeBasedUuidString(uuid.toString());
					doh.assertTrue(uuid.getVersion() == dxuuid.version.TIME_BASED);
					doh.assertTrue(dojo.isString(uuid.getNode()));
					doh.assertTrue(uuid.getNode().length == 12);
					var timestamp = uuid.getTimestamp();
					var date = uuid.getTimestamp(Date);
					var dateString = uuid.getTimestamp(String);
					var hexString = uuid.getTimestamp("hex");
					doh.assertTrue(date instanceof Date);
					doh.assertTrue(timestamp.valueOf() == date.valueOf());
					doh.assertTrue(hexString.length == 15);
				}
			}
		},
		
		function test_uuid_nilGenerator(){
			var nilUuidString = '00000000-0000-0000-0000-000000000000';
			var uuidString = dxuuid.generateNilUuid();
			doh.assertTrue(uuidString == nilUuidString);
		},
		
		function test_uuid_timeBasedGenerator(){
			var uuid;   // an instance of dojox.uuid.Uuid
			var string; // a simple string literal
			var generator = generateTimeBasedUuid;

			var string1 = generator();
			var uuid2    = new Uuid(generator());
			var string3 = generator("017bf397618a");         // hardwareNode
			var string4 = generator("f17bf397618a");         // pseudoNode
			var string5 = generator(new String("017BF397618A"));
			
			generateTimeBasedUuid.setNode("017bf397618a");
			var string6 = generator(); // the generated UUID has node == "017bf397618a"
			var uuid7   = new Uuid(generator()); // the generated UUID has node == "017bf397618a"
			var returnedNode = generateTimeBasedUuid.getNode();
			doh.assertTrue(returnedNode == "017bf397618a");
		
			function getNode(string){
				var arrayOfStrings = string.split('-');
				return arrayOfStrings[4];
			}
			checkForPseudoNodeBitInTimeBasedUuidString(string1);
			checkForPseudoNodeBitInTimeBasedUuidString(uuid2.toString());
			checkForPseudoNodeBitInTimeBasedUuidString(string4);
			
			doh.assertTrue(getNode(string3) == "017bf397618a");
			doh.assertTrue(getNode(string4) == "f17bf397618a");
			doh.assertTrue(getNode(string5) == "017bf397618a");
			doh.assertTrue(getNode(string6) == "017bf397618a");
			doh.assertTrue(uuid7.getNode() == "017bf397618a");
			
			checkValidityOfTimeBasedUuidString(string1);
			checkValidityOfTimeBasedUuidString(uuid2.toString());
			checkValidityOfTimeBasedUuidString(string3);
			checkValidityOfTimeBasedUuidString(string4);
			checkValidityOfTimeBasedUuidString(string5);
			checkValidityOfTimeBasedUuidString(string6);
			checkValidityOfTimeBasedUuidString(uuid7.toString());
		},

		function test_uuid_invalidUuids(){
			var uuidStrings = [];
			uuidStrings.push("Hello world!");                          // not a UUID
			uuidStrings.push("3B12F1DF-5232-1804-897E-917BF39761");    // too short
			uuidStrings.push("3B12F1DF-5232-1804-897E-917BF39761-8A"); // extra '-'
			uuidStrings.push("3B12F1DF-5232-1804-897E917BF39761-8A");  // last '-' in wrong place
			uuidStrings.push("HB12F1DF-5232-1804-897E-917BF397618A");  // "HB12F1DF" is not a hex string
		
			var numberOfFailures = 0;
			for(var i in uuidStrings){
				var uuidString = uuidStrings[i];
				try{
					new Uuid(uuidString);
				}catch (e){
					++numberOfFailures;
				}
			}
			doh.assertTrue(numberOfFailures == uuidStrings.length);
		}
	]
);



/*
function test_uuid_get64bitArrayFromFloat(){
	// summary:
	//		This is a test we'd like to be able to run, but we can't run it
	//		because it tests a function which is private in generateTimeBasedUuid
	var x = Math.pow(2, 63) + Math.pow(2, 15);
	var result = generateTimeBasedUuid._get64bitArrayFromFloat(x);
	doh.assertTrue(result[0] === 0x8000);
	doh.assertTrue(result[1] === 0x0000);
	doh.assertTrue(result[2] === 0x0000);
	doh.assertTrue(result[3] === 0x8000);

	var date = new Date();
	x = date.valueOf();
	result = generateTimeBasedUuid._get64bitArrayFromFloat(x);
	var reconstructedFloat = result[0];
	reconstructedFloat *= 0x10000;
	reconstructedFloat += result[1];
	reconstructedFloat *= 0x10000;
	reconstructedFloat += result[2];
	reconstructedFloat *= 0x10000;
	reconstructedFloat += result[3];

	doh.assertTrue(reconstructedFloat === x);
}

function test_uuid_addTwo64bitArrays(){
	// summary:
	//		This is a test we'd like to be able to run, but we can't run it
	//		because it tests a function which is private in generateTimeBasedUuid
	var a = [0x0000, 0x0000, 0x0000, 0x0001];
	var b = [0x0FFF, 0xFFFF, 0xFFFF, 0xFFFF];
	var result = generateTimeBasedUuid._addTwo64bitArrays(a, b);
	doh.assertTrue(result[0] === 0x1000);
	doh.assertTrue(result[1] === 0x0000);
	doh.assertTrue(result[2] === 0x0000);
	doh.assertTrue(result[3] === 0x0000);

	a = [0x4000, 0x8000, 0x8000, 0x8000];
	b = [0x8000, 0x8000, 0x8000, 0x8000];
	result = generateTimeBasedUuid._addTwo64bitArrays(a, b);
	doh.assertTrue(result[0] === 0xC001);
	doh.assertTrue(result[1] === 0x0001);
	doh.assertTrue(result[2] === 0x0001);
	doh.assertTrue(result[3] === 0x0000);

	a = [7, 6, 2, 5];
	b = [1, 0, 3, 4];
	result = generateTimeBasedUuid._addTwo64bitArrays(a, b);
	doh.assertTrue(result[0] === 8);
	doh.assertTrue(result[1] === 6);
	doh.assertTrue(result[2] === 5);
	doh.assertTrue(result[3] === 9);
}

function test_uuid_multiplyTwo64bitArrays(){
	// summary:
	//		This is a test we'd like to be able to run, but we can't run it
	//		because it tests a function which is private in generateTimeBasedUuid
	var a = [     0, 0x0000, 0x0000, 0x0003];
	var b = [0x1111, 0x1234, 0x0000, 0xFFFF];
	var result = generateTimeBasedUuid._multiplyTwo64bitArrays(a, b);
	doh.assertTrue(result[0] === 0x3333);
	doh.assertTrue(result[1] === 0x369C);
	doh.assertTrue(result[2] === 0x0002);
	doh.assertTrue(result[3] === 0xFFFD);

	a = [0, 0, 0, 5];
	b = [0, 0, 0, 4];
	result = generateTimeBasedUuid._multiplyTwo64bitArrays(a, b);
	doh.assertTrue(result[0] === 0);
	doh.assertTrue(result[1] === 0);
	doh.assertTrue(result[2] === 0);
	doh.assertTrue(result[3] === 20);

	a = [0, 0, 2, 5];
	b = [0, 0, 3, 4];
	result = generateTimeBasedUuid._multiplyTwo64bitArrays(a, b);
	doh.assertTrue(result[0] === 0);
	doh.assertTrue(result[1] === 6);
	doh.assertTrue(result[2] === 23);
	doh.assertTrue(result[3] === 20);
}
*/
});
