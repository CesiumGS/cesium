dojo.provide("dojox.widget.CalendarViews");
dojo.experimental("dojox.widget.CalendarViews");

dojo.require("dojox.widget.Calendar");

dojo.declare("dojox.widget._CalendarMonth", null, {
	// summary: Mixin class for adding a view listing all 12 months of the year to the
	//	 dojox.widget._CalendarBase


	constructor: function(){
		// summary: Adds a dojox.widget._CalendarMonthView view to the calendar widget.
		this._addView(dojox.widget._CalendarMonthView);
	}
});

dojo.declare("dojox.widget._CalendarMonthView", [dojox.widget._CalendarView, dijit._Templated], {
	// summary: A Calendar view listing the 12 months of the year

	// templateString: String
	//	The template to be used to construct the widget.
	templateString: dojo.cache("dojox.widget","Calendar/CalendarMonth.html"),

	// datePart: String
	//	Specifies how much to increment the displayed date when the user
	//	clicks the array button to increment of decrement the view.
	datePart: "year",

	// headerClass: String
	//	Specifies the CSS class to apply to the header node for this view.
	headerClass: "dojoxCalendarMonthHeader",

	postCreate: function(){
		// summary: Constructs the view
		this.cloneClass(".dojoxCalendarMonthTemplate", 3);
		this.cloneClass(".dojoxCalendarMonthGroupTemplate", 2);
		this._populateMonths();

		// Add visual effects to the view, if any have been mixed in
		this.addFx(".dojoxCalendarMonthLabel", this.domNode);
	},

	_setValueAttr: function(value){
		this.header.innerHTML = value.getFullYear();
	},

	_getMonthNames: dojox.widget._CalendarMonthYearView.prototype._getMonthNames,

	_populateMonths: dojox.widget._CalendarMonthYearView.prototype._populateMonths,

	onClick: function(evt){
		// summary: Handles clicks on month names
		if(!dojo.hasClass(evt.target, "dojoxCalendarMonthLabel")){dojo.stopEvent(evt); return;}
		var parentNode = evt.target.parentNode;
		var month = parentNode.cellIndex + (parentNode.parentNode.rowIndex * 4);
		var date = this.get("value");

		// Seeing a really strange bug in FF3.6 where this has to be called twice
		// in order to take affect
		date.setMonth(month);
		date.setMonth(month);
		this.onValueSelected(date, month);
	}
});

dojo.declare("dojox.widget._CalendarYear", null, {
	// summary: Mixin class for adding a view listing 12 years to the
	//	 dojox.widget._CalendarBase
	parent: null,

	constructor: function(){
		// summary: Adds a dojox.widget._CalendarYearView view to the
		//	dojo.widget._CalendarBase widget.
		this._addView(dojox.widget._CalendarYearView);
	}
});

dojo.declare("dojox.widget._CalendarYearView", [dojox.widget._CalendarView, dijit._Templated], {
	// summary: A Calendar view listing 12 years

	// templateString: String
	//		The template to be used to construct the widget.
	templateString: dojo.cache("dojox.widget","Calendar/CalendarYear.html"),

	displayedYears: 6,

	postCreate: function(){
		// summary: Constructs the view
		this.cloneClass(".dojoxCalendarYearTemplate", 3);
		this.cloneClass(".dojoxCalendarYearGroupTemplate", 2);
		this._populateYears();
		this.addFx(".dojoxCalendarYearLabel", this.domNode);
	},

	_setValueAttr: function(value){
		this._populateYears(value.getFullYear());
	},

	_populateYears: dojox.widget._CalendarMonthYearView.prototype._populateYears,

	adjustDate: function(date, amount){
		// summary: Adjusts the value of a date. It moves it by 12 years each time.
		return dojo.date.add(date, "year", amount * 12);
	},

	onClick: function(evt){
		// summary: Handles clicks on year values.
		if(!dojo.hasClass(evt.target, "dojoxCalendarYearLabel")){dojo.stopEvent(evt); return;}
		var year = Number(evt.target.innerHTML);
		var date = this.get("value");
		date.setYear(year);
		this.onValueSelected(date, year);
	}
});


dojo.declare("dojox.widget.Calendar3Pane",
	[dojox.widget._CalendarBase,
	 dojox.widget._CalendarDay,
	 dojox.widget._CalendarMonth,
	 dojox.widget._CalendarYear], {
	 	// summary: The Calendar includes day, month and year views.
		//	No visual effects are included.
	 }
);

dojo.declare("dojox.widget.MonthlyCalendar",
	[dojox.widget._CalendarBase,
	 dojox.widget._CalendarMonth], {
	 	// summary: A calendar with only a month view.
		_makeDate: function(value){
			var now = new Date();
			now.setMonth(value);
			return now;
		}
	 }
);
dojo.declare("dojox.widget.YearlyCalendar",
	[dojox.widget._CalendarBase,
	 dojox.widget._CalendarYear], {
	 	// summary: A calendar with only a year view.
		_makeDate: function(value){
			var now = new Date();
			now.setFullYear(value);
			return now;
		}
	 }
);
