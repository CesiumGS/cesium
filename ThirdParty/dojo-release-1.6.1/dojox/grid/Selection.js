/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid.Selection"]){
dojo._hasResource["dojox.grid.Selection"]=true;
dojo.provide("dojox.grid.Selection");
dojo.declare("dojox.grid.Selection",null,{constructor:function(_1){
this.grid=_1;
this.selected=[];
this.setMode(_1.selectionMode);
},mode:"extended",selected:null,updating:0,selectedIndex:-1,setMode:function(_2){
if(this.selected.length){
this.deselectAll();
}
if(_2!="extended"&&_2!="multiple"&&_2!="single"&&_2!="none"){
this.mode="extended";
}else{
this.mode=_2;
}
},onCanSelect:function(_3){
return this.grid.onCanSelect(_3);
},onCanDeselect:function(_4){
return this.grid.onCanDeselect(_4);
},onSelected:function(_5){
},onDeselected:function(_6){
},onChanging:function(){
},onChanged:function(){
},isSelected:function(_7){
if(this.mode=="none"){
return false;
}
return this.selected[_7];
},getFirstSelected:function(){
if(!this.selected.length||this.mode=="none"){
return -1;
}
for(var i=0,l=this.selected.length;i<l;i++){
if(this.selected[i]){
return i;
}
}
return -1;
},getNextSelected:function(_8){
if(this.mode=="none"){
return -1;
}
for(var i=_8+1,l=this.selected.length;i<l;i++){
if(this.selected[i]){
return i;
}
}
return -1;
},getSelected:function(){
var _9=[];
for(var i=0,l=this.selected.length;i<l;i++){
if(this.selected[i]){
_9.push(i);
}
}
return _9;
},getSelectedCount:function(){
var c=0;
for(var i=0;i<this.selected.length;i++){
if(this.selected[i]){
c++;
}
}
return c;
},_beginUpdate:function(){
if(this.updating===0){
this.onChanging();
}
this.updating++;
},_endUpdate:function(){
this.updating--;
if(this.updating===0){
this.onChanged();
}
},select:function(_a){
if(this.mode=="none"){
return;
}
if(this.mode!="multiple"){
this.deselectAll(_a);
this.addToSelection(_a);
}else{
this.toggleSelect(_a);
}
},addToSelection:function(_b){
if(this.mode=="none"){
return;
}
if(dojo.isArray(_b)){
dojo.forEach(_b,this.addToSelection,this);
return;
}
_b=Number(_b);
if(this.selected[_b]){
this.selectedIndex=_b;
}else{
if(this.onCanSelect(_b)!==false){
this.selectedIndex=_b;
var _c=this.grid.getRowNode(_b);
if(_c){
dojo.attr(_c,"aria-selected","true");
}
this._beginUpdate();
this.selected[_b]=true;
this.onSelected(_b);
this._endUpdate();
}
}
},deselect:function(_d){
if(this.mode=="none"){
return;
}
if(dojo.isArray(_d)){
dojo.forEach(_d,this.deselect,this);
return;
}
_d=Number(_d);
if(this.selectedIndex==_d){
this.selectedIndex=-1;
}
if(this.selected[_d]){
if(this.onCanDeselect(_d)===false){
return;
}
var _e=this.grid.getRowNode(_d);
if(_e){
dojo.attr(_e,"aria-selected","false");
}
this._beginUpdate();
delete this.selected[_d];
this.onDeselected(_d);
this._endUpdate();
}
},setSelected:function(_f,_10){
this[(_10?"addToSelection":"deselect")](_f);
},toggleSelect:function(_11){
if(dojo.isArray(_11)){
dojo.forEach(_11,this.toggleSelect,this);
return;
}
this.setSelected(_11,!this.selected[_11]);
},_range:function(_12,_13,_14){
var s=(_12>=0?_12:_13),e=_13;
if(s>e){
e=s;
s=_13;
}
for(var i=s;i<=e;i++){
_14(i);
}
},selectRange:function(_15,_16){
this._range(_15,_16,dojo.hitch(this,"addToSelection"));
},deselectRange:function(_17,_18){
this._range(_17,_18,dojo.hitch(this,"deselect"));
},insert:function(_19){
this.selected.splice(_19,0,false);
if(this.selectedIndex>=_19){
this.selectedIndex++;
}
},remove:function(_1a){
this.selected.splice(_1a,1);
if(this.selectedIndex>=_1a){
this.selectedIndex--;
}
},deselectAll:function(_1b){
for(var i in this.selected){
if((i!=_1b)&&(this.selected[i]===true)){
this.deselect(i);
}
}
},clickSelect:function(_1c,_1d,_1e){
if(this.mode=="none"){
return;
}
this._beginUpdate();
if(this.mode!="extended"){
this.select(_1c);
}else{
var _1f=this.selectedIndex;
if(!_1d){
this.deselectAll(_1c);
}
if(_1e){
this.selectRange(_1f,_1c);
}else{
if(_1d){
this.toggleSelect(_1c);
}else{
this.addToSelection(_1c);
}
}
}
this._endUpdate();
},clickSelectEvent:function(e){
this.clickSelect(e.rowIndex,dojo.isCopyKey(e),e.shiftKey);
},clear:function(){
this._beginUpdate();
this.deselectAll();
this._endUpdate();
}});
}
