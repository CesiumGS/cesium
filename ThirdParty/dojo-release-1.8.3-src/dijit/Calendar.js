define([
	"dojo/_base/array", // array.map
	"dojo/date",
	"dojo/date/locale",
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.get
	"dojo/dom-class", // domClass.add domClass.contains domClass.remove domClass.toggle
	"dojo/_base/event", // event.stop
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.hitch
	"dojo/sniff", // has("ie")
	"./CalendarLite",
	"./_Widget",
	"./_CssStateMixin",
	"./_TemplatedMixin",
	"./form/DropDownButton"
], function(array, date, local, declare, domAttr, domClass, event, kernel, keys, lang, has,
			CalendarLite, _Widget, _CssStateMixin, _TemplatedMixin, DropDownButton){

	// module:
	//		dijit/Calendar

	var Calendar = declare("dijit.Calendar",
		[CalendarLite, _Widget, _CssStateMixin], // _Widget for deprecated methods like setAttribute()
		{
		// summary:
		//		A simple GUI for choosing a date in the context of a monthly calendar.
		//
		// description:
		//		See CalendarLite for general description.   Calendar extends CalendarLite, adding:
		//
		//		- month drop down list
		//		- keyboard navigation
		//		- CSS classes for hover/mousepress on date, month, and year nodes
		//		- support of deprecated methods (will be removed in 2.0)

		// Set node classes for various mouse events, see dijit._CssStateMixin for more details
		cssStateNodes: {
			"decrementMonth": "dijitCalendarArrow",
			"incrementMonth": "dijitCalendarArrow",
			"previousYearLabelNode": "dijitCalendarPreviousYear",
			"nextYearLabelNode": "dijitCalendarNextYear"
		},

		setValue: function(/*Date*/ value){
			// summary:
			//		Deprecated.   Use set('value', ...) instead.
			// tags:
			//		deprecated
			kernel.deprecated("dijit.Calendar:setValue() is deprecated.  Use set('value', ...) instead.", "", "2.0");
			this.set('value', value);
		},

		_createMonthWidget: function(){
			// summary:
			//		Creates the drop down button that displays the current month and lets user pick a new one

			return new Calendar._MonthDropDownButton({
				id: this.id + "_mddb",
				tabIndex: -1,
				onMonthSelect: lang.hitch(this, "_onMonthSelect"),
				lang: this.lang,
				dateLocaleModule: this.dateLocaleModule
			}, this.monthNode);
		},

		postCreate: function(){
			this.inherited(arguments);

			// Events specific to Calendar, not used in CalendarLite
			this.connect(this.domNode, "onkeydown", "_onKeyDown");
			this.connect(this.dateRowsNode, "onmouseover", "_onDayMouseOver");
			this.connect(this.dateRowsNode, "onmouseout", "_onDayMouseOut");
			this.connect(this.dateRowsNode, "onmousedown", "_onDayMouseDown");
			this.connect(this.dateRowsNode, "onmouseup", "_onDayMouseUp");
		},

		_onMonthSelect: function(/*Number*/ newMonth){
			// summary:
			//		Handler for when user selects a month from the drop down list
			// tags:
			//		protected

			// move to selected month, bounding by the number of days in the month
			// (ex: jan 31 --> feb 28, not feb 31)
			var date  = new this.dateClassObj(this.currentFocus);
			date.setDate(1);
			date.setMonth(newMonth);
			var daysInMonth = this.dateModule.getDaysInMonth(date);
			var currentDate = this.currentFocus.getDate();
			date.setDate(Math.min(currentDate, daysInMonth));
			this._setCurrentFocusAttr(date);
		},

		_onDayMouseOver: function(/*Event*/ evt){
			// summary:
			//		Handler for mouse over events on days, sets hovered style
			// tags:
			//		protected

			// event can occur on <td> or the <span> inside the td,
			// set node to the <td>.
			var node =
				domClass.contains(evt.target, "dijitCalendarDateLabel") ?
				evt.target.parentNode :
				evt.target;

			if(node && (
				(node.dijitDateValue && !domClass.contains(node, "dijitCalendarDisabledDate"))
					|| node == this.previousYearLabelNode || node == this.nextYearLabelNode
				)){
				domClass.add(node, "dijitCalendarHoveredDate");
				this._currentNode = node;
			}
		},

		_onDayMouseOut: function(/*Event*/ evt){
			// summary:
			//		Handler for mouse out events on days, clears hovered style
			// tags:
			//		protected

			if(!this._currentNode){ return; }

			// if mouse out occurs moving from <td> to <span> inside <td>, ignore it
			if(evt.relatedTarget && evt.relatedTarget.parentNode == this._currentNode){ return; }
			var cls = "dijitCalendarHoveredDate";
			if(domClass.contains(this._currentNode, "dijitCalendarActiveDate")){
				cls += " dijitCalendarActiveDate";
			}
			domClass.remove(this._currentNode, cls);
			this._currentNode = null;
		},

		_onDayMouseDown: function(/*Event*/ evt){
			var node = evt.target.parentNode;
			if(node && node.dijitDateValue && !domClass.contains(node, "dijitCalendarDisabledDate")){
				domClass.add(node, "dijitCalendarActiveDate");
				this._currentNode = node;
			}
		},

		_onDayMouseUp: function(/*Event*/ evt){
			var node = evt.target.parentNode;
			if(node && node.dijitDateValue){
				domClass.remove(node, "dijitCalendarActiveDate");
			}
		},

		handleKey: function(/*Event*/ evt){
			// summary:
			//		Provides keyboard navigation of calendar.
			// description:
			//		Called from _onKeyDown() to handle keypress on a stand alone Calendar,
			//		and also from `dijit/form/_DateTimeTextBox` to pass a keydown event
			//		from the `dijit/form/DateTextBox` to be handled in this widget
			// returns:
			//		False if the key was recognized as a navigation key,
			//		to indicate that the event was handled by Calendar and shouldn't be propagated
			// tags:
			//		protected
			var increment = -1,
				interval,
				newValue = this.currentFocus;
			switch(evt.keyCode){
				case keys.RIGHT_ARROW:
					increment = 1;
					//fallthrough...
				case keys.LEFT_ARROW:
					interval = "day";
					if(!this.isLeftToRight()){ increment *= -1; }
					break;
				case keys.DOWN_ARROW:
					increment = 1;
					//fallthrough...
				case keys.UP_ARROW:
					interval = "week";
					break;
				case keys.PAGE_DOWN:
					increment = 1;
					//fallthrough...
				case keys.PAGE_UP:
					interval = evt.ctrlKey || evt.altKey ? "year" : "month";
					break;
				case keys.END:
					// go to the next month
					newValue = this.dateModule.add(newValue, "month", 1);
					// subtract a day from the result when we're done
					interval = "day";
					//fallthrough...
				case keys.HOME:
					newValue = new this.dateClassObj(newValue);
					newValue.setDate(1);
					break;
				case keys.ENTER:
				case keys.SPACE:
					this.set("value", this.currentFocus);
					break;
				default:
					return true;
			}

			if(interval){
				newValue = this.dateModule.add(newValue, interval, increment);
			}

			this._setCurrentFocusAttr(newValue);

			return false;
		},

		_onKeyDown: function(/*Event*/ evt){
			// summary:
			//		For handling keypress events on a stand alone calendar
			if(!this.handleKey(evt)){
				event.stop(evt);
			}
		},

		onValueSelected: function(/*Date*/ /*===== date =====*/){
			// summary:
			//		Deprecated.   Notification that a date cell was selected.  It may be the same as the previous value.
			// description:
			//		Formerly used by `dijit/form/_DateTimeTextBox` (and thus `dijit/form/DateTextBox`)
			//		to get notification when the user has clicked a date.  Now onExecute() (above) is used.
			// tags:
			//		protected
		},

		onChange: function(value){
			this.onValueSelected(value);	// remove in 2.0
		},

		getClassForDate: function(/*===== dateObject, locale =====*/){
			// summary:
			//		May be overridden to return CSS classes to associate with the date entry for the given dateObject,
			//		for example to indicate a holiday in specified locale.
			// dateObject: Date
			// locale: String?
			// tags:
			//		extension

/*=====
			return ""; // String
=====*/
		}
	});

	Calendar._MonthDropDownButton = declare("dijit.Calendar._MonthDropDownButton", DropDownButton, {
		// summary:
		//		DropDownButton for the current month.    Displays name of current month
		//		and a list of month names in the drop down

		onMonthSelect: function(){ },

		postCreate: function(){
			this.inherited(arguments);
			this.dropDown = new Calendar._MonthDropDown({
				id: this.id + "_mdd", //do not change this id because it is referenced in the template
				onChange: this.onMonthSelect
			});
		},
		_setMonthAttr: function(month){
			// summary:
			//		Set the current month to display as a label
			var monthNames = this.dateLocaleModule.getNames('months', 'wide', 'standAlone', this.lang, month);
			this.dropDown.set("months", monthNames);

			// Set name of current month and also fill in spacer element with all the month names
			// (invisible) so that the maximum width will affect layout.   But not on IE6 because then
			// the center <TH> overlaps the right <TH> (due to a browser bug).
			this.containerNode.innerHTML =
				(has("ie") == 6 ? "" : "<div class='dijitSpacer'>" + this.dropDown.domNode.innerHTML + "</div>") +
				"<div class='dijitCalendarMonthLabel dijitCalendarCurrentMonthLabel'>" +  monthNames[month.getMonth()] + "</div>";
		}
	});

	Calendar._MonthDropDown = declare("dijit.Calendar._MonthDropDown", [_Widget, _TemplatedMixin], {
		// summary:
		//		The list-of-months drop down from the MonthDropDownButton

		// months: String[]
		//		List of names of months, possibly w/some undefined entries for Hebrew leap months
		//		(ex: ["January", "February", undefined, "April", ...])
		months: [],

		templateString: "<div class='dijitCalendarMonthMenu dijitMenu' " +
			"data-dojo-attach-event='onclick:_onClick,onmouseover:_onMenuHover,onmouseout:_onMenuHover'></div>",

		_setMonthsAttr: function(/*String[]*/ months){
			this.domNode.innerHTML = array.map(months, function(month, idx){
					return month ? "<div class='dijitCalendarMonthLabel' month='" + idx +"'>" + month + "</div>" : "";
				}).join("");
		},

		_onClick: function(/*Event*/ evt){
			this.onChange(domAttr.get(evt.target, "month"));
		},

		onChange: function(/*Number*/ /*===== month =====*/){
			// summary:
			//		Callback when month is selected from drop down
		},

		_onMenuHover: function(evt){
			domClass.toggle(evt.target, "dijitCalendarMonthLabelHover", evt.type == "mouseover");
		}
	});

	return Calendar;
});
