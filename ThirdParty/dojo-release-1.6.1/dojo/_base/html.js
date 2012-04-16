/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._base.html"]){
dojo._hasResource["dojo._base.html"]=true;
dojo.provide("dojo._base.html");
dojo.require("dojo._base.lang");
try{
document.execCommand("BackgroundImageCache",false,true);
}
catch(e){
}
if(dojo.isIE){
dojo.byId=function(id,_1){
if(typeof id!="string"){
return id;
}
var _2=_1||dojo.doc,te=_2.getElementById(id);
if(te&&(te.attributes.id.value==id||te.id==id)){
return te;
}else{
var _3=_2.all[id];
if(!_3||_3.nodeName){
_3=[_3];
}
var i=0;
while((te=_3[i++])){
if((te.attributes&&te.attributes.id&&te.attributes.id.value==id)||te.id==id){
return te;
}
}
}
};
}else{
dojo.byId=function(id,_4){
return ((typeof id=="string")?(_4||dojo.doc).getElementById(id):id)||null;
};
}
(function(){
var d=dojo;
var _5=d.byId;
var _6=null,_7;
d.addOnWindowUnload(function(){
_6=null;
});
dojo._destroyElement=dojo.destroy=function(_8){
_8=_5(_8);
try{
var _9=_8.ownerDocument;
if(!_6||_7!=_9){
_6=_9.createElement("div");
_7=_9;
}
_6.appendChild(_8.parentNode?_8.parentNode.removeChild(_8):_8);
_6.innerHTML="";
}
catch(e){
}
};
dojo.isDescendant=function(_a,_b){
try{
_a=_5(_a);
_b=_5(_b);
while(_a){
if(_a==_b){
return true;
}
_a=_a.parentNode;
}
}
catch(e){
}
return false;
};
dojo.setSelectable=function(_c,_d){
_c=_5(_c);
if(d.isMozilla){
_c.style.MozUserSelect=_d?"":"none";
}else{
if(d.isKhtml||d.isWebKit){
_c.style.KhtmlUserSelect=_d?"auto":"none";
}else{
if(d.isIE){
var v=(_c.unselectable=_d?"":"on");
d.query("*",_c).forEach("item.unselectable = '"+v+"'");
}
}
}
};
var _e=function(_f,ref){
var _10=ref.parentNode;
if(_10){
_10.insertBefore(_f,ref);
}
};
var _11=function(_12,ref){
var _13=ref.parentNode;
if(_13){
if(_13.lastChild==ref){
_13.appendChild(_12);
}else{
_13.insertBefore(_12,ref.nextSibling);
}
}
};
dojo.place=function(_14,_15,_16){
_15=_5(_15);
if(typeof _14=="string"){
_14=/^\s*</.test(_14)?d._toDom(_14,_15.ownerDocument):_5(_14);
}
if(typeof _16=="number"){
var cn=_15.childNodes;
if(!cn.length||cn.length<=_16){
_15.appendChild(_14);
}else{
_e(_14,cn[_16<0?0:_16]);
}
}else{
switch(_16){
case "before":
_e(_14,_15);
break;
case "after":
_11(_14,_15);
break;
case "replace":
_15.parentNode.replaceChild(_14,_15);
break;
case "only":
d.empty(_15);
_15.appendChild(_14);
break;
case "first":
if(_15.firstChild){
_e(_14,_15.firstChild);
break;
}
default:
_15.appendChild(_14);
}
}
return _14;
};
dojo.boxModel="content-box";
if(d.isIE){
d.boxModel=document.compatMode=="BackCompat"?"border-box":"content-box";
}
var gcs;
if(d.isWebKit){
gcs=function(_17){
var s;
if(_17.nodeType==1){
var dv=_17.ownerDocument.defaultView;
s=dv.getComputedStyle(_17,null);
if(!s&&_17.style){
_17.style.display="";
s=dv.getComputedStyle(_17,null);
}
}
return s||{};
};
}else{
if(d.isIE){
gcs=function(_18){
return _18.nodeType==1?_18.currentStyle:{};
};
}else{
gcs=function(_19){
return _19.nodeType==1?_19.ownerDocument.defaultView.getComputedStyle(_19,null):{};
};
}
}
dojo.getComputedStyle=gcs;
if(!d.isIE){
d._toPixelValue=function(_1a,_1b){
return parseFloat(_1b)||0;
};
}else{
d._toPixelValue=function(_1c,_1d){
if(!_1d){
return 0;
}
if(_1d=="medium"){
return 4;
}
if(_1d.slice&&_1d.slice(-2)=="px"){
return parseFloat(_1d);
}
with(_1c){
var _1e=style.left;
var _1f=runtimeStyle.left;
runtimeStyle.left=currentStyle.left;
try{
style.left=_1d;
_1d=style.pixelLeft;
}
catch(e){
_1d=0;
}
style.left=_1e;
runtimeStyle.left=_1f;
}
return _1d;
};
}
var px=d._toPixelValue;
var _20="DXImageTransform.Microsoft.Alpha";
var af=function(n,f){
try{
return n.filters.item(_20);
}
catch(e){
return f?{}:null;
}
};
dojo._getOpacity=d.isIE<9?function(_21){
try{
return af(_21).Opacity/100;
}
catch(e){
return 1;
}
}:function(_22){
return gcs(_22).opacity;
};
dojo._setOpacity=d.isIE<9?function(_23,_24){
var ov=_24*100,_25=_24==1;
_23.style.zoom=_25?"":1;
if(!af(_23)){
if(_25){
return _24;
}
_23.style.filter+=" progid:"+_20+"(Opacity="+ov+")";
}else{
af(_23,1).Opacity=ov;
}
af(_23,1).Enabled=!_25;
if(_23.nodeName.toLowerCase()=="tr"){
d.query("> td",_23).forEach(function(i){
d._setOpacity(i,_24);
});
}
return _24;
}:function(_26,_27){
return _26.style.opacity=_27;
};
var _28={left:true,top:true};
var _29=/margin|padding|width|height|max|min|offset/;
var _2a=function(_2b,_2c,_2d){
_2c=_2c.toLowerCase();
if(d.isIE){
if(_2d=="auto"){
if(_2c=="height"){
return _2b.offsetHeight;
}
if(_2c=="width"){
return _2b.offsetWidth;
}
}
if(_2c=="fontweight"){
switch(_2d){
case 700:
return "bold";
case 400:
default:
return "normal";
}
}
}
if(!(_2c in _28)){
_28[_2c]=_29.test(_2c);
}
return _28[_2c]?px(_2b,_2d):_2d;
};
var _2e=d.isIE?"styleFloat":"cssFloat",_2f={"cssFloat":_2e,"styleFloat":_2e,"float":_2e};
dojo.style=function(_30,_31,_32){
var n=_5(_30),_33=arguments.length,op=(_31=="opacity");
_31=_2f[_31]||_31;
if(_33==3){
return op?d._setOpacity(n,_32):n.style[_31]=_32;
}
if(_33==2&&op){
return d._getOpacity(n);
}
var s=gcs(n);
if(_33==2&&typeof _31!="string"){
for(var x in _31){
d.style(_30,x,_31[x]);
}
return s;
}
return (_33==1)?s:_2a(n,_31,s[_31]||n.style[_31]);
};
dojo._getPadExtents=function(n,_34){
var s=_34||gcs(n),l=px(n,s.paddingLeft),t=px(n,s.paddingTop);
return {l:l,t:t,w:l+px(n,s.paddingRight),h:t+px(n,s.paddingBottom)};
};
dojo._getBorderExtents=function(n,_35){
var ne="none",s=_35||gcs(n),bl=(s.borderLeftStyle!=ne?px(n,s.borderLeftWidth):0),bt=(s.borderTopStyle!=ne?px(n,s.borderTopWidth):0);
return {l:bl,t:bt,w:bl+(s.borderRightStyle!=ne?px(n,s.borderRightWidth):0),h:bt+(s.borderBottomStyle!=ne?px(n,s.borderBottomWidth):0)};
};
dojo._getPadBorderExtents=function(n,_36){
var s=_36||gcs(n),p=d._getPadExtents(n,s),b=d._getBorderExtents(n,s);
return {l:p.l+b.l,t:p.t+b.t,w:p.w+b.w,h:p.h+b.h};
};
dojo._getMarginExtents=function(n,_37){
var s=_37||gcs(n),l=px(n,s.marginLeft),t=px(n,s.marginTop),r=px(n,s.marginRight),b=px(n,s.marginBottom);
if(d.isWebKit&&(s.position!="absolute")){
r=l;
}
return {l:l,t:t,w:l+r,h:t+b};
};
dojo._getMarginBox=function(_38,_39){
var s=_39||gcs(_38),me=d._getMarginExtents(_38,s);
var l=_38.offsetLeft-me.l,t=_38.offsetTop-me.t,p=_38.parentNode;
if(d.isMoz){
var sl=parseFloat(s.left),st=parseFloat(s.top);
if(!isNaN(sl)&&!isNaN(st)){
l=sl,t=st;
}else{
if(p&&p.style){
var pcs=gcs(p);
if(pcs.overflow!="visible"){
var be=d._getBorderExtents(p,pcs);
l+=be.l,t+=be.t;
}
}
}
}else{
if(d.isOpera||(d.isIE>7&&!d.isQuirks)){
if(p){
be=d._getBorderExtents(p);
l-=be.l;
t-=be.t;
}
}
}
return {l:l,t:t,w:_38.offsetWidth+me.w,h:_38.offsetHeight+me.h};
};
dojo._getMarginSize=function(_3a,_3b){
_3a=_5(_3a);
var me=d._getMarginExtents(_3a,_3b||gcs(_3a));
var _3c=_3a.getBoundingClientRect();
return {w:(_3c.right-_3c.left)+me.w,h:(_3c.bottom-_3c.top)+me.h};
};
dojo._getContentBox=function(_3d,_3e){
var s=_3e||gcs(_3d),pe=d._getPadExtents(_3d,s),be=d._getBorderExtents(_3d,s),w=_3d.clientWidth,h;
if(!w){
w=_3d.offsetWidth,h=_3d.offsetHeight;
}else{
h=_3d.clientHeight,be.w=be.h=0;
}
if(d.isOpera){
pe.l+=be.l;
pe.t+=be.t;
}
return {l:pe.l,t:pe.t,w:w-pe.w-be.w,h:h-pe.h-be.h};
};
dojo._getBorderBox=function(_3f,_40){
var s=_40||gcs(_3f),pe=d._getPadExtents(_3f,s),cb=d._getContentBox(_3f,s);
return {l:cb.l-pe.l,t:cb.t-pe.t,w:cb.w+pe.w,h:cb.h+pe.h};
};
dojo._setBox=function(_41,l,t,w,h,u){
u=u||"px";
var s=_41.style;
if(!isNaN(l)){
s.left=l+u;
}
if(!isNaN(t)){
s.top=t+u;
}
if(w>=0){
s.width=w+u;
}
if(h>=0){
s.height=h+u;
}
};
dojo._isButtonTag=function(_42){
return _42.tagName=="BUTTON"||_42.tagName=="INPUT"&&(_42.getAttribute("type")||"").toUpperCase()=="BUTTON";
};
dojo._usesBorderBox=function(_43){
var n=_43.tagName;
return d.boxModel=="border-box"||n=="TABLE"||d._isButtonTag(_43);
};
dojo._setContentSize=function(_44,_45,_46,_47){
if(d._usesBorderBox(_44)){
var pb=d._getPadBorderExtents(_44,_47);
if(_45>=0){
_45+=pb.w;
}
if(_46>=0){
_46+=pb.h;
}
}
d._setBox(_44,NaN,NaN,_45,_46);
};
dojo._setMarginBox=function(_48,_49,_4a,_4b,_4c,_4d){
var s=_4d||gcs(_48),bb=d._usesBorderBox(_48),pb=bb?_4e:d._getPadBorderExtents(_48,s);
if(d.isWebKit){
if(d._isButtonTag(_48)){
var ns=_48.style;
if(_4b>=0&&!ns.width){
ns.width="4px";
}
if(_4c>=0&&!ns.height){
ns.height="4px";
}
}
}
var mb=d._getMarginExtents(_48,s);
if(_4b>=0){
_4b=Math.max(_4b-pb.w-mb.w,0);
}
if(_4c>=0){
_4c=Math.max(_4c-pb.h-mb.h,0);
}
d._setBox(_48,_49,_4a,_4b,_4c);
};
var _4e={l:0,t:0,w:0,h:0};
dojo.marginBox=function(_4f,box){
var n=_5(_4f),s=gcs(n),b=box;
return !b?d._getMarginBox(n,s):d._setMarginBox(n,b.l,b.t,b.w,b.h,s);
};
dojo.contentBox=function(_50,box){
var n=_5(_50),s=gcs(n),b=box;
return !b?d._getContentBox(n,s):d._setContentSize(n,b.w,b.h,s);
};
var _51=function(_52,_53){
if(!(_52=(_52||0).parentNode)){
return 0;
}
var val,_54=0,_55=d.body();
while(_52&&_52.style){
if(gcs(_52).position=="fixed"){
return 0;
}
val=_52[_53];
if(val){
_54+=val-0;
if(_52==_55){
break;
}
}
_52=_52.parentNode;
}
return _54;
};
dojo._docScroll=function(){
var n=d.global;
return "pageXOffset" in n?{x:n.pageXOffset,y:n.pageYOffset}:(n=d.isQuirks?d.doc.body:d.doc.documentElement,{x:d._fixIeBiDiScrollLeft(n.scrollLeft||0),y:n.scrollTop||0});
};
dojo._isBodyLtr=function(){
return "_bodyLtr" in d?d._bodyLtr:d._bodyLtr=(d.body().dir||d.doc.documentElement.dir||"ltr").toLowerCase()=="ltr";
};
dojo._getIeDocumentElementOffset=function(){
var de=d.doc.documentElement;
if(d.isIE<8){
var r=de.getBoundingClientRect();
var l=r.left,t=r.top;
if(d.isIE<7){
l+=de.clientLeft;
t+=de.clientTop;
}
return {x:l<0?0:l,y:t<0?0:t};
}else{
return {x:0,y:0};
}
};
dojo._fixIeBiDiScrollLeft=function(_56){
var ie=d.isIE;
if(ie&&!d._isBodyLtr()){
var qk=d.isQuirks,de=qk?d.doc.body:d.doc.documentElement;
if(ie==6&&!qk&&d.global.frameElement&&de.scrollHeight>de.clientHeight){
_56+=de.clientLeft;
}
return (ie<8||qk)?(_56+de.clientWidth-de.scrollWidth):-_56;
}
return _56;
};
dojo._abs=dojo.position=function(_57,_58){
_57=_5(_57);
var db=d.body(),dh=db.parentNode,ret=_57.getBoundingClientRect();
ret={x:ret.left,y:ret.top,w:ret.right-ret.left,h:ret.bottom-ret.top};
if(d.isIE){
var _59=d._getIeDocumentElementOffset();
ret.x-=_59.x+(d.isQuirks?db.clientLeft+db.offsetLeft:0);
ret.y-=_59.y+(d.isQuirks?db.clientTop+db.offsetTop:0);
}else{
if(d.isFF==3){
var cs=gcs(dh);
ret.x-=px(dh,cs.marginLeft)+px(dh,cs.borderLeftWidth);
ret.y-=px(dh,cs.marginTop)+px(dh,cs.borderTopWidth);
}
}
if(_58){
var _5a=d._docScroll();
ret.x+=_5a.x;
ret.y+=_5a.y;
}
return ret;
};
dojo.coords=function(_5b,_5c){
var n=_5(_5b),s=gcs(n),mb=d._getMarginBox(n,s);
var abs=d.position(n,_5c);
mb.x=abs.x;
mb.y=abs.y;
return mb;
};
var _5d={"class":"className","for":"htmlFor",tabindex:"tabIndex",readonly:"readOnly",colspan:"colSpan",frameborder:"frameBorder",rowspan:"rowSpan",valuetype:"valueType"},_5e={classname:"class",htmlfor:"for",tabindex:"tabIndex",readonly:"readOnly"},_5f={innerHTML:1,className:1,htmlFor:d.isIE,value:1};
var _60=function(_61){
return _5e[_61.toLowerCase()]||_61;
};
var _62=function(_63,_64){
var _65=_63.getAttributeNode&&_63.getAttributeNode(_64);
return _65&&_65.specified;
};
dojo.hasAttr=function(_66,_67){
var lc=_67.toLowerCase();
return _5f[_5d[lc]||_67]||_62(_5(_66),_5e[lc]||_67);
};
var _68={},_69=0,_6a=dojo._scopeName+"attrid",_6b={col:1,colgroup:1,table:1,tbody:1,tfoot:1,thead:1,tr:1,title:1};
dojo.attr=function(_6c,_6d,_6e){
_6c=_5(_6c);
var _6f=arguments.length,_70;
if(_6f==2&&typeof _6d!="string"){
for(var x in _6d){
d.attr(_6c,x,_6d[x]);
}
return _6c;
}
var lc=_6d.toLowerCase(),_71=_5d[lc]||_6d,_72=_5f[_71],_73=_5e[lc]||_6d;
if(_6f==3){
do{
if(_71=="style"&&typeof _6e!="string"){
d.style(_6c,_6e);
break;
}
if(_71=="innerHTML"){
if(d.isIE&&_6c.tagName.toLowerCase() in _6b){
d.empty(_6c);
_6c.appendChild(d._toDom(_6e,_6c.ownerDocument));
}else{
_6c[_71]=_6e;
}
break;
}
if(d.isFunction(_6e)){
var _74=d.attr(_6c,_6a);
if(!_74){
_74=_69++;
d.attr(_6c,_6a,_74);
}
if(!_68[_74]){
_68[_74]={};
}
var h=_68[_74][_71];
if(h){
d.disconnect(h);
}else{
try{
delete _6c[_71];
}
catch(e){
}
}
_68[_74][_71]=d.connect(_6c,_71,_6e);
break;
}
if(_72||typeof _6e=="boolean"){
_6c[_71]=_6e;
break;
}
_6c.setAttribute(_73,_6e);
}while(false);
return _6c;
}
_6e=_6c[_71];
if(_72&&typeof _6e!="undefined"){
return _6e;
}
if(_71!="href"&&(typeof _6e=="boolean"||d.isFunction(_6e))){
return _6e;
}
return _62(_6c,_73)?_6c.getAttribute(_73):null;
};
dojo.removeAttr=function(_75,_76){
_5(_75).removeAttribute(_60(_76));
};
dojo.getNodeProp=function(_77,_78){
_77=_5(_77);
var lc=_78.toLowerCase(),_79=_5d[lc]||_78;
if((_79 in _77)&&_79!="href"){
return _77[_79];
}
var _7a=_5e[lc]||_78;
return _62(_77,_7a)?_77.getAttribute(_7a):null;
};
dojo.create=function(tag,_7b,_7c,pos){
var doc=d.doc;
if(_7c){
_7c=_5(_7c);
doc=_7c.ownerDocument;
}
if(typeof tag=="string"){
tag=doc.createElement(tag);
}
if(_7b){
d.attr(tag,_7b);
}
if(_7c){
d.place(tag,_7c,pos);
}
return tag;
};
d.empty=d.isIE?function(_7d){
_7d=_5(_7d);
for(var c;c=_7d.lastChild;){
d.destroy(c);
}
}:function(_7e){
_5(_7e).innerHTML="";
};
var _7f={option:["select"],tbody:["table"],thead:["table"],tfoot:["table"],tr:["table","tbody"],td:["table","tbody","tr"],th:["table","thead","tr"],legend:["fieldset"],caption:["table"],colgroup:["table"],col:["table","colgroup"],li:["ul"]},_80=/<\s*([\w\:]+)/,_81={},_82=0,_83="__"+d._scopeName+"ToDomId";
for(var _84 in _7f){
if(_7f.hasOwnProperty(_84)){
var tw=_7f[_84];
tw.pre=_84=="option"?"<select multiple=\"multiple\">":"<"+tw.join("><")+">";
tw.post="</"+tw.reverse().join("></")+">";
}
}
d._toDom=function(_85,doc){
doc=doc||d.doc;
var _86=doc[_83];
if(!_86){
doc[_83]=_86=++_82+"";
_81[_86]=doc.createElement("div");
}
_85+="";
var _87=_85.match(_80),tag=_87?_87[1].toLowerCase():"",_88=_81[_86],_89,i,fc,df;
if(_87&&_7f[tag]){
_89=_7f[tag];
_88.innerHTML=_89.pre+_85+_89.post;
for(i=_89.length;i;--i){
_88=_88.firstChild;
}
}else{
_88.innerHTML=_85;
}
if(_88.childNodes.length==1){
return _88.removeChild(_88.firstChild);
}
df=doc.createDocumentFragment();
while(fc=_88.firstChild){
df.appendChild(fc);
}
return df;
};
var _8a="className";
dojo.hasClass=function(_8b,_8c){
return ((" "+_5(_8b)[_8a]+" ").indexOf(" "+_8c+" ")>=0);
};
var _8d=/\s+/,a1=[""],_8e={},_8f=function(s){
if(typeof s=="string"||s instanceof String){
if(s.indexOf(" ")<0){
a1[0]=s;
return a1;
}else{
return s.split(_8d);
}
}
return s||"";
};
dojo.addClass=function(_90,_91){
_90=_5(_90);
_91=_8f(_91);
var cls=_90[_8a],_92;
cls=cls?" "+cls+" ":" ";
_92=cls.length;
for(var i=0,len=_91.length,c;i<len;++i){
c=_91[i];
if(c&&cls.indexOf(" "+c+" ")<0){
cls+=c+" ";
}
}
if(_92<cls.length){
_90[_8a]=cls.substr(1,cls.length-2);
}
};
dojo.removeClass=function(_93,_94){
_93=_5(_93);
var cls;
if(_94!==undefined){
_94=_8f(_94);
cls=" "+_93[_8a]+" ";
for(var i=0,len=_94.length;i<len;++i){
cls=cls.replace(" "+_94[i]+" "," ");
}
cls=d.trim(cls);
}else{
cls="";
}
if(_93[_8a]!=cls){
_93[_8a]=cls;
}
};
dojo.replaceClass=function(_95,_96,_97){
_95=_5(_95);
_8e.className=_95.className;
dojo.removeClass(_8e,_97);
dojo.addClass(_8e,_96);
if(_95.className!==_8e.className){
_95.className=_8e.className;
}
};
dojo.toggleClass=function(_98,_99,_9a){
if(_9a===undefined){
_9a=!d.hasClass(_98,_99);
}
d[_9a?"addClass":"removeClass"](_98,_99);
};
})();
}
