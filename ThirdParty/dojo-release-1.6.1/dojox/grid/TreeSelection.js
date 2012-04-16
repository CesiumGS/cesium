/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.TreeSelection"]){
dojo._hasResource["dojox.grid.TreeSelection"]=true;
dojo.provide("dojox.grid.TreeSelection");
dojo.require("dojox.grid.DataSelection");
dojo.declare("dojox.grid.TreeSelection",dojox.grid.DataSelection,{setMode:function(_1){
this.selected={};
this.sorted_sel=[];
this.sorted_ltos={};
this.sorted_stol={};
dojox.grid.DataSelection.prototype.setMode.call(this,_1);
},addToSelection:function(_2){
if(this.mode=="none"){
return;
}
var _3=null;
if(typeof _2=="number"||typeof _2=="string"){
_3=_2;
}else{
_3=this.grid.getItemIndex(_2);
}
if(this.selected[_3]){
this.selectedIndex=_3;
}else{
if(this.onCanSelect(_3)!==false){
this.selectedIndex=_3;
var _4=dojo.query("tr[dojoxTreeGridPath='"+_3+"']",this.grid.domNode);
if(_4.length){
dojo.attr(_4[0],"aria-selected","true");
}
this._beginUpdate();
this.selected[_3]=true;
this._insertSortedSelection(_3);
this.onSelected(_3);
this._endUpdate();
}
}
},deselect:function(_5){
if(this.mode=="none"){
return;
}
var _6=null;
if(typeof _5=="number"||typeof _5=="string"){
_6=_5;
}else{
_6=this.grid.getItemIndex(_5);
}
if(this.selectedIndex==_6){
this.selectedIndex=-1;
}
if(this.selected[_6]){
if(this.onCanDeselect(_6)===false){
return;
}
var _7=dojo.query("tr[dojoxTreeGridPath='"+_6+"']",this.grid.domNode);
if(_7.length){
dojo.attr(_7[0],"aria-selected","false");
}
this._beginUpdate();
delete this.selected[_6];
this._removeSortedSelection(_6);
this.onDeselected(_6);
this._endUpdate();
}
},getSelected:function(){
var _8=[];
for(var i in this.selected){
if(this.selected[i]){
_8.push(this.grid.getItem(i));
}
}
return _8;
},getSelectedCount:function(){
var c=0;
for(var i in this.selected){
if(this.selected[i]){
c++;
}
}
return c;
},_bsearch:function(v){
var o=this.sorted_sel;
var h=o.length-1,l=0,m;
while(l<=h){
var _9=this._comparePaths(o[m=(l+h)>>1],v);
if(_9<0){
l=m+1;
continue;
}
if(_9>0){
h=m-1;
continue;
}
return m;
}
return _9<0?m-_9:m;
},_comparePaths:function(a,b){
for(var i=0,l=(a.length<b.length?a.length:b.length);i<l;i++){
if(a[i]<b[i]){
return -1;
}
if(a[i]>b[i]){
return 1;
}
}
if(a.length<b.length){
return -1;
}
if(a.length>b.length){
return 1;
}
return 0;
},_insertSortedSelection:function(_a){
_a=String(_a);
var s=this.sorted_sel;
var sl=this.sorted_ltos;
var ss=this.sorted_stol;
var _b=_a.split("/");
_b=dojo.map(_b,function(_c){
return parseInt(_c,10);
});
sl[_b]=_a;
ss[_a]=_b;
if(s.length===0){
s.push(_b);
return;
}
if(s.length==1){
var _d=this._comparePaths(s[0],_b);
if(_d==1){
s.unshift(_b);
}else{
s.push(_b);
}
return;
}
var _e=this._bsearch(_b);
this.sorted_sel.splice(_e,0,_b);
},_removeSortedSelection:function(_f){
_f=String(_f);
var s=this.sorted_sel;
var sl=this.sorted_ltos;
var ss=this.sorted_stol;
if(s.length===0){
return;
}
var _10=ss[_f];
if(!_10){
return;
}
var idx=this._bsearch(_10);
if(idx>-1){
delete sl[_10];
delete ss[_f];
s.splice(idx,1);
}
},getFirstSelected:function(){
if(!this.sorted_sel.length||this.mode=="none"){
return -1;
}
var _11=this.sorted_sel[0];
if(!_11){
return -1;
}
_11=this.sorted_ltos[_11];
if(!_11){
return -1;
}
return _11;
},getNextSelected:function(_12){
if(!this.sorted_sel.length||this.mode=="none"){
return -1;
}
_12=String(_12);
var _13=this.sorted_stol[_12];
if(!_13){
return -1;
}
var idx=this._bsearch(_13);
var _14=this.sorted_sel[idx+1];
if(!_14){
return -1;
}
return this.sorted_ltos[_14];
},_range:function(_15,_16,_17){
if(!dojo.isString(_15)&&_15<0){
_15=_16;
}
var _18=this.grid.layout.cells,_19=this.grid.store,_1a=this.grid;
_15=new dojox.grid.TreePath(String(_15),_1a);
_16=new dojox.grid.TreePath(String(_16),_1a);
if(_15.compare(_16)>0){
var tmp=_15;
_15=_16;
_16=tmp;
}
var _1b=_15._str,_1c=_16._str;
_17(_1b);
var p=_15;
while((p=p.next())){
if(p._str==_1c){
break;
}
_17(p._str);
}
_17(_1c);
}});
}
