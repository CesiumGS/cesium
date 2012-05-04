dojo.provide("coolio.calendar1");
dojo.require("dijit.Calendar");

coolio.calendar1= function(id){
	return new dijit.Calendar({}, dojo.byId(id));
};
