define(["dojo/dom", "dojo/_base/connect", "dijit/registry", "dojox/mvc/at", "dojox/mvc/Repeat", "dojox/mvc/getStateful", "dojox/mvc/Output"],
function(dom, connect, registry, at, Repeat, getStateful, Output){

	var _connectResults = []; // events connect result

	var repeatmodel2 = null;	//repeat view data model

	// delete an item
	var deleteResult = function(index){
		var nextIndex = repeatmodel2.get("cursorIndex");
		if(nextIndex >= index){
			nextIndex = nextIndex-1;
		}
		repeatmodel2.model.splice(index, 1);
		repeatmodel2.set("cursorIndex", nextIndex);		
	};
	// show an item detail
	var setDetailsContext = function(index){
		repeatmodel2.set("cursorIndex", index);
	};
	// insert an item
	var insertResult = function(index){
		if(index<0 || index>repeatmodel2.model.length){
			throw Error("index out of data model.");
		}
		if((repeatmodel2.model[index].First=="") ||
			(repeatmodel2.model[index+1] && (repeatmodel2.model[index+1].First == ""))){
			return;
		}
		var data = {id:Math.random(), "First": "", "Last": "", "Location": "CA", "Office": "", "Email": "", "Tel": "", "Fax": ""};
		repeatmodel2.model.splice(index+1, 0, new getStateful(data));
		setDetailsContext(index+1);
	};
	// get index from dom node id
	var getIndexFromId = function(nodeId, perfix){
		var len = perfix.length;
		if(nodeId.length <= len){
			throw Error("repeate node id error.");
		}
		var index = nodeId.substring(len, nodeId.length);
		return parseInt(index);
	};

	return {
		// repeate2 view init
		init: function(){
			repeatmodel2 = this.loadedModels.repeatmodels2;
			var repeatDom = dom.byId('repeatWidget2');
			var connectResult;
			connectResult = connect.connect(repeatDom, "button[id^=\"detail2\"]:click", function(e){
				var index = getIndexFromId(e.target.id, "detail2");
				setDetailsContext(index);
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(repeatDom, "button[id^=\"insert2\"]:click", function(e){
				var index = getIndexFromId(e.target.id, "insert2");
				insertResult(index);
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(repeatDom, "button[id^=\"delete2\"]:click", function(e){
				var index = getIndexFromId(e.target.id, "delete2");
				deleteResult(index);
			});
			_connectResults.push(connectResult);
		},
		// repeat2 view destroy
		destroy: function(){
			var connectResult = _connectResults.pop();
			while(connectResult){
				connect.disconnect(connectResult);
				connectResult = _connectResults.pop();
			}
		}
	}
});
