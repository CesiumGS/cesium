/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.manager.keys"]){
dojo._hasResource["dojox.drawing.manager.keys"]=true;
dojo.provide("dojox.drawing.manager.keys");
(function(){
var _1=false;
var _2=true;
var _3="abcdefghijklmnopqrstuvwxyz";
dojox.drawing.manager.keys={arrowIncrement:1,arrowShiftIncrement:10,shift:false,ctrl:false,alt:false,cmmd:false,meta:false,onDelete:function(_4){
},onEsc:function(_5){
},onEnter:function(_6){
},onArrow:function(_7){
},onKeyDown:function(_8){
},onKeyUp:function(_9){
},listeners:[],register:function(_a){
var _b=dojox.drawing.util.uid("listener");
this.listeners.push({handle:_b,scope:_a.scope||window,callback:_a.callback,keyCode:_a.keyCode});
},_getLetter:function(_c){
if(!_c.meta&&_c.keyCode>=65&&_c.keyCode<=90){
return _3.charAt(_c.keyCode-65);
}
return null;
},_mixin:function(_d){
_d.meta=this.meta;
_d.shift=this.shift;
_d.alt=this.alt;
_d.cmmd=this.cmmd;
_d.letter=this._getLetter(_d);
return _d;
},editMode:function(_e){
_1=_e;
},enable:function(_f){
_2=_f;
},scanForFields:function(){
if(this._fieldCons){
dojo.forEach(this._fieldCons,dojo.disconnect,dojo);
}
this._fieldCons=[];
dojo.query("input").forEach(function(n){
var a=dojo.connect(n,"focus",this,function(evt){
this.enable(false);
});
var b=dojo.connect(n,"blur",this,function(evt){
this.enable(true);
});
this._fieldCons.push(a);
this._fieldCons.push(b);
},this);
},init:function(){
setTimeout(dojo.hitch(this,"scanForFields"),500);
dojo.connect(document,"blur",this,function(evt){
this.meta=this.shift=this.ctrl=this.cmmd=this.alt=false;
});
dojo.connect(document,"keydown",this,function(evt){
if(!_2){
return;
}
if(evt.keyCode==16){
this.shift=true;
}
if(evt.keyCode==17){
this.ctrl=true;
}
if(evt.keyCode==18){
this.alt=true;
}
if(evt.keyCode==224){
this.cmmd=true;
}
this.meta=this.shift||this.ctrl||this.cmmd||this.alt;
if(!_1){
this.onKeyDown(this._mixin(evt));
if(evt.keyCode==8||evt.keyCode==46){
dojo.stopEvent(evt);
}
}
});
dojo.connect(document,"keyup",this,function(evt){
if(!_2){
return;
}
var _10=false;
if(evt.keyCode==16){
this.shift=false;
}
if(evt.keyCode==17){
this.ctrl=false;
}
if(evt.keyCode==18){
this.alt=false;
}
if(evt.keyCode==224){
this.cmmd=false;
}
this.meta=this.shift||this.ctrl||this.cmmd||this.alt;
!_1&&this.onKeyUp(this._mixin(evt));
if(evt.keyCode==13){
console.warn("KEY ENTER");
this.onEnter(evt);
_10=true;
}
if(evt.keyCode==27){
this.onEsc(evt);
_10=true;
}
if(evt.keyCode==8||evt.keyCode==46){
this.onDelete(evt);
_10=true;
}
if(_10&&!_1){
dojo.stopEvent(evt);
}
});
dojo.connect(document,"keypress",this,function(evt){
if(!_2){
return;
}
var inc=this.shift?this.arrowIncrement*this.arrowShiftIncrement:this.arrowIncrement;
var x=0,y=0;
if(evt.keyCode==32&&!_1){
dojo.stopEvent(evt);
}
if(evt.keyCode==37){
x=-inc;
}
if(evt.keyCode==38){
y=-inc;
}
if(evt.keyCode==39){
x=inc;
}
if(evt.keyCode==40){
y=inc;
}
if(x||y){
evt.x=x;
evt.y=y;
evt.shift=this.shift;
if(!_1){
this.onArrow(evt);
dojo.stopEvent(evt);
}
}
});
}};
dojo.addOnLoad(dojox.drawing.manager.keys,"init");
})();
}
