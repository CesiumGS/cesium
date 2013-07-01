/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/dnd/Manager",["../_base/array","../_base/declare","../_base/lang","../_base/window","../dom-class","../Evented","../has","../keys","../on","../topic","../touch","./common","./autoscroll","./Avatar"],function(_1,_2,_3,_4,_5,_6,_7,_8,on,_9,_a,_b,_c,_d){
var _e=_2("dojo.dnd.Manager",[_6],{constructor:function(){
this.avatar=null;
this.source=null;
this.nodes=[];
this.copy=true;
this.target=null;
this.canDropFlag=false;
this.events=[];
},OFFSET_X:_7("touch")?0:16,OFFSET_Y:_7("touch")?-64:16,overSource:function(_f){
if(this.avatar){
this.target=(_f&&_f.targetState!="Disabled")?_f:null;
this.canDropFlag=Boolean(this.target);
this.avatar.update();
}
_9.publish("/dnd/source/over",_f);
},outSource:function(_10){
if(this.avatar){
if(this.target==_10){
this.target=null;
this.canDropFlag=false;
this.avatar.update();
_9.publish("/dnd/source/over",null);
}
}else{
_9.publish("/dnd/source/over",null);
}
},startDrag:function(_11,_12,_13){
_c.autoScrollStart(_4.doc);
this.source=_11;
this.nodes=_12;
this.copy=Boolean(_13);
this.avatar=this.makeAvatar();
_4.body().appendChild(this.avatar.node);
_9.publish("/dnd/start",_11,_12,this.copy);
function _14(e){
e.preventDefault();
e.stopPropagation();
};
this.events=[on(_4.doc,_a.move,_3.hitch(this,"onMouseMove")),on(_4.doc,_a.release,_3.hitch(this,"onMouseUp")),on(_4.doc,"keydown",_3.hitch(this,"onKeyDown")),on(_4.doc,"keyup",_3.hitch(this,"onKeyUp")),on(_4.doc,"dragstart",_14),on(_4.body(),"selectstart",_14)];
var c="dojoDnd"+(_13?"Copy":"Move");
_5.add(_4.body(),c);
},canDrop:function(_15){
var _16=Boolean(this.target&&_15);
if(this.canDropFlag!=_16){
this.canDropFlag=_16;
this.avatar.update();
}
},stopDrag:function(){
_5.remove(_4.body(),["dojoDndCopy","dojoDndMove"]);
_1.forEach(this.events,function(_17){
_17.remove();
});
this.events=[];
this.avatar.destroy();
this.avatar=null;
this.source=this.target=null;
this.nodes=[];
},makeAvatar:function(){
return new _d(this);
},updateAvatar:function(){
this.avatar.update();
},onMouseMove:function(e){
var a=this.avatar;
if(a){
_c.autoScrollNodes(e);
var s=a.node.style;
s.left=(e.pageX+this.OFFSET_X)+"px";
s.top=(e.pageY+this.OFFSET_Y)+"px";
var _18=Boolean(this.source.copyState(_b.getCopyKeyState(e)));
if(this.copy!=_18){
this._setCopyStatus(_18);
}
}
if(_7("touch")){
e.preventDefault();
}
},onMouseUp:function(e){
if(this.avatar){
if(this.target&&this.canDropFlag){
var _19=Boolean(this.source.copyState(_b.getCopyKeyState(e)));
_9.publish("/dnd/drop/before",this.source,this.nodes,_19,this.target,e);
_9.publish("/dnd/drop",this.source,this.nodes,_19,this.target,e);
}else{
_9.publish("/dnd/cancel");
}
this.stopDrag();
}
},onKeyDown:function(e){
if(this.avatar){
switch(e.keyCode){
case _8.CTRL:
var _1a=Boolean(this.source.copyState(true));
if(this.copy!=_1a){
this._setCopyStatus(_1a);
}
break;
case _8.ESCAPE:
_9.publish("/dnd/cancel");
this.stopDrag();
break;
}
}
},onKeyUp:function(e){
if(this.avatar&&e.keyCode==_8.CTRL){
var _1b=Boolean(this.source.copyState(false));
if(this.copy!=_1b){
this._setCopyStatus(_1b);
}
}
},_setCopyStatus:function(_1c){
this.copy=_1c;
this.source._markDndStatus(this.copy);
this.updateAvatar();
_5.replace(_4.body(),"dojoDnd"+(this.copy?"Copy":"Move"),"dojoDnd"+(this.copy?"Move":"Copy"));
}});
_b._manager=null;
_e.manager=_b.manager=function(){
if(!_b._manager){
_b._manager=new _e();
}
return _b._manager;
};
return _e;
});
