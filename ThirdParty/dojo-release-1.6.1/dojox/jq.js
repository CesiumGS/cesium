/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.jq"]){
dojo._hasResource["dojox.jq"]=true;
dojo.provide("dojox.jq");
dojo.require("dojo.NodeList-traverse");
dojo.require("dojo.NodeList-manipulate");
dojo.require("dojo.io.script");
(function(){
dojo.config.ioPublish=true;
var _1="|img|meta|hr|br|input|";
function _2(_3,_4){
_3+="";
_3=_3.replace(/<\s*(\w+)([^\/\>]*)\/\s*>/g,function(_5,_6,_7){
if(_1.indexOf("|"+_6+"|")==-1){
return "<"+_6+_7+"></"+_6+">";
}else{
return _5;
}
});
return dojo._toDom(_3,_4);
};
function _8(_9){
var _a=_9.indexOf("-");
if(_a!=-1){
if(_a==0){
_9=_9.substring(1);
}
_9=_9.replace(/-(\w)/g,function(_b,_c){
return _c.toUpperCase();
});
}
return _9;
};
var _d=dojo.global.$;
var _e=dojo.global.jQuery;
var $=dojo.global.$=dojo.global.jQuery=function(){
var _f=arguments[0];
if(!_f){
return $._wrap([],null,$);
}else{
if(dojo.isString(_f)){
if(_f.charAt(0)=="<"){
_f=_2(_f);
if(_f.nodeType==11){
_f=_f.childNodes;
}else{
return $._wrap([_f],null,$);
}
}else{
var _10=dojo._NodeListCtor;
dojo._NodeListCtor=$;
var _11=arguments[1];
if(_11&&_11._is$){
_11=_11[0];
}else{
if(dojo.isString(_11)){
_11=dojo.query(_11)[0];
}
}
var nl=dojo.query.call(this,_f,_11);
dojo._NodeListCtor=_10;
return nl;
}
}else{
if(dojo.isFunction(_f)){
$.ready(_f);
return $;
}else{
if(_f==document||_f==window){
return $._wrap([_f],null,$);
}else{
if(dojo.isArray(_f)){
var ary=[];
for(var i=0;i<_f.length;i++){
if(dojo.indexOf(ary,_f[i])==-1){
ary.push(_f[i]);
}
}
return $._wrap(_f,null,$);
}else{
if("nodeType" in _f){
return $._wrap([_f],null,$);
}
}
}
}
}
}
return $._wrap(dojo._toArray(_f),null,$);
};
var _12=dojo.NodeList.prototype;
var f=$.fn=$.prototype=dojo.delegate(_12);
$._wrap=dojo.NodeList._wrap;
var _13=/^H\d/i;
var _14=dojo.query.pseudos;
dojo.mixin(_14,{has:function(_15,_16){
return function(_17){
return $(_16,_17).length;
};
},visible:function(_18,_19){
return function(_1a){
return dojo.style(_1a,"visible")!="hidden"&&dojo.style(_1a,"display")!="none";
};
},hidden:function(_1b,_1c){
return function(_1d){
return _1d.type=="hidden"||dojo.style(_1d,"visible")=="hidden"||dojo.style(_1d,"display")=="none";
};
},selected:function(_1e,_1f){
return function(_20){
return _20.selected;
};
},checked:function(_21,_22){
return function(_23){
return _23.nodeName.toUpperCase()=="INPUT"&&_23.checked;
};
},disabled:function(_24,_25){
return function(_26){
return _26.getAttribute("disabled");
};
},enabled:function(_27,_28){
return function(_29){
return !_29.getAttribute("disabled");
};
},input:function(_2a,_2b){
return function(_2c){
var n=_2c.nodeName.toUpperCase();
return n=="INPUT"||n=="SELECT"||n=="TEXTAREA"||n=="BUTTON";
};
},button:function(_2d,_2e){
return function(_2f){
return (_2f.nodeName.toUpperCase()=="INPUT"&&_2f.type=="button")||_2f.nodeName.toUpperCase()=="BUTTON";
};
},header:function(_30,_31){
return function(_32){
return _32.nodeName.match(_13);
};
}});
var _33={};
dojo.forEach(["text","password","radio","checkbox","submit","image","reset","file"],function(_34){
_33[_34]=function(_35,_36){
return function(_37){
return _37.nodeName.toUpperCase()=="INPUT"&&_37.type==_34;
};
};
});
dojo.mixin(_14,_33);
$.browser={mozilla:dojo.isMoz,msie:dojo.isIE,opera:dojo.isOpera,safari:dojo.isSafari};
$.browser.version=dojo.isIE||dojo.isMoz||dojo.isOpera||dojo.isSafari||dojo.isWebKit;
$.ready=$.fn.ready=function(_38){
dojo.addOnLoad(dojo.hitch(null,_38,$));
return this;
};
f._is$=true;
f.size=function(){
return this.length;
};
$.prop=function(_39,_3a){
if(dojo.isFunction(_3a)){
return _3a.call(_39);
}else{
return _3a;
}
};
$.className={add:dojo.addClass,remove:dojo.removeClass,has:dojo.hasClass};
$.makeArray=function(_3b){
if(typeof _3b=="undefined"){
return [];
}else{
if(_3b.length&&!dojo.isString(_3b)&&!("location" in _3b)){
return dojo._toArray(_3b);
}else{
return [_3b];
}
}
};
$.merge=function(_3c,_3d){
var _3e=[_3c.length,0];
_3e=_3e.concat(_3d);
_3c.splice.apply(_3c,_3e);
return _3c;
};
$.each=function(_3f,cb){
if(dojo.isArrayLike(_3f)){
for(var i=0;i<_3f.length;i++){
if(cb.call(_3f[i],i,_3f[i])===false){
break;
}
}
}else{
if(dojo.isObject(_3f)){
for(var _40 in _3f){
if(cb.call(_3f[_40],_40,_3f[_40])===false){
break;
}
}
}
}
return this;
};
f.each=function(cb){
return $.each.call(this,this,cb);
};
f.eq=function(){
var nl=$();
dojo.forEach(arguments,function(i){
if(this[i]){
nl.push(this[i]);
}
},this);
return nl;
};
f.get=function(_41){
if(_41||_41==0){
return this[_41];
}
return this;
};
f.index=function(arg){
if(arg._is$){
arg=arg[0];
}
return this.indexOf(arg);
};
var _42=[];
var _43=0;
var _44=dojo._scopeName+"DataId";
var _45=function(_46){
var id=_46.getAttribute(_44);
if(!id){
id=_43++;
_46.setAttribute(_44,id);
}
};
var _47=function(_48){
var _49={};
if(_48.nodeType==1){
var id=_45(_48);
_49=_42[id];
if(!_49){
_49=_42[id]={};
}
}
return _49;
};
$.data=function(_4a,_4b,_4c){
var _4d=null;
if(_4b=="events"){
_4d=_4e[_4a.getAttribute(_4f)];
var _50=true;
if(_4d){
for(var _51 in _4d){
_50=false;
break;
}
}
return _50?null:_4d;
}
var _52=_47(_4a);
if(typeof _4c!="undefined"){
_52[_4b]=_4c;
}else{
_4d=_52[_4b];
}
return _4c?this:_4d;
};
$.removeData=function(_53,_54){
var _55=_47(_53);
delete _55[_54];
if(_53.nodeType==1){
var _56=true;
for(var _57 in _55){
_56=false;
break;
}
if(_56){
_53.removeAttribute(_44);
}
}
return this;
};
f.data=function(_58,_59){
var _5a=null;
this.forEach(function(_5b){
_5a=$.data(_5b,_58,_59);
});
return _59?this:_5a;
};
f.removeData=function(_5c){
this.forEach(function(_5d){
$.removeData(_5d,_5c);
});
return this;
};
function _5e(obj,_5f){
if(obj==_5f){
return obj;
}
var _60={};
for(var x in _5f){
if((_60[x]===undefined||_60[x]!=_5f[x])&&_5f[x]!==undefined&&obj!=_5f[x]){
if(dojo.isObject(obj[x])&&dojo.isObject(_5f[x])){
if(dojo.isArray(_5f[x])){
obj[x]=_5f[x];
}else{
obj[x]=_5e(obj[x],_5f[x]);
}
}else{
obj[x]=_5f[x];
}
}
}
if(dojo.isIE&&_5f){
var p=_5f.toString;
if(typeof p=="function"&&p!=obj.toString&&p!=_60.toString&&p!="\nfunction toString() {\n    [native code]\n}\n"){
obj.toString=_5f.toString;
}
}
return obj;
};
f.extend=function(){
var _61=[this];
_61=_61.concat(arguments);
return $.extend.apply($,_61);
};
$.extend=function(){
var _62=arguments,_63;
for(var i=0;i<_62.length;i++){
var obj=_62[i];
if(obj&&dojo.isObject(obj)){
if(!_63){
_63=obj;
}else{
_5e(_63,obj);
}
}
}
return _63;
};
$.noConflict=function(_64){
var me=$;
dojo.global.$=_d;
if(_64){
dojo.global.jQuery=_e;
}
return me;
};
f.attr=function(_65,_66){
if(arguments.length==1&&dojo.isString(arguments[0])){
var _67=this[0];
if(!_67){
return null;
}
var arg=arguments[0];
var _68=dojo.attr(_67,arg);
var _69=_67[arg];
if((arg in _67)&&!dojo.isObject(_69)&&_65!="href"){
return _69;
}else{
return _68||_69;
}
}else{
if(dojo.isObject(_65)){
for(var _6a in _65){
this.attr(_6a,_65[_6a]);
}
return this;
}else{
var _6b=dojo.isFunction(_66);
this.forEach(function(_6c,_6d){
var _6e=_6c[_65];
if((_65 in _6c)&&!dojo.isObject(_6e)&&_65!="href"){
_6c[_65]=(_6b?_66.call(_6c,_6d):_66);
}else{
if(_6c.nodeType==1){
dojo.attr(_6c,_65,(_6b?_66.call(_6c,_6d):_66));
}
}
});
return this;
}
}
};
f.removeAttr=function(_6f){
this.forEach(function(_70,_71){
var _72=_70[_6f];
if((_6f in _70)&&!dojo.isObject(_72)&&_6f!="href"){
delete _70[_6f];
}else{
if(_70.nodeType==1){
if(_6f=="class"){
_70.removeAttribute(_6f);
}else{
dojo.removeAttr(_70,_6f);
}
}
}
});
return this;
};
f.toggleClass=function(_73,_74){
var _75=arguments.length>1;
this.forEach(function(_76){
dojo.toggleClass(_76,_73,_75?_74:!dojo.hasClass(_76,_73));
});
return this;
};
f.toggle=function(){
var _77=arguments;
if(arguments.length>1&&dojo.isFunction(arguments[0])){
var _78=0;
var _79=function(){
var _7a=_77[_78].apply(this,arguments);
_78+=1;
if(_78>_77.length-1){
_78=0;
}
};
return this.bind("click",_79);
}else{
var _7b=arguments.length==1?arguments[0]:undefined;
this.forEach(function(_7c){
var _7d=typeof _7b=="undefined"?dojo.style(_7c,"display")=="none":_7b;
var _7e=(_7d?"show":"hide");
var nl=$(_7c);
nl[_7e].apply(nl,_77);
});
return this;
}
};
f.hasClass=function(_7f){
return this.some(function(_80){
return dojo.hasClass(_80,_7f);
});
};
f.html=f.innerHTML;
dojo.forEach(["filter","slice"],function(_81){
f[_81]=function(){
var nl;
if(dojo.isFunction(arguments[0])){
var _82=arguments[0];
arguments[0]=function(_83,_84){
return _82.call(_83,_83,_84);
};
}
if(_81=="filter"&&dojo.isString(arguments[0])){
var nl=this._filterQueryResult(this,arguments[0]);
}else{
var _85=dojo._NodeListCtor;
dojo._NodeListCtor=f;
nl=$(_12[_81].apply(this,arguments));
dojo._NodeListCtor=_85;
}
return nl._stash(this);
};
});
f.map=function(_86){
return this._buildArrayFromCallback(_86);
};
$.map=function(ary,_87){
return f._buildArrayFromCallback.call(ary,_87);
};
$.inArray=function(_88,ary){
return dojo.indexOf(ary,_88);
};
f.is=function(_89){
return (_89?!!this.filter(_89).length:false);
};
f.not=function(){
var _8a=$.apply($,arguments);
var nl=$(_12.filter.call(this,function(_8b){
return _8a.indexOf(_8b)==-1;
}));
return nl._stash(this);
};
f.add=function(){
return this.concat.apply(this,arguments);
};
function _8c(_8d){
var doc=_8d.contentDocument||(((_8d.name)&&(_8d.document)&&(document.getElementsByTagName("iframe")[_8d.name].contentWindow)&&(document.getElementsByTagName("iframe")[_8d.name].contentWindow.document)))||((_8d.name)&&(document.frames[_8d.name])&&(document.frames[_8d.name].document))||null;
return doc;
};
f.contents=function(){
var ary=[];
this.forEach(function(_8e){
if(_8e.nodeName.toUpperCase()=="IFRAME"){
var doc=_8c(_8e);
if(doc){
ary.push(doc);
}
}else{
var _8f=_8e.childNodes;
for(var i=0;i<_8f.length;i++){
ary.push(_8f[i]);
}
}
});
return this._wrap(ary)._stash(this);
};
f.find=function(_90){
var ary=[];
this.forEach(function(_91){
if(_91.nodeType==1){
ary=ary.concat(dojo._toArray($(_90,_91)));
}
});
return this._getUniqueAsNodeList(ary)._stash(this);
};
f.andSelf=function(){
return this.add(this._parent);
};
f.remove=function(_92){
var nl=(_92?this._filterQueryResult(this,_92):this);
nl.removeData();
nl.forEach(function(_93){
_93.parentNode.removeChild(_93);
});
return this;
};
$.css=function(_94,_95,_96){
_95=_8(_95);
var _97=(_96?dojo.style(_94,_95,_96):dojo.style(_94,_95));
return _97;
};
f.css=function(_98,_99){
if(dojo.isString(_98)){
_98=_8(_98);
if(arguments.length==2){
if(!dojo.isString(_99)&&_98!="zIndex"){
_99=_99+"px";
}
this.forEach(function(_9a){
if(_9a.nodeType==1){
dojo.style(_9a,_98,_99);
}
});
return this;
}else{
_99=dojo.style(this[0],_98);
if(!dojo.isString(_99)&&_98!="zIndex"){
_99=_99+"px";
}
return _99;
}
}else{
for(var _9b in _98){
this.css(_9b,_98[_9b]);
}
return this;
}
};
function _9c(nl,_9d,_9e,_9f){
if(_9f){
var mod={};
mod[_9e]=_9f;
nl.forEach(function(_a0){
dojo[_9d](_a0,mod);
});
return nl;
}else{
return Math.abs(Math.round(dojo[_9d](nl[0])[_9e]));
}
};
f.height=function(_a1){
return _9c(this,"contentBox","h",_a1);
};
f.width=function(_a2){
return _9c(this,"contentBox","w",_a2);
};
function _a3(_a4,_a5,_a6,_a7,_a8){
var _a9=false;
if((_a9=_a4.style.display=="none")){
_a4.style.display="block";
}
var cs=dojo.getComputedStyle(_a4);
var _aa=Math.abs(Math.round(dojo._getContentBox(_a4,cs)[_a5]));
var pad=_a6?Math.abs(Math.round(dojo._getPadExtents(_a4,cs)[_a5])):0;
var _ab=_a7?Math.abs(Math.round(dojo._getBorderExtents(_a4,cs)[_a5])):0;
var _ac=_a8?Math.abs(Math.round(dojo._getMarginExtents(_a4,cs)[_a5])):0;
if(_a9){
_a4.style.display="none";
}
return pad+_aa+_ab+_ac;
};
f.innerHeight=function(){
return _a3(this[0],"h",true);
};
f.innerWidth=function(){
return _a3(this[0],"w",true);
};
f.outerHeight=function(_ad){
return _a3(this[0],"h",true,true,_ad);
};
f.outerWidth=function(_ae){
return _a3(this[0],"w",true,true,_ae);
};
var _4e=[];
var _af=1;
var _4f=dojo._scopeName+"eventid";
var _b0;
function _b1(_b2){
_b2=_b2.split("$$")[0];
var _b3=_b2.indexOf(".");
if(_b3!=-1){
_b2=_b2.substring(0,_b3);
}
return _b2;
};
function _b4(_b5,_b6){
if(_b6.indexOf("ajax")==0){
return dojo.subscribe(_b7[_b6],function(dfd,res){
var _b8=new $.Event(_b6);
if("ajaxComplete|ajaxSend|ajaxSuccess".indexOf(_b6)!=-1){
_b9(_b5,[_b8,dfd.ioArgs.xhr,dfd.ioArgs.args]);
}else{
if(_b6=="ajaxError"){
_b9(_b5,[_b8,dfd.ioArgs.xhr,dfd.ioArgs.args,res]);
}else{
_b9(_b5,[_b8]);
}
}
});
}else{
return dojo.connect(_b5,"on"+_b6,function(e){
_b9(_b5,arguments);
});
}
};
$.Event=function(_ba){
if(this==$){
return new $.Event(_ba);
}
if(typeof _ba=="string"){
this.type=_ba.replace(/!/,"");
}else{
dojo.mixin(this,_ba);
}
this.timeStamp=(new Date()).getTime();
this._isFake=true;
this._isStrict=(this.type.indexOf("!")!=-1);
};
var ep=$.Event.prototype={preventDefault:function(){
this.isDefaultPrevented=this._true;
},stopPropagation:function(){
this.isPropagationStopped=this._true;
},stopImmediatePropagation:function(){
this.isPropagationStopped=this._true;
this.isImmediatePropagationStopped=this._true;
},_true:function(){
return true;
},_false:function(){
return false;
}};
dojo.mixin(ep,{isPropagationStopped:ep._false,isImmediatePropagationStopped:ep._false,isDefaultPrevented:ep._false});
function _bb(_bc,_bd){
_bc=_bc||[];
_bc=[].concat(_bc);
var evt=_bc[0];
if(!evt||!evt.preventDefault){
evt=_bd&&_bd.preventDefault?_bd:new $.Event(_bd);
_bc.unshift(evt);
}
return _bc;
};
var _be=false;
function _b9(_bf,_c0,_c1){
_be=true;
_c0=_c0||_b0;
_c1=_c1;
if(_bf.nodeType==9){
_bf=_bf.documentElement;
}
var _c2=_bf.getAttribute(_4f);
if(!_c2){
return;
}
var evt=_c0[0];
var _c3=evt.type;
var _c4=_b1(_c3);
var cbs=_4e[_c2][_c4];
var _c5;
if(_c1){
_c5=_c1.apply(_bf,_c0);
}
if(_c5!==false){
for(var _c6 in cbs){
if(_c6!="_connectId"&&(!evt._isStrict&&(_c6.indexOf(_c3)==0)||(evt._isStrict&&_c6==_c3))){
evt[dojo._scopeName+"callbackId"]=_c6;
var cb=cbs[_c6];
if(typeof cb.data!="undefined"){
evt.data=cb.data;
}else{
evt.data=null;
}
if((_c5=cb.fn.apply(evt.target,_c0))===false&&!evt._isFake){
dojo.stopEvent(evt);
}
evt.result=_c5;
}
}
}
return _c5;
};
f.triggerHandler=function(_c7,_c8,_c9){
var _ca=this[0];
if(_ca&&_ca.nodeType!=3&&_ca.nodeType!=8){
_c8=_bb(_c8,_c7);
return _b9(_ca,_c8,_c9);
}else{
return undefined;
}
};
f.trigger=function(_cb,_cc,_cd){
_cc=_bb(_cc,_cb);
var evt=_cc[0];
var _cb=_b1(evt.type);
_b0=_cc;
currentExtraFunc=_cd;
var _ce=null;
var _cf=!evt.target;
this.forEach(function(_d0){
if(_d0.nodeType!=3&&_d0.nodeType!=8){
if(_d0.nodeType==9){
_d0=_d0.documentElement;
}
if(evt._isFake){
evt.currentTarget=_d0;
if(_cf){
evt.target=_d0;
}
}
if(_cd){
var _d1=_cc.slice(1);
_ce=_cd.apply(_d0,(_ce=null?_d1:_d1.concat(_ce)));
}
if(_ce!==false){
_be=false;
if(_d0[_cb]){
try{
_ce=_d0[_cb]();
}
catch(e){
}
}else{
if(_d0["on"+_cb]){
try{
_ce=_d0["on"+_cb]();
}
catch(e){
}
}
}
if(!_be){
_ce=_b9(_d0,_cc);
}
var _d2=_d0.parentNode;
if(_ce!==false&&!evt.isImmediatePropagationStopped()&&!evt.isPropagationStopped()&&_d2&&_d2.nodeType==1){
$(_d2).trigger(_cb,_cc,_cd);
}
}
}
});
_b0=null;
currentExtraFunc=null;
return this;
};
var _d3=0;
f.bind=function(_d4,_d5,fn){
_d4=_d4.split(" ");
if(!fn){
fn=_d5;
_d5=null;
}
this.forEach(function(_d6){
if(_d6.nodeType!=3&&_d6.nodeType!=8){
if(_d6.nodeType==9){
_d6=_d6.documentElement;
}
var _d7=_d6.getAttribute(_4f);
if(!_d7){
_d7=_af++;
_d6.setAttribute(_4f,_d7);
_4e[_d7]={};
}
for(var i=0;i<_d4.length;i++){
var _d8=_d4[i];
var _d9=_b1(_d8);
if(_d9==_d8){
_d8=_d9+"$$"+(_d3++);
}
var lls=_4e[_d7];
if(!lls[_d9]){
lls[_d9]={_connectId:_b4(_d6,_d9)};
}
lls[_d9][_d8]={fn:fn,data:_d5};
}
}
});
return this;
};
function _da(src,_db){
var _dc=_db.getAttribute(_4f);
var sls=_4e[_dc];
if(!sls){
return;
}
var _dd=_dd=_af++;
_db.setAttribute(_4f,_dd);
var tls=_4e[_dd]={};
var _de={};
for(var _df in sls){
var _e0=tls[_df]={_connectId:_b4(_db,_df)};
var _e1=sls[_df];
for(var _e2 in _e1){
_e0[_e2]={fn:_e1[_e2].fn,data:_e1[_e2].data};
}
}
};
function _e3(lls,_e4,_e5,_e6,fn){
var _e7=lls[_e4];
if(_e7){
var _e8=_e5.indexOf(".")!=-1;
var _e9=false;
if(_e6){
delete _e7[_e6];
}else{
if(!_e8&&!fn){
_e9=true;
}else{
if(_e8){
if(_e5.charAt(0)=="."){
for(var _ea in _e7){
if(_ea.indexOf(_e5)==_ea.length-_e5.length){
delete _e7[_ea];
}
}
}else{
delete _e7[_e5];
}
}else{
for(var _ea in _e7){
if(_ea.indexOf("$$")!=-1&&_e7[_ea].fn==fn){
delete _e7[_ea];
break;
}
}
}
}
}
var _eb=true;
for(var _ea in _e7){
if(_ea!="_connectId"){
_eb=false;
break;
}
}
if(_e9||_eb){
if(_e4.indexOf("ajax")!=-1){
dojo.unsubscribe(_e7._connectId);
}else{
dojo.disconnect(_e7._connectId);
}
delete lls[_e4];
}
}
};
f.unbind=function(_ec,fn){
var _ed=_ec?_ec[dojo._scopeName+"callbackId"]:null;
_ec=_ec&&_ec.type?_ec.type:_ec;
_ec=_ec?_ec.split(" "):_ec;
this.forEach(function(_ee){
if(_ee.nodeType!=3&&_ee.nodeType!=8){
if(_ee.nodeType==9){
_ee=_ee.documentElement;
}
var _ef=_ee.getAttribute(_4f);
if(_ef){
var lls=_4e[_ef];
if(lls){
var _f0=_ec;
if(!_f0){
_f0=[];
for(var _f1 in lls){
_f0.push(_f1);
}
}
for(var i=0;i<_f0.length;i++){
var _f2=_f0[i];
var _f3=_b1(_f2);
if(_f2.charAt(0)=="."){
for(var _f1 in lls){
_e3(lls,_f1,_f2,_ed,fn);
}
}else{
_e3(lls,_f3,_f2,_ed,fn);
}
}
}
}
}
});
return this;
};
f.one=function(_f4,_f5){
var _f6=function(){
$(this).unbind(_f4,arguments.callee);
return _f5.apply(this,arguments);
};
return this.bind(_f4,_f6);
};
f._cloneNode=function(src){
var _f7=src.cloneNode(true);
if(src.nodeType==1){
var _f8=dojo.query("["+_4f+"]",_f7);
for(var i=0,_f9;_f9=_f8[i];i++){
var _fa=dojo.query("["+_4f+"=\""+_f9.getAttribute(_4f)+"\"]",src)[0];
if(_fa){
_da(_fa,_f9);
}
}
}
return _f7;
};
dojo.getObject("$.event.global",true);
dojo.forEach(["blur","focus","dblclick","click","error","keydown","keypress","keyup","load","mousedown","mouseenter","mouseleave","mousemove","mouseout","mouseover","mouseup","submit","ajaxStart","ajaxSend","ajaxSuccess","ajaxError","ajaxComplete","ajaxStop"],function(evt){
f[evt]=function(_fb){
if(_fb){
this.bind(evt,_fb);
}else{
this.trigger(evt);
}
return this;
};
});
function _fc(_fd){
if(dojo.isString(_fd)){
if(_fd=="slow"){
_fd=700;
}else{
if(_fd="fast"){
_fd=300;
}else{
_fd=500;
}
}
}
return _fd;
};
f.hide=function(_fe,_ff){
_fe=_fc(_fe);
this.forEach(function(node){
var _100=node.style;
var cs=dojo.getComputedStyle(node);
if(cs.display=="none"){
return;
}
_100.overflow="hidden";
_100.display="block";
if(_fe){
dojo.anim(node,{width:0,height:0,opacity:0},_fe,null,function(){
_100.width="";
_100.height="";
_100.display="none";
return _ff&&_ff.call(node);
});
}else{
dojo.style(node,"display","none");
if(_ff){
_ff.call(node);
}
}
});
return this;
};
f.show=function(_101,_102){
_101=_fc(_101);
this.forEach(function(node){
var _103=node.style;
var cs=dojo.getComputedStyle(node);
if(cs.display!="none"){
return;
}
if(_101){
var _104=parseFloat(_103.width);
var _105=parseFloat(_103.height);
if(!_104||!_105){
_103.display="block";
var box=dojo.marginBox(node);
_104=box.w;
_105=box.h;
}
_103.width=0;
_103.height=0;
_103.overflow="hidden";
dojo.attr(node,"opacity",0);
_103.display="block";
dojo.anim(node,{width:_104,height:_105,opacity:1},_101,null,_102?dojo.hitch(node,_102):undefined);
}else{
dojo.style(node,"display","block");
if(_102){
_102.call(node);
}
}
});
return this;
};
$.ajaxSettings={};
$.ajaxSetup=function(args){
dojo.mixin($.ajaxSettings,args);
};
var _b7={"ajaxStart":"/dojo/io/start","ajaxSend":"/dojo/io/send","ajaxSuccess":"/dojo/io/load","ajaxError":"/dojo/io/error","ajaxComplete":"/dojo/io/done","ajaxStop":"/dojo/io/stop"};
for(var _106 in _b7){
if(_106.indexOf("ajax")==0){
(function(_107){
f[_107]=function(_108){
this.forEach(function(node){
dojo.subscribe(_b7[_107],function(){
var _109=new $.Event(_107);
var _10a=arguments[0]&&arguments[0].ioArgs;
var xhr=_10a&&_10a.xhr;
var args=_10a&&_10a.args;
var res=arguments[1];
if("ajaxComplete|ajaxSend|ajaxSuccess".indexOf(_107)!=-1){
return _108.call(node,_109,xhr,args);
}else{
if(_107=="ajaxError"){
return _108.call(node,_109,xhr,args,res);
}else{
return _108.call(node,_109);
}
}
});
});
return this;
};
})(_106);
}
}
var _10b=dojo._xhrObj;
dojo._xhrObj=function(args){
var xhr=_10b.apply(dojo,arguments);
if(args&&args.beforeSend){
if(args.beforeSend(xhr)===false){
return false;
}
}
return xhr;
};
$.ajax=function(args){
var temp=dojo.delegate($.ajaxSettings);
for(var _10c in args){
if(_10c=="data"&&dojo.isObject(args[_10c])&&dojo.isObject(temp.data)){
for(var prop in args[_10c]){
temp.data[prop]=args[_10c][prop];
}
}else{
temp[_10c]=args[_10c];
}
}
args=temp;
var url=args.url;
if("async" in args){
args.sync=!args.async;
}
if(args.global===false){
args.ioPublish=false;
}
if(args.data){
var data=args.data;
if(dojo.isString(data)){
args.content=dojo.queryToObject(data);
}else{
for(var _10c in data){
if(dojo.isFunction(data[_10c])){
data[_10c]=data[_10c]();
}
}
args.content=data;
}
}
var _10d=args.dataType;
if("dataType" in args){
if(_10d=="script"){
_10d="javascript";
}else{
if(_10d=="html"){
_10d="text";
}
}
args.handleAs=_10d;
}else{
_10d=args.handleAs="text";
args.guessedType=true;
}
if("cache" in args){
args.preventCache=!args.cache;
}else{
if(args.dataType=="script"||args.dataType=="jsonp"){
args.preventCache=true;
}
}
if(args.error){
args._jqueryError=args.error;
delete args.error;
}
args.handle=function(_10e,_10f){
var _110="success";
if(_10e instanceof Error){
_110=(_10e.dojoType=="timeout"?"timeout":"error");
if(args._jqueryError){
args._jqueryError(_10f.xhr,_110,_10e);
}
}else{
var xml=(_10f.args.guessedType&&_10f.xhr&&_10f.xhr.responseXML);
if(xml){
_10e=xml;
}
if(args.success){
args.success(_10e,_110,_10f.xhr);
}
}
if(args.complete){
args.complete(_10e,_110,_10f.xhr);
}
return _10e;
};
var _111=(_10d=="jsonp");
if(_10d=="javascript"){
var _112=url.indexOf(":");
var _113=url.indexOf("/");
if(_112>0&&_112<_113){
var _114=url.indexOf("/",_113+2);
if(_114==-1){
_114=url.length;
}
if(location.protocol!=url.substring(0,_112+1)||location.hostname!=url.substring(_113+2,_114)){
_111=true;
}
}
}
if(_111){
if(_10d=="jsonp"){
var cb=args.jsonp;
if(!cb){
var _115=args.url.split("?")[1];
if(_115&&(_115=dojo.queryToObject(_115))){
cb=_116(_115);
if(cb){
var _117=new RegExp("([&\\?])?"+cb+"=?");
args.url=args.url.replace(_117+"=?");
}
}
if(!cb){
cb=_116(args.content);
if(cb){
delete args.content[cb];
}
}
}
args.jsonp=cb||"callback";
}
var dfd=dojo.io.script.get(args);
return dfd;
}else{
var dfd=dojo.xhr(args.type||"GET",args);
return dfd.ioArgs.xhr===false?false:dfd.ioArgs.xhr;
}
};
function _116(obj){
for(var prop in obj){
if(prop.indexOf("callback")==prop.length-8){
return prop;
}
}
return null;
};
$.getpost=function(_118,url,data,_119,_11a){
var args={url:url,type:_118};
if(data){
if(dojo.isFunction(data)&&!_119){
args.complete=data;
}else{
args.data=data;
}
}
if(_119){
if(dojo.isString(_119)&&!_11a){
_11a=_119;
}else{
args.complete=_119;
}
}
if(_11a){
args.dataType=_11a;
}
return $.ajax(args);
};
$.get=dojo.hitch($,"getpost","GET");
$.post=dojo.hitch($,"getpost","POST");
$.getJSON=function(url,data,_11b){
return $.getpost("GET",url,data,_11b,"json");
};
$.getScript=function(url,_11c){
return $.ajax({url:url,success:_11c,dataType:"script"});
};
f.load=function(url,data,_11d){
var node=this[0];
if(!node||!node.nodeType||node.nodeType==9){
dojo.addOnLoad(url);
return this;
}
var _11e=url.split(/\s+/);
url=_11e[0];
var _11f=_11e[1];
var _120=_11d||data;
var cb=dojo.hitch(this,function(_121,_122,xhr){
var _123=_121.match(/\<\s*body[^>]+>.*<\/body\s*>/i);
if(_123){
_121=_123;
}
var _124=dojo._toDom(_121);
if(_11f){
var temp=$(dojo.create("div"));
temp.append(_124);
_124=temp.find(_11f);
}else{
_124=$(_124.nodeType==11?_124.childNodes:_124);
}
this.html(_124);
if(_120){
setTimeout(dojo.hitch(this,function(){
this.forEach(function(node){
_120.call(node,_121,_122,xhr);
});
}),10);
}
});
if(!_11d){
data=cb;
}else{
_11d=cb;
}
var _125="GET";
if(data&&dojo.isObject(data)){
_125="POST";
}
$.getpost(_125,url,data,_11d,"html");
return this;
};
var _126="file|submit|image|reset|button|";
f.serialize=function(){
var ret="";
var strs=this.map(function(node){
if(node.nodeName.toUpperCase()=="FORM"){
return dojo.formToQuery(node);
}else{
var type=(node.type||"").toLowerCase();
if(_126.indexOf(type)==-1){
var val=dojo.fieldToObject(node);
if(node.name&&val!=null){
var q={};
q[node.name]=val;
return dojo.objectToQuery(q);
}
}
}
});
return ret+strs.join("&");
};
$.param=function(obj){
if(obj._is$&&obj.serialize){
return obj.serialize();
}else{
if(dojo.isArray(obj)){
return dojo.map(obj,function(item){
return $.param(item);
}).join("&");
}else{
return dojo.objectToQuery(obj);
}
}
};
$.isFunction=function(){
var _127=dojo.isFunction.apply(dojo,arguments);
if(_127){
_127=(typeof (arguments[0])!="object");
}
return _127;
};
})();
}
