dojo.provide("dojox.widget.CalendarFx");
dojo.require("dojox.widget.FisheyeLite");

dojo.declare("dojox.widget._FisheyeFX",null, {
	// summary
	//   A mixin to add a FisheyeLite effect to the calendar
	addFx: function(query, fromNode) {
		//Use the query and base node passed from the calendar view mixin
		//to select the nodes to attach the event to.
		dojo.query(query, fromNode).forEach(function(node){
			new dojox.widget.FisheyeLite({
				properties: {
					fontSize: 1.1
				}
			}, node);
		});
	}
});

dojo.declare("dojox.widget.CalendarFisheye",
	[dojox.widget.Calendar,
	 dojox.widget._FisheyeFX], {
	 	// summary: The standard Calendar. It includes day, month and year views.
		//  FisheyeLite effects are included.
	 }
);
