define([
	"../main",
	"dojo/_base/lang",
	"dojo/dom"
], function(dojox, lang, dom){

	var dgu = lang.getObject("grid.util", true, dojox);

/*=====
dgu = {
	// summary:
	//		grid utility library
};
=====*/

	dgu.na = '...';
	dgu.rowIndexTag = "gridRowIndex";
	dgu.gridViewTag = "gridView";


	dgu.fire = function(ob, ev, args){
		var fn = ob && ev && ob[ev];
		return fn && (args ? fn.apply(ob, args) : ob[ev]());
	};
	
	dgu.setStyleHeightPx = function(inElement, inHeight){
		if(inHeight >= 0){
			var s = inElement.style;
			var v = inHeight + 'px';
			if(inElement && s['height'] != v){
				s['height'] = v;
			}
		}
	};
	
	dgu.mouseEvents = [ 'mouseover', 'mouseout', /*'mousemove',*/ 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu' ];

	dgu.keyEvents = [ 'keyup', 'keydown', 'keypress' ];

	dgu.funnelEvents = function(inNode, inObject, inMethod, inEvents){
		var evts = (inEvents ? inEvents : dgu.mouseEvents.concat(dgu.keyEvents));
		for (var i=0, l=evts.length; i<l; i++){
			inObject.connect(inNode, 'on' + evts[i], inMethod);
		}
	};

	dgu.removeNode = function(inNode){
		inNode = dom.byId(inNode);
		inNode && inNode.parentNode && inNode.parentNode.removeChild(inNode);
		return inNode;
	};
	
	dgu.arrayCompare = function(inA, inB){
		for(var i=0,l=inA.length; i<l; i++){
			if(inA[i] != inB[i]){return false;}
		}
		return (inA.length == inB.length);
	};
	
	dgu.arrayInsert = function(inArray, inIndex, inValue){
		if(inArray.length <= inIndex){
			inArray[inIndex] = inValue;
		}else{
			inArray.splice(inIndex, 0, inValue);
		}
	};
	
	dgu.arrayRemove = function(inArray, inIndex){
		inArray.splice(inIndex, 1);
	};
	
	dgu.arraySwap = function(inArray, inI, inJ){
		var cache = inArray[inI];
		inArray[inI] = inArray[inJ];
		inArray[inJ] = cache;
	};

	return dgu;

});