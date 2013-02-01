define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/when",
	"dijit/_WidgetBase",
	"dojo/regexp"
], function(declare, lang, when, _WidgetBase, regexp){

	return declare("dojox.mvc._Container", _WidgetBase, {
	
		// stopParser: [private] Boolean
		//		Flag to parser to not try and parse widgets declared inside the container.
		stopParser: true,

		// exprchar:  Character
		//		Character to use for a substitution expression, for a substitution string like ${this.index}
		exprchar: '$',
	
		// templateString: [private] String
		//		The template or content for this container. It is usually obtained from the
		//		body of the container and may be modified or repeated over a collection/array.
		//		In this simple implementation, attach points, attach events and WAI
		//		attributes are not supported in the template.
		templateString : "",
	
		// inlineTemplateString: [private] String
		//		Same as templateString. Used when this widget is mixed with a regular templated widget.
		inlineTemplateString : "",

		// _containedWidgets: [protected] dijit/_Widget[]
		//		The array of contained widgets at any given point in time within this container.
		_containedWidgets : [],
	
		////////////////////// PROTECTED METHODS ////////////////////////
	
		_parser : null,
		
		_createBody: function(){
			// summary:
			//		Parse the body of this MVC container widget.
			// description:
			//		The bodies of MVC containers may be model-bound views generated dynamically.
			//		Parse the body, start an contained widgets and attach template nodes for
			//		contained widgets as necessary.
			// tags:
			//		protected
			if(!this._parser){
				try{
					// returns dojo/parser if loaded, otherwise throws
					this._parser = require("dojo/parser");
				}catch(e){
					// if here, dojo/parser not loaded
					try{
						// returns dojox/mobile/parser if loaded, otherwise throws
						this._parser = require("dojox/mobile/parser");
					}catch(e){
						// if here, both dojox/mobile/parser and dojo/parser are not loaded
						console.error("Add explicit require(['dojo/parser']) or explicit require(['dojox/mobile/parser']), one of the parsers is required!");
					}
				}
			}

			var _self = this;

			if(this._parser){
				return when(this._parser.parse(this.srcNodeRef,{
					template: true,
					inherited: {dir: this.dir, lang: this.lang},
					propsThis: this,
					scope: "dojo"
				}), function(widgets){
					_self._containedWidgets = widgets;
				});
			}
		},
	
		_destroyBody: function(){
			// summary:
			//		Destroy the body of this MVC container widget. Also destroys any
			//		contained widgets.
			// tags:
			//		protected
			if(this._containedWidgets && this._containedWidgets.length > 0){
				for(var n = this._containedWidgets.length - 1; n > -1; n--){
					var w = this._containedWidgets[n];
					if(w && !w._destroyed && w.destroy){
						w.destroy();
					}
				}
			}
		},
	
		////////////////////// PRIVATE METHODS ////////////////////////

		_exprRepl: function(tmpl){
			// summary:
			//		Does substitution of ${foo+bar} type expressions in template string.
			// tags:
			//		private
			var pThis = this, transform = function(value, key){
				if(!value){return "";}
				var exp = value.substr(2);
				exp = exp.substr(0, exp.length - 1);
				with(pThis){return eval(exp);}
			};
			transform = lang.hitch(this, transform);
			return tmpl.replace(new RegExp(regexp.escapeString(this.exprchar)+"(\{.*?\})","g"),
				function(match, key, format){
					return transform(match, key).toString();
				});
		}
	});
});
