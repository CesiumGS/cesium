define(['doh', '../../crypto/Blowfish'], function(doh, Blowfish){
	var message="The rain in Spain falls mainly on the plain.";
	var key="foobar";
	var base64Encrypted="WI5J5BPPVBuiTniVcl7KlIyNMmCosmKTU6a/ueyQuoUXyC5dERzwwdzfFsiU4vBw";

	tests.register("dojox.encoding.crypto.tests.Blowfish", [
		function testEncrypt(t){
			var dt=new Date();
			t.assertEqual(base64Encrypted, Blowfish.encrypt(message, key));
			doh.debug("testEncrypt: ", new Date()-dt, "ms.");
		},
		function testDecrypt(t){
			var dt=new Date();
			t.assertEqual(message, Blowfish.decrypt(base64Encrypted, key));
			doh.debug("testDecrypt: ", new Date()-dt, "ms.");
		},
		function testShortMessage(t){
			var msg="pass";
			var pwd="foobar";
			var dt=new Date();
			var enc=Blowfish.encrypt(msg, pwd);
			var dec=Blowfish.decrypt(enc, pwd);
			t.assertEqual(dec, msg);
			doh.debug("testShortMessage: ", new Date()-dt, "ms.");
		}
	]);
});
