define([
	"dojo/_base/declare", // declare
	"dojo/has",
	"dojo/number", // number.format
	"dojo/query", // query
	"dojo/_base/lang", // lang
	"./HorizontalRule"
], function(declare, has, number, query, lang, HorizontalRule){

	// module:
	//		dijit/form/HorizontalRuleLabels

	var HorizontalRuleLabels = declare("dijit.form.HorizontalRuleLabels", HorizontalRule, {
		// summary:
		//		Labels for `dijit/form/HorizontalSlider`

		templateString: '<div class="dijitRuleContainer dijitRuleContainerH dijitRuleLabelsContainer dijitRuleLabelsContainerH"></div>',

		// labelStyle: String
		//		CSS style to apply to individual text labels
		labelStyle: "",

		// labels: String[]?
		//		Array of text labels to render - evenly spaced from left-to-right or bottom-to-top.
		//		Alternately, minimum and maximum can be specified, to get numeric labels.
		labels: [],

		// numericMargin: Integer
		//		Number of generated numeric labels that should be rendered as '' on the ends when labels[] are not specified
		numericMargin: 0,

		// numericMinimum: Integer
		//		Leftmost label value for generated numeric labels when labels[] are not specified
		minimum: 0,

		// numericMaximum: Integer
		//		Rightmost label value for generated numeric labels when labels[] are not specified
		maximum: 1,

		// constraints: Object
		//		pattern, places, lang, et al (see dojo.number) for generated numeric labels when labels[] are not specified
		constraints: {pattern: "#%"},

		_positionPrefix: '<div class="dijitRuleLabelContainer dijitRuleLabelContainerH" style="left:',
		_labelPrefix: '"><div class="dijitRuleLabel dijitRuleLabelH">',
		_suffix: '</div></div>',

		_calcPosition: function(pos){
			// summary:
			//		Returns the value to be used in HTML for the label as part of the left: attribute
			// tags:
			//		protected extension
			return pos;
		},

		_genHTML: function(pos, ndx){
			var label = this.labels[ndx];
			return this._positionPrefix + this._calcPosition(pos) + this._positionSuffix + this.labelStyle +
				this._genDirectionHTML(label) +
				this._labelPrefix + label + this._suffix;
		},

		_genDirectionHTML: function(label){
			// extension point for bidi code
			return "";
		},

		getLabels: function(){
			// summary:
			//		Overridable function to return array of labels to use for this slider.
			//		Can specify a getLabels() method instead of a labels[] array, or min/max attributes.
			// tags:
			//		protected extension

			// if the labels array was not specified directly, then see if <li> children were
			var labels = this.labels;
			if(!labels.length && this.srcNodeRef){
				// for markup creation, labels are specified as child elements
				labels = query("> li", this.srcNodeRef).map(function(node){
					return String(node.innerHTML);
				});
			}
			// if the labels were not specified directly and not as <li> children, then calculate numeric labels
			if(!labels.length && this.count > 1){
				var start = this.minimum;
				var inc = (this.maximum - start) / (this.count - 1);
				for(var i = 0; i < this.count; i++){
					labels.push((i < this.numericMargin || i >= (this.count - this.numericMargin)) ? '' : number.format(start, this.constraints));
					start += inc;
				}
			}
			return labels;
		},

		postMixInProperties: function(){
			this.inherited(arguments);
			this.labels = this.getLabels();
			this.count = this.labels.length;
		}
	});

	if(has("dojo-bidi")){
		HorizontalRuleLabels.extend({
			_setTextDirAttr: function(textDir){
				if(this.textDir != textDir){
					this._set("textDir", textDir);
					query(".dijitRuleLabelContainer", this.domNode).forEach(
						lang.hitch(this, function(labelNode){
							labelNode.style.direction = this.getTextDir(labelNode.innerText || labelNode.textContent || "");
						})
					);
				}
			},

			_genDirectionHTML: function(label){
				return (this.textDir ? ("direction:" + this.getTextDir(label) + ";") : "")
			}
		});
	}

	return HorizontalRuleLabels;
});
