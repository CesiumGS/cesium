define(["dojo", "dijit/Calendar"], function(dojo, calendar){
	// a coolio/calendarAsync-created calendar will be created in the cdojo and cdijit instances
	// but, during dev, this is a detail we can ignore...the config makes in just work
	return function(id){
		return new calendar({}, dojo.byId(id));
	};
});
