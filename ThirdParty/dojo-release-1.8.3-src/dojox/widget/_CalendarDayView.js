define([
	"dojo/_base/declare",
	"./_CalendarView",
	"dijit/_TemplatedMixin",
	"dojo/query",
	"dojo/dom-class",
	"dojo/_base/event",
	"dojo/date",
	"dojo/date/locale",
	"dojo/text!./Calendar/CalendarDay.html",
	"dojo/cldr/supplemental",
	"dojo/NodeList-dom"
], function(declare, _CalendarView, _TemplatedMixin, query, domClass, event, date, locale, template, supplemental){
	return declare("dojox.widget._CalendarDayView", [_CalendarView, _TemplatedMixin], {
		// summary:
		//		View class for the dojox/widget/Calendar.
		//		Adds a view showing every day of a single month to the calendar.
		//		This should not be mixed in directly with dojox/widget._CalendarBase.
		//		Instead, use dojox/widget._CalendarDay

		// templateString: String
		//		The template to be used to construct the widget.
		templateString: template,

		// datePart: String
		//		Specifies how much to increment the displayed date when the user
		//		clicks the array button to increment of decrement the view.
		datePart: "month",

		// dayWidth: String
		//		Specifies the type of day name to display.	"narrow" causes just one letter to be shown.
		dayWidth: "narrow",

		postCreate: function(){
			// summary:
			//		Constructs the calendar view.
			this.cloneClass(".dijitCalendarDayLabelTemplate", 6);
			this.cloneClass(".dijitCalendarDateTemplate", 6);

			// now make 6 week rows
			this.cloneClass(".dijitCalendarWeekTemplate", 5);

			// insert localized day names in the header
			var dayNames = locale.getNames('days', this.dayWidth, 'standAlone', this.getLang());
			var dayOffset = supplemental.getFirstDayOfWeek(this.getLang());

			// Set the text of the day labels.
			query(".dijitCalendarDayLabel", this.domNode).forEach(function(label, i){
				this._setText(label, dayNames[(i + dayOffset) % 7]);
			}, this);
		},

		onDisplay: function(){
			if(!this._addedFx){
			// Add visual effects to the view, if any has been specified.
				this._addedFx = true;
				this.addFx(".dijitCalendarDateTemplate div", this.domNode);
			}
		},

		// TODO: This method needs serious work
		_onDayClick: function(/*Event*/ e){
			// summary:
			//		Executed when a day value is clicked.

			// If the user somehow clicked the TR, rather than a
			// cell, ignore it.
			if(typeof(e.target._date) == "undefined"){return;}

			var displayMonth = new Date(this.get("displayMonth"));

			var p = e.target.parentNode;
			var c = "dijitCalendar";
			var d = domClass.contains(p, c + "PreviousMonth") ? -1 :
								(domClass.contains(p, c + "NextMonth") ? 1 : 0);
			if(d){displayMonth = date.add(displayMonth, "month", d);}
			displayMonth.setDate(e.target._date);

			// If the day is disabled, ignore it
			if(this.isDisabledDate(displayMonth)){
				event.stop(e);
				return;
			}
			this.parent._onDateSelected(displayMonth);
		},

		_setValueAttr: function(value){
			//Change the day values
			this._populateDays();
		},

		_populateDays: function(){
			// summary:
			//		Fills the days of the current month.

			var currentDate = new Date(this.get("displayMonth"));
			currentDate.setDate(1);
			var firstDay = currentDate.getDay();
			var daysInMonth = date.getDaysInMonth(currentDate);
			var daysInPreviousMonth = date.getDaysInMonth(date.add(currentDate, "month", -1));
			var today = new Date();
			var selected = this.get('value');

			var dayOffset = supplemental.getFirstDayOfWeek(this.getLang());
			if(dayOffset > firstDay){ dayOffset -= 7; }

			var compareDate = date.compare;
			var templateCls = ".dijitCalendarDateTemplate";
			var selectedCls = "dijitCalendarSelectedDate";

			var oldDate = this._lastDate;
			var redrawRequired = oldDate == null
					|| oldDate.getMonth() != currentDate.getMonth()
					|| oldDate.getFullYear() != currentDate.getFullYear();
			this._lastDate = currentDate;

			// If still showing the same month, it's much faster to not redraw,
			// and just change the selected date.
			if(!redrawRequired){
				query(templateCls, this.domNode)
						.removeClass(selectedCls)
						.filter(function(node){
							return node.className.indexOf("dijitCalendarCurrent") > -1
										&& node._date == selected.getDate();
						})
						.addClass(selectedCls);
				return;
			}

			// Iterate through dates in the calendar and fill in date numbers and style info
			query(templateCls, this.domNode).forEach(function(template, i){
				i += dayOffset;
				var eachDate = new Date(currentDate);
				var number, clazz = "dijitCalendar", adj = 0;

				if(i < firstDay){
					number = daysInPreviousMonth - firstDay + i + 1;
					adj = -1;
					clazz += "Previous";
				}else if(i >= (firstDay + daysInMonth)){
					number = i - firstDay - daysInMonth + 1;
					adj = 1;
					clazz += "Next";
				}else{
					number = i - firstDay + 1;
					clazz += "Current";
				}

				if(adj){
					eachDate = date.add(eachDate, "month", adj);
				}
				eachDate.setDate(number);

				if(!compareDate(eachDate, today, "date")){
					clazz = "dijitCalendarCurrentDate " + clazz;
				}

				if(!compareDate(eachDate, selected, "date")
						&& !compareDate(eachDate, selected, "month")
						&& !compareDate(eachDate, selected, "year") ){
					clazz = selectedCls + " " + clazz;
				}

				if(this.isDisabledDate(eachDate, this.getLang())){
					clazz = " dijitCalendarDisabledDate " + clazz;
				}

				var clazz2 = this.getClassForDate(eachDate, this.getLang());
				if(clazz2){
					clazz = clazz2 + " " + clazz;
				}

				template.className = clazz + "Month dijitCalendarDateTemplate";
				template.dijitDateValue = eachDate.valueOf();
				var label = query(".dijitCalendarDateLabel", template)[0];

				this._setText(label, eachDate.getDate());

				label._date = label.parentNode._date = eachDate.getDate();
			}, this);

			// Fill in localized month name
			var monthNames = locale.getNames('months', 'wide', 'standAlone', this.getLang());
			this._setText(this.monthLabelNode, monthNames[currentDate.getMonth()]);
			this._setText(this.yearLabelNode, currentDate.getFullYear());
		}
	});
});