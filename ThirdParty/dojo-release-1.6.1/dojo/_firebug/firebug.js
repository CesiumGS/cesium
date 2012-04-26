/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo._firebug.firebug"]){
dojo._hasResource["dojo._firebug.firebug"]=true;
dojo.provide("dojo._firebug.firebug");
dojo.deprecated=function(_1,_2,_3){
var _4="DEPRECATED: "+_1;
if(_2){
_4+=" "+_2;
}
if(_3){
_4+=" -- will be removed in version: "+_3;
}
console.warn(_4);
};
dojo.experimental=function(_5,_6){
var _7="EXPERIMENTAL: "+_5+" -- APIs subject to change without notice.";
if(_6){
_7+=" "+_6;
}
console.warn(_7);
};
(function(){
var _8=(/Trident/.test(window.navigator.userAgent));
if(_8){
var _9=["log","info","debug","warn","error"];
for(var i=0;i<_9.length;i++){
var m=_9[i];
var n="_"+_9[i];
console[n]=console[m];
console[m]=(function(){
var _a=n;
return function(){
console[_a](Array.prototype.slice.call(arguments).join(" "));
};
})();
}
try{
console.clear();
}
catch(e){
}
}
if(!dojo.isFF&&!dojo.isChrome&&!dojo.isSafari&&!_8&&!window.firebug&&(typeof console!="undefined"&&!console.firebug)&&!dojo.config.useCustomLogger&&!dojo.isAIR){
try{
if(window!=window.parent){
if(window.parent["console"]){
window.console=window.parent.console;
}
return;
}
}
catch(e){
}
var _b=document;
var _c=window;
var _d=0;
var _e=null;
var _f=null;
var _10=null;
var _11=null;
var _12=null;
var _13=null;
var _14=false;
var _15=[];
var _16=[];
var _17={};
var _18={};
var _19=null;
var _1a;
var _1b;
var _1c=false;
var _1d=null;
var _1e=document.createElement("div");
var _1f;
var _20;
window.console={_connects:[],log:function(){
_21(arguments,"");
},debug:function(){
_21(arguments,"debug");
},info:function(){
_21(arguments,"info");
},warn:function(){
_21(arguments,"warning");
},error:function(){
_21(arguments,"error");
},assert:function(_22,_23){
if(!_22){
var _24=[];
for(var i=1;i<arguments.length;++i){
_24.push(arguments[i]);
}
_21(_24.length?_24:["Assertion Failure"],"error");
throw _23?_23:"Assertion Failure";
}
},dir:function(obj){
var str=_25(obj);
str=str.replace(/\n/g,"<br />");
str=str.replace(/\t/g,"&nbsp;&nbsp;&nbsp;&nbsp;");
_26([str],"dir");
},dirxml:function(_27){
var _28=[];
_29(_27,_28);
_26(_28,"dirxml");
},group:function(){
_26(arguments,"group",_2a);
},groupEnd:function(){
_26(arguments,"",_2b);
},time:function(_2c){
_17[_2c]=new Date().getTime();
},timeEnd:function(_2d){
if(_2d in _17){
var _2e=(new Date()).getTime()-_17[_2d];
_21([_2d+":",_2e+"ms"]);
delete _17[_2d];
}
},count:function(_2f){
if(!_18[_2f]){
_18[_2f]=0;
}
_18[_2f]++;
_21([_2f+": "+_18[_2f]]);
},trace:function(_30){
var _31=_30||3;
var f=console.trace.caller;
for(var i=0;i<_31;i++){
var _32=f.toString();
var _33=[];
for(var a=0;a<f.arguments.length;a++){
_33.push(f.arguments[a]);
}
if(f.arguments.length){
}else{
}
f=f.caller;
}
},profile:function(){
this.warn(["profile() not supported."]);
},profileEnd:function(){
},clear:function(){
if(_f){
while(_f.childNodes.length){
dojo.destroy(_f.firstChild);
}
}
dojo.forEach(this._connects,dojo.disconnect);
},open:function(){
_34(true);
},close:function(){
if(_14){
_34();
}
},_restoreBorder:function(){
if(_1f){
_1f.style.border=_20;
}
},openDomInspector:function(){
_1c=true;
_f.style.display="none";
_19.style.display="block";
_10.style.display="none";
document.body.style.cursor="pointer";
_1a=dojo.connect(document,"mousemove",function(evt){
if(!_1c){
return;
}
if(!_1d){
_1d=setTimeout(function(){
_1d=null;
},50);
}else{
return;
}
var _35=evt.target;
if(_35&&(_1f!==_35)){
var _36=true;
console._restoreBorder();
var _37=[];
_29(_35,_37);
_19.innerHTML=_37.join("");
_1f=_35;
_20=_1f.style.border;
_1f.style.border="#0000FF 1px solid";
}
});
setTimeout(function(){
_1b=dojo.connect(document,"click",function(evt){
document.body.style.cursor="";
_1c=!_1c;
dojo.disconnect(_1b);
});
},30);
},_closeDomInspector:function(){
document.body.style.cursor="";
dojo.disconnect(_1a);
dojo.disconnect(_1b);
_1c=false;
console._restoreBorder();
},openConsole:function(){
_f.style.display="block";
_19.style.display="none";
_10.style.display="none";
console._closeDomInspector();
},openObjectInspector:function(){
_f.style.display="none";
_19.style.display="none";
_10.style.display="block";
console._closeDomInspector();
},recss:function(){
var i,a,s;
a=document.getElementsByTagName("link");
for(i=0;i<a.length;i++){
s=a[i];
if(s.rel.toLowerCase().indexOf("stylesheet")>=0&&s.href){
var h=s.href.replace(/(&|%5C?)forceReload=\d+/,"");
s.href=h+(h.indexOf("?")>=0?"&":"?")+"forceReload="+new Date().valueOf();
}
}
}};
function _34(_38){
_14=_38||!_14;
if(_e){
_e.style.display=_14?"block":"none";
}
};
function _39(){
_34(true);
if(_12){
_12.focus();
}
};
function _3a(x,y,w,h){
var win=window.open("","_firebug","status=0,menubar=0,resizable=1,top="+y+",left="+x+",width="+w+",height="+h+",scrollbars=1,addressbar=0");
if(!win){
var msg="Firebug Lite could not open a pop-up window, most likely because of a blocker.\n"+"Either enable pop-ups for this domain, or change the djConfig to popup=false.";
alert(msg);
}
_3b(win);
var _3c=win.document;
var _3d="<html style=\"height:100%;\"><head><title>Firebug Lite</title></head>\n"+"<body bgColor=\"#ccc\" style=\"height:97%;\" onresize=\"opener.onFirebugResize()\">\n"+"<div id=\"fb\"></div>"+"</body></html>";
_3c.write(_3d);
_3c.close();
return win;
};
function _3b(wn){
var d=new Date();
d.setTime(d.getTime()+(60*24*60*60*1000));
d=d.toUTCString();
var dc=wn.document,_3e;
if(wn.innerWidth){
_3e=function(){
return {w:wn.innerWidth,h:wn.innerHeight};
};
}else{
if(dc.documentElement&&dc.documentElement.clientWidth){
_3e=function(){
return {w:dc.documentElement.clientWidth,h:dc.documentElement.clientHeight};
};
}else{
if(dc.body){
_3e=function(){
return {w:dc.body.clientWidth,h:dc.body.clientHeight};
};
}
}
}
window.onFirebugResize=function(){
_4c(_3e().h);
clearInterval(wn._firebugWin_resize);
wn._firebugWin_resize=setTimeout(function(){
var x=wn.screenLeft,y=wn.screenTop,w=wn.outerWidth||wn.document.body.offsetWidth,h=wn.outerHeight||wn.document.body.offsetHeight;
document.cookie="_firebugPosition="+[x,y,w,h].join(",")+"; expires="+d+"; path=/";
},5000);
};
};
function _3f(){
if(_e){
return;
}
if(dojo.config.popup){
var _40="100%";
var _41=document.cookie.match(/(?:^|; )_firebugPosition=([^;]*)/);
var p=_41?_41[1].split(","):[2,2,320,480];
_c=_3a(p[0],p[1],p[2],p[3]);
_b=_c.document;
dojo.config.debugContainerId="fb";
_c.console=window.console;
_c.dojo=window.dojo;
}else{
_b=document;
_40=(dojo.config.debugHeight||300)+"px";
}
var _42=_b.createElement("link");
_42.href=dojo.moduleUrl("dojo._firebug","firebug.css");
_42.rel="stylesheet";
_42.type="text/css";
var _43=_b.getElementsByTagName("head");
if(_43){
_43=_43[0];
}
if(!_43){
_43=_b.getElementsByTagName("html")[0];
}
if(dojo.isIE){
window.setTimeout(function(){
_43.appendChild(_42);
},0);
}else{
_43.appendChild(_42);
}
if(dojo.config.debugContainerId){
_e=_b.getElementById(dojo.config.debugContainerId);
}
if(!_e){
_e=_b.createElement("div");
_b.body.appendChild(_e);
}
_e.className+=" firebug";
_e.style.height=_40;
_e.style.display=(_14?"block":"none");
var _44=function(_45,_46,_47,_48){
return "<li class=\""+_48+"\"><a href=\"javascript:void(0);\" onclick=\"console."+_47+"(); return false;\" title=\""+_46+"\">"+_45+"</a></li>";
};
_e.innerHTML="<div id=\"firebugToolbar\">"+"  <ul id=\"fireBugTabs\" class=\"tabs\">"+_44("Clear","Remove All Console Logs","clear","")+_44("ReCSS","Refresh CSS without reloading page","recss","")+_44("Console","Show Console Logs","openConsole","gap")+_44("DOM","Show DOM Inspector","openDomInspector","")+_44("Object","Show Object Inspector","openObjectInspector","")+((dojo.config.popup)?"":_44("Close","Close the console","close","gap"))+"\t</ul>"+"</div>"+"<input type=\"text\" id=\"firebugCommandLine\" />"+"<div id=\"firebugLog\"></div>"+"<div id=\"objectLog\" style=\"display:none;\">Click on an object in the Log display</div>"+"<div id=\"domInspect\" style=\"display:none;\">Hover over HTML elements in the main page. Click to hold selection.</div>";
_13=_b.getElementById("firebugToolbar");
_12=_b.getElementById("firebugCommandLine");
_49(_12,"keydown",_4a);
_49(_b,dojo.isIE||dojo.isSafari?"keydown":"keypress",_4b);
_f=_b.getElementById("firebugLog");
_10=_b.getElementById("objectLog");
_19=_b.getElementById("domInspect");
_11=_b.getElementById("fireBugTabs");
_4c();
_4d();
};
dojo.addOnLoad(_3f);
function _4e(){
_b=null;
if(_c.console){
_c.console.clear();
}
_c=null;
_e=null;
_f=null;
_10=null;
_19=null;
_12=null;
_15=[];
_16=[];
_17={};
};
function _4f(){
var _50=_12.value;
_12.value="";
_26([">  ",_50],"command");
var _51;
try{
_51=eval(_50);
}
catch(e){
}
};
function _4c(h){
var _52=25;
var _53=h?h-(_52+_12.offsetHeight+25+(h*0.01))+"px":(_e.offsetHeight-_52-_12.offsetHeight)+"px";
_f.style.top=_52+"px";
_f.style.height=_53;
_10.style.height=_53;
_10.style.top=_52+"px";
_19.style.height=_53;
_19.style.top=_52+"px";
_12.style.bottom=0;
dojo.addOnWindowUnload(_4e);
};
function _26(_54,_55,_56){
if(_f){
_57(_54,_55,_56);
}else{
_15.push([_54,_55,_56]);
}
};
function _4d(){
var _58=_15;
_15=[];
for(var i=0;i<_58.length;++i){
_57(_58[i][0],_58[i][1],_58[i][2]);
}
};
function _57(_59,_5a,_5b){
var _5c=_f.scrollTop+_f.offsetHeight>=_f.scrollHeight;
_5b=_5b||_5d;
_5b(_59,_5a);
if(_5c){
_f.scrollTop=_f.scrollHeight-_f.offsetHeight;
}
};
function _5e(row){
var _5f=_16.length?_16[_16.length-1]:_f;
_5f.appendChild(row);
};
function _5d(_60,_61){
var row=_f.ownerDocument.createElement("div");
row.className="logRow"+(_61?" logRow-"+_61:"");
row.innerHTML=_60.join("");
_5e(row);
};
function _2a(_62,_63){
_21(_62,_63);
var _64=_f.ownerDocument.createElement("div");
_64.className="logGroupBox";
_5e(_64);
_16.push(_64);
};
function _2b(){
_16.pop();
};
function _21(_65,_66){
var _67=[];
var _68=_65[0];
var _69=0;
if(typeof (_68)!="string"){
_68="";
_69=-1;
}
var _6a=_6b(_68);
for(var i=0;i<_6a.length;++i){
var _6c=_6a[i];
if(_6c&&typeof _6c=="object"){
_6c.appender(_65[++_69],_67);
}else{
_6d(_6c,_67);
}
}
var ids=[];
var obs=[];
for(i=_69+1;i<_65.length;++i){
_6d(" ",_67);
var _6e=_65[i];
if(_6e===undefined||_6e===null){
_6f(_6e,_67);
}else{
if(typeof (_6e)=="string"){
_6d(_6e,_67);
}else{
if(_6e instanceof Date){
_6d(_6e.toString(),_67);
}else{
if(_6e.nodeType==9){
_6d("[ XmlDoc ]",_67);
}else{
var id="_a"+_d++;
ids.push(id);
obs.push(_6e);
var str="<a id=\""+id+"\" href=\"javascript:void(0);\">"+_70(_6e)+"</a>";
_71(str,_67);
}
}
}
}
}
_26(_67,_66);
for(i=0;i<ids.length;i++){
var btn=_b.getElementById(ids[i]);
if(!btn){
continue;
}
btn.obj=obs[i];
_c.console._connects.push(dojo.connect(btn,"onclick",function(){
console.openObjectInspector();
try{
_25(this.obj);
}
catch(e){
this.obj=e;
}
_10.innerHTML="<pre>"+_25(this.obj)+"</pre>";
}));
}
};
function _6b(_72){
var _73=[];
var reg=/((^%|[^\\]%)(\d+)?(\.)([a-zA-Z]))|((^%|[^\\]%)([a-zA-Z]))/;
var _74={s:_6d,d:_75,i:_75,f:_76};
for(var m=reg.exec(_72);m;m=reg.exec(_72)){
var _77=m[8]?m[8]:m[5];
var _78=_77 in _74?_74[_77]:_79;
var _7a=m[3]?parseInt(m[3]):(m[4]=="."?-1:0);
_73.push(_72.substr(0,m[0][0]=="%"?m.index:m.index+1));
_73.push({appender:_78,precision:_7a});
_72=_72.substr(m.index+m[0].length);
}
_73.push(_72);
return _73;
};
function _7b(_7c){
function _7d(ch){
switch(ch){
case "<":
return "&lt;";
case ">":
return "&gt;";
case "&":
return "&amp;";
case "'":
return "&#39;";
case "\"":
return "&quot;";
}
return "?";
};
return String(_7c).replace(/[<>&"']/g,_7d);
};
function _7e(_7f){
try{
return _7f+"";
}
catch(e){
return null;
}
};
function _71(_80,_81){
_81.push(_7e(_80));
};
function _6d(_82,_83){
_83.push(_7b(_7e(_82)));
};
function _6f(_84,_85){
_85.push("<span class=\"objectBox-null\">",_7b(_7e(_84)),"</span>");
};
function _86(_87,_88){
_88.push("<span class=\"objectBox-string\">&quot;",_7b(_7e(_87)),"&quot;</span>");
};
function _75(_89,_8a){
_8a.push("<span class=\"objectBox-number\">",_7b(_7e(_89)),"</span>");
};
function _76(_8b,_8c){
_8c.push("<span class=\"objectBox-number\">",_7b(_7e(_8b)),"</span>");
};
function _8d(_8e,_8f){
_8f.push("<span class=\"objectBox-function\">",_70(_8e),"</span>");
};
function _79(_90,_91){
try{
if(_90===undefined){
_6f("undefined",_91);
}else{
if(_90===null){
_6f("null",_91);
}else{
if(typeof _90=="string"){
_86(_90,_91);
}else{
if(typeof _90=="number"){
_75(_90,_91);
}else{
if(typeof _90=="function"){
_8d(_90,_91);
}else{
if(_90.nodeType==1){
_92(_90,_91);
}else{
if(typeof _90=="object"){
_93(_90,_91);
}else{
_6d(_90,_91);
}
}
}
}
}
}
}
}
catch(e){
}
};
function _93(_94,_95){
var _96=_7e(_94);
var _97=/\[object (.*?)\]/;
var m=_97.exec(_96);
_95.push("<span class=\"objectBox-object\">",m?m[1]:_96,"</span>");
};
function _92(_98,_99){
_99.push("<span class=\"objectBox-selector\">");
_99.push("<span class=\"selectorTag\">",_7b(_98.nodeName.toLowerCase()),"</span>");
if(_98.id){
_99.push("<span class=\"selectorId\">#",_7b(_98.id),"</span>");
}
if(_98.className){
_99.push("<span class=\"selectorClass\">.",_7b(_98.className),"</span>");
}
_99.push("</span>");
};
function _29(_9a,_9b){
if(_9a.nodeType==1){
_9b.push("<div class=\"objectBox-element\">","&lt;<span class=\"nodeTag\">",_9a.nodeName.toLowerCase(),"</span>");
for(var i=0;i<_9a.attributes.length;++i){
var _9c=_9a.attributes[i];
if(!_9c.specified){
continue;
}
_9b.push("&nbsp;<span class=\"nodeName\">",_9c.nodeName.toLowerCase(),"</span>=&quot;<span class=\"nodeValue\">",_7b(_9c.nodeValue),"</span>&quot;");
}
if(_9a.firstChild){
_9b.push("&gt;</div><div class=\"nodeChildren\">");
for(var _9d=_9a.firstChild;_9d;_9d=_9d.nextSibling){
_29(_9d,_9b);
}
_9b.push("</div><div class=\"objectBox-element\">&lt;/<span class=\"nodeTag\">",_9a.nodeName.toLowerCase(),"&gt;</span></div>");
}else{
_9b.push("/&gt;</div>");
}
}else{
if(_9a.nodeType==3){
_9b.push("<div class=\"nodeText\">",_7b(_9a.nodeValue),"</div>");
}
}
};
function _49(_9e,_9f,_a0){
if(document.all){
_9e.attachEvent("on"+_9f,_a0);
}else{
_9e.addEventListener(_9f,_a0,false);
}
};
function _a1(_a2,_a3,_a4){
if(document.all){
_a2.detachEvent("on"+_a3,_a4);
}else{
_a2.removeEventListener(_a3,_a4,false);
}
};
function _a5(_a6){
if(document.all){
_a6.cancelBubble=true;
}else{
_a6.stopPropagation();
}
};
function _a7(msg,_a8,_a9){
var _aa=_a8.lastIndexOf("/");
var _ab=_aa==-1?_a8:_a8.substr(_aa+1);
var _ac=["<span class=\"errorMessage\">",msg,"</span>","<div class=\"objectBox-sourceLink\">",_ab," (line ",_a9,")</div>"];
_26(_ac,"error");
};
var _ad=new Date().getTime();
function _4b(_ae){
var _af=(new Date()).getTime();
if(_af>_ad+200){
_ae=dojo.fixEvent(_ae);
var _b0=dojo.keys;
var ekc=_ae.keyCode;
_ad=_af;
if(ekc==_b0.F12){
_34();
}else{
if((ekc==_b0.NUMPAD_ENTER||ekc==76)&&_ae.shiftKey&&(_ae.metaKey||_ae.ctrlKey)){
_39();
}else{
return;
}
}
_a5(_ae);
}
};
function _4a(e){
var dk=dojo.keys;
if(e.keyCode==13&&_12.value){
_b1(_12.value);
_4f();
}else{
if(e.keyCode==27){
_12.value="";
}else{
if(e.keyCode==dk.UP_ARROW||e.charCode==dk.UP_ARROW){
_b2("older");
}else{
if(e.keyCode==dk.DOWN_ARROW||e.charCode==dk.DOWN_ARROW){
_b2("newer");
}else{
if(e.keyCode==dk.HOME||e.charCode==dk.HOME){
_b3=1;
_b2("older");
}else{
if(e.keyCode==dk.END||e.charCode==dk.END){
_b3=999999;
_b2("newer");
}
}
}
}
}
}
};
var _b3=-1;
var _b4=null;
function _b1(_b5){
var _b6=_b7("firebug_history");
_b6=(_b6)?dojo.fromJson(_b6):[];
var pos=dojo.indexOf(_b6,_b5);
if(pos!=-1){
_b6.splice(pos,1);
}
_b6.push(_b5);
_b7("firebug_history",dojo.toJson(_b6),30);
while(_b6.length&&!_b7("firebug_history")){
_b6.shift();
_b7("firebug_history",dojo.toJson(_b6),30);
}
_b4=null;
_b3=-1;
};
function _b2(_b8){
var _b9=_b7("firebug_history");
_b9=(_b9)?dojo.fromJson(_b9):[];
if(!_b9.length){
return;
}
if(_b4===null){
_b4=_12.value;
}
if(_b3==-1){
_b3=_b9.length;
}
if(_b8=="older"){
--_b3;
if(_b3<0){
_b3=0;
}
}else{
if(_b8=="newer"){
++_b3;
if(_b3>_b9.length){
_b3=_b9.length;
}
}
}
if(_b3==_b9.length){
_12.value=_b4;
_b4=null;
}else{
_12.value=_b9[_b3];
}
};
function _b7(_ba,_bb){
var c=document.cookie;
if(arguments.length==1){
var _bc=c.match(new RegExp("(?:^|; )"+_ba+"=([^;]*)"));
return _bc?decodeURIComponent(_bc[1]):undefined;
}else{
var d=new Date();
d.setMonth(d.getMonth()+1);
document.cookie=_ba+"="+encodeURIComponent(_bb)+((d.toUtcString)?"; expires="+d.toUTCString():"");
}
};
function _bd(it){
return it&&it instanceof Array||typeof it=="array";
};
function _be(o){
var cnt=0;
for(var nm in o){
cnt++;
}
return cnt;
};
function _25(o,i,txt,_bf){
var ind=" \t";
txt=txt||"";
i=i||ind;
_bf=_bf||[];
var _c0;
if(o&&o.nodeType==1){
var _c1=[];
_29(o,_c1);
return _c1.join("");
}
var br=",\n",cnt=0,_c2=_be(o);
if(o instanceof Date){
return i+o.toString()+br;
}
looking:
for(var nm in o){
cnt++;
if(cnt==_c2){
br="\n";
}
if(o[nm]===window||o[nm]===document){
continue;
}else{
if(o[nm]===null){
txt+=i+nm+" : NULL"+br;
}else{
if(o[nm]&&o[nm].nodeType){
if(o[nm].nodeType==1){
}else{
if(o[nm].nodeType==3){
txt+=i+nm+" : [ TextNode "+o[nm].data+" ]"+br;
}
}
}else{
if(typeof o[nm]=="object"&&(o[nm] instanceof String||o[nm] instanceof Number||o[nm] instanceof Boolean)){
txt+=i+nm+" : "+o[nm]+","+br;
}else{
if(o[nm] instanceof Date){
txt+=i+nm+" : "+o[nm].toString()+br;
}else{
if(typeof (o[nm])=="object"&&o[nm]){
for(var j=0,_c3;_c3=_bf[j];j++){
if(o[nm]===_c3){
txt+=i+nm+" : RECURSION"+br;
continue looking;
}
}
_bf.push(o[nm]);
_c0=(_bd(o[nm]))?["[","]"]:["{","}"];
txt+=i+nm+" : "+_c0[0]+"\n";
txt+=_25(o[nm],i+ind,"",_bf);
txt+=i+_c0[1]+br;
}else{
if(typeof o[nm]=="undefined"){
txt+=i+nm+" : undefined"+br;
}else{
if(nm=="toString"&&typeof o[nm]=="function"){
var _c4=o[nm]();
if(typeof _c4=="string"&&_c4.match(/function ?(.*?)\(/)){
_c4=_7b(_70(o[nm]));
}
txt+=i+nm+" : "+_c4+br;
}else{
txt+=i+nm+" : "+_7b(_70(o[nm]))+br;
}
}
}
}
}
}
}
}
}
return txt;
};
function _70(obj){
var _c5=(obj instanceof Error);
if(obj.nodeType==1){
return _7b("< "+obj.tagName.toLowerCase()+" id=\""+obj.id+"\" />");
}
if(obj.nodeType==3){
return _7b("[TextNode: \""+obj.nodeValue+"\"]");
}
var nm=(obj&&(obj.id||obj.name||obj.ObjectID||obj.widgetId));
if(!_c5&&nm){
return "{"+nm+"}";
}
var _c6=2;
var _c7=4;
var cnt=0;
if(_c5){
nm="[ Error: "+(obj.message||obj.description||obj)+" ]";
}else{
if(_bd(obj)){
nm="["+obj.slice(0,_c7).join(",");
if(obj.length>_c7){
nm+=" ... ("+obj.length+" items)";
}
nm+="]";
}else{
if(typeof obj=="function"){
nm=obj+"";
var reg=/function\s*([^\(]*)(\([^\)]*\))[^\{]*\{/;
var m=reg.exec(nm);
if(m){
if(!m[1]){
m[1]="function";
}
nm=m[1]+m[2];
}else{
nm="function()";
}
}else{
if(typeof obj!="object"||typeof obj=="string"){
nm=obj+"";
}else{
nm="{";
for(var i in obj){
cnt++;
if(cnt>_c6){
break;
}
nm+=i+":"+_7b(obj[i])+"  ";
}
nm+="}";
}
}
}
}
return nm;
};
_49(document,dojo.isIE||dojo.isSafari?"keydown":"keypress",_4b);
if((document.documentElement.getAttribute("debug")=="true")||(dojo.config.isDebug)){
_34(true);
}
dojo.addOnWindowUnload(function(){
_a1(document,dojo.isIE||dojo.isSafari?"keydown":"keypress",_4b);
window.onFirebugResize=null;
window.console=null;
});
}
})();
}
