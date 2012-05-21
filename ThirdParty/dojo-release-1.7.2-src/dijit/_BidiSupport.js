define(["./_WidgetBase"], function(_WidgetBase){

/*=====
	var _WidgetBase = dijit._WidgetBase;
====*/

	// module:
	//		dijit/_BidiSupport
	// summary:
	//		Module that deals with BIDI, special with the auto
	//		direction if needed without changing the GUI direction.
	//		Including this module will extend _WidgetBase with BIDI related methods.
	// description:
	//		There's a special need for displaying BIDI text in rtl direction
	//		in ltr GUI, sometimes needed auto support.
	//		In creation of widget, if it's want to activate this class,
	//		the widget should define the "textDir".

	_WidgetBase.extend({

		getTextDir: function(/*String*/ text){
			// summary:
			//		Gets the right direction of text.
			// description:
			// 		If textDir is ltr or rtl returns the value.
			//		If it's auto, calls to another function that responsible
			//		for checking the value, and defining the direction.
			//	tags:
			//		protected.
			return this.textDir == "auto" ? this._checkContextual(text) : this.textDir;
		},

		_checkContextual: function(text){
			// summary:
			//		Finds the first strong (directional) character, return ltr if isLatin
			//		or rtl if isBidiChar.
			//	tags:
			//		private.

			// look for strong (directional) characters
			var fdc = /[A-Za-z\u05d0-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(text);
			// if found return the direction that defined by the character, else return widgets dir as defult.
			return fdc ? ( fdc[0] <= 'z' ? "ltr" : "rtl" ) : this.dir ? this.dir : this.isLeftToRight() ? "ltr" : "rtl";
		},

		applyTextDir: function(/*Object*/ element, /*String*/ text){
			// summary:
			//		Set element.dir according to this.textDir
			// element:
			//		The text element to be set. Should have dir property.
			// text:
			//		Used in case this.textDir is "auto", for calculating the right transformation
			// description:
			// 		If textDir is ltr or rtl returns the value.
			//		If it's auto, calls to another function that responsible
			//		for checking the value, and defining the direction.
			//	tags:
			//		protected.

			var textDir = this.textDir == "auto" ? this._checkContextual(text) : this.textDir;
			// update only when there's a difference
			if(element.dir != textDir){
				element.dir = textDir;
			}
		}
	});

	return _WidgetBase;
});
