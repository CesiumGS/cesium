/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.enhanced.plugins.GridSource"]){
dojo._hasResource["dojox.grid.enhanced.plugins.GridSource"]=true;
dojo.provide("dojox.grid.enhanced.plugins.GridSource");
dojo.require("dojo.dnd.Source");
dojo.require("dojox.grid.enhanced.plugins.DnD");
(function(){
var _1=function(_2){
var a=_2[0];
for(var i=1;i<_2.length;++i){
a=a.concat(_2[i]);
}
return a;
};
dojo.declare("dojox.grid.enhanced.plugins.GridSource",dojo.dnd.Source,{accept:["grid/cells","grid/rows","grid/cols","text"],insertNodesForGrid:false,markupFactory:function(_3,_4){
return new dojox.grid.enhanced.plugins.GridSource(_4,_3);
},checkAcceptance:function(_5,_6){
if(_5 instanceof dojox.grid.enhanced.plugins.GridDnDSource){
if(_6[0]){
var _7=_5.getItem(_6[0].id);
if(_7&&(dojo.indexOf(_7.type,"grid/rows")>=0||dojo.indexOf(_7.type,"grid/cells")>=0)&&!_5.dndPlugin._allDnDItemsLoaded()){
return false;
}
}
this.sourcePlugin=_5.dndPlugin;
}
return this.inherited(arguments);
},onDraggingOver:function(){
if(this.sourcePlugin){
this.sourcePlugin._isSource=true;
}
},onDraggingOut:function(){
if(this.sourcePlugin){
this.sourcePlugin._isSource=false;
}
},onDropExternal:function(_8,_9,_a){
if(_8 instanceof dojox.grid.enhanced.plugins.GridDnDSource){
var _b=dojo.map(_9,function(_c){
return _8.getItem(_c.id).data;
});
var _d=_8.getItem(_9[0].id);
var _e=_d.dndPlugin.grid;
var _f=_d.type[0];
var _10;
try{
switch(_f){
case "grid/cells":
_9[0].innerHTML=this.getCellContent(_e,_b[0].min,_b[0].max)||"";
this.onDropGridCells(_e,_b[0].min,_b[0].max);
break;
case "grid/rows":
_10=_1(_b);
_9[0].innerHTML=this.getRowContent(_e,_10)||"";
this.onDropGridRows(_e,_10);
break;
case "grid/cols":
_10=_1(_b);
_9[0].innerHTML=this.getColumnContent(_e,_10)||"";
this.onDropGridColumns(_e,_10);
break;
}
if(this.insertNodesForGrid){
this.selectNone();
this.insertNodes(true,[_9[0]],this.before,this.current);
}
_d.dndPlugin.onDragOut(!_a);
}
catch(e){
console.warn("GridSource.onDropExternal() error:",e);
}
}else{
this.inherited(arguments);
}
},getCellContent:function(_11,_12,_13){
},getRowContent:function(_14,_15){
},getColumnContent:function(_16,_17){
},onDropGridCells:function(_18,_19,_1a){
},onDropGridRows:function(_1b,_1c){
},onDropGridColumns:function(_1d,_1e){
}});
})();
}
