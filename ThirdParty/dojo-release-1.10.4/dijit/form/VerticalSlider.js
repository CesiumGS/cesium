define([
	"dojo/_base/declare", // declare
	"./HorizontalSlider",
	"dojo/text!./templates/VerticalSlider.html"
], function(declare, HorizontalSlider, template){

	// module:
	//		dijit/form/VerticalSlider

	return declare("dijit.form.VerticalSlider", HorizontalSlider, {
		// summary:
		//		A form widget that allows one to select a value with a vertically draggable handle

		templateString: template,
		_mousePixelCoord: "pageY",
		_pixelCount: "h",
		_startingPixelCoord: "y",
		_handleOffsetCoord: "top",
		_progressPixelSize: "height",

		// _descending: Boolean
		//		Specifies if the slider values go from high-on-top (true), or low-on-top (false)
		//		TODO: expose this in 1.2 - the css progress/remaining bar classes need to be reversed
		_descending: true,

		_isReversed: function(){
			// summary:
			//		Overrides HorizontalSlider._isReversed.
			//		Indicates if values are high on top (with low numbers on the bottom).
			return this._descending;
		}
	});
});
