define([
	"dojo/_base/declare", // declare
	"../_Widget",
	"../_TemplatedMixin"
], function(declare, _Widget, _TemplatedMixin){

	// module:
	//		dijit/form/HorizontalRule

	return declare("dijit.form.HorizontalRule", [_Widget, _TemplatedMixin], {
		// summary:
		//		Hash marks for `dijit/form/HorizontalSlider`

		templateString: '<div class="dijitRuleContainer dijitRuleContainerH"></div>',

		// count: Integer
		//		Number of hash marks to generate
		count: 3,

		// container: String
		//		For HorizontalSlider, this is either "topDecoration" or "bottomDecoration",
		//		and indicates whether this rule goes above or below the slider.
		container: "containerNode",

		// ruleStyle: String
		//		CSS style to apply to individual hash marks
		ruleStyle: "",

		_positionPrefix: '<div class="dijitRuleMark dijitRuleMarkH" style="left:',
		_positionSuffix: '%;',
		_suffix: '"></div>',

		_genHTML: function(pos){
			return this._positionPrefix + pos + this._positionSuffix + this.ruleStyle + this._suffix;
		},

		// _isHorizontal: [protected extension] Boolean
		//		VerticalRule will override this...
		_isHorizontal: true,

		buildRendering: function(){
			this.inherited(arguments);

			var innerHTML;
			if(this.count == 1){
				innerHTML = this._genHTML(50, 0);
			}else{
				var i;
				var interval = 100 / (this.count - 1);
				if(!this._isHorizontal || this.isLeftToRight()){
					innerHTML = this._genHTML(0, 0);
					for(i = 1; i < this.count - 1; i++){
						innerHTML += this._genHTML(interval * i, i);
					}
					innerHTML += this._genHTML(100, this.count - 1);
				}else{
					innerHTML = this._genHTML(100, 0);
					for(i = 1; i < this.count - 1; i++){
						innerHTML += this._genHTML(100 - interval * i, i);
					}
					innerHTML += this._genHTML(0, this.count - 1);
				}
			}
			this.domNode.innerHTML = innerHTML;
		}
	});
});
