dojo.provide("dojox.widget.tests.CalendarStackLayout");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit.layout.StackContainer");
dojo.require("dojox.widget.Calendar");
dojo.require("dijit._Widget");
dojo.require("dijit._Container");
dojo.require("dojo.string");

dojo.declare("dojox.widget.tests.CalendarStackLayout", [dijit._Widget, dijit._Container],{
	dateToPane: {},
	startup: function(){
		if(this._started){
			return null;
		}
		
		// Get a list of the stack panes
		var kids = this.getChildren();
		var dates = [];

		// Store the dates for each pane
		dojo.forEach(kids, dojo.hitch(this, function(childContainer){
			var dateRef = childContainer.domNode.getAttribute("dateref");
			this.dateToPane[dateRef] = childContainer;
			
			var parts = dateRef.split("-");
			var date = new Date();
			date.setFullYear(parts[0]);
			date.setMonth(Number(parts[1]) - 1);
			date.setDate(parts[2]);
			dates.push(date.getTime());
		}));
		
		dates.sort();
		var lastDate = new Date(dates[dates.length -1]);
		var firstDate = new Date(dates[0]);

		var _this = this;

		function getChildByDate(date){
			return _this.dateToPane[
				date.getFullYear()
				+  "-" + dojo.string.pad(String(date.getMonth() + 1), 2)
				+ "-" + dojo.string.pad(String(date.getDate()))];
		}

		// Instantiate the calendar, overriding the getClassForDate and isDisabledDate functions
		this.calendar = new dojox.widget.Calendar({
			getClassForDate: function(date){
				return getChildByDate(date) ? " hasAppointment" : " noAppointment";
		    },

		    isDisabledDate: function(date){
				return getChildByDate(date) ? false : true;
		    }
		});
		
		if(this.calendar.attr("value").getTime() > lastDate.getTime()){
			this.calendar.attr("value", lastDate);
		}else if(this.calendar.attr("value").getTime() < firstDate.getTime()){
			this.calendar.attr("value", firstDate);
		}

		// Instantiate the stack container
		this.stack = new dijit.layout.StackContainer();
		dojo.addClass(this.stack.domNode, "calendarStack");

		//Add the calendar and stack container to this widget
		this.addChild(this.calendar);
		this.addChild(this.stack);

		// Set up some styles on the calendar and stack container
		dojo.style(this.stack.domNode, "width", dojo.style(this.calendar.domNode, "width") + "px");
		
		dojo.addClass(this.stack.domNode, "dijitCalendarStackDetails");

		// Add all the content panes to the stack container
		dojo.forEach(kids, dojo.hitch(this,function(childContainer){
			this.stack.addChild(childContainer);
		}));

		// Add a listener to the onValueSelected method of the calendar
		// to select the correct pane
		dojo.connect(this.calendar, "onValueSelected", dojo.hitch(this, function(date){
			var pane = getChildByDate(date);

			if(pane){
				this.stack.selectChild(pane);
			}
		}));
		
		// Show the last pane automatically
		this.stack.selectChild(kids[kids.length - 1]);
			if(!this.stack.started && !this.stack._started){
				this.stack.startup();
			}
		return this.inherited(arguments);
		
	}
});