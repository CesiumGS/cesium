define("dojox/widget/MultiSelectCalendar", [
    "dojo/main", "dijit", 
    "dojo/text!./MultiSelectCalendar/MultiSelectCalendar.html", 
    "dojo/cldr/supplemental", 
    "dojo/date", 
    "dojo/date/locale", 
    "dijit/_Widget", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
	"dijit/_CssStateMixin", "dijit/form/DropDownButton", "dijit/typematic"
],
    function(dojo, dijit, template, supplemental, date, locale,
		_Widget, _TemplatedMixin, _WidgetsInTemplateMixin,
		_CssStateMixin, DropDownButton, typematic) {

dojo.experimental("dojox.widget.MultiSelectCalendar");

dojo.declare(
	"dojox.widget.MultiSelectCalendar",
	[_Widget, _TemplatedMixin, _WidgetsInTemplateMixin, _CssStateMixin],
	{
		// summary:
		//		A simple GUI for choosing several dates in the context of a monthly calendar.
		//
		// description:
		//		A simple GUI for choosing several dates in the context of a monthly calendar.
		//		This widget serialises its selected dates to ISO dates or ISO ranges of dates, 
		//		depending on developer selection
		//		Note that it accepts an Array of ISO dates as its input
		//
		// example:
		//	|	var calendar = new dojox.widget.MultiSelectCalendar({value: ['2011-05-07,'2011-05-08',2011-05-09','2011-05-23']}, dojo.byId("calendarNode"));
		//
		// example:
		//	|	<div dojoType="dojox.widget.MultiSelectCalendar"></div>

		templateString: template,
		widgetsInTemplate: true,

		// value: Date
		//		The currently selected Dates, initially set to an empty object to indicate no selection.
		value: {},

		// datePackage: String
		//		JavaScript namespace to find Calendar routines.  Uses Gregorian Calendar routines
		//		at dojo.date by default.
		datePackage: "dojo.date",

		// dayWidth: String
		//		How to represent the days of the week in the calendar header. See dojo.date.locale
		dayWidth: "narrow",

		// tabIndex: String
		//		Order fields are traversed when user hits the tab key
		tabIndex: "0",
		
		// if returnIsoRanges is true, the selected dates will be returned as ISO ranges
		// else each selected date will be returned sequentially
		returnIsoRanges : false,
		
		// currentFocus: Date
		//		Date object containing the currently focused date, or the date which would be focused
		//		if the calendar itself was focused.   Also indicates which year and month to display,
		//		i.e. the current "page" the calendar is on.
		currentFocus: new Date(),

		baseClass:"dijitCalendar",
		
		cssStateNodes: {
			"decrementMonth": "dijitCalendarArrow",
			"incrementMonth": "dijitCalendarArrow",
			"previousYearLabelNode": "dijitCalendarPreviousYear",
			"nextYearLabelNode": "dijitCalendarNextYear"			
		},

		_areValidDates: function(/*Date*/ value){
			// summary:
			//		Runs various tests on each selected date, checking that they're a valid date, rather
			//		than blank or NaN.
			// tags:
			//		private
			for (var selDate in this.value){
				valid = (selDate && !isNaN(selDate) && typeof value == "object" && selDate.toString() != this.constructor.prototype.value.toString());
				if(!valid){ return false; }
			}
			return true;
		},

		_getValueAttr: function(){
			// summary:
			//		this method returns the list of selected dates in an array structure
			if(this.returnIsoRanges){
				datesWithRanges = this._returnDatesWithIsoRanges(this._sort());
				return datesWithRanges;
			}else{
				return this._sort();
			}
		},
		
		_setValueAttr: function(/*Date|Number|array*/ value, /*Boolean*/ priorityChange){
			// summary:
			//		Support set("value", ...)
			// description:
			//		Set the passed dates to the selected date and updates the value of this widget
			//		to reflect that
			// value:
			//		Can be a Date, the number of milliseconds since 1970 or an array of ISO dates (['2011-07-01', '2001-06-01']).
			// tags:
			//		protected
			
			//If we are passed an array of ISO dates, we are going to mark each date in the list as selected
			//We perform the normalization of the passed date
			this.value = {};
			if(dojo.isArray(value)) {
				dojo.forEach(value,function(element, i){
					//Each element of the array could be a date or a date range
					var slashPosition = element.indexOf("/");
					if(slashPosition == -1){
						//The element is a single date
						this.value[element] = 1;
					}else{
						//We have a slash somewhere in the string so this is an ISO date range
						var dateA=new dojo.date.stamp.fromISOString(element.substr(0,10));
						var dateB=new dojo.date.stamp.fromISOString(element.substr(11,10));
						
						this.toggleDate(dateA,[],[]);
						if((dateA - dateB) > 0){
							//We select the first date then the rest is handled as if we had selected a range
							this._addToRangeRTL(dateA, dateB, [], []);	
						}else{
							//We select the first date then the rest is handled as if we had selected a range
							this._addToRangeLTR(dateA, dateB, [], []);	
						}
					}
				},this);
			if(value.length > 0){
				this.focusOnLastDate(value[value.length-1]);
			}
			}else{
				if(value){
					// convert from Number to Date, or make copy of Date object so that setHours() call below
					// doesn't affect original value
					value = new this.dateClassObj(value);
				}
				if(this._isValidDate(value)){
					value.setHours(1, 0, 0, 0); // round to nearest day (1am to avoid issues when DST shift occurs at midnight, see #8521, #9366)
	
					if(!this.isDisabledDate(value, this.lang)){
						dateIndex = dojo.date.stamp.toISOString(value).substring(0,10);
						
						this.value[dateIndex] = 1;
		
						// Set focus cell to the new value.   Arguably this should only happen when there isn't a current
						// focus point.   This will also repopulate the grid, showing the new selected value (and possibly
						// new month/year).
						this.set("currentFocus", value);
	
						if(priorityChange || typeof priorityChange == "undefined"){
							this.onChange(this.get('value'));
							this.onValueSelected(this.get('value'));	// remove in 2.0
						}
					}
				}
			}
			this._populateGrid();
		},
		focusOnLastDate : function(lastElement){
			//We put the focus on the last date so that when the user re-clicks on the calendar it will be 
			//on the proper month
			var slashPositionLastDate = lastElement.indexOf("/");
			var dateA,dateB;
			if(slashPositionLastDate == -1){
				//This is a singleDate
				lastDate = lastElement;
			}else{
				dateA=new dojo.date.stamp.fromISOString(lastElement.substr(0,10));
				dateB=new dojo.date.stamp.fromISOString(lastElement.substr(11,10));
				if((dateA - dateB) > 0){
					lastDate = dateA;
				}else{
					lastDate = dateB;
				}
			}
			this.set("currentFocus", lastDate);		
		},
		_isValidDate: function(/*Date*/ value){
			// summary:
			//		Runs various tests on the value, checking that it's a valid date, rather
			//		than blank or NaN.
			// tags:
			//		private
			return value && !isNaN(value) && typeof value == "object" &&
				value.toString() != this.constructor.prototype.value.toString();
		},
		_setText: function(node, text){
			// summary:
			//		This just sets the content of node to the specified text.
			//		Can't do "node.innerHTML=text" because of an IE bug w/tables, see #3434.
			// tags:
			//		private
			while(node.firstChild){
				node.removeChild(node.firstChild);
			}
			node.appendChild(dojo.doc.createTextNode(text));
		},

		_populateGrid: function(){
			// summary:
			//		Fills in the calendar grid with each day (1-31)
			// tags:
			//		private

			var month = new this.dateClassObj(this.currentFocus);
			month.setDate(1);

			var firstDay = month.getDay(),
				daysInMonth = this.dateFuncObj.getDaysInMonth(month),
				daysInPreviousMonth = this.dateFuncObj.getDaysInMonth(this.dateFuncObj.add(month, "month", -1)),
				today = new this.dateClassObj(),
				dayOffset = dojo.cldr.supplemental.getFirstDayOfWeek(this.lang);
			if(dayOffset > firstDay){ dayOffset -= 7; }

			//List of all 42 displayed days in the calendar
			this.listOfNodes = dojo.query(".dijitCalendarDateTemplate", this.domNode);

			// Iterate through dates in the calendar and fill in date numbers and style info
			this.listOfNodes.forEach(function(template, i){
				i += dayOffset;
				var date = new this.dateClassObj(month),
					number, clazz = "dijitCalendar", adj = 0;

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
					date = this.dateFuncObj.add(date, "month", adj);
				}
				date.setDate(number);

				if(!this.dateFuncObj.compare(date, today, "date")){
					clazz = "dijitCalendarCurrentDate " + clazz;
				}

				//If the date falls outside of the min or max constraints, we do nothing
				dateIndex = dojo.date.stamp.toISOString(date).substring(0,10);
				
				if(!this.isDisabledDate(date, this.lang)){
					//If the node is already selected, the user clicking on it once more will deselect it 
					//so we will destroy it in the value object. If the date was not previously selected
					//The user wants to select it so we add it to the value object
					if(this._isSelectedDate(date, this.lang)){
						if(this.value[dateIndex]){
							clazz = "dijitCalendarSelectedDate " + clazz;
						}else{
							clazz = clazz.replace("dijitCalendarSelectedDate ","");
						}
					}
				}
				if(this._isSelectedDate(date, this.lang)){
					clazz = "dijitCalendarBrowsingDate " + clazz;
				}

				if(this.isDisabledDate(date, this.lang)){
					clazz = "dijitCalendarDisabledDate " + clazz;
				}

				var clazz2 = this.getClassForDate(date, this.lang);
				if(clazz2){
					clazz = clazz2 + " " + clazz;
				}

				template.className = clazz + "Month dijitCalendarDateTemplate";
				template.dijitDateValue = date.valueOf();				// original code
				dojo.attr(template, "dijitDateValue", date.valueOf());	// so I can dojo.query() it
				var label = dojo.query(".dijitCalendarDateLabel", template)[0],
					text = date.getDateLocalized ? date.getDateLocalized(this.lang) : date.getDate();
				this._setText(label, text);
			}, this);

			// Repopulate month drop down list based on current year.
			// Need to do this to hide leap months in Hebrew calendar.
			var monthNames = this.dateLocaleModule.getNames('months', 'wide', 'standAlone', this.lang, month);
			this.monthDropDownButton.dropDown.set("months", monthNames);

			// Set name of current month and also fill in spacer element with all the month names 
			// (invisible) so that the maximum width will affect layout.   But not on IE6 because then
			// the center <TH> overlaps the right <TH> (due to a browser bug).
			this.monthDropDownButton.containerNode.innerHTML =
				(dojo.isIE == 6 ? "" : "<div class='dijitSpacer'>" + this.monthDropDownButton.dropDown.domNode.innerHTML + "</div>") + 
				"<div class='dijitCalendarMonthLabel dijitCalendarCurrentMonthLabel'>" +  monthNames[month.getMonth()] + "</div>";

			// Fill in localized prev/current/next years
			var y = month.getFullYear() - 1;
			var d = new this.dateClassObj();
			dojo.forEach(["previous", "current", "next"], function(name){
				d.setFullYear(y++);
				this._setText(this[name+"YearLabelNode"],
					this.dateLocaleModule.format(d, {selector:'year', locale:this.lang}));
			}, this);
		},

		goToToday: function(){
			// summary:
			//		We go to today but we do no select it
			this.set('currentFocus', new this.dateClassObj(), false);
		},

		constructor: function(/*Object*/args){
			var dateClass = (args.datePackage && (args.datePackage != "dojo.date"))? args.datePackage + ".Date" : "Date";
			this.dateClassObj = dojo.getObject(dateClass, false);
			this.datePackage = args.datePackage || this.datePackage;
			this.dateFuncObj = dojo.getObject(this.datePackage, false);
			this.dateLocaleModule = dojo.getObject(this.datePackage + ".locale", false);
		},

		buildRendering: function(){
			this.inherited(arguments);
			dojo.setSelectable(this.domNode, false);

			var cloneClass = dojo.hitch(this, function(clazz, n){
				var template = dojo.query(clazz, this.domNode)[0];
	 			for(var i=0; i<n; i++){
					template.parentNode.appendChild(template.cloneNode(true));
				}
			});

			// clone the day label and calendar day templates 6 times to make 7 columns
			cloneClass(".dijitCalendarDayLabelTemplate", 6);
			cloneClass(".dijitCalendarDateTemplate", 6);

			// now make 6 week rows
			cloneClass(".dijitCalendarWeekTemplate", 5);

			// insert localized day names in the header
			var dayNames = this.dateLocaleModule.getNames('days', this.dayWidth, 'standAlone', this.lang);
			var dayOffset = dojo.cldr.supplemental.getFirstDayOfWeek(this.lang);
			dojo.query(".dijitCalendarDayLabel", this.domNode).forEach(function(label, i){
				this._setText(label, dayNames[(i + dayOffset) % 7]);
			}, this);

			var dateObj = new this.dateClassObj(this.currentFocus);

			this.monthDropDownButton.dropDown = new dojox.widget._MonthDropDown({
				id: this.id + "_mdd",
				onChange: dojo.hitch(this, "_onMonthSelect")
			});

			this.set('currentFocus', dateObj, false);	// draw the grid to the month specified by currentFocus

			// Set up repeating mouse behavior for increment/decrement of months/years
			var _this = this;
			var typematic = function(nodeProp, dateProp, adj){
				_this._connects.push(
					dijit.typematic.addMouseListener(_this[nodeProp], _this, function(count){
						if(count >= 0){ _this._adjustDisplay(dateProp, adj); }
					}, 0.8, 500)
				);
			};
			typematic("incrementMonth", "month", 1);
			typematic("decrementMonth", "month", -1);
			typematic("nextYearLabelNode", "year", 1);
			typematic("previousYearLabelNode", "year", -1);
		},

		_adjustDisplay: function(/*String*/ part, /*int*/ amount){
			// summary:
			//		Moves calendar forwards or backwards by months or years
			// part:
			//		"month" or "year"
			// amount:
			//		Number of months or years
			// tags:
			//		private
			this._setCurrentFocusAttr(this.dateFuncObj.add(this.currentFocus, part, amount));
		},

		_setCurrentFocusAttr: function(/*Date*/ date, /*Boolean*/ forceFocus){
			// summary:
			//		If the calendar currently has focus, then focuses specified date,
			//		changing the currently displayed month/year if necessary.
			//		If the calendar doesn't have focus, updates currently
			//		displayed month/year, and sets the cell that will get focus.
			// forceFocus:
			//		If true, will focus() the cell even if calendar itself doesn't have focus

			var oldFocus = this.currentFocus,
				oldCell = oldFocus ? dojo.query("[dijitDateValue=" + oldFocus.valueOf() + "]", this.domNode)[0] : null;

			// round specified value to nearest day (1am to avoid issues when DST shift occurs at midnight, see #8521, #9366)
			date = new this.dateClassObj(date);
			date.setHours(1, 0, 0, 0); 

			this._set("currentFocus", date);
			var currentMonth = dojo.date.stamp.toISOString(date).substring(0,7);
			//We only redraw the grid if we're in a new month
			if(currentMonth != this.previousMonth){
				this._populateGrid();
				this.previousMonth = currentMonth;
			}

			// set tabIndex=0 on new cell, and focus it (but only if Calendar itself is focused)
			var newCell = dojo.query("[dijitDateValue=" + date.valueOf() + "]", this.domNode)[0];
			newCell.setAttribute("tabIndex", this.tabIndex);
			if(this._focused || forceFocus){
				newCell.focus();
			}

			// set tabIndex=-1 on old focusable cell
			if(oldCell && oldCell != newCell){
				if(dojo.isWebKit){	// see #11064 about webkit bug
					oldCell.setAttribute("tabIndex", "-1");
				}else{
						oldCell.removeAttribute("tabIndex");				
				}
			}
		},

		focus: function(){
			// summary:
			//		Focus the calendar by focusing one of the calendar cells
			this._setCurrentFocusAttr(this.currentFocus, true);
		},

		_onMonthSelect: function(/*Number*/ newMonth){
			// summary:
			//		Handler for when user selects a month from the drop down list
			// tags:
			//		protected

			// move to selected month, bounding by the number of days in the month
			// (ex: dec 31 --> jan 28, not jan 31)
			this.currentFocus = this.dateFuncObj.add(this.currentFocus, "month",
				newMonth - this.currentFocus.getMonth());
			this._populateGrid();
		},
		
		toggleDate : function(/*date*/ dateToToggle, /*array of dates*/ selectedDates, /*array of dates*/ unselectedDates){
			
			//Obtain CSS class before toggling if necessary
			var dateIndex = dojo.date.stamp.toISOString(dateToToggle).substring(0,10);			 
			//If previously selected we unselect and vice-versa
			if(this.value[dateIndex]){
				this.unselectDate(dateToToggle, unselectedDates);			
			}else{
				this.selectDate(dateToToggle, selectedDates);
			}		
		},
		
		selectDate : function(/*date*/ dateToSelect, /*array of dates*/ selectedDates){
			//Selects the passed iso date, changes its class and records it in the selected dates array
			var node = this._getNodeByDate(dateToSelect);
			var clazz = node.className;
			var dateIndex = dojo.date.stamp.toISOString(dateToSelect).substring(0,10);
			this.value[dateIndex] = 1;
			selectedDates.push(dateIndex);			
			clazz = "dijitCalendarSelectedDate " + clazz;
			//We update CSS class
			node.className = clazz;
		},
		
		unselectDate : function(/*date*/ dateToUnselect, /*array of dates*/ unselectedDates){
			//Unselects the passed iso date, changes its class and records it in the unselected dates array
			var node = this._getNodeByDate(dateToUnselect);
			var clazz = node.className;
			var dateIndex = dojo.date.stamp.toISOString(dateToUnselect).substring(0,10);
			delete(this.value[dateIndex]);
			unselectedDates.push(dateIndex);
			clazz = clazz.replace("dijitCalendarSelectedDate ","");
			//We update CSS class
			node.className = clazz;
		},

		_getNodeByDate : function(/*ISO date*/ dateNode){
			//return the node that corresponds to the passed ISO date
			var firstDate = new this.dateClassObj(this.listOfNodes[0].dijitDateValue);
			var difference = Math.abs(dojo.date.difference(firstDate, dateNode, "day"));
			return this.listOfNodes[difference];
		},

		_onDayClick: function(/*Event*/ evt){
			// summary:
			//		Handler for day clicks, selects the date if appropriate
			// tags:
			//		protected
			
			//If we coming out of selecting a range, we need to skip this onDayClick or else we
			//are going to deselect a date that has just been selected or deselect one that just was 
			//selected
				dojo.stopEvent(evt);
				for(var node = evt.target; node && !node.dijitDateValue; node = node.parentNode);
				if(node && !dojo.hasClass(node, "dijitCalendarDisabledDate")){
					value = new this.dateClassObj(node.dijitDateValue);
					if(!this.rangeJustSelected){
						this.toggleDate(value,[],[]);
						//To record the date that was selected prior to the one currently selected
						//needed in the event we are selecting a range of dates
						this.previouslySelectedDay = value;
						this.set("currentFocus", value);
						this.onValueSelected([dojo.date.stamp.toISOString(value).substring(0,10)]);
						
					}else{
						this.rangeJustSelected = false;
						this.set("currentFocus", value);
					}
				}
		},

		_onDayMouseOver: function(/*Event*/ evt){
			// summary:
			//		Handler for mouse over events on days, sets hovered style
			// tags:
			//		protected

			// event can occur on <td> or the <span> inside the td,
			// set node to the <td>.
			var node =
				dojo.hasClass(evt.target, "dijitCalendarDateLabel") ?
				evt.target.parentNode :
				evt.target;

			if(node && (node.dijitDateValue || node == this.previousYearLabelNode || node == this.nextYearLabelNode) ){
				dojo.addClass(node, "dijitCalendarHoveredDate");
				this._currentNode = node;
			}
		},
		_setEndRangeAttr: function(/*Date*/ value){
			// description:
			//		records the end of a date range
			// tags:
			//		protected
			value = new this.dateClassObj(value);
			value.setHours(1); // to avoid issues when DST shift occurs at midnight, see #8521, #9366
			this.endRange = value;
		},
		_getEndRangeAttr: function(){
		//		Returns the EndRange date that is set when selecting a range
			var value = new this.dateClassObj(this.endRange);
			value.setHours(0, 0, 0, 0); // return midnight, local time for back-compat
		
			// If daylight savings pushes midnight to the previous date, fix the Date
			// object to point at 1am so it will represent the correct day. See #9366
			if(value.getDate() < this.endRange.getDate()){
				value = this.dateFuncObj.add(value, "hour", 1);
			}
			return value;
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
			if(dojo.hasClass(this._currentNode, "dijitCalendarActiveDate")) {
				cls += " dijitCalendarActiveDate";
			}
			dojo.removeClass(this._currentNode, cls);
			this._currentNode = null;
		},
		_onDayMouseDown: function(/*Event*/ evt){ 
			var node = evt.target.parentNode;
			if(node && node.dijitDateValue){
				dojo.addClass(node, "dijitCalendarActiveDate");
				this._currentNode = node;
			}
			//if shift is pressed, we know the user is selecting a range,
			//in which case we are going to select a range of date 
			if(evt.shiftKey && this.previouslySelectedDay){
				//necessary to know whether or not we are in the process of selecting a range of dates	
				this.selectingRange = true;
				this.set('endRange', node.dijitDateValue);
				this._selectRange();
			}else{
				this.selectingRange = false;
				this.previousRangeStart = null;
				this.previousRangeEnd = null;
			}
		},
		
		_onDayMouseUp: function(/*Event*/ evt){
			var node = evt.target.parentNode;
			if(node && node.dijitDateValue){
				dojo.removeClass(node, "dijitCalendarActiveDate");
			}
		},

//TODO: use typematic
		handleKey: function(/*Event*/ evt){
			// summary:
			//		Provides keyboard navigation of calendar.
			// description:
			//		Called from _onKeyDown() to handle keypress on a stand alone Calendar,
			//		and also from `dijit.form._DateTimeTextBox` to pass a keypress event 
			//		from the `dijit.form.DateTextBox` to be handled in this widget
			// returns:
			//		False if the key was recognized as a navigation key,
			//		to indicate that the event was handled by Calendar and shouldn't be propogated
			// tags:
			//		protected
			var dk = dojo.keys,
				increment = -1,
				interval,
				newValue = this.currentFocus;
			switch(evt.keyCode){
				case dk.RIGHT_ARROW:
					increment = 1;
					//fallthrough...
				case dk.LEFT_ARROW:
					interval = "day";
					if(!this.isLeftToRight()){ increment *= -1; }
					break;
				case dk.DOWN_ARROW:
					increment = 1;
					//fallthrough...
				case dk.UP_ARROW:
					interval = "week";
					break;
				case dk.PAGE_DOWN:
					increment = 1;
					//fallthrough...
				case dk.PAGE_UP:
					interval = evt.ctrlKey || evt.altKey ? "year" : "month";
					break;
				case dk.END:
					// go to the next month
					newValue = this.dateFuncObj.add(newValue, "month", 1);
					// subtract a day from the result when we're done
					interval = "day";
					//fallthrough...
				case dk.HOME:
					newValue = new this.dateClassObj(newValue);
					newValue.setDate(1);
					break;
				case dk.ENTER:
				case dk.SPACE:
					if(evt.shiftKey && this.previouslySelectedDay){
						this.selectingRange = true;
						this.set('endRange', newValue);
						this._selectRange();
					}else{
						this.selectingRange = false;				
						this.toggleDate(newValue,[],[]);
						//We record the selected date as the previous one 
						//In case we are selecting the first date of a range
						this.previouslySelectedDay = newValue;
						this.previousRangeStart = null;
						this.previousRangeEnd = null;
						this.onValueSelected([dojo.date.stamp.toISOString(newValue).substring(0,10)]);
						
					}
					break;
				default:
					return true;
			}

			if(interval){
				newValue = this.dateFuncObj.add(newValue, interval, increment);
			}

			this.set("currentFocus", newValue);

			return false;
		},

		_onKeyDown: function(/*Event*/ evt){
			// summary:
			//		For handling keypress events on a stand alone calendar
			if(!this.handleKey(evt)){
				dojo.stopEvent(evt);
			}
		},
		
		_removeFromRangeLTR : function(/*date*/ beginning, /*date*/ end, /*array*/selectedDates, /*array*/unselectedDates){
	//In this method we remove some dates from a range from left to right
			difference = Math.abs(dojo.date.difference(beginning, end, "day"));
			for(var i = 0; i <= difference; i++){
				var nextDay = dojo.date.add(beginning, 'day',i);
				this.toggleDate(nextDay, selectedDates, unselectedDates);
			}
			if(this.previousRangeEnd == null){
				//necessary to keep track of the previous range's end date
				this.previousRangeEnd = end;
			}else{
				if(dojo.date.compare(end, this.previousRangeEnd, 'date') > 0 )
					this.previousRangeEnd = end;
			}
			if(this.previousRangeStart == null){
				//necessary to keep track of the previous range's start date
				this.previousRangeStart = end;
			}else{
				if(dojo.date.compare(end, this.previousRangeStart, 'date') > 0 )
					this.previousRangeStart = end;
			}
			this.previouslySelectedDay = dojo.date.add(nextDay, 'day',1);	
		},
		_removeFromRangeRTL : function(/*date*/ beginning, /*date*/ end, /*array*/selectedDates, /*array*/unselectedDates){
			//If the end of the range is earlier than the beginning (back in time), 
			//we are going to start from the end and move backward 
	
			difference = Math.abs(dojo.date.difference(beginning, end, "day"));
			for(var i = 0; i <= difference; i++){
				var nextDay = dojo.date.add(beginning, 'day',-i);
				this.toggleDate(nextDay, selectedDates, unselectedDates);
			}
			if(this.previousRangeEnd == null){
				this.previousRangeEnd = end;
			}else{
				if(dojo.date.compare(end, this.previousRangeEnd, 'date') < 0 ){
					this.previousRangeEnd = end;
				}
			}
			if(this.previousRangeStart == null){
				this.previousRangeStart = end;
			}else{
				if(dojo.date.compare(end, this.previousRangeStart, 'date') < 0 ){
					this.previousRangeStart = end;
				}
			}
			this.previouslySelectedDay = dojo.date.add(nextDay, 'day',-1);
		},
		_addToRangeRTL : function(/*date*/ beginning, /*date*/ end, /*array*/selectedDates, /*array*/unselectedDates){
		
			difference = Math.abs(dojo.date.difference(beginning, end, "day"));
			//If the end of the range is earlier than the beginning (back in time), 
			//we are going to start from the end and move backward 
			for(var i = 1; i <= difference; i++){
				var nextDay = dojo.date.add(beginning, 'day',-i);
				this.toggleDate(nextDay, selectedDates, unselectedDates);
			}
	
			if(this.previousRangeStart == null){
				this.previousRangeStart = end;
			}else{
				if(dojo.date.compare(end, this.previousRangeStart, 'date') < 0 ){
					this.previousRangeStart = end;
				}
			}
			if(this.previousRangeEnd == null){
				this.previousRangeEnd = beginning;
			}else{
				if(dojo.date.compare(beginning, this.previousRangeEnd, 'date') > 0 ){
					this.previousRangeEnd = beginning;
				}
			}
			this.previouslySelectedDay = nextDay;
		},
		_addToRangeLTR : function(/*date*/ beginning, /*date*/ end, /*array*/selectedDates, /*array*/unselectedDates){
			//If the end of the range is later than the beginning, 
			//adding dates from left to right
			difference = Math.abs(dojo.date.difference(beginning, end, "day"));
			for(var i = 1; i <= difference; i++){
				var nextDay = dojo.date.add(beginning, 'day',i);
				this.toggleDate(nextDay, selectedDates, unselectedDates);
			}
			if(this.previousRangeStart == null){
				this.previousRangeStart = beginning;
			}else{
				if(dojo.date.compare(beginning, this.previousRangeStart, 'date') < 0 ){
					this.previousRangeStart = beginning;
				}
			}
			if(this.previousRangeEnd == null){
				this.previousRangeEnd = end;
			}else{
				if(dojo.date.compare(end, this.previousRangeEnd, 'date') > 0 ){
					this.previousRangeEnd = end;
				}
			}
			this.previouslySelectedDay = nextDay;
		},
		_selectRange : function(){
			//This method will toggle the dates in the selected range.
			var selectedDates = []; //Will gather the list of ISO dates that are selected
			var unselectedDates = []; //Will gather the list of ISO dates that are unselected
			var beginning = this.previouslySelectedDay;
			var end = this.get('endRange');
			
			if(!this.previousRangeStart && !this.previousRangeEnd){
				removingFromRange = false;
			}else{
				if((dojo.date.compare(end, this.previousRangeStart, 'date') < 0) || (dojo.date.compare(end, this.previousRangeEnd, 'date') > 0)){
				//We are adding to range
					removingFromRange = false;
				}else{// Otherwise we are removing from the range
					removingFromRange = true;
				}
			}
			if(removingFromRange == true){
				if(dojo.date.compare(end, beginning, 'date') < 0){
					//We are removing from the range, starting from the end (Right to left)
					this._removeFromRangeRTL(beginning, end, selectedDates, unselectedDates);
				}else{
				//The end of the range is later in time than the beginning: We go from left to right
					this._removeFromRangeLTR(beginning, end, selectedDates, unselectedDates);
				}
			}else{
				//We are adding to the range
				if(dojo.date.compare(end, beginning, 'date') < 0){
					this._addToRangeRTL(beginning, end, selectedDates, unselectedDates);
				}else{
					this._addToRangeLTR(beginning, end, selectedDates, unselectedDates);
				}
			}
			//We call the extension point with the changed dates
			if(selectedDates.length > 0){
				this.onValueSelected(selectedDates);
			}
			if(unselectedDates.length > 0){
				this.onValueUnselected(unselectedDates);
			}
			this.rangeJustSelected = true; //Indicates that we just selected a range.
		},

		onValueSelected: function(/*array of ISO dates*/ dates){
			// summary:
			//		Notification that a date cell or more were selected.
			// description:
			//		Passes on the list of ISO dates that are selected
			// tags:
			//		protected
		},

		onValueUnselected: function(/*array of ISO dates*/ dates){
			// summary:
			//		Notification that a date cell or more were unselected.
			// description:
			//		Passes on the list of ISO dates that are unselected
			// tags:
			//		protected
		},
		onChange: function(/*Date*/ date){
			// summary:
			//		Called only when the selected date has changed
		},

		_isSelectedDate: function(/*Date*/ dateObject, /*String?*/ locale){
			// summary:
			//		Returns true if the passed date is part of the selected dates of the calendar
			
				dateIndex = dojo.date.stamp.toISOString(dateObject).substring(0,10);
				return this.value[dateIndex];
		},

		isDisabledDate: function(/*Date*/ dateObject, /*String?*/ locale){
			// summary:
			//		May be overridden to disable certain dates in the calendar e.g. `isDisabledDate=dojo.date.locale.isWeekend`
			// tags:
			//		extension
/*=====
			return false; // Boolean
=====*/
		},

		getClassForDate: function(/*Date*/ dateObject, /*String?*/ locale){
			// summary:
			//		May be overridden to return CSS classes to associate with the date entry for the given dateObject,
			//		for example to indicate a holiday in specified locale.
			// tags:
			//		extension

/*=====
			return ""; // String
=====*/
		},
		_sort : function(){
			//This function returns a sorted version of the value array that represents the selected dates.
			if(this.value == {}){return [];}
			//We create an array of date objects with the dates that were selected by the user.
			var selectedDates = [];
			for (var selDate in this.value){
				selectedDates.push(selDate);
			}
			//Actual sorting
			selectedDates.sort(function(a, b){
				var dateA=new Date(a), dateB=new Date(b);
				return dateA-dateB;
			});
			return selectedDates;
		},
		_returnDatesWithIsoRanges : function(selectedDates /*Array of sorted ISO dates*/){
		//this method receives a sorted array of dates and returns an array of dates and date ranges where
		//such range exist. For instance when passed with selectedDates = ['2010-06-14', '2010-06-15', '2010-12-25']
		//it would return [2010-06-14/2010-06-15,  '2010-12-25']
		var returnDates = [];
		if(selectedDates.length > 1){
			//initialisation
			var weHaveRange = false,
				rangeCount = 0,
				startRange = null,
				lastDayRange = null,
				previousDate = dojo.date.stamp.fromISOString(selectedDates[0]);
			
			for(var i = 1; i < selectedDates.length+1; i++){
				currentDate = dojo.date.stamp.fromISOString(selectedDates[i]);
				if(weHaveRange){
				//We are in the middle of a range				
					difference = Math.abs(dojo.date.difference(previousDate, currentDate, "day"));
					if(difference == 1){
						//we continue with the range
						lastDayRange = currentDate;
					}else{
						//end of the range, reset variables for maybe the next range..
						range = dojo.date.stamp.toISOString(startRange).substring(0,10)
								+ "/" + dojo.date.stamp.toISOString(lastDayRange).substring(0,10);
						returnDates.push(range);
						weHaveRange = false;
					}
				}else{
					//We are not in a range to begin with
					difference = Math.abs(dojo.date.difference(previousDate, currentDate, "day"));
					if(difference == 1){
						//These are two consecutive dates: This is a range!
						weHaveRange = true;
						startRange = previousDate;
						lastDayRange = currentDate;
					}else{
						//this is a standalone date
						returnDates.push(dojo.date.stamp.toISOString(previousDate).substring(0,10));
					}
				}
				previousDate = currentDate;
			}
			return returnDates;
		}else{
			//If there's only one selected date we return only it
				return selectedDates;
			}
		}
	}	
);

//FIXME: can we use dijit.Calendar._MonthDropDown directly?
dojo.declare("dojox.widget._MonthDropDown", [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
	// summary:
	//		The month drop down

	// months: String[]
	//		List of names of months, possibly w/some undefined entries for Hebrew leap months
	//		(ex: ["January", "February", undefined, "April", ...])
	months: [],

	templateString: "<div class='dijitCalendarMonthMenu dijitMenu' " +
		"dojoAttachEvent='onclick:_onClick,onmouseover:_onMenuHover,onmouseout:_onMenuHover'></div>",

	_setMonthsAttr: function(/*String[]*/ months){
		this.domNode.innerHTML = dojo.map(months, function(month, idx){
				return month ? "<div class='dijitCalendarMonthLabel' month='" + idx +"'>" + month + "</div>" : "";
			}).join("");
	},

	_onClick: function(/*Event*/ evt){
		this.onChange(dojo.attr(evt.target, "month"));
	},

	onChange: function(/*Number*/ month){
		// summary:
		//		Callback when month is selected from drop down
	},

	_onMenuHover: function(evt){
		dojo.toggleClass(evt.target, "dijitCalendarMonthLabelHover", evt.type == "mouseover");
	}
});

return dojox.widget.MultiSelectCalendar;
});
