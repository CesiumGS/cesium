define([
	"dojo/_base/declare",
	"./_CalendarView",
	"dijit/_TemplatedMixin",
	"dojo/date",
	"dojo/dom-class",
	"dojo/_base/event",
	"dojo/text!./Calendar/CalendarYear.html",
	"./_CalendarMonthYearView"
], function(declare, _CalendarView, _TemplatedMixin, dojoDate, domClass, event, template, _CalendarMonthYearView){
	return declare("dojox.widget._CalendarYearView", [_CalendarView, _TemplatedMixin], {
		// summary:
		//		A Calendar view listing 12 years

		// templateString: String
		//		The template to be used to construct the widget.
		templateString: template,

		displayedYears: 6,

		postCreate: function(){
			// summary:
			//		Constructs the view
			this.cloneClass(".dojoxCalendarYearTemplate", 3);
			this.cloneClass(".dojoxCalendarYearGroupTemplate", 2);
			this._populateYears();
			this.addFx(".dojoxCalendarYearLabel", this.domNode);
		},

		_setValueAttr: function(value){
			this._populateYears(value.getFullYear());
		},

		_populateYears: _CalendarMonthYearView.prototype._populateYears,

		adjustDate: function(date, amount){
			// summary:
			//		Adjusts the value of a date. It moves it by 12 years each time.
			return dojoDate.add(date, "year", amount * 12);
		},

		onClick: function(evt){
			// summary:
			//		Handles clicks on year values.
			if(!domClass.contains(evt.target, "dojoxCalendarYearLabel")){event.stop(evt); return;}
			var year = Number(evt.target.innerHTML);
			var date = this.get("value");
			date.setYear(year);
			this.onValueSelected(date, year);
		}
	});
});
