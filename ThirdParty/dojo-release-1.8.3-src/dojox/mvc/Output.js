define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom",
	"dijit/_WidgetBase",
	"dojo/regexp"
], function(declare, lang, dom, _WidgetBase, regexp){

	return declare("dojox.mvc.Output", _WidgetBase, {
		// summary:
		//		A simple widget that displays templated output, parts of which may
		//		be data-bound.
		//
		// description:
		//		Simple output example:
		//
		//		|  <span data-dojo-type="dojox/mvc/Output" data-dojo-props="value: at(model, 'balance')"></span>
		//
		//		Another simple output example:
		//
		//		|  <span data-dojo-type="dojox/mvc/Output" data-dojo-props="value: at(model, 'balance')">
		//		|    Your balance is: ${this.value}
		//		|  </span>
		//
		//
		//		The output widget being data-bound, if the balance changes in the
		//		model, the content within the `<span>` will be
		//		updated accordingly.

		// exprchar:  Character
		//		Character to use for a substitution expression, for a substitution string like ${this.value}
		exprchar: '$',
	
		// templateString: [private] String
		//		The template or data-bound output content.
		templateString : "",
	
		postscript: function(params, srcNodeRef){
			// summary:
			//		Override and save template from body.
			this.srcNodeRef = dom.byId(srcNodeRef);
			if(this.srcNodeRef){
				this.templateString = this.srcNodeRef.innerHTML;
				this.srcNodeRef.innerHTML = "";
			}
			this.inherited(arguments);
		},
	
		set: function(name, value){
			// summary:
			//		Override and refresh output on value change.
			// name:
			//		The property to set.
			// value:
			//		The value to set in the property.
			this.inherited(arguments);
			if(name === "value"){
				this._output();
			}
		},
	
		////////////////////// PRIVATE METHODS ////////////////////////
	
		_updateBinding: function(name, old, current){
			// summary:
			//		Rebuild output UI if data binding changes.
			// tags:
			//		private
			this.inherited(arguments);
			this._output();
		},
	
		_output: function(){
			// summary:
			//		Produce the data-bound output.
			// tags:
			//		private
			var outputNode = this.srcNodeRef || this.domNode;
			outputNode.innerHTML = this.templateString ? this._exprRepl(this.templateString) : this.value;
		},
	
		_exprRepl: function(tmpl){
			// summary:
			//		Does substitution of ${foo+bar} type expressions in template string.
			// tags:
			//		private
			var pThis = this, transform = function(value, key){
				if(!value){return "";}
				var exp = value.substr(2);
				exp = exp.substr(0, exp.length - 1);
				with(pThis){
					var val = eval(exp);
					return (val || val == 0 ? val : "");
				}
			};
			transform = lang.hitch(this, transform);
			return tmpl.replace(new RegExp(regexp.escapeString(this.exprchar)+"(\{.*?\})","g"),
				function(match, key, format){
					return transform(match, key).toString();
				});
		}
	});
});
