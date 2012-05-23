var repeatModel, setRef, nextIndexToAdd, selectedIndex;
var setRef, setDetailsContext, insertResult, updateView, updateModel;

require([
	'dojox/mobile/parser',
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
	'dojo/data/ItemFileWriteStore',
	'dojo/store/DataStore'	
], function(){
	require([
	         "dojox/mobile/compat"
	]);

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

selectedIndex = 0;

model = dojox.mvc.newStatefulModel({ data : names });
repeatmodel = null;  // use store for repeat data 
nextIndexToAdd = -1;

 // used in the Ship to - Bill to demo
setRef = function(id, addrRef) {
	var widget = dijit.byId(id);
	widget.set("ref", addrRef);
}

// used in the Repeat Data binding demo
setDetailsContext = function(index){
	selectedIndex = index;
	var groupRoot = dijit.byId("detailsGroup");
	groupRoot.set("ref", index);
}

// used in the Repeat Data binding demo
insertResult = function(index){
	if (repeatmodel[index-1].First.value !== ""){ // TODO: figure out why we are getting called twice for each click
		var insert = dojox.mvc.newStatefulModel({ "data" : {
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
		var modeldata = dojo.fromJson(dojo.byId("modelArea").value);
		genmodel = dojox.mvc.newStatefulModel({ data : modeldata });
		dijit.byId("view").set("ref", genmodel);
		dojo.byId("outerModelArea").style.display = "none";
		dojo.byId("viewArea").style.display = "";              		
	}catch(err){
		console.error("Error parsing json from model: "+err);
	}
};

// used in the Generate View demo
updateModel = function() {
	dojo.byId("outerModelArea").style.display = "";
	try {
		dojo.byId("modelArea").focus(); // hack: do this to force focus off of the textbox, bug on mobile?
		dojo.byId("viewArea").style.display = "none";
		dijit.byId("modelArea").set("value",(dojo.toJson(genmodel.toPlainObject(), true)));
	} catch(e) {
		console.log(e);
	};
};


// The dojox.mvc.StatefulModel class creates a data model instance
// where each leaf within the data model is decorated with dojo.Stateful
// properties that widgets can bind to and watch for their changes.
var writeStore = new dojo.data.ItemFileWriteStore({url: dojo.moduleUrl("dojox.mvc.tests._data", "mvcRepeatData.json")});
var modelPromise = dojox.mvc.newStatefulModel({store: new dojo.store.DataStore({store: writeStore}), query:{"Location" : "CA"}}); // example of using a query parm for Location 

require(['dojo/domReady!'], function(){
				modelPromise.then(function(results){ 
					repeatmodel = results;
					nextIndexToAdd = repeatmodel.data.length;
					console.log("before call to parser.parse");
					dojox.mobile.parser.parse();
					console.log("before call to set the wholepage style for display");	
					dojo.byId("wholepage").style.display = "";
					console.log("after call to set the wholepage style for display");	
				});
	
		});

dojo.addOnLoad(function() {
});

}); // end function

