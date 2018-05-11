define([
	"require", // require.toUrl
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.toggle
	"dojo/_base/lang", // lang.mixin
	"dojo/number", // number.format
	"./_Widget",
	"./_TemplatedMixin",
	"dojo/text!./templates/ProgressBar.html"
], function(require, declare, domClass, lang, number, _Widget, _TemplatedMixin, template){

	// module:
	//		dijit/ProgressBar

	return declare("dijit.ProgressBar", [_Widget, _TemplatedMixin], {
		// summary:
		//		A progress indication widget, showing the amount completed
		//		(often the percentage completed) of a task.

		// progress: [const] String (Percentage or Number)
		//		Number or percentage indicating amount of task completed.
		//		Deprecated.   Use "value" instead.
		progress: "0",

		// value: String (Percentage or Number)
		//		Number or percentage indicating amount of task completed.
		//		With "%": percentage value, 0% <= progress <= 100%, or
		//		without "%": absolute value, 0 <= progress <= maximum.
		//		Infinity means that the progress bar is indeterminate.
		value: "",

		// maximum: [const] Float
		//		Max sample number
		maximum: 100,

		// places: [const] Number
		//		Number of places to show in values; 0 by default
		places: 0,

		// indeterminate: [const] Boolean
		//		If false: show progress value (number or percentage).
		//		If true: show that a process is underway but that the amount completed is unknown.
		//		Deprecated.   Use "value" instead.
		indeterminate: false,

		// label: String?
		//		HTML label on progress bar.   Defaults to percentage for determinate progress bar and
		//		blank for indeterminate progress bar.
		label: "",

		// name: String
		//		this is the field name (for a form) if set. This needs to be set if you want to use
		//		this widget in a dijit/form/Form widget (such as dijit/Dialog)
		name: '',

		templateString: template,

		// _indeterminateHighContrastImagePath: [private] URL
		//		URL to image to use for indeterminate progress bar when display is in high contrast mode
		_indeterminateHighContrastImagePath: require.toUrl("./themes/a11y/indeterminate_progress.gif"),

		postMixInProperties: function(){
			this.inherited(arguments);

			// Back-compat for when constructor specifies indeterminate or progress, rather than value.   Remove for 2.0.
			if(!(this.params && "value" in this.params)){
				this.value = this.indeterminate ? Infinity : this.progress;
			}
		},

		buildRendering: function(){
			this.inherited(arguments);
			this.indeterminateHighContrastImage.setAttribute("src",
				this._indeterminateHighContrastImagePath.toString());
			this.update();
		},

		_setDirAttr: function(val){
			// Normally _CssStateMixin takes care of this, but we aren't extending it
			var rtl = val.toLowerCase() == "rtl";
			domClass.toggle(this.domNode, "dijitProgressBarRtl", rtl);
			domClass.toggle(this.domNode, "dijitProgressBarIndeterminateRtl", this.indeterminate && rtl);
			this.inherited(arguments);
		},

		update: function(/*Object?*/attributes){
			// summary:
			//		Internal method to change attributes of ProgressBar, similar to set(hash).  Users should call
			//		set("value", ...) rather than calling this method directly.
			// attributes:
			//		May provide progress and/or maximum properties on this parameter;
			//		see attribute specs for details.
			// example:
			//	|	myProgressBar.update({'indeterminate': true});
			//	|	myProgressBar.update({'progress': 80});
			//	|	myProgressBar.update({'indeterminate': true, label:"Loading ..." })
			// tags:
			//		private

			// TODO: deprecate this method and use set() instead

			lang.mixin(this, attributes || {});
			var tip = this.internalProgress, ap = this.domNode;
			var percent = 1;
			if(this.indeterminate){
				ap.removeAttribute("aria-valuenow");
			}else{
				if(String(this.progress).indexOf("%") != -1){
					percent = Math.min(parseFloat(this.progress) / 100, 1);
					this.progress = percent * this.maximum;
				}else{
					this.progress = Math.min(this.progress, this.maximum);
					percent = this.maximum ? this.progress / this.maximum : 0;
				}
				ap.setAttribute("aria-valuenow", this.progress);
			}

			// Even indeterminate ProgressBars should have these attributes
			ap.setAttribute("aria-labelledby", this.labelNode.id);
			ap.setAttribute("aria-valuemin", 0);
			ap.setAttribute("aria-valuemax", this.maximum);

			this.labelNode.innerHTML = this.report(percent);

			domClass.toggle(this.domNode, "dijitProgressBarIndeterminate", this.indeterminate);
			domClass.toggle(this.domNode, "dijitProgressBarIndeterminateRtl", this.indeterminate && !this.isLeftToRight());

			tip.style.width = (percent * 100) + "%";
			this.onChange();
		},

		_setValueAttr: function(v){
			this._set("value", v);
			if(v == Infinity){
				this.update({indeterminate: true});
			}else{
				this.update({indeterminate: false, progress: v});
			}
		},

		_setLabelAttr: function(label){
			this._set("label", label);
			this.update();
		},

		_setIndeterminateAttr: function(indeterminate){
			// Deprecated, use set("value", ...) instead
			this._set("indeterminate", indeterminate);
			this.update();
		},

		report: function(/*float*/percent){
			// summary:
			//		Generates HTML message to show inside progress bar (normally indicating amount of task completed).
			//		May be overridden.
			// tags:
			//		extension

			return this.label ? this.label :
				(this.indeterminate ? "&#160;" : number.format(percent, { type: "percent", places: this.places, locale: this.lang }));
		},

		onChange: function(){
			// summary:
			//		Callback fired when progress updates.
			// tags:
			//		extension
		}
	});
});
