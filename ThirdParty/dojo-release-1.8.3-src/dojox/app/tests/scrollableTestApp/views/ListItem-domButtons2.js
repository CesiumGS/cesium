define(["dojo/dom", "dojo/dom-style", "dojo/_base/connect", "dijit/registry", "dojox/mvc/at", "dojox/mobile/TransitionEvent", "dojox/mvc/Repeat", "dojox/mvc/getStateful", "dojox/mvc/Output"],
function(dom, domStyle, connect, registry, at, TransitionEvent, Repeat, getStateful, Output){
	var _connectResults = []; // events connect result

	var repeatmodel = null;	//repeat view data model

	// delete an item
	var deleteResult = function(index){
		var nextIndex = repeatmodel.get("cursorIndex");
		if(nextIndex >= index){
			nextIndex = nextIndex-1;
		}
		repeatmodel.model.splice(index, 1);
		repeatmodel.set("cursorIndex", nextIndex);		
	};
	// show an item detail
	var setDetailsContext = function(index){
		repeatmodel.set("cursorIndex", index);

		// transition to repeatDetails view with the &cursor=index
		var transOpts = {
			title : "repeatDetails",
			target : "repeatDetails",
			url : "#repeatDetails", // this is optional if not set it will be created from target   
			params : {"cursor":index}
		};
		var e = window.event;
		new TransitionEvent(e.srcElement, transOpts, e).dispatch(); 
		
	};
	// insert an item
	var insertResult = function(index){
		if(index<0 || index>repeatmodel.model.length){
			throw Error("index out of data model.");
		}
		if((repeatmodel.model[index].First=="") ||
			(repeatmodel.model[index+1] && (repeatmodel.model[index+1].First == ""))){
			return;
		}
		var data = {id:Math.random(), "First": "", "Last": "", "Location": "CA", "Office": "", "Email": "", "Tel": "", "Fax": ""};
		repeatmodel.model.splice(index+1, 0, new getStateful(data));
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
		// repeate view init
		init: function(){
			repeatmodel = this.loadedModels.repeatmodels;
			var repeatDom = dom.byId('repeatWidget');
			var connectResult;
			connectResult = connect.connect(repeatDom, "button[id^=\"detail\"]:click", function(e){
				var index = getIndexFromId(e.target.id, "detail");
				setDetailsContext(index);
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(dom.byId('insert3rx'), "click", function(){
				insertResult(repeatmodel.model.length-1);
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(repeatDom, "button[id^=\"insert\"]:click", function(e){
				var index = getIndexFromId(e.target.id, "insert");
				insertResult(index);
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(repeatDom, "button[id^=\"delete\"]:click", function(e){
				var index = getIndexFromId(e.target.id, "delete");
				deleteResult(index);
			});
			_connectResults.push(connectResult);
		},


		beforeActivate: function(){
			// summary:
			//		view life cycle beforeActivate()
			// description:
			//		beforeActivate will call refreshData to create the
			//		model/controller and show the list.
			if(dom.byId("back3r") && this.app.isTablet){ 
				domStyle.set(dom.byId("back3r"), "visibility", "hidden"); // hide the back button in tablet mode
			}
			if(dom.byId("tab1WrapperA")){ 
				domStyle.set(dom.byId("tab1WrapperA"), "visibility", "visible");  // show the nav view if it being used
				domStyle.set(dom.byId("tab1WrapperB"), "visibility", "visible");  // show the nav view if it being used
			}
		},
		
		
		// repeat view destroy
		destroy: function(){
			var connectResult = _connectResults.pop();
			while(connectResult){
				connect.disconnect(connectResult);
				connectResult = _connectResults.pop();
			}
		}
	}
});
