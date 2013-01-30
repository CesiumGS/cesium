define(["dojox/mvc/getStateful"], function(getStateful){
	// module:
	//		dojox/mvc/tests/mobile/demo/MobileDemoContactModel
	// summary:
	//		The data model of contact info for this demo.

	return getStateful({
		Serial: "360324",
		First: "John",
		Last: "Doe",
		Email: "jdoe@us.ibm.com",
		ShipTo: {
			Street: "123 Valley Rd",
			City: "Katonah",
			State: "NY",
			Zip: "10536"
		},
		BillTo: {
			Street: "17 Skyline Dr",
			City: "Hawthorne",
			State: "NY",
			Zip: "10532"
		}
	});
});
