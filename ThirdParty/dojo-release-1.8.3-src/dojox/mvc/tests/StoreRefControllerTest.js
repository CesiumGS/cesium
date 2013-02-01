define([
	"doh",
	"dojo/_base/array",
	"dojo/_base/config",
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/_Container",
	"dijit/form/TextBox",
	"dojox/mvc/at",
	"dojox/mvc/getStateful",
    "dojox/mvc/EditStoreRefListController",	
    "dojo/store/Memory",
    "dojo/when",
	"dojox/mvc/WidgetList",
	"dojo/text!dojox/mvc/tests/test_WidgetList_WidgetListInTemplate.html",
	"dojo/text!dojox/mvc/tests/test_WidgetList_childTemplate.html",
	"dojo/text!dojox/mvc/tests/test_WidgetList_childBindings.json"
], function(doh, array, config, declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _Container, 
	_TextBox, at, getStateful, EditStoreRefListController, Memory, when, WidgetList, template, childTemplate, childBindings){
    var data = {
        "identifier": "Serial",
        "items": [
            {
                "Serial"  : "A111",
                "First"   : "Anne",
                "Last"    : "Ackerman",
                "Email"   : "a.a@test.com"
            },
            {
                "Serial"  : "B111",
                "First"   : "Ben",
                "Last"    : "Beckham",
                "Email"   : "b.b@test.com"
            },
            {
                "Serial"  : "I111",
                "First"   : "Irene",
                "Last"    : "Ira",
                "Email"   : "i.i@test.com"
            },
            {
                "Serial"  : "J111",
                "First"   : "John",
                "Last"    : "Jacklin",
                "Email"   : "j.j@test.com"
            }
        ]
    };


	ctrl = new EditStoreRefListController({
		store : new Memory({
			data : data
		})
	});
	when(ctrl.getStore("A111"), function(value) {
		doh.register("dojox.mvc.tests.StoreRefControllerTest", [
			function getStore(){
				doh.is(value.Serial, "A111", "Serial should be set");
				doh.is(value.First, "Anne", "First should be set");
				doh.is(value.Last, "Ackerman", "Last should be set");
				doh.is(value.Email, "a.a@test.com", "Email should be set");
			},
			function queryStore(){
				when(ctrl.queryStore(), function(results) {
					doh.is(results[0].Serial, "A111", "Serial should be set");
					doh.is(results[0].First, "Anne", "First should be set");
					doh.is(results[0].Last, "Ackerman", "Last should be set");
					doh.is(results[0].Email, "a.a@test.com", "Email should be set");
				});
			},
			function addStore(){
				var newId2 = "newObj222-" + Math.random();
				var newObj2 = {
					"Serial" : newId2,
					"First" : "newObj2",
					"Last" : "newObj2 Last",
					"Email" : "new.obj2@test.com"
				};
				when(ctrl.addStore(newObj2), function(results) {
					doh.is(results, newId2, "id should be returned");
					when(ctrl.getStore(newId2), function(value) {
						doh.is(value.Serial, newId2, "Serial should be set");
						doh.is(value.First, "newObj2", "First should be set");
						doh.is(value.Last, "newObj2 Last", "Last should be set");
						doh.is(value.Email, "new.obj2@test.com", "Email should be set");
					});
				});
			},
			function putStore(){
				var newId1 = "newObj111-" + Math.random();
				var newObj = {
					"Serial" : newId1,
					"First" : "newObj",
					"Last" : "newObj Last",
					"Email" : "new.obj@test.com"
				};
				when(ctrl.putStore(newObj), function(results) {
					doh.is(results, newId1, "id should be returned");
					when(ctrl.getStore(results), function(value) {
						doh.is(value.Serial, newId1, "Serial should be set");
						doh.is(value.First, "newObj", "First should be set");
						doh.is(value.Last, "newObj Last", "Last should be set");
						doh.is(value.Email, "new.obj@test.com", "Email should be set");
					});
				});
			},
			function removeStore(){
				when(ctrl.queryStore(), function(results) {
					var remObjId = results[1].Serial;
					when(ctrl.removeStore(remObjId), function(results) {
						doh.is(results, true, "should return true from removeStore");
					});
				});
			}
		]);
	}); 
});
