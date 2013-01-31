define(['doh', '../../crypto/RSAKey', '../../../math/random/Secure', '../../../math/random/prng4', '../../crypto/RSAKey-ext'], function(doh, RSAKey, Secure, prng4){
	var message = "The rain in Spain falls mainly on the plain.",

		sec = function(){ return new Secure(prng4); },

		keys = {
			"512e3": {
				N:		"BC86E3DC782C446EE756B874ACECF2A115E613021EAF1ED5EF295BEC2BED899D" +
						"26FE2EC896BF9DE84FE381AF67A7B7CBB48D85235E72AB595ABF8FE840D5F8DB",
				E:		"3",
				D:		"7daf4292fac82d9f44e47af87348a1c0b9440cac1474bf394a1b929d729e5bbc" +
						"f402f29a9300e11b478c091f7e5dacd3f8edae2effe3164d7e0eeada87ee817b",
				P:		"ef3fc61e21867a900e01ee4b1ba69f5403274ed27656da03ed88d7902cce693f",
				Q:		"c9b9fcc298b7d1af568f85b50e749539bc01b10a68472fe1302058104821cd65",
				DMP1:	"9f7fd9696baefc6009569edcbd19bf8d576f89e1a439e6ad4905e50ac8899b7f",
				DMQ1:	"867bfdd7107a8bca39b503ce09a30e267d567606f02f7540cac03ab5856bde43",
				COEFF:	"412d6b551d93ee1bd7dccafc63d7a6d031fc66035ecc630ddf75f949a378cd9d"
			},

			"512f4": {
				N:		"C4E3F7212602E1E396C0B6623CF11D26204ACE3E7D26685E037AD2507DCE82FC" +
						"28F2D5F8A67FC3AFAB89A6D818D1F4C28CFA548418BD9F8E7426789A67E73E41",
				E:		"10001",
				D:		"7cd1745aec69096129b1f42da52ac9eae0afebbe0bc2ec89253598dcf454960e" +
						"3e5e4ec9f8c87202b986601dd167253ee3fb3fa047e14f1dfd5ccd37e931b29d",
				P:		"f0e4dd1eac5622bd3932860fc749bbc48662edabdf3d2826059acc0251ac0d3b",
				Q:		"d13cb38fbcd06ee9bca330b4000b3dae5dae12b27e5173e4d888c325cda61ab3",
				DMP1:	"b3d5571197fc31b0eb6b4153b425e24c033b054d22b9c8282254fe69d8c8c593",
				DMQ1:	"968ffe89e50d7b72585a79b65cfdb9c1da0963cceb56c3759e57334de5a0ac3f",
				COEFF:	"d9bc4f420e93adad9f007d0e5744c2fe051c9ed9d3c9b65f439a18e13d6e3908"
			},

			"1024e3": {
				N:		"ABC30681295774F7CECA691EC17F4E762DA6DE70F198EAEE3CCE3A435FC006B9" +
						"71DC24E55904F1D2705758C041C2B0B18E8BFAE2C9CD96B50082D7D8C7342CBA" +
						"B7F6E0622DA53B8B56DBDB24174F00173263CFECAE604795CDA2A037BC3A69B7" +
						"C0090AA2DE1568998BCD6D70CC2E0574755B9F7986AE01CE8714A26144279CDB",
				E:		"3",
				D:		"728204561b8fa34fdf319b69d654def973c4944b4bbb47497dded1823fd559d0" +
						"f692c34390adf68c4ae4e5d5812c75cbb45d51ec86890f2355ac8fe5da22c87b" +
						"62449e2aa754422bc43d3ca32efa866227ad58178e7803897d074f1312740aa7" +
						"61cfc7ed753bb829d7a2ab091289d1676809bfd61276b43bb3a395714f167beb",
				P:		"e200731c6e934a0fdc1d5ce5f66d08ba9478280f46e9cbed777029dd4811a7cd" +
						"4aa66ad8365c5aa67b06b97e54ee8fec03adb2134f7359a427c7ffc468ef0231",
				Q:		"c28f8005c4138e39d462a3495a6a2dc96267a3ba11c2765a1aa77fbdd87ab1ef" +
						"62aaf3e677df79b44d52b364db70bb6d559f4da51b8899d0d1d74272e496e0cb",
				DMP1:	"96aaf76849b786b53d68e8994ef35b270da5700a2f4687f3a4f5713e300bc533" +
						"87199c90243d91c452047ba98df45ff2ad1e76b78a4ce66d6fdaaa82f09f56cb",
				DMQ1:	"81b50003d80d097be2ec6cdb919c1e86419a6d26b681a43c11c4ffd3e5a7214a" +
						"41c74d444fea5122de3722433cf5d248e3bf8918bd05bbe08be4d6f7430f4087",
				COEFF:	"a318fb95d3b10d6cfb0096fc3a3173377cf0952bf5d50fd3ccf678dd636ca1a1" +
						"aeed8da416c8fba4395b00dc3e22823d1b2add8a4e1222d562af11bd6c78ad94"
			},

			"1024f4": {
				N:		"a5261939975948bb7a58dffe5ff54e65f0498f9175f5a09288810b8975871e99" +
						"af3b5dd94057b0fc07535f5f97444504fa35169d461d0d30cf0192e307727c06" +
						"5168c788771c561a9400fb49175e9e6aa4e23fe11af69e9412dd23b0cb6684c4" +
						"c2429bce139e848ab26d0829073351f4acd36074eafd036a5eb83359d2a698d3",
				E:		"10001",
				D:		"8e9912f6d3645894e8d38cb58c0db81ff516cf4c7e5a14c7f1eddb1459d2cded" +
						"4d8d293fc97aee6aefb861859c8b6a3d1dfe710463e1f9ddc72048c09751971c" +
						"4a580aa51eb523357a3cc48d31cfad1d4a165066ed92d4748fb6571211da5cb1" +
						"4bc11b6e2df7c1a559e6d5ac1cd5c94703a22891464fba23d0d965086277a161",
				P:		"d090ce58a92c75233a6486cb0a9209bf3583b64f540c76f5294bb97d285eed33" +
						"aec220bde14b2417951178ac152ceab6da7090905b478195498b352048f15e7d",
				Q:		"cab575dc652bb66df15a0359609d51d1db184750c00c6698b90ef3465c996551" +
						"03edbf0d54c56aec0ce3c4d22592338092a126a0cc49f65a4a30d222b411e58f",
				DMP1:	"1a24bca8e273df2f0e47c199bbf678604e7df7215480c77c8db39f49b000ce2c" +
						"f7500038acfff5433b7d582a01f1826e6f4d42e1c57f5e1fef7b12aabc59fd25",
				DMQ1:	"3d06982efbbe47339e1f6d36b1216b8a741d410b0c662f54f7118b27b9a4ec9d" +
						"914337eb39841d8666f3034408cf94f5b62f11c402fc994fe15a05493150d9fd",
				COEFF:	"3a3e731acd8960b7ff9eb81a7ff93bd1cfa74cbd56987db58b4594fb09c09084" +
						"db1734c8143f98b602b981aaa9243ca28deb69b5b280ee8dcee0fd2625e53250"
			}
		};

	function roundTrip(text, key, rngf){
		var rsa = rngf ? new RSAKey(rngf) : new RSAKey();
		rsa.setPublic(key.N, key.E);
		var encoded = rsa.encrypt(text);
		rsa.setPrivateEx(key.N, key.E, key.D, key.P, key.Q, key.DMP1, key.DMQ1, key.COEFF);
		var decoded = rsa.decrypt(encoded);
		return decoded;
	}

	function generateKey(len, e, rngf){
		var rsa = rngf ? new RSAKey(rngf) : new RSAKey();
		rsa.generate(len, e);
		return {
			N: rsa.n.toString(),
			E: rsa.e.toString(),
			D: rsa.d.toString(),
			P: rsa.p.toString(),
			Q: rsa.q.toString(),
			DMP1:  rsa.dmp1.toString(),
			DMQ1:  rsa.dmq1.toString(),
			COEFF: rsa.coeff.toString()
		};
	}

	tests.register("dojox.encoding.crypto.tests.RSA", [
		// simple round-trip
		function testSimple_RoundTrip1(t){
			t.is(message, roundTrip(message, keys["512e3"]));
		},
		function testSimple_RoundTrip2(t){
			t.is(message, roundTrip(message, keys["512f4"]));
		},
		function testSimple_RoundTrip3(t){
			t.is(message, roundTrip(message, keys["1024e3"]));
		},
		function testSimple_RoundTrip4(t){
			t.is(message, roundTrip(message, keys["1024f4"]));
		},
		// secure round-trip
		function testSecure_RoundTrip1(t){
			t.is(message, roundTrip(message, keys["512e3"], sec));
		},
		function testSecure_RoundTrip2(t){
			t.is(message, roundTrip(message, keys["512f4"], sec));
		},
		function testSecure_RoundTrip3(t){
			t.is(message, roundTrip(message, keys["1024e3"], sec));
		},
		function testSecure_RoundTrip4(t){
			t.is(message, roundTrip(message, keys["1024f4"], sec));
		}
/*
		// generate a key + round-trip using simple rng
		function testSimple_GenRT_512e3(t){
			var key = generateKey(512, "3");
			t.is(message, roundTrip(message, key));
		},
		function testSimple_GenRT_512f4(t){
			var key = generateKey(512, "10001");
			t.is(message, roundTrip(message, key));
		},
		function testSimple_GenRT_1024e3(t){
			var key = generateKey(1024, "3");
			t.is(message, roundTrip(message, key));
		},
		function testSimple_GenRT_1024f4(t){
			var key = generateKey(1024, "10001");
			t.is(message, roundTrip(message, key));
		},
		// generate a key + round-trip using secure rng
		function testSecure_GenRT_512e3(t){
			var key = generateKey(512, "3", sec);
			t.is(message, roundTrip(message, key, sec));
		},
		function testSecure_GenRT_512f4(t){
			var key = generateKey(512, "10001", sec);
			t.is(message, roundTrip(message, key, sec));
		},
		function testSecure_GenRT_1024e3(t){
			var key = generateKey(1024, "3", sec);
			t.is(message, roundTrip(message, key, sec));
		},
		function testSecure_GenRT_1024f4(t){
			var key = generateKey(1024, "10001", sec);
			t.is(message, roundTrip(message, key, sec));
		}
*/
	]);
});
