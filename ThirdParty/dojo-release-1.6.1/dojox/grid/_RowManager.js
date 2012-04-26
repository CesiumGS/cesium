/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._RowManager"]){
dojo._hasResource["dojox.grid._RowManager"]=true;
dojo.provide("dojox.grid._RowManager");
(function(){
var _1=function(_2,_3){
if(_2.style.cssText==undefined){
_2.setAttribute("style",_3);
}else{
_2.style.cssText=_3;
}
};
dojo.declare("dojox.grid._RowManager",null,{constructor:function(_4){
this.grid=_4;
},linesToEms:2,overRow:-2,prepareStylingRow:function(_5,_6){
return {index:_5,node:_6,odd:Boolean(_5&1),selected:!!this.grid.selection.isSelected(_5),over:this.isOver(_5),customStyles:"",customClasses:"dojoxGridRow"};
},styleRowNode:function(_7,_8){
var _9=this.prepareStylingRow(_7,_8);
this.grid.onStyleRow(_9);
this.applyStyles(_9);
},applyStyles:function(_a){
var i=_a;
i.node.className=i.customClasses;
var h=i.node.style.height;
_1(i.node,i.customStyles+";"+(i.node._style||""));
i.node.style.height=h;
},updateStyles:function(_b){
this.grid.updateRowStyles(_b);
},setOverRow:function(_c){
var _d=this.overRow;
this.overRow=_c;
if((_d!=this.overRow)&&(dojo.isString(_d)||_d>=0)){
this.updateStyles(_d);
}
this.updateStyles(this.overRow);
},isOver:function(_e){
return (this.overRow==_e&&!dojo.hasClass(this.grid.domNode,"dojoxGridColumnResizing"));
}});
})();
}
