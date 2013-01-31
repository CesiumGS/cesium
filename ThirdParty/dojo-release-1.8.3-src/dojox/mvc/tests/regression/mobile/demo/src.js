var repeatModel, setRef, nextIndexToAdd, selectedIndex;
var setRef, setDetailsContext, insertResult, updateView, updateModel;

require(['dojo/has',
	'dojox/mobile/parser',
	//'dojo/parser',
	'dojo/ready',
	'dojox/mvc',
	'dojox/mobile',
	'dojox/mobile/ScrollableView',
	'dojox/mobile/Button',
	'dojox/mobile/TextArea',
	'dojox/mvc/Group',
	'dojox/mvc/Generate',
	'dojox/mvc/Repeat',
	'dojox/mobile/TextBox',
	'dojox/mobile/ViewController',
	'dojox/mobile/FixedSplitter',
	'dojox/mobile/EdgeToEdgeList',
	'dojox/mobile/EdgeToEdgeCategory',
	'dojox/mobile/deviceTheme',
	'dojox/mobile/RoundRectCategory',
	'dojox/mobile/Heading',
	'dijit/registry',
	'dojo/_base/json',
	'dojo/dom'
], function(has, parser, ready, mvc, mobile, ScrollableView, Button, TextArea, Group, Generate, Repeat, TextBox, ViewController,
		FixedSplitter, EdgeToEdgeList, EdgeToEdgeCategory, deviceTheme, RoundRectCategory, Heading, WidgetRegistry,
		json, dom){

	if(!has("webkit")){
		require(["dojox/mobile/compat"]);
	}

	var names = {
	"Serial" : "360324",
	"First"  : "John",
	"Last"   : "Doe",
	"Email"  : "jdoe@us.ibm.com",
	"ShipTo" : {
		"Street" : "123 Valley Rd",
		"City"   : "Katonah",
		"State"  : "NY",
		"Zip"    : "10536"
	},
	"BillTo" : {
		"Street" : "17 Skyline Dr",
		"City"   : "Hawthorne",
		"State"  : "NY",
		"Zip"    : "10532"
	}
};

// Initial repeat data used in the Repeat Data binding demo
var repeatData = [ 
	{
		"First"   : "Chad",
		"Last"    : "Chapman",
		"Location": "CA",
		"Office"  : "1278",
		"Email"   : "c.c@test.com",
		"Tel"     : "408-764-8237",
		"Fax"     : "408-764-8228"
	},
	{
		"First"   : "Irene",
		"Last"    : "Ira",
		"Location": "NJ",
		"Office"  : "F09",
		"Email"   : "i.i@test.com",
		"Tel"     : "514-764-6532",
		"Fax"     : "514-764-7300"
	},
	{
		"First"   : "John",
		"Last"    : "Jacklin",
		"Location": "CA",
		"Office"  : "6701",
		"Email"   : "j.j@test.com",
		"Tel"     : "408-764-1234",
		"Fax"     : "408-764-4321"
	}
];

	selectedIndex = 0;

	model = mvc.newStatefulModel({ data : names });
	repeatmodel = mvc.newStatefulModel({ data : repeatData });
	nextIndexToAdd = repeatmodel.data.length;

	// used in the Ship to - Bill to demo
	setRef = function(id, addrRef) {
		var widget = WidgetRegistry.byId(id);
		widget.set("ref", addrRef);
	}

	// used in the Repeat Data binding demo
	setDetailsContext = function(index){
		selectedIndex = index;
		var groupRoot = WidgetRegistry.byId("detailsGroup");
		groupRoot.set("ref", index);
	}

	// used in the Repeat Data binding demo
	insertResult = function(index){
		if (repeatmodel[index-1].First.value !== ""){ // TODO: figure out why we are getting called twice for each click
			var insert = mvc.newStatefulModel({ "data" : {
			"First"   : "",
			"Last"    : "",
			"Location": "CA",
			"Office"  : "",
			"Email"   : "",
			"Tel"     : "",
			"Fax"     : ""} 
			});
			repeatmodel.add(index, insert);
			setDetailsContext(index);
			nextIndexToAdd++;
		}else{
			setDetailsContext(index-1);                 
		}
	};

	// used in the Generate View demo
	var genmodel;
	updateView = function() {
		try {
			var modeldata = json.fromJson(dom.byId("modelArea").value);
			genmodel = mvc.newStatefulModel({ data : modeldata });
			WidgetRegistry.byId("view").set("ref", genmodel);
			dom.byId("outerModelArea").style.display = "none";
			dom.byId("viewArea").style.display = "";              		
		}catch(err){
			console.error("Error parsing json from model: "+err);
		}
	};

	// used in the Generate View demo
	updateModel = function() {
		dom.byId("outerModelArea").style.display = "";
		try {
			dom.byId("modelArea").focus(); // hack: do this to force focus off of the textbox, bug on mobile?
			dom.byId("viewArea").style.display = "none";
			WidgetRegistry.byId("modelArea").set("value",(json.toJson(genmodel.toPlainObject(), true)));
		} catch(e) {
			console.log(e);
		};
	};


	// The dojox.mvc.StatefulModel class creates a data model instance
	// where each leaf within the data model is decorated with dojo.Stateful
	// properties that widgets can bind to and watch for their changes.


	// when "dojo/ready" is ready call parse
	ready(function(){
		parser.parse();
	});

	// when domReady! is ready show the page 
	require(['dojo/domReady!'], function(){
		dom.byId("wholepage").style.display = "";
	});

}); // end function

