define(["dojox/mvc/getStateful"], function(getStateful){
	// module:
	//		dojox/mvc/tests/mobile/demo/MobileDemoContactListModel
	// summary:
	//		The data model of contact list info for this demo.

	return getStateful([ 
		{
			uniqueId: "0",
			First: "Chad",
			Last: "Chapman",
			Location: "CA",
			Office: "1278",
			Email: "c.c@test.com",
			Tel: "408-764-8237",
			Fax: "408-764-8228"
		},
		{
			uniqueId: "1",
			First: "Irene",
			Last: "Ira",
			Location: "NJ",
			Office: "F09",
			Email: "i.i@test.com",
			Tel: "514-764-6532",
			Fax: "514-764-7300"
		},
		{
			uniqueId: "2",
			First: "John",
			Last: "Jacklin",
			Location: "CA",
			Office: "6701",
			Email: "j.j@test.com",
			Tel: "408-764-1234",
			Fax: "408-764-4321"
		}
	]);
});
