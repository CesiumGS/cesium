define(["dojo/dom", "dojo/_base/connect", "dijit/registry", "dojox/mvc/at"],
function(dom, connect, registry, at){

	var _connectResults = []; // events connect results
	var currentModel = null;

	var setFromModel = function (){
		registry.byId("firstInput1-3").set('value', currentModel[0].First);
		registry.byId("lastInput1-3").set('value', currentModel[0].Last);
		registry.byId("emailInput1-3").set('value', currentModel[0].Email);
		registry.byId("shiptostreetInput1-3").set('value', currentModel[0].ShipTo.Street);
		registry.byId("shiptocityInput1-3").set('value', currentModel[0].ShipTo.City);
		registry.byId("shiptostateInput1-3").set('value', currentModel[0].ShipTo.State);
		registry.byId("shiptozipInput1-3").set('value', currentModel[0].ShipTo.Zip);
		registry.byId("billtostreetInput1-3").set('value', currentModel[0].BillTo.Street);
		registry.byId("billtocityInput1-3").set('value', currentModel[0].BillTo.City);
		registry.byId("billtostateInput1-3").set('value', currentModel[0].BillTo.State);
		registry.byId("billtozipInput1-3").set('value', currentModel[0].BillTo.Zip);
	};

	return {
		// simple view init
		init: function(){
			currentModel = this.loadedModels.names3;
			var connectResult;

			connectResult = connect.connect(dom.byId('shipto-3'), "click", function(){
				//console.log("shipTo called. ");
				dom.byId("billtodiv-3").style.display = "none";
				dom.byId("shiptodiv-3").style.display = "";
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(dom.byId('billto-3'), "click", function(){
				//console.log("billTo called. ");
				dom.byId("billtodiv-3").style.display = "";
				dom.byId("shiptodiv-3").style.display = "none";
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(dom.byId('reset1-3'), "click", function(){
				//console.log("reset called. ");
				setFromModel();
				//console.log("reset done. ");
			});
			_connectResults.push(connectResult);

			dom.byId("billtodiv-3").style.display = "none";
			setFromModel();
			
		},

		// simple view destroy
		destroy: function(){
			var connectResult = _connectResults.pop();
			while(connectResult){
				connect.disconnect(connectResult);
				connectResult = _connectResults.pop();
			}
		}
	}
});
