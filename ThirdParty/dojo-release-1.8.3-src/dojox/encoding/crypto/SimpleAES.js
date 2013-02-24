define(["../base64", "./_base"], 
 function(base64, crypto){

	// Sbox is pre-computed multiplicative inverse in GF(2^8) used in SubBytes and KeyExpansion [5.1.1]
	var Sbox =	[0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
				 0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
				 0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
				 0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
				 0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
				 0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
				 0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
				 0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
				 0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
				 0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
				 0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
				 0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
				 0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
				 0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
				 0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
				 0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16];

	// Rcon is Round Constant used for the Key Expansion [1st col is 2^(r-1) in GF(2^8)] [5.2]
	var Rcon = [ [0x00, 0x00, 0x00, 0x00],
				 [0x01, 0x00, 0x00, 0x00],
				 [0x02, 0x00, 0x00, 0x00],
				 [0x04, 0x00, 0x00, 0x00],
				 [0x08, 0x00, 0x00, 0x00],
				 [0x10, 0x00, 0x00, 0x00],
				 [0x20, 0x00, 0x00, 0x00],
				 [0x40, 0x00, 0x00, 0x00],
				 [0x80, 0x00, 0x00, 0x00],
				 [0x1b, 0x00, 0x00, 0x00],
				 [0x36, 0x00, 0x00, 0x00] ];

	/*
	 * AES Cipher function: encrypt 'input' with Rijndael algorithm
	 *
	 *	 takes	 byte-array 'input' (16 bytes)
	 *			 2D byte-array key schedule 'w' (Nr+1 x Nb bytes)
	 *
	 *	 applies Nr rounds (10/12/14) using key schedule w for 'add round key' stage
	 *
	 *	 returns byte-array encrypted value (16 bytes)
	 */
	function Cipher(input, w) {	   // main Cipher function [��5.1]
	  var Nb = 4;				// block size (in words): no of columns in state (fixed at 4 for AES)
	  var Nr = w.length/Nb - 1; // no of rounds: 10/12/14 for 128/192/256-bit keys

	  var state = [[],[],[],[]];  // initialise 4xNb byte-array 'state' with input [3.4]
	  for (var i=0; i<4*Nb; i++) state[i%4][Math.floor(i/4)] = input[i];

	  state = AddRoundKey(state, w, 0, Nb);

	  for (var round=1; round<Nr; round++) {
		state = SubBytes(state, Nb);
		state = ShiftRows(state, Nb);
		state = MixColumns(state, Nb);
		state = AddRoundKey(state, w, round, Nb);
	  }

	  state = SubBytes(state, Nb);
	  state = ShiftRows(state, Nb);
	  state = AddRoundKey(state, w, Nr, Nb);

	  var output = new Array(4*Nb);	 // convert state to 1-d array before returning [3.4]
	  for (var i=0; i<4*Nb; i++) output[i] = state[i%4][Math.floor(i/4)];
	  return output;
	}


	function SubBytes(s, Nb) {	  // apply SBox to state S [5.1.1]
	  for (var r=0; r<4; r++) {
		for (var c=0; c<Nb; c++) s[r][c] = Sbox[s[r][c]];
	  }
	  return s;
	}


	function ShiftRows(s, Nb) {	   // shift row r of state S left by r bytes [5.1.2]
	  var t = new Array(4);
	  for (var r=1; r<4; r++) {
		for (var c=0; c<4; c++) t[c] = s[r][(c+r)%Nb];	// shift into temp copy
		for (var c=0; c<4; c++) s[r][c] = t[c];			// and copy back
	  }			 // note that this will work for Nb=4,5,6, but not 7,8 (always 4 for AES):
	  return s;	 // see fp.gladman.plus.com/cryptography_technology/rijndael/aes.spec.311.pdf
	}


	function MixColumns(s, Nb) {   // combine bytes of each col of state S [5.1.3]
	  for (var c=0; c<4; c++) {
		var a = new Array(4);  // 'a' is a copy of the current column from 's'
		var b = new Array(4);  // 'b' is a�ށ{02} in GF(2^8)
		for (var i=0; i<4; i++) {
		  a[i] = s[i][c];
		  b[i] = s[i][c]&0x80 ? s[i][c]<<1 ^ 0x011b : s[i][c]<<1;
		}
		// a[n] ^ b[n] is a�ށ{03} in GF(2^8)
		s[0][c] = b[0] ^ a[1] ^ b[1] ^ a[2] ^ a[3]; // 2*a0 + 3*a1 + a2 + a3
		s[1][c] = a[0] ^ b[1] ^ a[2] ^ b[2] ^ a[3]; // a0 * 2*a1 + 3*a2 + a3
		s[2][c] = a[0] ^ a[1] ^ b[2] ^ a[3] ^ b[3]; // a0 + a1 + 2*a2 + 3*a3
		s[3][c] = a[0] ^ b[0] ^ a[1] ^ a[2] ^ b[3]; // 3*a0 + a1 + a2 + 2*a3
	  }
	  return s;
	}


	function AddRoundKey(state, w, rnd, Nb) {  // xor Round Key into state S [5.1.4]
	  for (var r=0; r<4; r++) {
		for (var c=0; c<Nb; c++) state[r][c] ^= w[rnd*4+c][r];
	  }
	  return state;
	}


	function KeyExpansion(key) {  // generate Key Schedule (byte-array Nr+1 x Nb) from Key [5.2]
	  var Nb = 4;			 // block size (in words): no of columns in state (fixed at 4 for AES)
	  var Nk = key.length/4	 // key length (in words): 4/6/8 for 128/192/256-bit keys
	  var Nr = Nk + 6;		 // no of rounds: 10/12/14 for 128/192/256-bit keys

	  var w = new Array(Nb*(Nr+1));
	  var temp = new Array(4);

	  for (var i=0; i<Nk; i++) {
		var r = [key[4*i], key[4*i+1], key[4*i+2], key[4*i+3]];
		w[i] = r;
	  }

	  for (var i=Nk; i<(Nb*(Nr+1)); i++) {
		w[i] = new Array(4);
		for (var t=0; t<4; t++) temp[t] = w[i-1][t];
		if (i % Nk == 0) {
		  temp = SubWord(RotWord(temp));
		  for (var t=0; t<4; t++) temp[t] ^= Rcon[i/Nk][t];
		} else if (Nk > 6 && i%Nk == 4) {
		  temp = SubWord(temp);
		}
		for (var t=0; t<4; t++) w[i][t] = w[i-Nk][t] ^ temp[t];
	  }

	  return w;
	}

	function SubWord(w) {	 // apply SBox to 4-byte word w
	  for (var i=0; i<4; i++) w[i] = Sbox[w[i]];
	  return w;
	}

	function RotWord(w) {	 // rotate 4-byte word w left by one byte
	  w[4] = w[0];
	  for (var i=0; i<4; i++) w[i] = w[i+1];
	  return w;
	}

	/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

	/*
	 * Use AES to encrypt 'plaintext' with 'password' using 'nBits' key, in 'Counter' mode of operation
	 *							 - see http://csrc.nist.gov/publications/nistpubs/800-38a/sp800-38a.pdf
	 *	 for each block
	 *	 - outputblock = cipher(counter, key)
	 *	 - cipherblock = plaintext xor outputblock
	 */
	function AESEncryptCtr(plaintext, password, nBits) {
	  if (!(nBits==128 || nBits==192 || nBits==256)) return '';	 // standard allows 128/192/256 bit keys

	  // for this example script, generate the key by applying Cipher to 1st 16/24/32 chars of password;
	  // for real-world applications, a more secure approach would be to hash the password e.g. with SHA-1
	  var nBytes = nBits/8;	 // no bytes in key
	  var pwBytes = new Array(nBytes);
	  for (var i=0; i<nBytes; i++) pwBytes[i] = password.charCodeAt(i) & 0xff;

	  var key = Cipher(pwBytes, KeyExpansion(pwBytes));

	  key = key.concat(key.slice(0, nBytes-16));  // key is now 16/24/32 bytes long

	  // initialise counter block (NIST SP800-38A B.2): millisecond time-stamp for nonce in 1st 8 bytes,
	  // block counter in 2nd 8 bytes
	  var blockSize = 16;  // block size fixed at 16 bytes / 128 bits (Nb=4) for AES
	  var counterBlock = new Array(blockSize);	// block size fixed at 16 bytes / 128 bits (Nb=4) for AES
	  var nonce = (new Date()).getTime();  // milliseconds since 1-Jan-1970

	  // encode nonce in two stages to cater for JavaScript 32-bit limit on bitwise ops
	  for (var i=0; i<4; i++) counterBlock[i] = (nonce >>> i*8) & 0xff;
	  for (var i=0; i<4; i++) counterBlock[i+4] = (nonce/0x100000000 >>> i*8) & 0xff;

	  // generate key schedule - an expansion of the key into distinct Key Rounds for each round
	  var keySchedule = KeyExpansion(key);

	  var blockCount = Math.ceil(plaintext.length/blockSize);
	  var ciphertext = new Array(blockCount);  // ciphertext as array of strings

	  for (var b=0; b<blockCount; b++) {
		// set counter (block #) in last 8 bytes of counter block (leaving nonce in 1st 8 bytes)
		// again done in two stages for 32-bit ops
		for (var c=0; c<4; c++) counterBlock[15-c] = (b >>> c*8) & 0xff;
		for (var c=0; c<4; c++) counterBlock[15-c-4] = (b/0x100000000 >>> c*8)

		var cipherCntr = Cipher(counterBlock, keySchedule);	 // -- encrypt counter block --

		// calculate length of final block:
		var blockLength = b<blockCount-1 ? blockSize : (plaintext.length-1)%blockSize+1;

		var ct = '';
		for (var i=0; i<blockLength; i++) {	 // -- xor plaintext with ciphered counter byte-by-byte --
		  var plaintextByte = plaintext.charCodeAt(b*blockSize+i);
		  var cipherByte = plaintextByte ^ cipherCntr[i];
		  //ct += String.fromCharCode(cipherByte);
		  ct += ((cipherByte < 16) ? "0" : "") + cipherByte.toString(16);
		}
		// ct is now ciphertext for this block

		ciphertext[b] = ct; // escCtrlChars(ct);  // escape troublesome characters in ciphertext
	  }

	  // convert the nonce to a string to go on the front of the ciphertext
	  var ctrTxt = '';
	  for (var i=0; i<8; i++) ctrTxt += ((counterBlock[i] < 16) ? "0" : "") + counterBlock[i].toString(16); //String.fromCharCode(counterBlock[i]);
	  //ctrTxt = escCtrlChars(ctrTxt);

	  // use '-' to separate blocks, use Array.join to concatenate arrays of strings for efficiency
	  return ctrTxt + ' ' + ciphertext.join(' ');
	}

	function stringToHex(s){
		var ret = [];
		s.replace(/(..)/g, function(str){
			ret.push(parseInt(str, 16));
		});
		return ret;
	}

	/*
	 * Use AES to decrypt 'ciphertext' with 'password' using 'nBits' key, in Counter mode of operation
	 *
	 *	 for each block
	 *	 - outputblock = cipher(counter, key)
	 *	 - cipherblock = plaintext xor outputblock
	 */
	function AESDecryptCtr(ciphertext, password, nBits) {
	  if (!(nBits==128 || nBits==192 || nBits==256)) return '';	 // standard allows 128/192/256 bit keys

	  var nBytes = nBits/8;	 // no bytes in key
	  var pwBytes = new Array(nBytes);
	  for (var i=0; i<nBytes; i++) pwBytes[i] = password.charCodeAt(i) & 0xff;
	  var pwKeySchedule = KeyExpansion(pwBytes);
	  var key = Cipher(pwBytes, pwKeySchedule);
	  key = key.concat(key.slice(0, nBytes-16));  // key is now 16/24/32 bytes long

	  var keySchedule = KeyExpansion(key);

	  ciphertext = ciphertext.split(' ');  // split ciphertext into array of block-length strings

	  // recover nonce from 1st element of ciphertext
	  var blockSize = 16;  // block size fixed at 16 bytes / 128 bits (Nb=4) for AES
	  var counterBlock = new Array(blockSize);
	  var ctrTxt = ciphertext[0]; //unescCtrlChars(ciphertext[0]);
	  counterBlock = stringToHex(ctrTxt);

	  var plaintext = new Array(ciphertext.length-1);

	  for (var b=1; b<ciphertext.length; b++) {
		// set counter (block #) in last 8 bytes of counter block (leaving nonce in 1st 8 bytes)
		for (var c=0; c<4; c++) counterBlock[15-c] = ((b-1) >>> c*8) & 0xff;
		for (var c=0; c<4; c++) counterBlock[15-c-4] = ((b/0x100000000-1) >>> c*8) & 0xff;

		var cipherCntr = Cipher(counterBlock, keySchedule);	 // encrypt counter block

		//ciphertext[b] = ciphertext[b]; //unescCtrlChars(ciphertext[b]);

		var pt = '';
		var tmp = stringToHex(ciphertext[b]);
		for (var i=0; i<tmp.length; i++) {
		  // -- xor plaintext with ciphered counter byte-by-byte --
		  var ciphertextByte = ciphertext[b].charCodeAt(i);
		  var plaintextByte = tmp[i] ^ cipherCntr[i];
		  pt += String.fromCharCode(plaintextByte);
		}
		// pt is now plaintext for this block

		plaintext[b-1] = pt;  // b-1 'cos no initial nonce block in plaintext
	  }

	  return plaintext.join('');
	}

	/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

	function escCtrlChars(str) {  // escape control chars which might cause problems handling ciphertext
	  return str.replace(/[\0\t\n\v\f\r\xa0!-]/g, function(c) { return '!' + c.charCodeAt(0) + '!'; });
	}  // \xa0 to cater for bug in Firefox; include '-' to leave it free for use as a block marker

	function unescCtrlChars(str) {	// unescape potentially problematic control characters
	  return str.replace(/!\d\d?\d?!/g, function(c) { return String.fromCharCode(c.slice(1,-1)); });
	}

	/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

	crypto.SimpleAES = new (function(){
		// summary:
		//		SimpleAES, ported from dojox.sql, and done without the need for
		//		a Google Gears worker pool.
		// description:
		//		Taken from http://www.movable-type.co.uk/scripts/aes.html by
		//		Chris Veness (CLA signed); adapted for Dojo by Brad Neuberg
		//		(bkn3 AT columbia.edu) and moved to DojoX crypto by Tom Trenka
		//		(ttrenka AT gmail.com).
		//
		//		A few notes:
		//		1) This algorithm uses a customized version of CBC mode by creating
		//		a nonce, using it as an initialization vector, and storing the
		//		IV as the first portion of the encrypted text.  Because of this, it
		//		is HIGHLY PROBABLE that it will NOT be usable by other AES implementations.
		//		2) All encoding is done in hex format; other encoding formats (such
		//		as base 64) are not supported.
		//		3) The bit depth of the key is hardcoded at 256, despite the ability
		//		of the code to handle all three recommended bit depths.
		//		4) The passed key will be padded (as opposed to enforcing a strict
		//		length) with null bytes.
		this.encrypt = function(/* String */plaintext, /* String */key){
			// summary:
			//		Encrypt the passed plaintext using the key, with a
			//		hardcoded bit depth of 256.
			return AESEncryptCtr(plaintext, key, 256);	//	String
		};
		this.decrypt = function(/* String */ciphertext, /* String */key){
			// summary:
			//		Decrypt the passed ciphertext using the key at a fixed
			//		bit depth of 256.
			return AESDecryptCtr(ciphertext, key, 256);	//	String
		};
	})();

	return crypto.SimpleAES;
});
