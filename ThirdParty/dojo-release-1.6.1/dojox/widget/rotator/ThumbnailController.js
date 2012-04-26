/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.rotator.ThumbnailController"]){
dojo._hasResource["dojox.widget.rotator.ThumbnailController"]=true;
dojo.provide("dojox.widget.rotator.ThumbnailController");
(function(d){
var _1="dojoxRotatorThumb",_2=_1+"Selected";
d.declare("dojox.widget.rotator.ThumbnailController",null,{rotator:null,constructor:function(_3,_4){
d.mixin(this,_3);
this._domNode=_4;
var r=this.rotator;
if(r){
while(_4.firstChild){
_4.removeChild(_4.firstChild);
}
for(var i=0;i<r.panes.length;i++){
var n=r.panes[i].node,s=d.attr(n,"thumbsrc")||d.attr(n,"src"),t=d.attr(n,"alt")||"";
if(/img/i.test(n.tagName)){
(function(j){
d.create("a",{classname:_1+" "+_1+j+" "+(j==r.idx?_2:""),href:s,onclick:function(e){
d.stopEvent(e);
if(r){
r.control.apply(r,["go",j]);
}
},title:t,innerHTML:"<img src=\""+s+"\" alt=\""+t+"\"/>"},_4);
})(i);
}
}
this._con=d.connect(r,"onUpdate",this,"_onUpdate");
}
},destroy:function(){
d.disconnect(this._con);
d.destroy(this._domNode);
},_onUpdate:function(_5){
var r=this.rotator;
if(_5=="onAfterTransition"){
var n=d.query("."+_1,this._domNode).removeClass(_2);
if(r.idx<n.length){
d.addClass(n[r.idx],_2);
}
}
}});
})(dojo);
}
