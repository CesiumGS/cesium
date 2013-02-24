define(["dojo/dom", "dojo/_base/connect", "dijit/registry", "dojox/mvc/at"],
function(dom, connect, registry, at){
	var _connectResults = []; // events connect results
	var currentModel = null;

	var setRef = function (id, attr){
		var widget = registry.byId(id);
		widget.set("target", at("rel:", attr));
		console.log("setRef done.");
	};
	return {
		// simple view init
		init: function(){
			currentModel = this.loadedModels.names;
			var connectResult;

			connectResult = connect.connect(dom.byId('shipto'), "click", function(){
				setRef('addrGroup', 'ShipTo');
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(dom.byId('billto'), "click", function(){
				setRef('addrGroup', 'BillTo');
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(dom.byId('reset1'), "click", function(){
				currentModel.reset();
				console.log("reset done. ");
			});
			_connectResults.push(connectResult);
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
