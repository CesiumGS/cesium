define(["dojo/dom", "dojo/dom-style", "dojo/_base/connect", "dojo/_base/lang", "dojo/_base/declare", "dijit/registry", "dojox/mvc/at", 
"dojox/mobile/TransitionEvent", "dojox/mvc/Repeat", "dojox/mvc/getStateful", "dojox/mvc/Output", 
"dojox/mobile/RoundRectList", "dojox/mvc/WidgetList", "dojox/mvc/Templated", "dojox/mobile/ListItem", "dojo/text!../templates/RoundRectWidListTemplate.html"],
function(dom, domStyle, connect, lang, declare, registry, at, TransitionEvent, Repeat, getStateful, Output, RoundRectList, WidgetList, Templated, 
	ListItem, RoundRectWidListTemplate){
	var _connectResults = []; // events connect result

	var repeatmodel = null;	//repeat view data model
	var roundRectWidList = null;
	
	// these ids are updated here and in the html file to avoid duplicate ids
	var backId = 'sc1back1P';
	var insert1Id = 'sc1insert1xP';
	var insert10Id = 'sc1insert10xP';
	var remove10Id = 'sc1remove10xP';
	var wrapperIdA = 'sc1WrapperA';
	var wrapperIdB = 'sc1WrapperB';
	var wrapperIdC = 'sc1WrapperC';
	var wrapperIdD = 'sc1WrapperD';

	// delete an item
	deleteResult = function(index){
		var nextIndex = repeatmodel.get("cursorIndex");
		if(nextIndex >= index){
			nextIndex = nextIndex-1;
		}
		repeatmodel.model.splice(index, 1);
		repeatmodel.set("cursorIndex", nextIndex);		
	};
	// show an item detail
	setDetailsContext = function(index){
		repeatmodel.set("cursorIndex", index);
		
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
		var transOpts = {
			title : "repeatDetails",
			target : "repeatDetails",
			url : "#repeatDetails", // this is optional if not set it will be created from target   
			params : {"cursor":index+1}
		};
		var e = window.event;
		new TransitionEvent(e.srcElement, transOpts, e).dispatch(); 
		
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
	
	var showListData = function(/*dojox/mvc/EditStoreRefListController*/ datamodel){
		// summary:
		//		create the WidgetList programatically if it has not been created, and 
		//		set the children for items_list widget to the datamodel to show the items in the selected list.
		//		RoundRectWidListTemplate is used for the templateString of the WidgetList.
		//
		// datamodel: dojox/mvc/EditStoreRefListController
		//		The EditStoreRefListController whose model holds the items for the selected list.
		//
	/*
	 					data-dojo-type="dojox/mobile/RoundRectList"
					data-dojo-mixins="dojox/mvc/WidgetList,dojox/mvc/_InlineTemplateMixin"
					data-dojo-props="children: this.loadedModels.repeatmodels.model"
					data-mvc-child-type="dojox/mvc/Templated"
					data-mvc-child-mixins="dojox/mobile/ListItem"
					data-mvc-child-props="clickable: true,
							label: at(this.target, 'First'),
							transitionOptions: {title:'Details',target:'repeatDetails',url:'#repeatDetails',params:{'cursor':this.indexAtStartup}},
							onClick: function(){setDetailsContext(this.indexAtStartup);}">					
 
	 */	
		if(!roundRectWidList){
			var clz = declare([WidgetList, RoundRectList], {});
			roundRectWidList = new clz({
				children: at(datamodel, 'model'),
				childClz: declare([Templated /* dojox/mvc/Templated module return value */, ListItem /* dojox/mobile/ListItem module return value */]),
				childParams: {
					transitionOptions: {title:'Details',target:'repeatDetails',url:'#repeatDetails',params:{'cursor':this.indexAtStartup}},
					clickable: true,
					onClick: function(){
						console.log("in onClick this.indexAtStartup="+this.indexAtStartup);
						setDetailsContext(this.indexAtStartup);}
				},
				childBindings: {
					titleNode: {value: at("rel:", "First")},
				},
				templateString: RoundRectWidListTemplate
			});
			//roundRectWidList.placeAt(dom.byId("list_container"));
			//roundRectWidList.placeAt(dom.byId("list_type").parentNode);
			roundRectWidList.placeAt(dom.byId("addWidgetHere"));
			roundRectWidList.startup();
		}else{
			roundRectWidList.set("children", at(datamodel, 'model'));
		}
	};

	return {
		// repeate view init
		init: function(){			
			repeatmodel = this.loadedModels.repeatmodels;
			var connectResult;

			connectResult = connect.connect(dom.byId(insert1Id), "click", function(){
				insertResult(repeatmodel.model.length-1);
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(dom.byId(insert10Id), "click", function(){
				//Add 10 items to the end of the model
				app.showProgressIndicator(true);
				setTimeout(lang.hitch(this,function(){
					maxentries = repeatmodel.model.length+10;
					for(i = repeatmodel.model.length; i < maxentries; i++){
						var data = {id:Math.random(), "First": "First"+repeatmodel.model.length, "Last": "Last"+repeatmodel.model.length, "Location": "CA", "Office": "", "Email": "", "Tel": "", "Fax": ""};
						repeatmodel.model.splice(repeatmodel.model.length, 0, new getStateful(data));					
					}
					app.showProgressIndicator(false);
				}), 100);				
				
			});
			_connectResults.push(connectResult);

			connectResult = connect.connect(dom.byId(remove10Id), "click", function(){
				//remove 10 items to the end of the model
				app.showProgressIndicator(true);
				setTimeout(lang.hitch(this,function(){				
					maxentries = repeatmodel.model.length-10;
					for(i = repeatmodel.model.length; i > maxentries; i--){
						repeatmodel.model.splice(i, 1);
					}
					repeatmodel.set("cursorIndex", 0);		
					app.showProgressIndicator(false);
				}), 100);				
			});
			_connectResults.push(connectResult);
			
			showListData(this.loadedModels.repeatmodels);
		},


		beforeActivate: function(){
			// summary:
			//		view life cycle beforeActivate()
			// description:
			//		beforeActivate will call refreshData to create the
			//		model/controller and show the list.
			if(dom.byId(backId) && this.app.isTablet){ 
				domStyle.set(dom.byId(backId), "visibility", "hidden"); // hide the back button in tablet mode
			}
			if(dom.byId("tab1WrapperA")){ 
				domStyle.set(dom.byId("tab1WrapperA"), "visibility", "visible");  // show the nav view if it being used
				domStyle.set(dom.byId("tab1WrapperB"), "visibility", "visible");  // show the nav view if it being used
			}
			//domStyle.set(dom.byId(wrapperIdA), "visibility", "visible");  // show the view when it is ready
			//domStyle.set(dom.byId(wrapperIdB), "visibility", "visible");  // show the view when it is ready
			//domStyle.set(dom.byId(wrapperIdC), "visibility", "visible");  // show the view when it is ready
			//domStyle.set(dom.byId(wrapperIdD), "visibility", "visible");  // show the view when it is ready

			showListData(this.loadedModels.repeatmodels);			
		},

		afterActivate: function(){
			// summary:
			//		view life cycle afterActivate()
		},
		
		
		// repeate view destroy
		destroy: function(){
			var connectResult = _connectResults.pop();
			while(connectResult){
				connect.disconnect(connectResult);
				connectResult = _connectResults.pop();
			}
		}
	}
});
