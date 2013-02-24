define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/_base/window",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/_base/array",
	"dojo/query",
	"dojo/when",
	"dijit/registry",
	"./_Container"
], function(declare, lang, has, win, dom, domconstruct, array, query, when, registry, _Container){

	return declare("dojox.mvc.Repeat", _Container, {
		// summary:
		//		A model-bound container which binds to a collection within a data model
		//		and produces a repeating user-interface from a template for each
		//		iteration within the collection.
		//
		// description:
		//		A repeat is bound to an intermediate dojo/Stateful node corresponding
		//		to an array in the data model. Child dijits or custom view components
		//		inside it inherit their parent data binding context from it.

		// index: Integer
		//		An index used to track the current iteration when the repeating UI is
		//		produced. This may be used to parameterize the content in the repeat
		//		template for the current iteration.
		//
		//		For example, consider a collection of search or query results where
		//		each item contains a "Name" property used to prime the "Results" data
		//		model. Then, the following CRUD-style UI displays all the names in
		//		the search results in text boxes where they may be updated or such.
		//
		//		|	<div dojoType="dojox/mvc/Repeat" ref="Results">
		//		|		<div class="row" dojoType="dojox/mvc/Group" ref="${this.index}">
		//		|			<label for="nameInput${this.index}">Name:</label>
		//		|			<input dojoType="dijit/form/TextBox" id="nameInput${this.index}" ref="'Name'"></input>
		//		|		</div>
		//		|	</div>
		index : 0,

		// useParent: String
		//		id of the DOM node to use as the parent for the repeating items, similar to useParentId processed a little differently 
		useParent : "",
		
		// removeRepeatNode: boolean
		//		When true the dom node for the Repeat and Groups within the Repeat
		//		will be removed, their children will be placed into the parent node 
		//		of the Repeat node.  This should be set to true when working with 
		//		a Repeat inside of a dojox.mobile list.		
		removeRepeatNode : false,

		// children: dojox/mvc/StatefulArray
		//		The array of data model that is used to render child nodes.
		children: null,

		// _relTargetProp: String
		//		The name of the property that is used by child widgets for relative data binding.
		_relTargetProp : "children",

		startup: function(){
			// This code needed for ticket 14423 is using removeRepeatNode to work with mobile.lists
			// this.select and this.onCheckStateChanged are called by ListItem so they need to be set
			// but it seems like a bit of a hack.
			if(this.removeRepeatNode){				
				var parent = null;
				if(lang.isFunction(this.getParent)){
					if(this.getParent()){
						this.select = this.getParent().select;
						this.onCheckStateChanged = this.getParent().onCheckStateChanged;
					}
				}			
			}

			this.inherited(arguments);
			this._setChildrenAttr(this.children);
		},

		// summary:
		//		Override and save template from body.
		postscript: function(params, srcNodeRef){
			//this.srcNodeRef = dom.byId(srcNodeRef);
			if(this.useParent && dom.byId(this.useParent)){
				this.srcNodeRef = dom.byId(this.useParent);				
			} else{
				this.srcNodeRef = dom.byId(srcNodeRef);
			}
			if(this.srcNodeRef){
				var prop = this._attachTemplateNodes ? "inlineTemplateString" : "templateString";
				if(this[prop] == ""){ // only overwrite templateString if it has not been set
					this[prop] = this.srcNodeRef.innerHTML;
				}
				try{
					this.srcNodeRef.innerHTML = "";
				}catch(e){
					while(this.srcNodeRef.firstChild){ this.srcNodeRef.removeChild(this.srcNodeRef.firstChild); }
				}

			}
			this.inherited(arguments);
		},

		////////////////////// PRIVATE METHODS ////////////////////////

		_setChildrenAttr: function(/*dojo/Stateful*/ value){
			// summary:
			//		Handler for calls to set("children", val).
			// description:
			//		Sets "ref" property so that child widgets can refer to, and then rebuilds the children.

			var children = this.children;
			this._set("children", value);
			// this.binding is the resolved ref, so not matching with the new value means change in repeat target.
			if(this.binding != value){
				this.set("ref", value);
			}
			if(this._started && (!this._builtOnce || children != value)){
				this._builtOnce = true;
				this._buildContained(value);
			}
		},

		_buildContained: function(/*dojox/mvc/StatefulArray*/ children){
			// summary:
			//		Destroy any existing contained view, recreate the repeating UI
			//		markup and parse the new contents.
			// children: dojox/mvc/StatefulArray
			//		The array of child widgets.
			// tags:
			//		private

			if(!children){ return; }

			// TODO: Potential optimization: only create new widgets for insert, only destroy for delete.
			if(this.useParent && dom.byId(this.useParent)){
				this.srcNodeRef = dom.byId(this.useParent);				
			}

			this._destroyBody();
			this._updateAddRemoveWatch(children);

			var insert = [], prop = this._attachTemplateNodes ? "inlineTemplateString" : "templateString";
			for(this.index = 0; lang.isFunction(children.get) ? children.get(this.index) : children[this.index]; this.index++){
				insert.push(this._exprRepl(this[prop]));
			}

			var repeatNode = this.containerNode || this.srcNodeRef || this.domNode;
			if(has("ie") && /^(table|tbody)$/i.test(repeatNode.tagName)){
				var div = win.doc.createElement("div");
				div.innerHTML = "<table><tbody>" + insert.join("") + "</tbody></table>";
				for(var tbody = div.getElementsByTagName("tbody")[0]; tbody.firstChild;){
					repeatNode.appendChild(tbody.firstChild);
				}
			}else if(has("ie") && /^td$/i.test(repeatNode.tagName)){
				var div = win.doc.createElement("div");
				div.innerHTML = "<table><tbody><tr>" + insert.join("") + "</tr></tbody></table>";
				for(var tr = div.getElementsByTagName("tr")[0]; tr.firstChild;){
					repeatNode.appendChild(tr.firstChild);
				}
			}else{
				repeatNode.innerHTML = insert.join("");
			}

			// srcNodeRef is used in _createBody, so in the programmatic create case where repeatNode was set  
			// from this.domNode we need to set srcNodeRef from repeatNode
			this.srcNodeRef = repeatNode;

			var _self = this;

			when(this._createBody(), function(){
				if(!_self.removeRepeatNode){ return; }
				
				var repeatnode = _self.domNode;
				if(!_self.savedParentId && _self.domNode.parentNode && _self.domNode.parentNode.id){
					_self.savedParentId = _self.domNode.parentNode.id;
				}
				var repeatParent = dom.byId(_self.savedParentId);			
				if(repeatnode && repeatnode.children){
					var t3 = registry.findWidgets(repeatnode);
					var parentcnt = t3.length;
					for(var j = parentcnt;j > 0;j--){
						if(t3[j-1].declaredClass == "dojox.mvc.Group"){
							var cnt = repeatnode.children[j-1].children.length;
							var selForList = registry.byId(repeatParent.id).select;
							for(var i = cnt;i > 0;i--){
								registry.byId(repeatnode.children[j-1].id).select = selForList;
								domconstruct.place(repeatnode.children[j-1].removeChild(repeatnode.children[j-1].children[i-1]), repeatParent, "first");
							}							
						}else{
							domconstruct.place(repeatnode.removeChild(repeatnode.children[j-1]), repeatParent, "first");							
						}
					}
					domconstruct.destroy(repeatnode);
				}
			});
		},

		_updateAddRemoveWatch: function(/*dojo/Stateful*/ children){
			// summary:
			//		Updates the watch handle when binding changes.
			// children: dojo/Stateful
			//		The array of child widgets.
			// tags:
			//		private
			if(this._addRemoveWatch){
				this._addRemoveWatch.unwatch();
			}
			var pThis = this;
			this._addRemoveWatch = lang.isFunction(children.watchElements) && children.watchElements(function(idx, removals, adds){
				if(!removals || !adds || removals.length || adds.length){
					pThis._buildContained(pThis.children);
				}
			});
		}
	});
});
