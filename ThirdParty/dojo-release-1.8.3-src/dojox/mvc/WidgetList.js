define([
	"require",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"dojox/mvc/Templated"
], function(require, array, lang, declare, _Container, _WidgetBase, Templated){
	var childTypeAttr = "data-mvc-child-type",
	 childMixinsAttr = "data-mvc-child-mixins",
	 childParamsAttr = "data-mvc-child-props",
	 childBindingsAttr = "data-mvc-child-bindings",
	 undef;

	function evalParams(params){
		return eval("({" + params + "})");
	}

	function unwatchElements(/*dojox/mvc/WidgetList*/ w){
		for(var h = null; h = (w._handles || []).pop();){
			h.unwatch();
		}
	}

	var WidgetList = declare("dojox.mvc.WidgetList", [_WidgetBase, _Container], {
		// summary:
		//		A widget that creates child widgets repeatedly based on the children attribute (the repeated data) and childType/childMixins/childParams attributes (determines how to create each child widget).
		// example:
		//		Create multiple instances of dijit/TextBox based on the data in array.
		//		The text box refers to First property in the array item.
		// |		<div data-dojo-type="dojox/mvc/WidgetList"
		// |		 data-dojo-props="children: array"
		// |		 data-mvc-child-type="dijit/form/TextBox"
		// |		 data-mvc-child-props="value: at(this.target, 'First')"></div>
		// example:
		//		Create multiple instances of widgets-in-template based on the HTML written in `<script type="dojox/mvc/InlineTemplate">`.
		//		The label refers to Serial property in the array item, and the text box refers to First property in the array item.
		// |		<div data-dojo-type="dojox/mvc/WidgetList"
		// |		 data-dojo-mixins="dojox/mvc/_InlineTemplateMixin"
		// |		 data-dojo-props="children: array">
		// |			<script type="dojox/mvc/InlineTemplate">
		// |				<div>
		// |					<span data-dojo-type="dijit/_WidgetBase"
		// |					 data-dojo-props="_setValueAttr: {node: 'domNode', type: 'innerText'}, value: at('rel:', 'Serial')"></span>: 
		// |					<span data-dojo-type="dijit/form/TextBox"
		// |					 data-dojo-props="value: at('rel:', 'First')"></span>
		// |				</div>
		// |			</script>
		// |		</div>
		// example:
		//		Programmatically create multiple instances of widgets-in-template based on the HTML stored in childTemplate.
		//		(childTemplate may come from dojo/text)
		//		Also programmatically establish data binding at child widget's startup phase.
		//		The label refers to Serial property in the array item, and the text box refers to First property in the array item.
		// |		var childTemplate = '<div>'
		// |		 + '<span data-dojo-type="dijit/_WidgetBase"'
		// |		 + ' data-dojo-attach-point="labelNode"'
		// |		 + ' data-dojo-props="_setValueAttr: {node: \'domNode\', type: \'innerText\'}"></span>'
		// |		 + '<span data-dojo-type="dijit/form/TextBox"'
		// |		 + ' data-dojo-attach-point="inputNode"></span>'
		// |		 + '</div>';
		// |		(new WidgetList({
		// |			children: array,
		// |			childParams: {
		// |				startup: function(){
		// |					this.labelNode.set("value", at("rel:", "Serial"));
		// |					this.inputNode.set("value", at("rel:", "First"));
		// |					this.inherited("startup", arguments);
		// |				}
		// |			},
		// |			templateString: childTemplate
		// |		}, dom.byId("programmaticRepeat"))).startup();
		// example:
		//		Using the same childTemplate above, establish data binding for child widgets based on the declaration in childBindings.
		//		(childBindings may come from dojo/text, by eval()'ing the text)
		// |		var childBindings = {
		// |			labelNode: {value: at("rel:", "Serial")},
		// |			inputNode: {value: at("rel:", "First")}
		// |		};
		// |		(new WidgetList({
		// |			children: array,
		// |			templateString: childTemplate,
		// |			childBindings: childBindings
		// |		}, dom.byId("programmaticRepeatWithSeparateBindingDeclaration"))).startup();

		// childClz: Function
		//		The class of the child widget. Takes precedence over childType/childMixins.
		childClz: null,

		// childType: String
		//		The module ID of child widget. childClz takes precedence over this/childMixins.
		//		Can be specified via data-mvc-child-type attribute of widget declaration.
		childType: "",

		// childMixins: String
		//		The list of module IDs, separated by comma, of the classes that will be mixed into child widget. childClz takes precedence over childType/this.
		//		Can be specified via data-mvc-child-mixins attribute of widget declaration.
		childMixins: "",

		// childParams: Object
		//		The mixin properties for child widget.
		//		Can be specified via data-mvc-child-props attribute of widget declaration.
		//		"this" in data-mvc-child-props will have the following properties:
		//
		//		- parent - This widget's instance.
		//		- target - The data item in children.
		childParams: null,

		// childBindings: Object
		//		Data bindings for child widget.
		childBindings: null,

		// children: dojox/mvc/StatefulArray
		//		The array of data model that is used to render child nodes.
		children: null,

		// templateString: String
		//		The template string for each child items. templateString in child widgets take precedence over this.
		templateString: "",

		// partialRebuild: Boolean
		//		If true, only rebuild repeat items for changed elements. Otherwise, rebuild everything if there is a change in children.
		partialRebuild: false,

		// _relTargetProp: String
		//		The name of the property that is used by child widgets for relative data binding.
		_relTargetProp : "children",

		postMixInProperties: function(){
			this.inherited(arguments);
			if(this[childTypeAttr]){
				this.childType = this[childTypeAttr];
			}
			if(this[childMixinsAttr]){
				this.childMixins = this[childMixinsAttr];
			}
		},

		startup: function(){
			this.inherited(arguments);
			this._setChildrenAttr(this.children);
		},

		_setChildrenAttr: function(/*dojo/Stateful*/ value){
			// summary:
			//		Handler for calls to set("children", val).

			var children = this.children;
			this._set("children", value);
			if(this._started && (!this._builtOnce || children != value)){
				unwatchElements(this);
				this._builtOnce = true;
				this._buildChildren(value);
				if(lang.isArray(value)){
					var _self = this;
					!this.partialRebuild && lang.isFunction(value.watchElements) && (this._handles = this._handles || []).push(value.watchElements(function(idx, removals, adds){
						_self._buildChildren(value);
					}));
					value.watch !== {}.watch && (this._handles = this._handles || []).push(value.watch(function(name, old, current){
						if(!isNaN(name)){
							var w = _self.getChildren()[name - 0];
							w && w.set(w._relTargetProp || "target", current);
						}
					}));
				}
			}
		},

		_buildChildren: function(/*dojox/mvc/StatefulArray*/ children){
			// summary:
			//		Create child widgets upon children and inserts them into the container node.

			for(var cw = this.getChildren(), w = null; w = cw.pop();){ this.removeChild(w); w.destroy(); }
			if(!lang.isArray(children)){ return; }

			var createAndWatch = lang.hitch(this, function(seq){
				if(this._buildChildrenSeq > seq){ return; } // If newer _buildChildren call comes during lazy loading, bail
				var clz = declare([].slice.call(arguments, 1), {}),
				 _self = this;
				function create(children, startIndex){
					array.forEach(array.map(children, function(child, idx){
						var params = {
							ownerDocument: _self.ownerDocument,
							parent: _self,
							indexAtStartup: startIndex + idx // Won't be updated even if there are removals/adds of repeat items after startup
						};
						params[(_self.childParams || _self[childParamsAttr] && evalParams.call(params, _self[childParamsAttr]) || {})._relTargetProp || clz.prototype._relTargetProp || "target"] = child;

						var childParams = _self.childParams || _self[childParamsAttr] && evalParams.call(params, _self[childParamsAttr]),
						 childBindings = _self.childBindings || _self[childBindingsAttr] && evalParams.call(params, _self[childBindingsAttr]);
						if(_self.templateString && !params.templateString && !clz.prototype.templateString){ params.templateString = _self.templateString; }
						if(childBindings && !params.bindings && !clz.prototype.bindings){ params.bindings = childBindings; }
						return new clz(lang.mixin(params, childParams));
					}), function(child, idx){
						_self.addChild(child, startIndex + idx);
					});
				}
				create(children, 0);
				if(this.partialRebuild){
					lang.isFunction(children.watchElements) && (this._handles = this._handles || []).push(children.watchElements(function(idx, removals, adds){
						for(var i = 0, l = (removals || []).length; i < l; ++i){
							_self.removeChild(idx);
						}
						create(adds, idx);
					}));
				}
			}, this._buildChildrenSeq = (this._buildChildrenSeq || 0) + 1);

			if(this.childClz){
				createAndWatch(this.childClz);
			}else if(this.childType){
				var types = [this.childType].concat(this.childMixins && this.childMixins.split(",") || []),
				 mids = array.filter(array.map(types, function(type){ return lang.getObject(type) ? undef : type; }), function(mid){ return mid !== undef; }),
				 _self = this;
				require(mids, function(){
					if(!_self._beingDestroyed){
						createAndWatch.apply(this, array.map(types, function(type){ return lang.getObject(type) || require(type); }));
					}
				});
			}else{
				createAndWatch(Templated);
			}
		},

		destroy: function(){
			unwatchElements(this);
			this.inherited(arguments);
		}
	});

	WidgetList.prototype[childTypeAttr] = WidgetList.prototype[childMixinsAttr] = WidgetList.prototype[childParamsAttr] = WidgetList.prototype[childBindingsAttr] = ""; // Let parser treat these attributes as string
	return WidgetList;
});
