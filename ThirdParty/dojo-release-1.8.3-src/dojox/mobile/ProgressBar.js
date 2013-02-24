define([
	"dojo/_base/declare",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dijit/_WidgetBase"
], function(declare, domClass, domConstruct, WidgetBase){

	// module:
	//		dojox/mobile/ProgressBar

	return declare("dojox.mobile.ProgressBar", WidgetBase, {
		// summary:
		//		A widget that shows the progress of a task.
		// description:
		//		The current progress can be specified either in percent or by a
		//		value between 0 and maximum. The setter for the value can be used to
		//		update the progress.

		// value: String
		//		Number ("0" to maximum) or percentage ("0%" to "100%")
		//		indicating the degree of completion of the task.
		value: "0",

		// maximum: Number
		//		Maximum value.
		maximum: 100,

		// label: String
		//		A text to be shown at the center of the progress bar.
		label: "",

		/* internal properties */	
		
		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblProgressBar",

		buildRendering: function(){
			this.inherited(arguments);
			this.progressNode = domConstruct.create("div", {
				className: "mblProgressBarProgress"
			}, this.domNode);
			this.msgNode = domConstruct.create("div", {
				className: "mblProgressBarMsg"
			}, this.domNode);
		},

		_setValueAttr: function(/*String*/value){
			// summary:
			//		Sets the new value to the progress bar.
			// tags:
			//		private
			value += "";
			this._set("value", value);

			var percent = Math.min(100, (value.indexOf("%") != -1 ?
				parseFloat(value) : this.maximum ? 100 * value / this.maximum : 0));
			this.progressNode.style.width = percent + "%";
			domClass.toggle(this.progressNode, "mblProgressBarNotStarted", !percent);
			domClass.toggle(this.progressNode, "mblProgressBarComplete", percent == 100);
			this.onChange(value, this.maximum, percent);
		},

		_setLabelAttr: function(label){
			// summary:
			//		Sets a label text to be shown at the center of the progress bar.
			// tags:
			//		private
			this.msgNode.innerHTML = label;
		},

		onChange: function(/*Number*/ /*===== percent =====*/){
			// summary:
			//		User-defined function called when progress updates.
			// tags:
			//		callback
		}
	});
});
