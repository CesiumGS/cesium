/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/fx",["./_base/lang","./Evented","./_base/kernel","./_base/array","./aspect","./_base/fx","./dom","./dom-style","./dom-geometry","./ready","require"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b){
if(!_3.isAsync){
_a(0,function(){
var _c=["./fx/Toggler"];
_b(_c);
});
}
var _d=_3.fx={};
var _e={_fire:function(_f,_10){
if(this[_f]){
this[_f].apply(this,_10||[]);
}
return this;
}};
var _11=function(_12){
this._index=-1;
this._animations=_12||[];
this._current=this._onAnimateCtx=this._onEndCtx=null;
this.duration=0;
_4.forEach(this._animations,function(a){
this.duration+=a.duration;
if(a.delay){
this.duration+=a.delay;
}
},this);
};
_11.prototype=new _2();
_1.extend(_11,{_onAnimate:function(){
this._fire("onAnimate",arguments);
},_onEnd:function(){
this._onAnimateCtx.remove();
this._onEndCtx.remove();
this._onAnimateCtx=this._onEndCtx=null;
if(this._index+1==this._animations.length){
this._fire("onEnd");
}else{
this._current=this._animations[++this._index];
this._onAnimateCtx=_5.after(this._current,"onAnimate",_1.hitch(this,"_onAnimate"),true);
this._onEndCtx=_5.after(this._current,"onEnd",_1.hitch(this,"_onEnd"),true);
this._current.play(0,true);
}
},play:function(_13,_14){
if(!this._current){
this._current=this._animations[this._index=0];
}
if(!_14&&this._current.status()=="playing"){
return this;
}
var _15=_5.after(this._current,"beforeBegin",_1.hitch(this,function(){
this._fire("beforeBegin");
}),true),_16=_5.after(this._current,"onBegin",_1.hitch(this,function(arg){
this._fire("onBegin",arguments);
}),true),_17=_5.after(this._current,"onPlay",_1.hitch(this,function(arg){
this._fire("onPlay",arguments);
_15.remove();
_16.remove();
_17.remove();
}));
if(this._onAnimateCtx){
this._onAnimateCtx.remove();
}
this._onAnimateCtx=_5.after(this._current,"onAnimate",_1.hitch(this,"_onAnimate"),true);
if(this._onEndCtx){
this._onEndCtx.remove();
}
this._onEndCtx=_5.after(this._current,"onEnd",_1.hitch(this,"_onEnd"),true);
this._current.play.apply(this._current,arguments);
return this;
},pause:function(){
if(this._current){
var e=_5.after(this._current,"onPause",_1.hitch(this,function(arg){
this._fire("onPause",arguments);
e.remove();
}),true);
this._current.pause();
}
return this;
},gotoPercent:function(_18,_19){
this.pause();
var _1a=this.duration*_18;
this._current=null;
_4.some(this._animations,function(a){
if(a.duration<=_1a){
this._current=a;
return true;
}
_1a-=a.duration;
return false;
});
if(this._current){
this._current.gotoPercent(_1a/this._current.duration,_19);
}
return this;
},stop:function(_1b){
if(this._current){
if(_1b){
for(;this._index+1<this._animations.length;++this._index){
this._animations[this._index].stop(true);
}
this._current=this._animations[this._index];
}
var e=_5.after(this._current,"onStop",_1.hitch(this,function(arg){
this._fire("onStop",arguments);
e.remove();
}),true);
this._current.stop();
}
return this;
},status:function(){
return this._current?this._current.status():"stopped";
},destroy:function(){
if(this._onAnimateCtx){
this._onAnimateCtx.remove();
}
if(this._onEndCtx){
this._onEndCtx.remove();
}
}});
_1.extend(_11,_e);
_d.chain=function(_1c){
return new _11(_1c);
};
var _1d=function(_1e){
this._animations=_1e||[];
this._connects=[];
this._finished=0;
this.duration=0;
_4.forEach(_1e,function(a){
var _1f=a.duration;
if(a.delay){
_1f+=a.delay;
}
if(this.duration<_1f){
this.duration=_1f;
}
this._connects.push(_5.after(a,"onEnd",_1.hitch(this,"_onEnd"),true));
},this);
this._pseudoAnimation=new _6.Animation({curve:[0,1],duration:this.duration});
var _20=this;
_4.forEach(["beforeBegin","onBegin","onPlay","onAnimate","onPause","onStop","onEnd"],function(evt){
_20._connects.push(_5.after(_20._pseudoAnimation,evt,function(){
_20._fire(evt,arguments);
},true));
});
};
_1.extend(_1d,{_doAction:function(_21,_22){
_4.forEach(this._animations,function(a){
a[_21].apply(a,_22);
});
return this;
},_onEnd:function(){
if(++this._finished>this._animations.length){
this._fire("onEnd");
}
},_call:function(_23,_24){
var t=this._pseudoAnimation;
t[_23].apply(t,_24);
},play:function(_25,_26){
this._finished=0;
this._doAction("play",arguments);
this._call("play",arguments);
return this;
},pause:function(){
this._doAction("pause",arguments);
this._call("pause",arguments);
return this;
},gotoPercent:function(_27,_28){
var ms=this.duration*_27;
_4.forEach(this._animations,function(a){
a.gotoPercent(a.duration<ms?1:(ms/a.duration),_28);
});
this._call("gotoPercent",arguments);
return this;
},stop:function(_29){
this._doAction("stop",arguments);
this._call("stop",arguments);
return this;
},status:function(){
return this._pseudoAnimation.status();
},destroy:function(){
_4.forEach(this._connects,function(_2a){
_2a.remove();
});
}});
_1.extend(_1d,_e);
_d.combine=function(_2b){
return new _1d(_2b);
};
_d.wipeIn=function(_2c){
var _2d=_2c.node=_7.byId(_2c.node),s=_2d.style,o;
var _2e=_6.animateProperty(_1.mixin({properties:{height:{start:function(){
o=s.overflow;
s.overflow="hidden";
if(s.visibility=="hidden"||s.display=="none"){
s.height="1px";
s.display="";
s.visibility="";
return 1;
}else{
var _2f=_8.get(_2d,"height");
return Math.max(_2f,1);
}
},end:function(){
return _2d.scrollHeight;
}}}},_2c));
var _30=function(){
s.height="auto";
s.overflow=o;
};
_5.after(_2e,"onStop",_30,true);
_5.after(_2e,"onEnd",_30,true);
return _2e;
};
_d.wipeOut=function(_31){
var _32=_31.node=_7.byId(_31.node),s=_32.style,o;
var _33=_6.animateProperty(_1.mixin({properties:{height:{end:1}}},_31));
_5.after(_33,"beforeBegin",function(){
o=s.overflow;
s.overflow="hidden";
s.display="";
},true);
var _34=function(){
s.overflow=o;
s.height="auto";
s.display="none";
};
_5.after(_33,"onStop",_34,true);
_5.after(_33,"onEnd",_34,true);
return _33;
};
_d.slideTo=function(_35){
var _36=_35.node=_7.byId(_35.node),top=null,_37=null;
var _38=(function(n){
return function(){
var cs=_8.getComputedStyle(n);
var pos=cs.position;
top=(pos=="absolute"?n.offsetTop:parseInt(cs.top)||0);
_37=(pos=="absolute"?n.offsetLeft:parseInt(cs.left)||0);
if(pos!="absolute"&&pos!="relative"){
var ret=_9.position(n,true);
top=ret.y;
_37=ret.x;
n.style.position="absolute";
n.style.top=top+"px";
n.style.left=_37+"px";
}
};
})(_36);
_38();
var _39=_6.animateProperty(_1.mixin({properties:{top:_35.top||0,left:_35.left||0}},_35));
_5.after(_39,"beforeBegin",_38,true);
return _39;
};
return _d;
});
