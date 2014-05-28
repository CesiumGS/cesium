/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/iframe",["module","require","./watch","./util","./handlers","../_base/lang","../io-query","../query","../has","../dom","../dom-construct","../_base/window","../NodeList-dom"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,_a,_b,_c){
var _d=_1.id.replace(/[\/\.\-]/g,"_"),_e=_d+"_onload";
if(!_c.global[_e]){
_c.global[_e]=function(){
var _f=_10._currentDfd;
if(!_f){
_10._fireNextRequest();
return;
}
var _11=_f.response,_12=_11.options,_13=_a.byId(_12.form)||_f._tmpForm;
if(_13){
var _14=_f._contentToClean;
for(var i=0;i<_14.length;i++){
var key=_14[i];
for(var j=0;j<_13.childNodes.length;j++){
var _15=_13.childNodes[j];
if(_15.name===key){
_b.destroy(_15);
break;
}
}
}
_f._originalAction&&_13.setAttribute("action",_f._originalAction);
if(_f._originalMethod){
_13.setAttribute("method",_f._originalMethod);
_13.method=_f._originalMethod;
}
if(_f._originalTarget){
_13.setAttribute("target",_f._originalTarget);
_13.target=_f._originalTarget;
}
}
if(_f._tmpForm){
_b.destroy(_f._tmpForm);
delete _f._tmpForm;
}
_f._finished=true;
};
}
function _16(_17,_18,uri){
if(_c.global[_17]){
return _c.global[_17];
}
if(_c.global.frames[_17]){
return _c.global.frames[_17];
}
if(!uri){
if(_9("config-useXDomain")&&!_9("config-dojoBlankHtmlUrl")){
console.warn("dojo/request/iframe: When using cross-domain Dojo builds,"+" please save dojo/resources/blank.html to your domain and set dojoConfig.dojoBlankHtmlUrl"+" to the path on your domain to blank.html");
}
uri=(_9("config-dojoBlankHtmlUrl")||_2.toUrl("dojo/resources/blank.html"));
}
var _19=_b.place("<iframe id=\""+_17+"\" name=\""+_17+"\" src=\""+uri+"\" onload=\""+_18+"\" style=\"position: absolute; left: 1px; top: 1px; height: 1px; width: 1px; visibility: hidden\">",_c.body());
_c.global[_17]=_19;
return _19;
};
function _1a(_1b,src,_1c){
var _1d=_c.global.frames[_1b.name];
if(_1d.contentWindow){
_1d=_1d.contentWindow;
}
try{
if(!_1c){
_1d.location=src;
}else{
_1d.location.replace(src);
}
}
catch(e){
}
};
function doc(_1e){
if(_1e.contentDocument){
return _1e.contentDocument;
}
var _1f=_1e.name;
if(_1f){
var _20=_c.doc.getElementsByTagName("iframe");
if(_1e.document&&_20[_1f].contentWindow&&_20[_1f].contentWindow.document){
return _20[_1f].contentWindow.document;
}else{
if(_c.doc.frames[_1f]&&_c.doc.frames[_1f].document){
return _c.doc.frames[_1f].document;
}
}
}
return null;
};
function _21(){
return _b.create("form",{name:_d+"_form",style:{position:"absolute",top:"-1000px",left:"-1000px"}},_c.body());
};
function _22(){
var dfd;
try{
if(_10._currentDfd||!_10._dfdQueue.length){
return;
}
do{
dfd=_10._currentDfd=_10._dfdQueue.shift();
}while(dfd&&(dfd.canceled||(dfd.isCanceled&&dfd.isCanceled()))&&_10._dfdQueue.length);
if(!dfd||dfd.canceled||(dfd.isCanceled&&dfd.isCanceled())){
_10._currentDfd=null;
return;
}
var _23=dfd.response,_24=_23.options,c2c=dfd._contentToClean=[],_25=_a.byId(_24.form),_26=_4.notify,_27=_24.data||null,_28;
if(!dfd._legacy&&_24.method==="POST"&&!_25){
_25=dfd._tmpForm=_21();
}else{
if(_24.method==="GET"&&_25&&_23.url.indexOf("?")>-1){
_28=_23.url.slice(_23.url.indexOf("?")+1);
_27=_6.mixin(_7.queryToObject(_28),_27);
}
}
if(_25){
if(!dfd._legacy){
var _29=_25;
do{
_29=_29.parentNode;
}while(_29!==_c.doc.documentElement);
if(!_29){
_25.style.position="absolute";
_25.style.left="-1000px";
_25.style.top="-1000px";
_c.body().appendChild(_25);
}
if(!_25.name){
_25.name=_d+"_form";
}
}
if(_27){
var _2a=function(_2b,_2c){
_b.create("input",{type:"hidden",name:_2b,value:_2c},_25);
c2c.push(_2b);
};
for(var x in _27){
var val=_27[x];
if(_6.isArray(val)&&val.length>1){
for(var i=0;i<val.length;i++){
_2a(x,val[i]);
}
}else{
if(!_25[x]){
_2a(x,val);
}else{
_25[x].value=val;
}
}
}
}
var _2d=_25.getAttributeNode("action"),_2e=_25.getAttributeNode("method"),_2f=_25.getAttributeNode("target");
if(_23.url){
dfd._originalAction=_2d?_2d.value:null;
if(_2d){
_2d.value=_23.url;
}else{
_25.setAttribute("action",_23.url);
}
}
if(!dfd._legacy){
dfd._originalMethod=_2e?_2e.value:null;
if(_2e){
_2e.value=_24.method;
}else{
_25.setAttribute("method",_24.method);
}
}else{
if(!_2e||!_2e.value){
if(_2e){
_2e.value=_24.method;
}else{
_25.setAttribute("method",_24.method);
}
}
}
dfd._originalTarget=_2f?_2f.value:null;
if(_2f){
_2f.value=_10._iframeName;
}else{
_25.setAttribute("target",_10._iframeName);
}
_25.target=_10._iframeName;
_26&&_26.emit("send",_23,dfd.promise.cancel);
_10._notifyStart(_23);
_25.submit();
}else{
var _30="";
if(_23.options.data){
_30=_23.options.data;
if(typeof _30!=="string"){
_30=_7.objectToQuery(_30);
}
}
var _31=_23.url+(_23.url.indexOf("?")>-1?"&":"?")+_30;
_26&&_26.emit("send",_23,dfd.promise.cancel);
_10._notifyStart(_23);
_10.setSrc(_10._frame,_31,true);
}
}
catch(e){
dfd.reject(e);
}
};
function _32(_33){
return !this.isFulfilled();
};
function _34(_35){
return !!this._finished;
};
function _36(_37,_38){
if(!_38){
try{
var _39=_37.options,doc=_10.doc(_10._frame),_3a=_39.handleAs;
if(_3a!=="html"){
if(_3a==="xml"){
if(doc.documentElement.tagName.toLowerCase()==="html"){
_8("a",doc.documentElement).orphan();
var _3b=doc.documentElement.innerText;
_3b=_3b.replace(/>\s+</g,"><");
_37.text=_6.trim(_3b);
}else{
_37.data=doc;
}
}else{
_37.text=doc.getElementsByTagName("textarea")[0].value;
}
_5(_37);
}else{
_37.data=doc;
}
}
catch(e){
_38=e;
}
}
if(_38){
this.reject(_38);
}else{
if(this._finished){
this.resolve(_37);
}else{
this.reject(new Error("Invalid dojo/request/iframe request state"));
}
}
};
function _3c(_3d){
this._callNext();
};
var _3e={method:"POST"};
function _10(url,_3f,_40){
var _41=_4.parseArgs(url,_4.deepCreate(_3e,_3f),true);
url=_41.url;
_3f=_41.options;
if(_3f.method!=="GET"&&_3f.method!=="POST"){
throw new Error(_3f.method+" not supported by dojo/request/iframe");
}
if(!_10._frame){
_10._frame=_10.create(_10._iframeName,_e+"();");
}
var dfd=_4.deferred(_41,null,_32,_34,_36,_3c);
dfd._callNext=function(){
if(!this._calledNext){
this._calledNext=true;
_10._currentDfd=null;
_10._fireNextRequest();
}
};
dfd._legacy=_40;
_10._dfdQueue.push(dfd);
_10._fireNextRequest();
_3(dfd);
return _40?dfd:dfd.promise;
};
_10.create=_16;
_10.doc=doc;
_10.setSrc=_1a;
_10._iframeName=_d+"_IoIframe";
_10._notifyStart=function(){
};
_10._dfdQueue=[];
_10._currentDfd=null;
_10._fireNextRequest=_22;
_4.addCommonMethods(_10,["GET","POST"]);
return _10;
});
