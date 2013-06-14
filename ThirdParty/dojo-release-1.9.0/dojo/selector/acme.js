/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/selector/acme",["../dom","../sniff","../_base/array","../_base/lang","../_base/window"],function(_1,_2,_3,_4,_5){
var _6=_4.trim;
var _7=_3.forEach;
var _8=function(){
return _5.doc;
};
var _9=(_8().compatMode)=="BackCompat";
var _a=">~+";
var _b=false;
var _c=function(){
return true;
};
var _d=function(_e){
if(_a.indexOf(_e.slice(-1))>=0){
_e+=" * ";
}else{
_e+=" ";
}
var ts=function(s,e){
return _6(_e.slice(s,e));
};
var _f=[];
var _10=-1,_11=-1,_12=-1,_13=-1,_14=-1,_15=-1,_16=-1,_17,lc="",cc="",_18;
var x=0,ql=_e.length,_19=null,_1a=null;
var _1b=function(){
if(_16>=0){
var tv=(_16==x)?null:ts(_16,x);
_19[(_a.indexOf(tv)<0)?"tag":"oper"]=tv;
_16=-1;
}
};
var _1c=function(){
if(_15>=0){
_19.id=ts(_15,x).replace(/\\/g,"");
_15=-1;
}
};
var _1d=function(){
if(_14>=0){
_19.classes.push(ts(_14+1,x).replace(/\\/g,""));
_14=-1;
}
};
var _1e=function(){
_1c();
_1b();
_1d();
};
var _1f=function(){
_1e();
if(_13>=0){
_19.pseudos.push({name:ts(_13+1,x)});
}
_19.loops=(_19.pseudos.length||_19.attrs.length||_19.classes.length);
_19.oquery=_19.query=ts(_18,x);
_19.otag=_19.tag=(_19["oper"])?null:(_19.tag||"*");
if(_19.tag){
_19.tag=_19.tag.toUpperCase();
}
if(_f.length&&(_f[_f.length-1].oper)){
_19.infixOper=_f.pop();
_19.query=_19.infixOper.query+" "+_19.query;
}
_f.push(_19);
_19=null;
};
for(;lc=cc,cc=_e.charAt(x),x<ql;x++){
if(lc=="\\"){
continue;
}
if(!_19){
_18=x;
_19={query:null,pseudos:[],attrs:[],classes:[],tag:null,oper:null,id:null,getTag:function(){
return _b?this.otag:this.tag;
}};
_16=x;
}
if(_17){
if(cc==_17){
_17=null;
}
continue;
}else{
if(cc=="'"||cc=="\""){
_17=cc;
continue;
}
}
if(_10>=0){
if(cc=="]"){
if(!_1a.attr){
_1a.attr=ts(_10+1,x);
}else{
_1a.matchFor=ts((_12||_10+1),x);
}
var cmf=_1a.matchFor;
if(cmf){
if((cmf.charAt(0)=="\"")||(cmf.charAt(0)=="'")){
_1a.matchFor=cmf.slice(1,-1);
}
}
if(_1a.matchFor){
_1a.matchFor=_1a.matchFor.replace(/\\/g,"");
}
_19.attrs.push(_1a);
_1a=null;
_10=_12=-1;
}else{
if(cc=="="){
var _20=("|~^$*".indexOf(lc)>=0)?lc:"";
_1a.type=_20+cc;
_1a.attr=ts(_10+1,x-_20.length);
_12=x+1;
}
}
}else{
if(_11>=0){
if(cc==")"){
if(_13>=0){
_1a.value=ts(_11+1,x);
}
_13=_11=-1;
}
}else{
if(cc=="#"){
_1e();
_15=x+1;
}else{
if(cc=="."){
_1e();
_14=x;
}else{
if(cc==":"){
_1e();
_13=x;
}else{
if(cc=="["){
_1e();
_10=x;
_1a={};
}else{
if(cc=="("){
if(_13>=0){
_1a={name:ts(_13+1,x),value:null};
_19.pseudos.push(_1a);
}
_11=x;
}else{
if((cc==" ")&&(lc!=cc)){
_1f();
}
}
}
}
}
}
}
}
}
return _f;
};
var _21=function(_22,_23){
if(!_22){
return _23;
}
if(!_23){
return _22;
}
return function(){
return _22.apply(window,arguments)&&_23.apply(window,arguments);
};
};
var _24=function(i,arr){
var r=arr||[];
if(i){
r.push(i);
}
return r;
};
var _25=function(n){
return (1==n.nodeType);
};
var _26="";
var _27=function(_28,_29){
if(!_28){
return _26;
}
if(_29=="class"){
return _28.className||_26;
}
if(_29=="for"){
return _28.htmlFor||_26;
}
if(_29=="style"){
return _28.style.cssText||_26;
}
return (_b?_28.getAttribute(_29):_28.getAttribute(_29,2))||_26;
};
var _2a={"*=":function(_2b,_2c){
return function(_2d){
return (_27(_2d,_2b).indexOf(_2c)>=0);
};
},"^=":function(_2e,_2f){
return function(_30){
return (_27(_30,_2e).indexOf(_2f)==0);
};
},"$=":function(_31,_32){
return function(_33){
var ea=" "+_27(_33,_31);
var _34=ea.lastIndexOf(_32);
return _34>-1&&(_34==(ea.length-_32.length));
};
},"~=":function(_35,_36){
var _37=" "+_36+" ";
return function(_38){
var ea=" "+_27(_38,_35)+" ";
return (ea.indexOf(_37)>=0);
};
},"|=":function(_39,_3a){
var _3b=_3a+"-";
return function(_3c){
var ea=_27(_3c,_39);
return ((ea==_3a)||(ea.indexOf(_3b)==0));
};
},"=":function(_3d,_3e){
return function(_3f){
return (_27(_3f,_3d)==_3e);
};
}};
var _40=(typeof _8().firstChild.nextElementSibling=="undefined");
var _41=!_40?"nextElementSibling":"nextSibling";
var _42=!_40?"previousElementSibling":"previousSibling";
var _43=(_40?_25:_c);
var _44=function(_45){
while(_45=_45[_42]){
if(_43(_45)){
return false;
}
}
return true;
};
var _46=function(_47){
while(_47=_47[_41]){
if(_43(_47)){
return false;
}
}
return true;
};
var _48=function(_49){
var _4a=_49.parentNode;
_4a=_4a.nodeType!=7?_4a:_4a.nextSibling;
var i=0,_4b=_4a.children||_4a.childNodes,ci=(_49["_i"]||_49.getAttribute("_i")||-1),cl=(_4a["_l"]||(typeof _4a.getAttribute!=="undefined"?_4a.getAttribute("_l"):-1));
if(!_4b){
return -1;
}
var l=_4b.length;
if(cl==l&&ci>=0&&cl>=0){
return ci;
}
if(_2("ie")&&typeof _4a.setAttribute!=="undefined"){
_4a.setAttribute("_l",l);
}else{
_4a["_l"]=l;
}
ci=-1;
for(var te=_4a["firstElementChild"]||_4a["firstChild"];te;te=te[_41]){
if(_43(te)){
if(_2("ie")){
te.setAttribute("_i",++i);
}else{
te["_i"]=++i;
}
if(_49===te){
ci=i;
}
}
}
return ci;
};
var _4c=function(_4d){
return !((_48(_4d))%2);
};
var _4e=function(_4f){
return ((_48(_4f))%2);
};
var _50={"checked":function(_51,_52){
return function(_53){
return !!("checked" in _53?_53.checked:_53.selected);
};
},"disabled":function(_54,_55){
return function(_56){
return _56.disabled;
};
},"enabled":function(_57,_58){
return function(_59){
return !_59.disabled;
};
},"first-child":function(){
return _44;
},"last-child":function(){
return _46;
},"only-child":function(_5a,_5b){
return function(_5c){
return _44(_5c)&&_46(_5c);
};
},"empty":function(_5d,_5e){
return function(_5f){
var cn=_5f.childNodes;
var cnl=_5f.childNodes.length;
for(var x=cnl-1;x>=0;x--){
var nt=cn[x].nodeType;
if((nt===1)||(nt==3)){
return false;
}
}
return true;
};
},"contains":function(_60,_61){
var cz=_61.charAt(0);
if(cz=="\""||cz=="'"){
_61=_61.slice(1,-1);
}
return function(_62){
return (_62.innerHTML.indexOf(_61)>=0);
};
},"not":function(_63,_64){
var p=_d(_64)[0];
var _65={el:1};
if(p.tag!="*"){
_65.tag=1;
}
if(!p.classes.length){
_65.classes=1;
}
var ntf=_66(p,_65);
return function(_67){
return (!ntf(_67));
};
},"nth-child":function(_68,_69){
var pi=parseInt;
if(_69=="odd"){
return _4e;
}else{
if(_69=="even"){
return _4c;
}
}
if(_69.indexOf("n")!=-1){
var _6a=_69.split("n",2);
var _6b=_6a[0]?((_6a[0]=="-")?-1:pi(_6a[0])):1;
var idx=_6a[1]?pi(_6a[1]):0;
var lb=0,ub=-1;
if(_6b>0){
if(idx<0){
idx=(idx%_6b)&&(_6b+(idx%_6b));
}else{
if(idx>0){
if(idx>=_6b){
lb=idx-idx%_6b;
}
idx=idx%_6b;
}
}
}else{
if(_6b<0){
_6b*=-1;
if(idx>0){
ub=idx;
idx=idx%_6b;
}
}
}
if(_6b>0){
return function(_6c){
var i=_48(_6c);
return (i>=lb)&&(ub<0||i<=ub)&&((i%_6b)==idx);
};
}else{
_69=idx;
}
}
var _6d=pi(_69);
return function(_6e){
return (_48(_6e)==_6d);
};
}};
var _6f=(_2("ie")<9||_2("ie")==9&&_2("quirks"))?function(_70){
var clc=_70.toLowerCase();
if(clc=="class"){
_70="className";
}
return function(_71){
return (_b?_71.getAttribute(_70):_71[_70]||_71[clc]);
};
}:function(_72){
return function(_73){
return (_73&&_73.getAttribute&&_73.hasAttribute(_72));
};
};
var _66=function(_74,_75){
if(!_74){
return _c;
}
_75=_75||{};
var ff=null;
if(!("el" in _75)){
ff=_21(ff,_25);
}
if(!("tag" in _75)){
if(_74.tag!="*"){
ff=_21(ff,function(_76){
return (_76&&((_b?_76.tagName:_76.tagName.toUpperCase())==_74.getTag()));
});
}
}
if(!("classes" in _75)){
_7(_74.classes,function(_77,idx,arr){
var re=new RegExp("(?:^|\\s)"+_77+"(?:\\s|$)");
ff=_21(ff,function(_78){
return re.test(_78.className);
});
ff.count=idx;
});
}
if(!("pseudos" in _75)){
_7(_74.pseudos,function(_79){
var pn=_79.name;
if(_50[pn]){
ff=_21(ff,_50[pn](pn,_79.value));
}
});
}
if(!("attrs" in _75)){
_7(_74.attrs,function(_7a){
var _7b;
var a=_7a.attr;
if(_7a.type&&_2a[_7a.type]){
_7b=_2a[_7a.type](a,_7a.matchFor);
}else{
if(a.length){
_7b=_6f(a);
}
}
if(_7b){
ff=_21(ff,_7b);
}
});
}
if(!("id" in _75)){
if(_74.id){
ff=_21(ff,function(_7c){
return (!!_7c&&(_7c.id==_74.id));
});
}
}
if(!ff){
if(!("default" in _75)){
ff=_c;
}
}
return ff;
};
var _7d=function(_7e){
return function(_7f,ret,bag){
while(_7f=_7f[_41]){
if(_40&&(!_25(_7f))){
continue;
}
if((!bag||_80(_7f,bag))&&_7e(_7f)){
ret.push(_7f);
}
break;
}
return ret;
};
};
var _81=function(_82){
return function(_83,ret,bag){
var te=_83[_41];
while(te){
if(_43(te)){
if(bag&&!_80(te,bag)){
break;
}
if(_82(te)){
ret.push(te);
}
}
te=te[_41];
}
return ret;
};
};
var _84=function(_85){
_85=_85||_c;
return function(_86,ret,bag){
var te,x=0,_87=_86.children||_86.childNodes;
while(te=_87[x++]){
if(_43(te)&&(!bag||_80(te,bag))&&(_85(te,x))){
ret.push(te);
}
}
return ret;
};
};
var _88=function(_89,_8a){
var pn=_89.parentNode;
while(pn){
if(pn==_8a){
break;
}
pn=pn.parentNode;
}
return !!pn;
};
var _8b={};
var _8c=function(_8d){
var _8e=_8b[_8d.query];
if(_8e){
return _8e;
}
var io=_8d.infixOper;
var _8f=(io?io.oper:"");
var _90=_66(_8d,{el:1});
var qt=_8d.tag;
var _91=("*"==qt);
var ecs=_8()["getElementsByClassName"];
if(!_8f){
if(_8d.id){
_90=(!_8d.loops&&_91)?_c:_66(_8d,{el:1,id:1});
_8e=function(_92,arr){
var te=_1.byId(_8d.id,(_92.ownerDocument||_92));
if(!te||!_90(te)){
return;
}
if(9==_92.nodeType){
return _24(te,arr);
}else{
if(_88(te,_92)){
return _24(te,arr);
}
}
};
}else{
if(ecs&&/\{\s*\[native code\]\s*\}/.test(String(ecs))&&_8d.classes.length&&!_9){
_90=_66(_8d,{el:1,classes:1,id:1});
var _93=_8d.classes.join(" ");
_8e=function(_94,arr,bag){
var ret=_24(0,arr),te,x=0;
var _95=_94.getElementsByClassName(_93);
while((te=_95[x++])){
if(_90(te,_94)&&_80(te,bag)){
ret.push(te);
}
}
return ret;
};
}else{
if(!_91&&!_8d.loops){
_8e=function(_96,arr,bag){
var ret=_24(0,arr),te,x=0;
var tag=_8d.getTag(),_97=tag?_96.getElementsByTagName(tag):[];
while((te=_97[x++])){
if(_80(te,bag)){
ret.push(te);
}
}
return ret;
};
}else{
_90=_66(_8d,{el:1,tag:1,id:1});
_8e=function(_98,arr,bag){
var ret=_24(0,arr),te,x=0;
var tag=_8d.getTag(),_99=tag?_98.getElementsByTagName(tag):[];
while((te=_99[x++])){
if(_90(te,_98)&&_80(te,bag)){
ret.push(te);
}
}
return ret;
};
}
}
}
}else{
var _9a={el:1};
if(_91){
_9a.tag=1;
}
_90=_66(_8d,_9a);
if("+"==_8f){
_8e=_7d(_90);
}else{
if("~"==_8f){
_8e=_81(_90);
}else{
if(">"==_8f){
_8e=_84(_90);
}
}
}
}
return _8b[_8d.query]=_8e;
};
var _9b=function(_9c,_9d){
var _9e=_24(_9c),qp,x,te,qpl=_9d.length,bag,ret;
for(var i=0;i<qpl;i++){
ret=[];
qp=_9d[i];
x=_9e.length-1;
if(x>0){
bag={};
ret.nozip=true;
}
var gef=_8c(qp);
for(var j=0;(te=_9e[j]);j++){
gef(te,ret,bag);
}
if(!ret.length){
break;
}
_9e=ret;
}
return ret;
};
var _9f={},_a0={};
var _a1=function(_a2){
var _a3=_d(_6(_a2));
if(_a3.length==1){
var tef=_8c(_a3[0]);
return function(_a4){
var r=tef(_a4,[]);
if(r){
r.nozip=true;
}
return r;
};
}
return function(_a5){
return _9b(_a5,_a3);
};
};
var _a6=_2("ie")?"commentStrip":"nozip";
var qsa="querySelectorAll";
var _a7=!!_8()[qsa];
var _a8=/\\[>~+]|n\+\d|([^ \\])?([>~+])([^ =])?/g;
var _a9=function(_aa,pre,ch,_ab){
return ch?(pre?pre+" ":"")+ch+(_ab?" "+_ab:""):_aa;
};
var _ac=/([^[]*)([^\]]*])?/g;
var _ad=function(_ae,_af,att){
return _af.replace(_a8,_a9)+(att||"");
};
var _b0=function(_b1,_b2){
_b1=_b1.replace(_ac,_ad);
if(_a7){
var _b3=_a0[_b1];
if(_b3&&!_b2){
return _b3;
}
}
var _b4=_9f[_b1];
if(_b4){
return _b4;
}
var qcz=_b1.charAt(0);
var _b5=(-1==_b1.indexOf(" "));
if((_b1.indexOf("#")>=0)&&(_b5)){
_b2=true;
}
var _b6=(_a7&&(!_b2)&&(_a.indexOf(qcz)==-1)&&(!_2("ie")||(_b1.indexOf(":")==-1))&&(!(_9&&(_b1.indexOf(".")>=0)))&&(_b1.indexOf(":contains")==-1)&&(_b1.indexOf(":checked")==-1)&&(_b1.indexOf("|=")==-1));
if(_b6){
var tq=(_a.indexOf(_b1.charAt(_b1.length-1))>=0)?(_b1+" *"):_b1;
return _a0[_b1]=function(_b7){
try{
if(!((9==_b7.nodeType)||_b5)){
throw "";
}
var r=_b7[qsa](tq);
r[_a6]=true;
return r;
}
catch(e){
return _b0(_b1,true)(_b7);
}
};
}else{
var _b8=_b1.match(/([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g);
return _9f[_b1]=((_b8.length<2)?_a1(_b1):function(_b9){
var _ba=0,ret=[],tp;
while((tp=_b8[_ba++])){
ret=ret.concat(_a1(tp)(_b9));
}
return ret;
});
}
};
var _bb=0;
var _bc=_2("ie")?function(_bd){
if(_b){
return (_bd.getAttribute("_uid")||_bd.setAttribute("_uid",++_bb)||_bb);
}else{
return _bd.uniqueID;
}
}:function(_be){
return (_be._uid||(_be._uid=++_bb));
};
var _80=function(_bf,bag){
if(!bag){
return 1;
}
var id=_bc(_bf);
if(!bag[id]){
return bag[id]=1;
}
return 0;
};
var _c0="_zipIdx";
var _c1=function(arr){
if(arr&&arr.nozip){
return arr;
}
if(!arr||!arr.length){
return [];
}
if(arr.length<2){
return [arr[0]];
}
var ret=[];
_bb++;
var x,te;
if(_2("ie")&&_b){
var _c2=_bb+"";
for(x=0;x<arr.length;x++){
if((te=arr[x])&&te.getAttribute(_c0)!=_c2){
ret.push(te);
te.setAttribute(_c0,_c2);
}
}
}else{
if(_2("ie")&&arr.commentStrip){
try{
for(x=0;x<arr.length;x++){
if((te=arr[x])&&_25(te)){
ret.push(te);
}
}
}
catch(e){
}
}else{
for(x=0;x<arr.length;x++){
if((te=arr[x])&&te[_c0]!=_bb){
ret.push(te);
te[_c0]=_bb;
}
}
}
}
return ret;
};
var _c3=function(_c4,_c5){
_c5=_c5||_8();
var od=_c5.ownerDocument||_c5;
_b=(od.createElement("div").tagName==="div");
var r=_b0(_c4)(_c5);
if(r&&r.nozip){
return r;
}
return _c1(r);
};
_c3.filter=function(_c6,_c7,_c8){
var _c9=[],_ca=_d(_c7),_cb=(_ca.length==1&&!/[^\w#\.]/.test(_c7))?_66(_ca[0]):function(_cc){
return _3.indexOf(_c3(_c7,_1.byId(_c8)),_cc)!=-1;
};
for(var x=0,te;te=_c6[x];x++){
if(_cb(te)){
_c9.push(te);
}
}
return _c9;
};
return _c3;
});
