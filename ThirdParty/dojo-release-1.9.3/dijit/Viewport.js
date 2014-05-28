//>>built
define("dijit/Viewport",["dojo/Evented","dojo/on","dojo/domReady","dojo/sniff","dojo/window"],function(_1,on,_2,_3,_4){
var _5=new _1();
var _6;
_2(function(){
var _7=_4.getBox();
_5._rlh=on(window,"resize",function(){
var _8=_4.getBox();
if(_7.h==_8.h&&_7.w==_8.w){
return;
}
_7=_8;
_5.emit("resize");
});
if(_3("ie")==8){
var _9=screen.deviceXDPI;
setInterval(function(){
if(screen.deviceXDPI!=_9){
_9=screen.deviceXDPI;
_5.emit("resize");
}
},500);
}
if(_3("ios")){
on(document,"focusin",function(_a){
_6=_a.target;
});
on(document,"focusout",function(_b){
_6=null;
});
}
});
_5.getEffectiveBox=function(_c){
var _d=_4.getBox(_c);
var _e=_6&&_6.tagName&&_6.tagName.toLowerCase();
if(_3("ios")&&_6&&!_6.readOnly&&(_e=="textarea"||(_e=="input"&&/^(color|email|number|password|search|tel|text|url)$/.test(_6.type)))){
_d.h*=(orientation==0||orientation==180?0.66:0.4);
var _f=_6.getBoundingClientRect();
_d.h=Math.max(_d.h,_f.top+_f.height);
}
return _d;
};
return _5;
});
