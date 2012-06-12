dojo.provide("coolio.calendar");
dojo.require("dijit.Calendar");

coolio.calendar= function(id){
	return new dijit.Calendar({}, dojo.byId(id));
};
