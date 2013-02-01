define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"./getPlainValue",
	"./EditStoreRefController",
	"./ListController"
], function(declare, lang, getPlainValue, EditStoreRefController, ListController){
	return declare("dojox.mvc.EditStoreRefListController", [EditStoreRefController, ListController], {
		// summary:
		//		A child class of dojox/mvc/EditStoreRefController, mixed with ListController.
		// description:
		//		It supports Lists in addition to what dojox/mvc/EditStoreRefController does.
		//		NOTE - If this class is used with a widget by data-dojo-mixins, make sure putting the widget in data-dojo-type and putting this class to data-dojo-mixins.
		// example:
		//		The check box refers to "value" property in the controller (with "ctrl" ID).
		//		The controller provides the "value" property, from the data coming from data store ("store" property in the controller), using the first one in array.
		//		Two seconds later, the check box changes from unchecked to checked.
		//		The change is committed to the data store, which is reflected to dojo/store/Observable callback. 
		// |		<html>
		// |			<head>
		// |				<script src="/path/to/dojo-toolkit/dojo/dojo.js" type="text/javascript" data-dojo-config="parseOnLoad: 0"></script>
		// |				<script type="text/javascript">
		// |					require([
		// |						"dojo/dom", "dojo/parser", "dojo/store/Observable", "dojo/store/Memory", "dijit/registry",
		// |						"dijit/form/CheckBox", "dojox/mvc/EditStoreRefListController", "dojox/mvc/ListController", "dojo/domReady!"
		// |					], function(ddom, parser, Observable, Memory, registry){
		// |						store = Observable(new Memory({data: [{id: "Foo", value: false}]}));
		// |						parser.parse();
		// |						registry.byId("ctrl").queryStore().observe(function(object, previousIndex, newIndex){
		// |							alert("ID: " + object.id + ", value: " + object.value);
		// |						}, true);
		// |						var count = 0;
		// |						var h = setInterval(function(){
		// |							ddom.byId("check").click();
		// |							registry.byId("ctrl").commit();
		// |							if(++count >= 2){ clearInterval(h); }
		// |						}, 2000);
		// |					});
		// |				</script>
		// |			</head>
		// |			<body>
		// |				<script type="dojo/require">at: "dojox/mvc/at"</script>
		// |				<span id="ctrl" data-dojo-type="dojox/mvc/EditStoreRefListController" 
		// |				 data-dojo-props="store: store, cursorIndex: 0"></span>
		// |				<input id="check" type="checkbox" data-dojo-type="dijit/form/CheckBox" data-dojo-props="checked: at('widget:ctrl', 'value')">
		// |			</body>
		// |		</html>

		commitCurrent: function(){
		// summary:
		//		Send the change back to the data source for the current index.

			var id = this.cursor[this.idProperty];
			for(var i = 0; i < this.originalModel.length; i++){
				if(this.originalModel[i][this.idProperty] == id){
					this.originalModel.set(i, this.cloneModel(this.cursor));
					break;
				}
			}
			this.store.put(this.cursor);
		}

	});
});
