define([
	"dojo/_base/declare",
	"dojo/dom",
	"./_Container"
], function(declare, dom, _Container){
	/*=====
		declare = dojo.declare;
		dom = dojo.dom;
		_Container = dojox.mvc._Container;
	=====*/

	return declare("dojox.mvc.Repeat", [_Container], {
		// summary:
		//		A model-bound container which binds to a collection within a data model
		//		and produces a repeating user-interface from a template for each
		//		iteration within the collection.
		//
		// description:
		//		A repeat is bound to an intermediate dojo.Stateful node corresponding
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
		//		|	<div dojoType="dojox.mvc.Repeat" ref="Results">
		//		|		<div class="row" dojoType="dojox.mvc.Group" ref="${this.index}">
		//		|			<label for="nameInput${this.index}">Name:</label>
		//		|			<input dojoType="dijit.form.TextBox" id="nameInput${this.index}" ref="'Name'"></input>
		//		|		</div>
		//		|	</div>
		index : 0,

		// summary:
		//		Override and save template from body.
		postscript: function(params, srcNodeRef){
			this.srcNodeRef = dom.byId(srcNodeRef);
			if(this.srcNodeRef){
				if(this.templateString == ""){ // only overwrite templateString if it has not been set
					this.templateString = this.srcNodeRef.innerHTML;
				}
				this.srcNodeRef.innerHTML = "";
			}
			this.inherited(arguments);
		},

		////////////////////// PRIVATE METHODS ////////////////////////

		_updateBinding: function(name, old, current){
			// summary:
			//		Rebuild repeating UI if data binding changes.
			// tags:
			//		private
			this.inherited(arguments);
			this._buildContained();
		},

		_buildContained: function(){
			// summary:
			//		Destroy any existing contained view, recreate the repeating UI
			//		markup and parse the new contents.
			// tags:
			//		private

			// TODO: Potential optimization: only create new widgets for insert, only destroy for delete.
			this._destroyBody();
			this._updateAddRemoveWatch();

			var insert = "";
			for(this.index = 0; this.get("binding").get(this.index); this.index++){
				insert += this._exprRepl(this.templateString);
			}
			var repeatNode = this.srcNodeRef || this.domNode;
			repeatNode.innerHTML = insert;

			// srcNodeRef is used in _createBody, so in the programmatic create case where repeatNode was set  
			// from this.domNode we need to set srcNodeRef from repeatNode
			this.srcNodeRef = repeatNode;

			this._createBody();
		},

		_updateAddRemoveWatch: function(){
			// summary:
			//		Updates the watch handle when binding changes.
			// tags:
			//		private
			if(this._addRemoveWatch){
				this._addRemoveWatch.unwatch();
			}
			var pThis = this;
			this._addRemoveWatch = this.get("binding").watch(function(name,old,current){
				if(/^[0-9]+$/.test(name.toString())){
					if(!old || !current){
						pThis._buildContained();
					} // else not an insert or delete, will get updated in above
				}
			});
		}
	});
});
