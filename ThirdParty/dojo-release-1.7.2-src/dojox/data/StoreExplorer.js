dojo.provide("dojox.data.StoreExplorer");
dojo.require("dojox.grid.DataGrid");
dojo.require("dojox.data.ItemExplorer");
dojo.require("dijit.layout.BorderContainer");
dojo.require("dijit.layout.ContentPane");

dojo.declare("dojox.data.StoreExplorer", dijit.layout.BorderContainer, {
	constructor: function(options){
		dojo.mixin(this, options);
	},
	store: null,
	columnWidth: '',
	stringQueries: false,
	showAllColumns: false,
	postCreate: function(){
		var self = this;
		this.inherited(arguments);
		var contentPane = new dijit.layout.ContentPane({
			region:'top'
		}).placeAt(this);
		function addButton(name, action){
			var button = new dijit.form.Button({label: name});
			contentPane.containerNode.appendChild(button.domNode);
			button.onClick = action;
			return button;
		}
		var queryText = contentPane.containerNode.appendChild(document.createElement("span"));
		queryText.innerHTML = "Enter query: &nbsp;";
		queryText.id = "queryText";
		var queryTextBox = contentPane.containerNode.appendChild(document.createElement("input"));
		queryTextBox.type = "text";
		queryTextBox.id = "queryTextBox";
		addButton("Query",function(){
			var query = queryTextBox.value;
			self.setQuery(self.stringQueries ? query : dojo.fromJson(query));
		});
		contentPane.containerNode.appendChild(document.createElement("span")).innerHTML = "&nbsp;&nbsp;&nbsp;";
		var createNewButton = addButton("Create New", dojo.hitch(this, "createNew"));
		var deleteButton = addButton("Delete",function(){
			var items = grid.selection.getSelected();
			for(var i = 0; i < items.length; i++){
				self.store.deleteItem(items[i]);
			}
		});
		this.setItemName = function(name){
			createNewButton.attr('label',"<img style='width:12px; height:12px' src='" + dojo.moduleUrl("dijit.themes.tundra.images","dndCopy.png") + "' /> Create New " + name);
			deleteButton.attr('label',"Delete " + name);
		};
		addButton("Save",function(){
			self.store.save({onError:function(error){
				alert(error);
			}});
			//refresh the tree
			self.tree.refreshItem();
		});
		addButton("Revert",function(){
			self.store.revert();
		});
		addButton("Add Column", function(){
			var columnName = prompt("Enter column name:","property");
			if(columnName){
				self.gridLayout.push({
						field: columnName,
						name: columnName,
						formatter: dojo.hitch(self,"_formatCell"),
						editable: true
					});
				self.grid.attr("structure",self.gridLayout);
			}
		});
		var centerCP = new dijit.layout.ContentPane({
			region:'center'
		}).placeAt(this);
		var grid = this.grid = new dojox.grid.DataGrid(
				{store: this.store}
			);
		centerCP.attr("content", grid);
		grid.canEdit = function(inCell, inRowIndex){
			var value = this._copyAttr(inRowIndex, inCell.field);
			return !(value && typeof value == 'object') || value instanceof Date;
		}

		var trailingCP = new dijit.layout.ContentPane({
			region: 'trailing',
			splitter: true,
			style: "width: 300px"
		}).placeAt(this);

		var tree = this.tree = new dojox.data.ItemExplorer({
			store: this.store}
			);
		trailingCP.attr("content", tree);

		dojo.connect(grid, "onCellClick", function(){
			var selected = grid.selection.getSelected()[0];
			tree.setItem(selected);
		});

		this.gridOnFetchComplete = grid._onFetchComplete;
		this.setStore(this.store);
	},
	setQuery: function(query, options){
		this.grid.setQuery(query, options);
	},
	_formatCell: function(value){
		if(this.store.isItem(value)){
			return this.store.getLabel(value) || this.store.getIdentity(value);
		}
		return value;
	},
	setStore: function(store){
		this.store = store;
		var self = this;
		var grid = this.grid;
		grid._pending_requests[0] = false;
		function formatCell(value){
			return self._formatCell(value);
		}
		var defaultOnComplete = this.gridOnFetchComplete;
		grid._onFetchComplete = function(items, req){
			var layout = self.gridLayout = [];
			var column, key, item, i, j, k, idAttributes = store.getIdentityAttributes();
			for(i = 0; i < idAttributes.length; i++){
				key = idAttributes[i];
				layout.push({
					field: key,
					name: key,
					_score: 100,
					formatter: formatCell,
					editable: false
				});

			}
			for(i=0; item = items[i++];){
				var keys = store.getAttributes(item);
				for(k=0; key = keys[k++];){
					var found = false;
					for(j=0; column = layout[j++];){
						if(column.field == key){
							column._score++;
							found = true;
							break;
						}
					}
					if(!found){
						layout.push({
							field: key,
							name: key,
							_score: 1,
							formatter: formatCell,
							styles: "white-space:nowrap; ",
							editable: true
						});
					}
				}
			}
			layout = layout.sort(function(a, b){
				return  b._score - a._score;
			});
			if(!self.showAllColumns){
				for(j=0; column=layout[j]; j++){
					if(column._score < items.length/40 * j) {
						layout.splice(j, layout.length-j);
						break;
					}
				}
			}
			for(j=0; column = layout[j++];){
				column.width=self.columnWidth || Math.round(100/layout.length) + '%';
			}
			grid._onFetchComplete = defaultOnComplete;
			grid.attr("structure",layout);
			var retValue = defaultOnComplete.apply(this, arguments);

		}
 		grid.setStore(store);
 		this.queryOptions = {cache:true};
		this.tree.setStore(store);
	},
	createNew: function(){
		var props = prompt("Enter any properties (in JSON literal form) to put in the new item (passed to the newItem constructor):","{ }");
		if(props){
			try{
				this.store.newItem(dojo.fromJson(props));
			}catch(e){
				alert(e);
			}

		}
	}
});
