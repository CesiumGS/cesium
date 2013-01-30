define(["dojo/dom", "dojo/_base/connect", "dijit/registry", "dojox/mvc"], function(dom, connect, registry, mvc){
	var genmodel = null; // generate view data model
	var _connectResults = []; // events connect result

	var updateModel = function(){
		dom.byId("modelArea").focus();
		dom.byId("viewArea").style.display = "none";
		dom.byId("outerModelArea").style.display = "";
		registry.byId("modelArea").set("value", (dojo.toJson(genmodel.toPlainObject(), true)));
	};

	var updateView = function(){
		try{
			var modeldata = dojo.fromJson(dom.byId("modelArea").value);
			genmodel = mvc.newStatefulModel({
				data: modeldata
			});
			registry.byId("view").set("ref", genmodel);
			dom.byId("outerModelArea").style.display = "none";
			dom.byId("viewArea").style.display = "";
		}catch(err){
			console.error("Error parsing json from model: " + err);
		}
	};

	return {
		init: function(){
			var connectResult;

			connectResult = connect.connect(dom.byId('generate1'), "click", function(){
				updateView();
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(dom.byId('updateModel'), "click", function(){
				updateModel();
			});
			_connectResults.push(connectResult);
		},

		beforeActivate: function(){
			console.log("generate view beforeActivate()");
		},

		destroy: function(){
			var connectResult = _connectResults.pop();
			while(connectResult){
				connect.disconnect(connectResult);
				connectResult = _connectResults.pop();
			}
		}
	}
});
