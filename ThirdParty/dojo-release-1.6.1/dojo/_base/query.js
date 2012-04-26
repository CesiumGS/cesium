/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.query"]){
dojo._hasResource["dojo._base.query"]=true;
(function(){
var _1=function(d){
var _2=d.trim;
var _3=d.forEach;
var _4=(d._NodeListCtor=d.NodeList);
var _5=function(){
return d.doc;
};
var _6=((d.isWebKit||d.isMozilla)&&((_5().compatMode)=="BackCompat"));
var _7=!!_5().firstChild["children"]?"children":"childNodes";
var _8=">~+";
var _9=false;
var _a=function(){
return true;
};
var _b=function(_c){
if(_8.indexOf(_c.slice(-1))>=0){
_c+=" * ";
}else{
_c+=" ";
}
var ts=function(s,e){
return _2(_c.slice(s,e));
};
var _d=[];
var _e=-1,_f=-1,_10=-1,_11=-1,_12=-1,_13=-1,_14=-1,lc="",cc="",_15;
var x=0,ql=_c.length,_16=null,_17=null;
var _18=function(){
if(_14>=0){
var tv=(_14==x)?null:ts(_14,x);
_16[(_8.indexOf(tv)<0)?"tag":"oper"]=tv;
_14=-1;
}
};
var _19=function(){
if(_13>=0){
_16.id=ts(_13,x).replace(/\\/g,"");
_13=-1;
}
};
var _1a=function(){
if(_12>=0){
_16.classes.push(ts(_12+1,x).replace(/\\/g,""));
_12=-1;
}
};
var _1b=function(){
_19();
_18();
_1a();
};
var _1c=function(){
_1b();
if(_11>=0){
_16.pseudos.push({name:ts(_11+1,x)});
}
_16.loops=(_16.pseudos.length||_16.attrs.length||_16.classes.length);
_16.oquery=_16.query=ts(_15,x);
_16.otag=_16.tag=(_16["oper"])?null:(_16.tag||"*");
if(_16.tag){
_16.tag=_16.tag.toUpperCase();
}
if(_d.length&&(_d[_d.length-1].oper)){
_16.infixOper=_d.pop();
_16.query=_16.infixOper.query+" "+_16.query;
}
_d.push(_16);
_16=null;
};
for(;lc=cc,cc=_c.charAt(x),x<ql;x++){
if(lc=="\\"){
continue;
}
if(!_16){
_15=x;
_16={query:null,pseudos:[],attrs:[],classes:[],tag:null,oper:null,id:null,getTag:function(){
return (_9)?this.otag:this.tag;
}};
_14=x;
}
if(_e>=0){
if(cc=="]"){
if(!_17.attr){
_17.attr=ts(_e+1,x);
}else{
_17.matchFor=ts((_10||_e+1),x);
}
var cmf=_17.matchFor;
if(cmf){
if((cmf.charAt(0)=="\"")||(cmf.charAt(0)=="'")){
_17.matchFor=cmf.slice(1,-1);
}
}
_16.attrs.push(_17);
_17=null;
_e=_10=-1;
}else{
if(cc=="="){
var _1d=("|~^$*".indexOf(lc)>=0)?lc:"";
_17.type=_1d+cc;
_17.attr=ts(_e+1,x-_1d.length);
_10=x+1;
}
}
}else{
if(_f>=0){
if(cc==")"){
if(_11>=0){
_17.value=ts(_f+1,x);
}
_11=_f=-1;
}
}else{
if(cc=="#"){
_1b();
_13=x+1;
}else{
if(cc=="."){
_1b();
_12=x;
}else{
if(cc==":"){
_1b();
_11=x;
}else{
if(cc=="["){
_1b();
_e=x;
_17={};
}else{
if(cc=="("){
if(_11>=0){
_17={name:ts(_11+1,x),value:null};
_16.pseudos.push(_17);
}
_f=x;
}else{
if((cc==" ")&&(lc!=cc)){
_1c();
}
}
}
}
}
}
}
}
}
return _d;
};
var _1e=function(_1f,_20){
if(!_1f){
return _20;
}
if(!_20){
return _1f;
}
return function(){
return _1f.apply(window,arguments)&&_20.apply(window,arguments);
};
};
var _21=function(i,arr){
var r=arr||[];
if(i){
r.push(i);
}
return r;
};
var _22=function(n){
return (1==n.nodeType);
};
var _23="";
var _24=function(_25,_26){
if(!_25){
return _23;
}
if(_26=="class"){
return _25.className||_23;
}
if(_26=="for"){
return _25.htmlFor||_23;
}
if(_26=="style"){
return _25.style.cssText||_23;
}
return (_9?_25.getAttribute(_26):_25.getAttribute(_26,2))||_23;
};
var _27={"*=":function(_28,_29){
return function(_2a){
return (_24(_2a,_28).indexOf(_29)>=0);
};
},"^=":function(_2b,_2c){
return function(_2d){
return (_24(_2d,_2b).indexOf(_2c)==0);
};
},"$=":function(_2e,_2f){
var _30=" "+_2f;
return function(_31){
var ea=" "+_24(_31,_2e);
return (ea.lastIndexOf(_2f)==(ea.length-_2f.length));
};
},"~=":function(_32,_33){
var _34=" "+_33+" ";
return function(_35){
var ea=" "+_24(_35,_32)+" ";
return (ea.indexOf(_34)>=0);
};
},"|=":function(_36,_37){
var _38=" "+_37+"-";
return function(_39){
var ea=" "+_24(_39,_36);
return ((ea==_37)||(ea.indexOf(_38)==0));
};
},"=":function(_3a,_3b){
return function(_3c){
return (_24(_3c,_3a)==_3b);
};
}};
var _3d=(typeof _5().firstChild.nextElementSibling=="undefined");
var _3e=!_3d?"nextElementSibling":"nextSibling";
var _3f=!_3d?"previousElementSibling":"previousSibling";
var _40=(_3d?_22:_a);
var _41=function(_42){
while(_42=_42[_3f]){
if(_40(_42)){
return false;
}
}
return true;
};
var _43=function(_44){
while(_44=_44[_3e]){
if(_40(_44)){
return false;
}
}
return true;
};
var _45=function(_46){
var _47=_46.parentNode;
var i=0,_48=_47[_7],ci=(_46["_i"]||-1),cl=(_47["_l"]||-1);
if(!_48){
return -1;
}
var l=_48.length;
if(cl==l&&ci>=0&&cl>=0){
return ci;
}
_47["_l"]=l;
ci=-1;
for(var te=_47["firstElementChild"]||_47["firstChild"];te;te=te[_3e]){
if(_40(te)){
te["_i"]=++i;
if(_46===te){
ci=i;
}
}
}
return ci;
};
var _49=function(_4a){
return !((_45(_4a))%2);
};
var _4b=function(_4c){
return ((_45(_4c))%2);
};
var _4d={"checked":function(_4e,_4f){
return function(_50){
return !!("checked" in _50?_50.checked:_50.selected);
};
},"first-child":function(){
return _41;
},"last-child":function(){
return _43;
},"only-child":function(_51,_52){
return function(_53){
if(!_41(_53)){
return false;
}
if(!_43(_53)){
return false;
}
return true;
};
},"empty":function(_54,_55){
return function(_56){
var cn=_56.childNodes;
var cnl=_56.childNodes.length;
for(var x=cnl-1;x>=0;x--){
var nt=cn[x].nodeType;
if((nt===1)||(nt==3)){
return false;
}
}
return true;
};
},"contains":function(_57,_58){
var cz=_58.charAt(0);
if(cz=="\""||cz=="'"){
_58=_58.slice(1,-1);
}
return function(_59){
return (_59.innerHTML.indexOf(_58)>=0);
};
},"not":function(_5a,_5b){
var p=_b(_5b)[0];
var _5c={el:1};
if(p.tag!="*"){
_5c.tag=1;
}
if(!p.classes.length){
_5c.classes=1;
}
var ntf=_5d(p,_5c);
return function(_5e){
return (!ntf(_5e));
};
},"nth-child":function(_5f,_60){
var pi=parseInt;
if(_60=="odd"){
return _4b;
}else{
if(_60=="even"){
return _49;
}
}
if(_60.indexOf("n")!=-1){
var _61=_60.split("n",2);
var _62=_61[0]?((_61[0]=="-")?-1:pi(_61[0])):1;
var idx=_61[1]?pi(_61[1]):0;
var lb=0,ub=-1;
if(_62>0){
if(idx<0){
idx=(idx%_62)&&(_62+(idx%_62));
}else{
if(idx>0){
if(idx>=_62){
lb=idx-idx%_62;
}
idx=idx%_62;
}
}
}else{
if(_62<0){
_62*=-1;
if(idx>0){
ub=idx;
idx=idx%_62;
}
}
}
if(_62>0){
return function(_63){
var i=_45(_63);
return (i>=lb)&&(ub<0||i<=ub)&&((i%_62)==idx);
};
}else{
_60=idx;
}
}
var _64=pi(_60);
return function(_65){
return (_45(_65)==_64);
};
}};
var _66=(d.isIE<9||(dojo.isIE&&dojo.isQuirks))?function(_67){
var clc=_67.toLowerCase();
if(clc=="class"){
_67="className";
}
return function(_68){
return (_9?_68.getAttribute(_67):_68[_67]||_68[clc]);
};
}:function(_69){
return function(_6a){
return (_6a&&_6a.getAttribute&&_6a.hasAttribute(_69));
};
};
var _5d=function(_6b,_6c){
if(!_6b){
return _a;
}
_6c=_6c||{};
var ff=null;
if(!("el" in _6c)){
ff=_1e(ff,_22);
}
if(!("tag" in _6c)){
if(_6b.tag!="*"){
ff=_1e(ff,function(_6d){
return (_6d&&(_6d.tagName==_6b.getTag()));
});
}
}
if(!("classes" in _6c)){
_3(_6b.classes,function(_6e,idx,arr){
var re=new RegExp("(?:^|\\s)"+_6e+"(?:\\s|$)");
ff=_1e(ff,function(_6f){
return re.test(_6f.className);
});
ff.count=idx;
});
}
if(!("pseudos" in _6c)){
_3(_6b.pseudos,function(_70){
var pn=_70.name;
if(_4d[pn]){
ff=_1e(ff,_4d[pn](pn,_70.value));
}
});
}
if(!("attrs" in _6c)){
_3(_6b.attrs,function(_71){
var _72;
var a=_71.attr;
if(_71.type&&_27[_71.type]){
_72=_27[_71.type](a,_71.matchFor);
}else{
if(a.length){
_72=_66(a);
}
}
if(_72){
ff=_1e(ff,_72);
}
});
}
if(!("id" in _6c)){
if(_6b.id){
ff=_1e(ff,function(_73){
return (!!_73&&(_73.id==_6b.id));
});
}
}
if(!ff){
if(!("default" in _6c)){
ff=_a;
}
}
return ff;
};
var _74=function(_75){
return function(_76,ret,bag){
while(_76=_76[_3e]){
if(_3d&&(!_22(_76))){
continue;
}
if((!bag||_77(_76,bag))&&_75(_76)){
ret.push(_76);
}
break;
}
return ret;
};
};
var _78=function(_79){
return function(_7a,ret,bag){
var te=_7a[_3e];
while(te){
if(_40(te)){
if(bag&&!_77(te,bag)){
break;
}
if(_79(te)){
ret.push(te);
}
}
te=te[_3e];
}
return ret;
};
};
var _7b=function(_7c){
_7c=_7c||_a;
return function(_7d,ret,bag){
var te,x=0,_7e=_7d[_7];
while(te=_7e[x++]){
if(_40(te)&&(!bag||_77(te,bag))&&(_7c(te,x))){
ret.push(te);
}
}
return ret;
};
};
var _7f=function(_80,_81){
var pn=_80.parentNode;
while(pn){
if(pn==_81){
break;
}
pn=pn.parentNode;
}
return !!pn;
};
var _82={};
var _83=function(_84){
var _85=_82[_84.query];
if(_85){
return _85;
}
var io=_84.infixOper;
var _86=(io?io.oper:"");
var _87=_5d(_84,{el:1});
var qt=_84.tag;
var _88=("*"==qt);
var ecs=_5()["getElementsByClassName"];
if(!_86){
if(_84.id){
_87=(!_84.loops&&_88)?_a:_5d(_84,{el:1,id:1});
_85=function(_89,arr){
var te=d.byId(_84.id,(_89.ownerDocument||_89));
if(!te||!_87(te)){
return;
}
if(9==_89.nodeType){
return _21(te,arr);
}else{
if(_7f(te,_89)){
return _21(te,arr);
}
}
};
}else{
if(ecs&&/\{\s*\[native code\]\s*\}/.test(String(ecs))&&_84.classes.length&&!_6){
_87=_5d(_84,{el:1,classes:1,id:1});
var _8a=_84.classes.join(" ");
_85=function(_8b,arr,bag){
var ret=_21(0,arr),te,x=0;
var _8c=_8b.getElementsByClassName(_8a);
while((te=_8c[x++])){
if(_87(te,_8b)&&_77(te,bag)){
ret.push(te);
}
}
return ret;
};
}else{
if(!_88&&!_84.loops){
_85=function(_8d,arr,bag){
var ret=_21(0,arr),te,x=0;
var _8e=_8d.getElementsByTagName(_84.getTag());
while((te=_8e[x++])){
if(_77(te,bag)){
ret.push(te);
}
}
return ret;
};
}else{
_87=_5d(_84,{el:1,tag:1,id:1});
_85=function(_8f,arr,bag){
var ret=_21(0,arr),te,x=0;
var _90=_8f.getElementsByTagName(_84.getTag());
while((te=_90[x++])){
if(_87(te,_8f)&&_77(te,bag)){
ret.push(te);
}
}
return ret;
};
}
}
}
}else{
var _91={el:1};
if(_88){
_91.tag=1;
}
_87=_5d(_84,_91);
if("+"==_86){
_85=_74(_87);
}else{
if("~"==_86){
_85=_78(_87);
}else{
if(">"==_86){
_85=_7b(_87);
}
}
}
}
return _82[_84.query]=_85;
};
var _92=function(_93,_94){
var _95=_21(_93),qp,x,te,qpl=_94.length,bag,ret;
for(var i=0;i<qpl;i++){
ret=[];
qp=_94[i];
x=_95.length-1;
if(x>0){
bag={};
ret.nozip=true;
}
var gef=_83(qp);
for(var j=0;(te=_95[j]);j++){
gef(te,ret,bag);
}
if(!ret.length){
break;
}
_95=ret;
}
return ret;
};
var _96={},_97={};
var _98=function(_99){
var _9a=_b(_2(_99));
if(_9a.length==1){
var tef=_83(_9a[0]);
return function(_9b){
var r=tef(_9b,new _4());
if(r){
r.nozip=true;
}
return r;
};
}
return function(_9c){
return _92(_9c,_9a);
};
};
var nua=navigator.userAgent;
var wk="WebKit/";
var _9d=(d.isWebKit&&(nua.indexOf(wk)>0)&&(parseFloat(nua.split(wk)[1])>528));
var _9e=d.isIE?"commentStrip":"nozip";
var qsa="querySelectorAll";
var _9f=(!!_5()[qsa]&&(!d.isSafari||(d.isSafari>3.1)||_9d));
var _a0=/n\+\d|([^ ])?([>~+])([^ =])?/g;
var _a1=function(_a2,pre,ch,_a3){
return ch?(pre?pre+" ":"")+ch+(_a3?" "+_a3:""):_a2;
};
var _a4=function(_a5,_a6){
_a5=_a5.replace(_a0,_a1);
if(_9f){
var _a7=_97[_a5];
if(_a7&&!_a6){
return _a7;
}
}
var _a8=_96[_a5];
if(_a8){
return _a8;
}
var qcz=_a5.charAt(0);
var _a9=(-1==_a5.indexOf(" "));
if((_a5.indexOf("#")>=0)&&(_a9)){
_a6=true;
}
var _aa=(_9f&&(!_a6)&&(_8.indexOf(qcz)==-1)&&(!d.isIE||(_a5.indexOf(":")==-1))&&(!(_6&&(_a5.indexOf(".")>=0)))&&(_a5.indexOf(":contains")==-1)&&(_a5.indexOf(":checked")==-1)&&(_a5.indexOf("|=")==-1));
if(_aa){
var tq=(_8.indexOf(_a5.charAt(_a5.length-1))>=0)?(_a5+" *"):_a5;
return _97[_a5]=function(_ab){
try{
if(!((9==_ab.nodeType)||_a9)){
throw "";
}
var r=_ab[qsa](tq);
r[_9e]=true;
return r;
}
catch(e){
return _a4(_a5,true)(_ab);
}
};
}else{
var _ac=_a5.split(/\s*,\s*/);
return _96[_a5]=((_ac.length<2)?_98(_a5):function(_ad){
var _ae=0,ret=[],tp;
while((tp=_ac[_ae++])){
ret=ret.concat(_98(tp)(_ad));
}
return ret;
});
}
};
var _af=0;
var _b0=d.isIE?function(_b1){
if(_9){
return (_b1.getAttribute("_uid")||_b1.setAttribute("_uid",++_af)||_af);
}else{
return _b1.uniqueID;
}
}:function(_b2){
return (_b2._uid||(_b2._uid=++_af));
};
var _77=function(_b3,bag){
if(!bag){
return 1;
}
var id=_b0(_b3);
if(!bag[id]){
return bag[id]=1;
}
return 0;
};
var _b4="_zipIdx";
var _b5=function(arr){
if(arr&&arr.nozip){
return (_4._wrap)?_4._wrap(arr):arr;
}
var ret=new _4();
if(!arr||!arr.length){
return ret;
}
if(arr[0]){
ret.push(arr[0]);
}
if(arr.length<2){
return ret;
}
_af++;
if(d.isIE&&_9){
var _b6=_af+"";
arr[0].setAttribute(_b4,_b6);
for(var x=1,te;te=arr[x];x++){
if(arr[x].getAttribute(_b4)!=_b6){
ret.push(te);
}
te.setAttribute(_b4,_b6);
}
}else{
if(d.isIE&&arr.commentStrip){
try{
for(var x=1,te;te=arr[x];x++){
if(_22(te)){
ret.push(te);
}
}
}
catch(e){
}
}else{
if(arr[0]){
arr[0][_b4]=_af;
}
for(var x=1,te;te=arr[x];x++){
if(arr[x][_b4]!=_af){
ret.push(te);
}
te[_b4]=_af;
}
}
}
return ret;
};
d.query=function(_b7,_b8){
_4=d._NodeListCtor;
if(!_b7){
return new _4();
}
if(_b7.constructor==_4){
return _b7;
}
if(typeof _b7!="string"){
return new _4(_b7);
}
if(typeof _b8=="string"){
_b8=d.byId(_b8);
if(!_b8){
return new _4();
}
}
_b8=_b8||_5();
var od=_b8.ownerDocument||_b8.documentElement;
_9=(_b8.contentType&&_b8.contentType=="application/xml")||(d.isOpera&&(_b8.doctype||od.toString()=="[object XMLDocument]"))||(!!od)&&(d.isIE?od.xml:(_b8.xmlVersion||od.xmlVersion));
var r=_a4(_b7)(_b8);
if(r&&r.nozip&&!_4._wrap){
return r;
}
return _b5(r);
};
d.query.pseudos=_4d;
d._filterQueryResult=function(_b9,_ba,_bb){
var _bc=new d._NodeListCtor(),_bd=_b(_ba),_be=(_bd.length==1&&!/[^\w#\.]/.test(_ba))?_5d(_bd[0]):function(_bf){
return dojo.query(_ba,_bb).indexOf(_bf)!=-1;
};
for(var x=0,te;te=_b9[x];x++){
if(_be(te)){
_bc.push(te);
}
}
return _bc;
};
};
var _c0=function(){
acme={trim:function(str){
str=str.replace(/^\s+/,"");
for(var i=str.length-1;i>=0;i--){
if(/\S/.test(str.charAt(i))){
str=str.substring(0,i+1);
break;
}
}
return str;
},forEach:function(arr,_c1,_c2){
if(!arr||!arr.length){
return;
}
for(var i=0,l=arr.length;i<l;++i){
_c1.call(_c2||window,arr[i],i,arr);
}
},byId:function(id,doc){
if(typeof id=="string"){
return (doc||document).getElementById(id);
}else{
return id;
}
},doc:document,NodeList:Array};
var n=navigator;
var dua=n.userAgent;
var dav=n.appVersion;
var tv=parseFloat(dav);
acme.isOpera=(dua.indexOf("Opera")>=0)?tv:undefined;
acme.isKhtml=(dav.indexOf("Konqueror")>=0)?tv:undefined;
acme.isWebKit=parseFloat(dua.split("WebKit/")[1])||undefined;
acme.isChrome=parseFloat(dua.split("Chrome/")[1])||undefined;
var _c3=Math.max(dav.indexOf("WebKit"),dav.indexOf("Safari"),0);
if(_c3&&!acme.isChrome){
acme.isSafari=parseFloat(dav.split("Version/")[1]);
if(!acme.isSafari||parseFloat(dav.substr(_c3+7))<=419.3){
acme.isSafari=2;
}
}
if(document.all&&!acme.isOpera){
acme.isIE=parseFloat(dav.split("MSIE ")[1])||undefined;
}
Array._wrap=function(arr){
return arr;
};
return acme;
};
if(this["dojo"]){
dojo.provide("dojo._base.query");
dojo.require("dojo._base.NodeList");
dojo.require("dojo._base.lang");
_1(this["queryPortability"]||this["acme"]||dojo);
}else{
_1(this["queryPortability"]||this["acme"]||_c0());
}
})();
}
