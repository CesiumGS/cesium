/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.PlaceholderMenuItem"]){
dojo._hasResource["dojox.widget.PlaceholderMenuItem"]=true;
dojo.provide("dojox.widget.PlaceholderMenuItem");
dojo.experimental("dojox.widget.PlaceholderMenuItem");
dojo.require("dijit.Menu");
dojo.declare("dojox.widget.PlaceholderMenuItem",dijit.MenuItem,{_replaced:false,_replacedWith:null,_isPlaceholder:true,postCreate:function(){
this.domNode.style.display="none";
this._replacedWith=[];
if(!this.label){
this.label=this.containerNode.innerHTML;
}
this.inherited(arguments);
},replace:function(_1){
if(this._replaced){
return false;
}
var _2=this.getIndexInParent();
if(_2<0){
return false;
}
var p=this.getParent();
dojo.forEach(_1,function(_3){
p.addChild(_3,_2++);
});
this._replacedWith=_1;
this._replaced=true;
return true;
},unReplace:function(_4){
if(!this._replaced){
return [];
}
var p=this.getParent();
if(!p){
return [];
}
var r=this._replacedWith;
dojo.forEach(this._replacedWith,function(_5){
p.removeChild(_5);
if(_4){
_5.destroyRecursive();
}
});
this._replacedWith=[];
this._replaced=false;
return r;
}});
dojo.extend(dijit.Menu,{getPlaceholders:function(_6){
var r=[];
var _7=this.getChildren();
dojo.forEach(_7,function(_8){
if(_8._isPlaceholder&&(!_6||_8.label==_6)){
r.push(_8);
}else{
if(_8._started&&_8.popup&&_8.popup.getPlaceholders){
r=r.concat(_8.popup.getPlaceholders(_6));
}else{
if(!_8._started&&_8.dropDownContainer){
var _9=dojo.query("[widgetId]",_8.dropDownContainer)[0];
var _a=dijit.byNode(_9);
if(_a.getPlaceholders){
r=r.concat(_a.getPlaceholders(_6));
}
}
}
}
},this);
return r;
}});
}
