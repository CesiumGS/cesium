define([
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.hitch lang.mixin
	"dojo/i18n", // i18n.normalizeLocale, i18n.getLocalization
	"dojo/string", // string.rep
	"dojo/number", // number._realNumberRegexp number.format number.parse number.regexp
	"./RangeBoundTextBox"
], function(declare, lang, i18n, string, number, RangeBoundTextBox){

	// module:
	//		dijit/form/NumberTextBox

	// A private helper function to determine decimal information
	// Returns an object with "sep" and "places" properties
	var getDecimalInfo = function(constraints){
		var constraints = constraints || {},
			bundle = i18n.getLocalization("dojo.cldr", "number", i18n.normalizeLocale(constraints.locale)),
			pattern = constraints.pattern ? constraints.pattern : bundle[(constraints.type || "decimal")+"Format"];

		// The number of places in the constraint can be specified in several ways,
		// the resolution order is:
		//
		// 1. If constraints.places is a number, use that
		// 2. If constraints.places is a string, which specifies a range, use the range max (e.g. 0,4)
		// 3. If a pattern is specified, use the implicit number of places in the pattern.
		// 4. If neither constraints.pattern or constraints.places is specified, use the locale default pattern
		var places;
		if(typeof constraints.places == "number"){
			places = constraints.places;
		}else if(typeof constraints.places === "string" && constraints.places.length > 0){
			places = constraints.places.replace(/.*,/, "");
		}else{
			places = (pattern.indexOf(".") != -1 ? pattern.split(".")[1].replace(/[^#0]/g, "").length : 0);
		}

		return { sep: bundle.decimal, places: places };
	};

	var NumberTextBoxMixin = declare("dijit.form.NumberTextBoxMixin", null, {
		// summary:
		//		A mixin for all number textboxes
		// tags:
		//		protected

		// Override ValidationTextBox.pattern.... we use a reg-ex generating function rather
		// than a straight regexp to deal with locale (plus formatting options too?)
		pattern: function(constraints){
			// if focused, accept either currency data or NumberTextBox format
			return '(' + (this.focused && this.editOptions ? this._regExpGenerator(lang.delegate(constraints, this.editOptions)) + '|' : '')
				+ this._regExpGenerator(constraints) + ')';
		},

		/*=====
		// constraints: NumberTextBox.__Constraints
		//		Despite the name, this parameter specifies both constraints on the input
		//		(including minimum/maximum allowed values) as well as
		//		formatting options like places (the number of digits to display after
		//		the decimal point).
		constraints: {},
		======*/

		// value: Number
		//		The value of this NumberTextBox as a Javascript Number (i.e., not a String).
		//		If the displayed value is blank, the value is NaN, and if the user types in
		//		an gibberish value (like "hello world"), the value is undefined
		//		(i.e. get('value') returns undefined).
		//
		//		Symmetrically, set('value', NaN) will clear the displayed value,
		//		whereas set('value', undefined) will have no effect.
		value: NaN,

		// editOptions: [protected] Object
		//		Properties to mix into constraints when the value is being edited.
		//		This is here because we edit the number in the format "12345", which is
		//		different than the display value (ex: "12,345")
		editOptions: { pattern: '#.######' },

		/*=====
		_formatter: function(value, options){
			// summary:
			//		_formatter() is called by format().  It's the base routine for formatting a number,
			//		as a string, for example converting 12345 into "12,345".
			// value: Number
			//		The number to be converted into a string.
			// options: number.__FormatOptions?
			//		Formatting options
			// tags:
			//		protected extension

			return "12345";		// String
		},
		 =====*/
		_formatter: number.format,

		/*=====
		_regExpGenerator: function(constraints){
			// summary:
			//		Generate a localized regular expression as a string, according to constraints.
			// constraints: number.__ParseOptions
			//		Formatting options
			// tags:
			//		protected

			return "(\d*).(\d*)";	// string
		},
		=====*/
		_regExpGenerator: number.regexp,

		// _decimalInfo: Object
		// summary:
		//		An object containing decimal related properties relevant to this TextBox.
		// tags:
		//		private
		_decimalInfo: getDecimalInfo(),

		postMixInProperties: function(){
			this.inherited(arguments);
			this._set("type", "text"); // in case type="number" was specified which messes up parse/format
		},

		_setConstraintsAttr: function(/*Object*/ constraints){
			var places = typeof constraints.places == "number"? constraints.places : 0;
			if(places){ places++; } // decimal rounding errors take away another digit of precision
			if(typeof constraints.max != "number"){
				constraints.max = 9 * Math.pow(10, 15-places);
			}
			if(typeof constraints.min != "number"){
				constraints.min = -9 * Math.pow(10, 15-places);
			}
			this.inherited(arguments, [ constraints ]);
			if(this.focusNode && this.focusNode.value && !isNaN(this.value)){
				this.set('value', this.value);
			}
			// Capture decimal information based on the constraint locale and pattern.
			this._decimalInfo = getDecimalInfo(constraints);
		},

		_onFocus: function(){
			if(this.disabled || this.readOnly){ return; }
			var val = this.get('value');
			if(typeof val == "number" && !isNaN(val)){
				var formattedValue = this.format(val, this.constraints);
				if(formattedValue !== undefined){
					this.textbox.value = formattedValue;
				}
			}
			this.inherited(arguments);
		},

		format: function(/*Number*/ value, /*number.__FormatOptions*/ constraints){
			// summary:
			//		Formats the value as a Number, according to constraints.
			// tags:
			//		protected

			var formattedValue = String(value);
			if(typeof value != "number"){ return formattedValue; }
			if(isNaN(value)){ return ""; }
			// check for exponential notation that dojo/number.format() chokes on
			if(!("rangeCheck" in this && this.rangeCheck(value, constraints)) && constraints.exponent !== false && /\de[-+]?\d/i.test(formattedValue)){
				return formattedValue;
			}
			if(this.editOptions && this.focused){
				constraints = lang.mixin({}, constraints, this.editOptions);
			}
			return this._formatter(value, constraints);
		},

		/*=====
		_parser: function(value, constraints){
			// summary:
			//		Parses the string value as a Number, according to constraints.
			// value: String
			//		String representing a number
			// constraints: number.__ParseOptions
			//		Formatting options
			// tags:
			//		protected

			return 123.45;		// Number
		},
		=====*/
		_parser: number.parse,

		parse: function(/*String*/ value, /*number.__FormatOptions*/ constraints){
			// summary:
			//		Replaceable function to convert a formatted string to a number value
			// tags:
			//		protected extension

			var v = this._parser(value, lang.mixin({}, constraints, (this.editOptions && this.focused) ? this.editOptions : {}));
			if(this.editOptions && this.focused && isNaN(v)){
				v = this._parser(value, constraints); // parse w/o editOptions: not technically needed but is nice for the user
			}
			return v;
		},

		_getDisplayedValueAttr: function(){
			var v = this.inherited(arguments);
			return isNaN(v) ? this.textbox.value : v;
		},

		filter: function(/*Number*/ value){
			// summary:
			//		This is called with both the display value (string), and the actual value (a number).
			//		When called with the actual value it does corrections so that '' etc. are represented as NaN.
			//		Otherwise it dispatches to the superclass's filter() method.
			//
			//		See `dijit/form/TextBox.filter()` for more details.
			if(value == null  /* or undefined */ || typeof value == "string" && value ==''){
				return NaN;
			}else if(typeof value == "number" && !isNaN(value) && value != 0){
				value = number.round(value, this._decimalInfo.places);
			}
			return this.inherited(arguments, [value]);
		},

		serialize: function(/*Number*/ value, /*Object?*/ options){
			// summary:
			//		Convert value (a Number) into a canonical string (ie, how the number literal is written in javascript/java/C/etc.)
			// tags:
			//		protected
			return (typeof value != "number" || isNaN(value)) ? '' : this.inherited(arguments);
		},

		_setBlurValue: function(){
			var val = lang.hitch(lang.delegate(this, { focused: true }), "get")('value'); // parse with editOptions
			this._setValueAttr(val, true);
		},

		_setValueAttr: function(/*Number*/ value, /*Boolean?*/ priorityChange, /*String?*/ formattedValue){
			// summary:
			//		Hook so set('value', ...) works.
			if(value !== undefined && formattedValue === undefined){
				formattedValue = String(value);
				if(typeof value == "number"){
					if(isNaN(value)){ formattedValue = '' }
					// check for exponential notation that number.format chokes on
					else if(("rangeCheck" in this && this.rangeCheck(value, this.constraints)) || this.constraints.exponent === false || !/\de[-+]?\d/i.test(formattedValue)){
						formattedValue = undefined; // lets format compute a real string value
					}
				}else if(!value){ // 0 processed in if branch above, ''|null|undefined flows through here
					formattedValue = '';
					value = NaN;
				}else{ // non-numeric values
					value = undefined;
				}
			}
			this.inherited(arguments, [value, priorityChange, formattedValue]);
		},

		_getValueAttr: function(){
			// summary:
			//		Hook so get('value') works.
			//		Returns Number, NaN for '', or undefined for unparseable text
			var v = this.inherited(arguments); // returns Number for all values accepted by parse() or NaN for all other displayed values

			// If the displayed value of the textbox is gibberish (ex: "hello world"), this.inherited() above
			// returns NaN; this if() branch converts the return value to undefined.
			// Returning undefined prevents user text from being overwritten when doing _setValueAttr(_getValueAttr()).
			// A blank displayed value is still returned as NaN.
			if(isNaN(v) && this.textbox.value !== ''){
				if(this.constraints.exponent !== false && /\de[-+]?\d/i.test(this.textbox.value) && (new RegExp("^"+number._realNumberRegexp(lang.delegate(this.constraints))+"$").test(this.textbox.value))){	// check for exponential notation that parse() rejected (erroneously?)
					var n = Number(this.textbox.value);
					return isNaN(n) ? undefined : n; // return exponential Number or undefined for random text (may not be possible to do with the above RegExp check)
				}else{
					return undefined; // gibberish
				}
			}else{
				return v; // Number or NaN for ''
			}
		},

		isValid: function(/*Boolean*/ isFocused){
			// Overrides dijit/form/RangeBoundTextBox.isValid() to check that the editing-mode value is valid since
			// it may not be formatted according to the regExp validation rules
			if(!this.focused || this._isEmpty(this.textbox.value)){
				return this.inherited(arguments);
			}else{
				var v = this.get('value');
				if(!isNaN(v) && this.rangeCheck(v, this.constraints)){
					if(this.constraints.exponent !== false && /\de[-+]?\d/i.test(this.textbox.value)){ // exponential, parse doesn't like it
						return true; // valid exponential number in range
					}else{
						return this.inherited(arguments);
					}
				}else{
					return false;
				}
			}
		},

		_isValidSubset: function(){
			// Overrides dijit/form/ValidationTextBox._isValidSubset()
			//
			// The inherited method only checks that the computed regex pattern is valid, which doesn't
			// take into account that numbers are a special case. Specifically:
			//
			//  (1) An arbitrary amount of leading or trailing zero's can be ignored.
			//  (2) Since numeric input always occurs in the order of most significant to least significant
			//      digits, the maximum and minimum possible values for partially inputted numbers can easily
			//      be determined by using the number of remaining digit spaces available.
			//
			// For example, if an input has a maxLength of 5, and a min value of greater than 100, then the subset
			// is invalid if there are 3 leading 0s. It remains valid for the first two.
			//
			// Another example is if the min value is 1.1. Once a value of 1.0 is entered, no additional trailing digits
			// could possibly satisify the min requirement.
			//
			// See ticket #17923
			var hasMinConstraint = (typeof this.constraints.min == "number"),
				hasMaxConstraint = (typeof this.constraints.max == "number"),
				curVal = this.get('value');

			// If there is no parsable number, or there are no min or max bounds, then we can safely
			// skip all remaining checks
			if(isNaN(curVal) || (!hasMinConstraint && !hasMaxConstraint)){
				return this.inherited(arguments);
			}

			// This block picks apart the values in the text box to be used later to compute the min and max possible
			// values based on the current value and the remaining available digits.
			//
			// Warning: The use of a "num|0" expression, can be confusing. See the link below
			// for an explanation.
			//
			// http://stackoverflow.com/questions/12125421/why-does-a-shift-by-0-truncate-the-decimal
			var integerDigits = curVal|0,
				valNegative = curVal < 0,
				// Check if the current number has a decimal based on its locale
				hasDecimal = this.textbox.value.indexOf(this._decimalInfo.sep) != -1,
				// Determine the max digits based on the textbox length. If no length is
				// specified, chose a huge number to account for crazy formatting.
				maxDigits = this.maxLength || 20,
				// Determine the remaining digits, based on the max digits
				remainingDigitsCount = maxDigits - this.textbox.value.length,
				// avoid approximation issues by capturing the decimal portion of the value as the user-entered string
				fractionalDigitStr = hasDecimal ? this.textbox.value.split(this._decimalInfo.sep)[1].replace(/[^0-9]/g, "") : "";

			// Create a normalized value string in the form of #.###
			var normalizedValueStr = hasDecimal ? integerDigits+"."+fractionalDigitStr : integerDigits+"";

			// The min and max values for the field can be determined using the following
			// logic:
			//
			//  If the number is positive:
			//      min value = the current value
			//      max value = the current value with 9s appended for all remaining possible digits
			//  else
			//      min value = the current value with 9s appended for all remaining possible digits
			//      max value = the current value
			//
			var ninePaddingStr = string.rep("9", remainingDigitsCount),
			    minPossibleValue = curVal,
			    maxPossibleValue = curVal;
			if (valNegative){
				minPossibleValue = Number(normalizedValueStr+ninePaddingStr);
			} else{
				maxPossibleValue = Number(normalizedValueStr+ninePaddingStr);
			}

			return !((hasMinConstraint && maxPossibleValue < this.constraints.min)
					|| (hasMaxConstraint && minPossibleValue > this.constraints.max));
		}
	});

	var NumberTextBox = declare("dijit.form.NumberTextBox", [RangeBoundTextBox, NumberTextBoxMixin], {
		// summary:
		//		A TextBox for entering numbers, with formatting and range checking
		// description:
		//		NumberTextBox is a textbox for entering and displaying numbers, supporting
		//		the following main features:
		//
		//		1. Enforce minimum/maximum allowed values (as well as enforcing that the user types
		//			a number rather than a random string)
		//		2. NLS support (altering roles of comma and dot as "thousands-separator" and "decimal-point"
		//			depending on locale).
		//		3. Separate modes for editing the value and displaying it, specifically that
		//			the thousands separator character (typically comma) disappears when editing
		//			but reappears after the field is blurred.
		//		4. Formatting and constraints regarding the number of places (digits after the decimal point)
		//			allowed on input, and number of places displayed when blurred (see `constraints` parameter).

		baseClass: "dijitTextBox dijitNumberTextBox"
	});

	NumberTextBox.Mixin = NumberTextBoxMixin;	// for monkey patching

	/*=====
	 NumberTextBox.__Constraints = declare([RangeBoundTextBox.__Constraints, number.__FormatOptions, number.__ParseOptions], {
		 // summary:
		 //		Specifies both the rules on valid/invalid values (minimum, maximum,
		 //		number of required decimal places), and also formatting options for
		 //		displaying the value when the field is not focused.
		 // example:
		 //		Minimum/maximum:
		 //		To specify a field between 0 and 120:
		 //	|		{min:0,max:120}
		 //		To specify a field that must be an integer:
		 //	|		{fractional:false}
		 //		To specify a field where 0 to 3 decimal places are allowed on input:
		 //	|		{places:'0,3'}
	 });
	 =====*/

	return NumberTextBox;
});
