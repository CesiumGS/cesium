define(['doh', '../../crypto/SimpleAES'], function(doh, SimpleAES){
	var message="The rain in Spain falls mainly on the plain.";
	var key="foo-bar-baz";
	var enc = null;

	tests.register("dojox.encoding.crypto.tests.SimpleAES", [
		function testAES(t){
			var dt = new Date();
			enc = SimpleAES.encrypt(message, key);
			doh.debug("Encrypt: ", new Date()-dt, "ms.");
			var dt2 = new Date();
			t.assertEqual(message, SimpleAES.decrypt(enc, key));
			doh.debug("Decrypt: ", new Date()-dt2, "ms.");
		}
	]);
});
