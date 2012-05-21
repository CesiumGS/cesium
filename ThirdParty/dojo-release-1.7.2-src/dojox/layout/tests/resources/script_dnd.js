dojo.addOnLoad(init);
var tabContainer, gridContainer;
function init(){
	tabContainer = dijit.byId("tb1");
	dojo.subscribe("/dnd/drop/after", "createNode");
	var adapter = dojox.mdnd.adapter.dndToDojo();
	// register tabs of tabContainer.
	var dojoNode = dojo.query('.dijitTab', tabContainer.tablist.containerNode).forEach(function(node){
		adapter.register(node, tabContainer.declaredClass);
	});
	adapter.register(c2.node, "targetDojo", true, "Drag Me !");
	
	adapter.isAccepted = function(draggedNode, target){
		//console.log("isAccepted ::: ", draggedNode, target);
		var dndType = dijit.byNode(draggedNode).get("dndType");
		switch(target.type){
			case "dijit.layout.TabContainer" :
				var tabButton = dijit.byNode(target.node);
				var panes = tabContainer.getChildren();
				for (var i = 0, l = panes.length; i < l; i++) {
					var gc = panes[i];
					if (gc.controlButton == tabButton) {
						for (var j=0; j < gc.acceptTypes.length; j++){
							if (dndType == gc.acceptTypes[j]){
								gridContainer = gc;
								return true;
							}
						}
						if (j == gc.acceptTypes.length){
							return false;
						}
					}
				}
				break;
			default:
				return true;
				break;
			
		};
	};
	
	dojo.subscribe("/dojox/mdnd/adapter/dndToDojo/over", null, "onOver");
	dojo.subscribe("/dojox/mdnd/adapter/dndToDojo/out", null, "onOut");
	dojo.subscribe("/dojox/mdnd/adapter/dndToDojo/drop", null, "onDrop");
	
	dojo.subscribe("/dojox/mdnd/drop", null, function(){
		dojo.forEach(dojoNode, function(node){
			dojo.removeClass(node, "dndOver");
			dojo.removeClass(node, "dndOverNotAccepted");
		});
	});
	
	dojo.subscribe(tabContainer.domNode.id+"-removeChild", null, "refresh");
};

/**
 * DojoDndAdapter functions :
 * 	source/target dojo to D&D OAF Area
 */

/*Function: createNode
 * 	Create a widget with a dojo draggedNode and drop this into a D&D OAF Area.
 */
function createNode(source, nodes, copy, target, dropIndex){
	//console.log("createNode ::: ", source, nodes, copy, target, dropIndex);
	if(target){
		var widget = _createWidget(nodes);
		dojox.mdnd.areaManager().addDragItem(target, widget.domNode, dropIndex);
	}
};
/*
 * Widget Factory : Create a Dijit Widget with the type of draggedNode.
 */
function _createWidget(/*Array*/nodes){
	var type = nodes[0].getAttribute("dndType");
	var widget;
	switch (type) {
		case "ContentPane":
			widget = new dijit.layout.ContentPane();
			dojo.addClass(widget.domNode, 'cpane');
			widget.set('dndType','ContentPane');
			break;
		case "Portlet":
			widget = new dojox.widget.Portlet({
				title: "portlet",
				closable : true,
				dndType:"Portlet"
			});
			break;
		case "TitlePane":
			widget = new dijit.TitlePane({
				title: "TitlePane",
				dndType:"TitlePane"
			});
			break;
		default:
			widget = new dijit.layout.ContentPane();
			dojo.addClass(widget.domNode, 'cpane');
			widget.set('dndType','ContentPane');
			break;
	}
	widget.set('content','Lorem ipsum dolor sit amet, consectetuer adipiscing elit.');
	widget.startup();
	return widget;
};

/**
 * Adapter functions
 */

/*Function: onOver
 * Call when the OAF draggedNode enters in a dojo target registered by the oafDndAdapter
 */
function onOver(target, type, draggedNode, accept){
	//console.info("onOver ::: ", target, type, draggedNode);
	// add the dropIndicator style for the tab of tabContainer.
	switch(type){
		case "dijit.layout.TabContainer" :
			if (accept){
				dojo.addClass(target, "dndOver");
			}
			else{
				dojo.addClass(target, "dndOverNotAccepted");
			}
		break;
	}
};

/*Function: onOut
 * Call when the OAF draggedNode exits of a dojo target registered by the oafDndAdapter
 */
function onOut(target, type, draggedNode, accept){
	//console.info("onOut ::: ", target, type, draggedNode);
	// remove the dropIndicator style for the tab of tabContainer.
	switch(type){
		case "dijit.layout.TabContainer" :
			dojo.removeClass(target, "dndOver");
			dojo.removeClass(target, "dndOverNotAccepted");
		break;
	}
};

function onDrop(node, target, type){
	//console.log("onDrop ::: ", node, target, type);
	switch(type){
		case "dijit.layout.TabContainer" :
			gridContainer.addChild(dijit.byNode(node), 0, 0); // add in first column / first element
			dojo.removeClass(target, "dndOver");
			dojo.removeClass(target, "dndOverNotAccepted");
		break;
	}
};

function refresh(){
	//console.info("refresh");
	dojox.mdnd.adapter.dndToDojo().refresh();
};

