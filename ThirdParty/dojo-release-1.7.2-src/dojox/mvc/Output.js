define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom",
	"dijit/_WidgetBase"
], function(declare, lang, dom, _WidgetBase){
	/*=====
		declare = dojo.declare;
		dom = dojo.dom;
		_WidgetBase = dijit._WidgetBase;
	=====*/

	return declare("dojox.mvc.Output", [_WidgetBase], {
		// summary:
		//		A simple widget that displays templated output, parts of which may
		//		be data-bound.
		//
		// description:
		//		Simple output example:
		//
		//		|  <span dojoType="dojox.mvc.Output" ref="model.balance">
		//		|    Your balance is: ${this.value}
		//		|  </span>
		//
		//		The output widget being data-bound, if the balance changes in the
		//		dojox.mvc.StatefulModel, the content within the <span> will be
		//		updated accordingly.
	
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
				with(pThis){return eval(exp) || "";}
			};
			transform = lang.hitch(this, transform);
			return tmpl.replace(/\$\{.*?\}/g,
				function(match, key, format){
					return transform(match, key).toString();
				});
		}
	});
});
