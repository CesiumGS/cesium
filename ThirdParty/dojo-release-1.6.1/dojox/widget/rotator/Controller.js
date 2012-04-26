/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.rotator.Controller"]){
dojo._hasResource["dojox.widget.rotator.Controller"]=true;
dojo.provide("dojox.widget.rotator.Controller");
(function(d){
var _1="dojoxRotator",_2=_1+"Play",_3=_1+"Pause",_4=_1+"Number",_5=_1+"Tab",_6=_1+"Selected";
d.declare("dojox.widget.rotator.Controller",null,{rotator:null,commands:"prev,play/pause,info,next",constructor:function(_7,_8){
d.mixin(this,_7);
var r=this.rotator;
if(r){
while(_8.firstChild){
_8.removeChild(_8.firstChild);
}
var ul=this._domNode=d.create("ul",null,_8),_9=" "+_1+"Icon",cb=function(_a,_b,_c){
d.create("li",{className:_b,innerHTML:"<a href=\"#\"><span>"+_a+"</span></a>",onclick:function(e){
d.stopEvent(e);
if(r){
r.control.apply(r,_c);
}
}},ul);
};
d.forEach(this.commands.split(","),function(b,i){
switch(b){
case "prev":
cb("Prev",_1+"Prev"+_9,["prev"]);
break;
case "play/pause":
cb("Play",_2+_9,["play"]);
cb("Pause",_3+_9,["pause"]);
break;
case "info":
this._info=d.create("li",{className:_1+"Info",innerHTML:this._buildInfo(r)},ul);
break;
case "next":
cb("Next",_1+"Next"+_9,["next"]);
break;
case "#":
case "titles":
for(var j=0;j<r.panes.length;j++){
cb(b=="#"?j+1:r.panes[j].title||"Tab "+(j+1),(b=="#"?_4:_5)+" "+(j==r.idx?_6:"")+" "+_1+"Pane"+j,["go",j]);
}
break;
}
},this);
d.query("li:first-child",ul).addClass(_1+"First");
d.query("li:last-child",ul).addClass(_1+"Last");
this._togglePlay();
this._con=d.connect(r,"onUpdate",this,"_onUpdate");
}
},destroy:function(){
d.disconnect(this._con);
d.destroy(this._domNode);
},_togglePlay:function(_d){
var p=this.rotator.playing;
d.query("."+_2,this._domNode).style("display",p?"none":"");
d.query("."+_3,this._domNode).style("display",p?"":"none");
},_buildInfo:function(r){
return "<span>"+(r.idx+1)+" / "+r.panes.length+"</span>";
},_onUpdate:function(_e){
var r=this.rotator;
switch(_e){
case "play":
case "pause":
this._togglePlay();
break;
case "onAfterTransition":
if(this._info){
this._info.innerHTML=this._buildInfo(r);
}
var s=function(n){
if(r.idx<n.length){
d.addClass(n[r.idx],_6);
}
};
s(d.query("."+_4,this._domNode).removeClass(_6));
s(d.query("."+_5,this._domNode).removeClass(_6));
break;
}
}});
})(dojo);
}
