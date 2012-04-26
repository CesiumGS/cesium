/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.observable"]){
dojo._hasResource["dojox.lang.observable"]=true;
dojo.provide("dojox.lang.observable");
dojo.experimental("dojox.lang.observable");
dojox.lang.observable=function(_1,_2,_3,_4){
return dojox.lang.makeObservable(_2,_3,_4)(_1);
};
dojox.lang.makeObservable=function(_5,_6,_7,_8){
_8=_8||{};
_7=_7||function(_9,_a,_b,_c){
return _a[_b].apply(_9,_c);
};
function _d(_e,_f,i){
return function(){
return _7(_e,_f,i,arguments);
};
};
if(dojox.lang.lettableWin){
var _10=dojox.lang.makeObservable;
_10.inc=(_10.inc||0)+1;
var _11="gettable_"+_10.inc;
dojox.lang.lettableWin[_11]=_5;
var _12="settable_"+_10.inc;
dojox.lang.lettableWin[_12]=_6;
var _13={};
return function(_14){
if(_14.__observable){
return _14.__observable;
}
if(_14.data__){
throw new Error("Can wrap an object that is already wrapped");
}
var _15=[],i,l;
for(i in _8){
_15.push(i);
}
var _16={type:1,event:1};
for(i in _14){
if(i.match(/^[a-zA-Z][\w\$_]*$/)&&!(i in _8)&&!(i in _16)){
_15.push(i);
}
}
var _17=_15.join(",");
var _18,_19=_13[_17];
if(!_19){
var _1a="dj_lettable_"+(_10.inc++);
var _1b=_1a+"_dj_getter";
var _1c=["Class "+_1a,"\tPublic data__"];
for(i=0,l=_15.length;i<l;i++){
_18=_15[i];
var _1d=typeof _14[_18];
if(_1d=="function"||_8[_18]){
_1c.push("  Public "+_18);
}else{
if(_1d!="object"){
_1c.push("\tPublic Property Let "+_18+"(val)","\t\tCall "+_12+"(me.data__,\""+_18+"\",val)","\tEnd Property","\tPublic Property Get "+_18,"\t\t"+_18+" = "+_11+"(me.data__,\""+_18+"\")","\tEnd Property");
}
}
}
_1c.push("End Class");
_1c.push("Function "+_1b+"()","\tDim tmp","\tSet tmp = New "+_1a,"\tSet "+_1b+" = tmp","End Function");
dojox.lang.lettableWin.vbEval(_1c.join("\n"));
_13[_17]=_19=function(){
return dojox.lang.lettableWin.construct(_1b);
};
}
var _1e=_19();
_1e.data__=_14;
try{
_14.__observable=_1e;
}
catch(e){
}
for(i=0,l=_15.length;i<l;i++){
_18=_15[i];
try{
var val=_14[_18];
}
catch(e){
}
if(typeof val=="function"||_8[_18]){
_1e[_18]=_d(_1e,_14,_18);
}
}
return _1e;
};
}else{
return function(_1f){
if(_1f.__observable){
return _1f.__observable;
}
var _20=_1f instanceof Array?[]:{};
_20.data__=_1f;
for(var i in _1f){
if(i.charAt(0)!="_"){
if(typeof _1f[i]=="function"){
_20[i]=_d(_20,_1f,i);
}else{
if(typeof _1f[i]!="object"){
(function(i){
_20.__defineGetter__(i,function(){
return _5(_1f,i);
});
_20.__defineSetter__(i,function(_21){
return _6(_1f,i,_21);
});
})(i);
}
}
}
}
for(i in _8){
_20[i]=_d(_20,_1f,i);
}
_1f.__observable=_20;
return _20;
};
}
};
if(!{}.__defineGetter__){
if(dojo.isIE){
var frame;
if(document.body){
frame=document.createElement("iframe");
document.body.appendChild(frame);
}else{
document.write("<iframe id='dj_vb_eval_frame'></iframe>");
frame=document.getElementById("dj_vb_eval_frame");
}
frame.style.display="none";
var doc=frame.contentWindow.document;
dojox.lang.lettableWin=frame.contentWindow;
doc.write("<html><head><script language=\"VBScript\" type=\"text/VBScript\">"+"Function vb_global_eval(code)"+"ExecuteGlobal(code)"+"End Function"+"</script>"+"<script type=\"text/javascript\">"+"function vbEval(code){ \n"+"return vb_global_eval(code);"+"}"+"function construct(name){ \n"+"return window[name]();"+"}"+"</script>"+"</head><body>vb-eval</body></html>");
doc.close();
}else{
throw new Error("This browser does not support getters and setters");
}
}
dojox.lang.ReadOnlyProxy=dojox.lang.makeObservable(function(obj,i){
return obj[i];
},function(obj,i,_22){
});
}
