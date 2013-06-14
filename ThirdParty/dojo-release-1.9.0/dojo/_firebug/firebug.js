/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_firebug/firebug",["../_base/kernel","require","../_base/html","../sniff","../_base/array","../_base/lang","../_base/event","../_base/unload"],function(_1,_2,_3,_4){
var _5=(/Trident/.test(window.navigator.userAgent));
if(_5){
var _6=["log","info","debug","warn","error"];
for(var i=0;i<_6.length;i++){
var m=_6[i];
if(!console[m]||console[m]._fake){
continue;
}
var n="_"+_6[i];
console[n]=console[m];
console[m]=(function(){
var _7=n;
return function(){
console[_7](Array.prototype.join.call(arguments," "));
};
})();
}
try{
console.clear();
}
catch(e){
}
}
if(_4("ff")||_4("chrome")||_4("safari")||_5||window.firebug||(typeof console!="undefined"&&console.firebug)||_1.config.useCustomLogger||_4("air")){
return;
}
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
var _8=document;
var _9=window;
var _a=0;
var _b=null;
var _c=null;
var _d=null;
var _e=null;
var _f=null;
var _10=null;
var _11=false;
var _12=[];
var _13=[];
var _14={};
var _15={};
var _16=null;
var _17;
var _18;
var _19=false;
var _1a=null;
var _1b=document.createElement("div");
var _1c;
var _1d;
window.console={_connects:[],log:function(){
_1e(arguments,"");
},debug:function(){
_1e(arguments,"debug");
},info:function(){
_1e(arguments,"info");
},warn:function(){
_1e(arguments,"warning");
},error:function(){
_1e(arguments,"error");
},assert:function(_1f,_20){
if(!_1f){
var _21=[];
for(var i=1;i<arguments.length;++i){
_21.push(arguments[i]);
}
_1e(_21.length?_21:["Assertion Failure"],"error");
throw _20?_20:"Assertion Failure";
}
},dir:function(obj){
var str=_22(obj);
str=str.replace(/\n/g,"<br />");
str=str.replace(/\t/g,"&nbsp;&nbsp;&nbsp;&nbsp;");
_23([str],"dir");
},dirxml:function(_24){
var _25=[];
_26(_24,_25);
_23(_25,"dirxml");
},group:function(){
_23(arguments,"group",_27);
},groupEnd:function(){
_23(arguments,"",_28);
},time:function(_29){
_14[_29]=new Date().getTime();
},timeEnd:function(_2a){
if(_2a in _14){
var _2b=(new Date()).getTime()-_14[_2a];
_1e([_2a+":",_2b+"ms"]);
delete _14[_2a];
}
},count:function(_2c){
if(!_15[_2c]){
_15[_2c]=0;
}
_15[_2c]++;
_1e([_2c+": "+_15[_2c]]);
},trace:function(_2d){
var _2e=_2d||3;
var f=console.trace.caller;
for(var i=0;i<_2e;i++){
var _2f=f.toString();
var _30=[];
for(var a=0;a<f.arguments.length;a++){
_30.push(f.arguments[a]);
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
if(_c){
while(_c.childNodes.length){
_1.destroy(_c.firstChild);
}
}
_1.forEach(this._connects,_1.disconnect);
},open:function(){
_31(true);
},close:function(){
if(_11){
_31();
}
},_restoreBorder:function(){
if(_1c){
_1c.style.border=_1d;
}
},openDomInspector:function(){
_19=true;
_c.style.display="none";
_16.style.display="block";
_d.style.display="none";
document.body.style.cursor="pointer";
_17=_1.connect(document,"mousemove",function(evt){
if(!_19){
return;
}
if(!_1a){
_1a=setTimeout(function(){
_1a=null;
},50);
}else{
return;
}
var _32=evt.target;
if(_32&&(_1c!==_32)){
var _33=true;
console._restoreBorder();
var _34=[];
_26(_32,_34);
_16.innerHTML=_34.join("");
_1c=_32;
_1d=_1c.style.border;
_1c.style.border="#0000FF 1px solid";
}
});
setTimeout(function(){
_18=_1.connect(document,"click",function(evt){
document.body.style.cursor="";
_19=!_19;
_1.disconnect(_18);
});
},30);
},_closeDomInspector:function(){
document.body.style.cursor="";
_1.disconnect(_17);
_1.disconnect(_18);
_19=false;
console._restoreBorder();
},openConsole:function(){
_c.style.display="block";
_16.style.display="none";
_d.style.display="none";
console._closeDomInspector();
},openObjectInspector:function(){
_c.style.display="none";
_16.style.display="none";
_d.style.display="block";
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
function _31(_35){
_11=_35||!_11;
if(_b){
_b.style.display=_11?"block":"none";
}
};
function _36(){
_31(true);
if(_f){
_f.focus();
}
};
function _37(x,y,w,h){
var win=window.open("","_firebug","status=0,menubar=0,resizable=1,top="+y+",left="+x+",width="+w+",height="+h+",scrollbars=1,addressbar=0");
if(!win){
var msg="Firebug Lite could not open a pop-up window, most likely because of a blocker.\n"+"Either enable pop-ups for this domain, or change the djConfig to popup=false.";
alert(msg);
}
_38(win);
var _39=win.document;
var _3a="<html style=\"height:100%;\"><head><title>Firebug Lite</title></head>\n"+"<body bgColor=\"#ccc\" style=\"height:97%;\" onresize=\"opener.onFirebugResize()\">\n"+"<div id=\"fb\"></div>"+"</body></html>";
_39.write(_3a);
_39.close();
return win;
};
function _38(wn){
var d=new Date();
d.setTime(d.getTime()+(60*24*60*60*1000));
d=d.toUTCString();
var dc=wn.document,_3b;
if(wn.innerWidth){
_3b=function(){
return {w:wn.innerWidth,h:wn.innerHeight};
};
}else{
if(dc.documentElement&&dc.documentElement.clientWidth){
_3b=function(){
return {w:dc.documentElement.clientWidth,h:dc.documentElement.clientHeight};
};
}else{
if(dc.body){
_3b=function(){
return {w:dc.body.clientWidth,h:dc.body.clientHeight};
};
}
}
}
window.onFirebugResize=function(){
_49(_3b().h);
clearInterval(wn._firebugWin_resize);
wn._firebugWin_resize=setTimeout(function(){
var x=wn.screenLeft,y=wn.screenTop,w=wn.outerWidth||wn.document.body.offsetWidth,h=wn.outerHeight||wn.document.body.offsetHeight;
document.cookie="_firebugPosition="+[x,y,w,h].join(",")+"; expires="+d+"; path=/";
},5000);
};
};
function _3c(){
if(_b){
return;
}
_31(true);
if(_1.config.popup){
var _3d="100%";
var _3e=document.cookie.match(/(?:^|; )_firebugPosition=([^;]*)/);
var p=_3e?_3e[1].split(","):[2,2,320,480];
_9=_37(p[0],p[1],p[2],p[3]);
_8=_9.document;
_1.config.debugContainerId="fb";
_9.console=window.console;
_9.dojo=window.dojo;
}else{
_8=document;
_3d=(_1.config.debugHeight||300)+"px";
}
var _3f=_8.createElement("link");
_3f.href=_2.toUrl("./firebug.css");
_3f.rel="stylesheet";
_3f.type="text/css";
var _40=_8.getElementsByTagName("head");
if(_40){
_40=_40[0];
}
if(!_40){
_40=_8.getElementsByTagName("html")[0];
}
if(_4("ie")){
window.setTimeout(function(){
_40.appendChild(_3f);
},0);
}else{
_40.appendChild(_3f);
}
if(_1.config.debugContainerId){
_b=_8.getElementById(_1.config.debugContainerId);
}
if(!_b){
_b=_8.createElement("div");
_8.body.appendChild(_b);
}
_b.className+=" firebug";
_b.id="firebug";
_b.style.height=_3d;
_b.style.display=(_11?"block":"none");
var _41=function(_42,_43,_44,_45){
return "<li class=\""+_45+"\"><a href=\"javascript:void(0);\" onclick=\"console."+_44+"(); return false;\" title=\""+_43+"\">"+_42+"</a></li>";
};
_b.innerHTML="<div id=\"firebugToolbar\">"+"  <ul id=\"fireBugTabs\" class=\"tabs\">"+_41("Clear","Remove All Console Logs","clear","")+_41("ReCSS","Refresh CSS without reloading page","recss","")+_41("Console","Show Console Logs","openConsole","gap")+_41("DOM","Show DOM Inspector","openDomInspector","")+_41("Object","Show Object Inspector","openObjectInspector","")+((_1.config.popup)?"":_41("Close","Close the console","close","gap"))+"\t</ul>"+"</div>"+"<input type=\"text\" id=\"firebugCommandLine\" />"+"<div id=\"firebugLog\"></div>"+"<div id=\"objectLog\" style=\"display:none;\">Click on an object in the Log display</div>"+"<div id=\"domInspect\" style=\"display:none;\">Hover over HTML elements in the main page. Click to hold selection.</div>";
_10=_8.getElementById("firebugToolbar");
_f=_8.getElementById("firebugCommandLine");
_46(_f,"keydown",_47);
_46(_8,_4("ie")||_4("safari")?"keydown":"keypress",_48);
_c=_8.getElementById("firebugLog");
_d=_8.getElementById("objectLog");
_16=_8.getElementById("domInspect");
_e=_8.getElementById("fireBugTabs");
_49();
_4a();
};
_1.addOnLoad(_3c);
function _4b(){
_8=null;
if(_9.console){
_9.console.clear();
}
_9=null;
_b=null;
_c=null;
_d=null;
_16=null;
_f=null;
_12=[];
_13=[];
_14={};
};
function _4c(){
var _4d=_f.value;
_f.value="";
_23([">  ",_4d],"command");
var _4e;
try{
_4e=eval(_4d);
}
catch(e){
}
};
function _49(h){
var _4f=25;
var _50=h?h-(_4f+_f.offsetHeight+25+(h*0.01))+"px":(_b.offsetHeight-_4f-_f.offsetHeight)+"px";
_c.style.top=_4f+"px";
_c.style.height=_50;
_d.style.height=_50;
_d.style.top=_4f+"px";
_16.style.height=_50;
_16.style.top=_4f+"px";
_f.style.bottom=0;
_1.addOnWindowUnload(_4b);
};
function _23(_51,_52,_53){
if(_c){
_54(_51,_52,_53);
}else{
_12.push([_51,_52,_53]);
}
};
function _4a(){
var _55=_12;
_12=[];
for(var i=0;i<_55.length;++i){
_54(_55[i][0],_55[i][1],_55[i][2]);
}
};
function _54(_56,_57,_58){
var _59=_c.scrollTop+_c.offsetHeight>=_c.scrollHeight;
_58=_58||_5a;
_58(_56,_57);
if(_59){
_c.scrollTop=_c.scrollHeight-_c.offsetHeight;
}
};
function _5b(row){
var _5c=_13.length?_13[_13.length-1]:_c;
_5c.appendChild(row);
};
function _5a(_5d,_5e){
var row=_c.ownerDocument.createElement("div");
row.className="logRow"+(_5e?" logRow-"+_5e:"");
row.innerHTML=_5d.join("");
_5b(row);
};
function _27(_5f,_60){
_1e(_5f,_60);
var _61=_c.ownerDocument.createElement("div");
_61.className="logGroupBox";
_5b(_61);
_13.push(_61);
};
function _28(){
_13.pop();
};
function _1e(_62,_63){
var _64=[];
var _65=_62[0];
var _66=0;
if(typeof (_65)!="string"){
_65="";
_66=-1;
}
var _67=_68(_65);
for(var i=0;i<_67.length;++i){
var _69=_67[i];
if(_69&&typeof _69=="object"){
_69.appender(_62[++_66],_64);
}else{
_6a(_69,_64);
}
}
var ids=[];
var obs=[];
for(i=_66+1;i<_62.length;++i){
_6a(" ",_64);
var _6b=_62[i];
if(_6b===undefined||_6b===null){
_6c(_6b,_64);
}else{
if(typeof (_6b)=="string"){
_6a(_6b,_64);
}else{
if(_6b instanceof Date){
_6a(_6b.toString(),_64);
}else{
if(_6b.nodeType==9){
_6a("[ XmlDoc ]",_64);
}else{
var id="_a"+_a++;
ids.push(id);
obs.push(_6b);
var str="<a id=\""+id+"\" href=\"javascript:void(0);\">"+_6d(_6b)+"</a>";
_6e(str,_64);
}
}
}
}
}
_23(_64,_63);
for(i=0;i<ids.length;i++){
var btn=_8.getElementById(ids[i]);
if(!btn){
continue;
}
btn.obj=obs[i];
_9.console._connects.push(_1.connect(btn,"onclick",function(){
console.openObjectInspector();
try{
_22(this.obj);
}
catch(e){
this.obj=e;
}
_d.innerHTML="<pre>"+_22(this.obj)+"</pre>";
}));
}
};
function _68(_6f){
var _70=[];
var reg=/((^%|[^\\]%)(\d+)?(\.)([a-zA-Z]))|((^%|[^\\]%)([a-zA-Z]))/;
var _71={s:_6a,d:_72,i:_72,f:_73};
for(var m=reg.exec(_6f);m;m=reg.exec(_6f)){
var _74=m[8]?m[8]:m[5];
var _75=_74 in _71?_71[_74]:_76;
var _77=m[3]?parseInt(m[3]):(m[4]=="."?-1:0);
_70.push(_6f.substr(0,m[0][0]=="%"?m.index:m.index+1));
_70.push({appender:_75,precision:_77});
_6f=_6f.substr(m.index+m[0].length);
}
_70.push(_6f);
return _70;
};
function _78(_79){
function _7a(ch){
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
return String(_79).replace(/[<>&"']/g,_7a);
};
function _7b(_7c){
try{
return _7c+"";
}
catch(e){
return null;
}
};
function _6e(_7d,_7e){
_7e.push(_7b(_7d));
};
function _6a(_7f,_80){
_80.push(_78(_7b(_7f)));
};
function _6c(_81,_82){
_82.push("<span class=\"objectBox-null\">",_78(_7b(_81)),"</span>");
};
function _83(_84,_85){
_85.push("<span class=\"objectBox-string\">&quot;",_78(_7b(_84)),"&quot;</span>");
};
function _72(_86,_87){
_87.push("<span class=\"objectBox-number\">",_78(_7b(_86)),"</span>");
};
function _73(_88,_89){
_89.push("<span class=\"objectBox-number\">",_78(_7b(_88)),"</span>");
};
function _8a(_8b,_8c){
_8c.push("<span class=\"objectBox-function\">",_6d(_8b),"</span>");
};
function _76(_8d,_8e){
try{
if(_8d===undefined){
_6c("undefined",_8e);
}else{
if(_8d===null){
_6c("null",_8e);
}else{
if(typeof _8d=="string"){
_83(_8d,_8e);
}else{
if(typeof _8d=="number"){
_72(_8d,_8e);
}else{
if(typeof _8d=="function"){
_8a(_8d,_8e);
}else{
if(_8d.nodeType==1){
_8f(_8d,_8e);
}else{
if(typeof _8d=="object"){
_90(_8d,_8e);
}else{
_6a(_8d,_8e);
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
function _90(_91,_92){
var _93=_7b(_91);
var _94=/\[object (.*?)\]/;
var m=_94.exec(_93);
_92.push("<span class=\"objectBox-object\">",m?m[1]:_93,"</span>");
};
function _8f(_95,_96){
_96.push("<span class=\"objectBox-selector\">");
_96.push("<span class=\"selectorTag\">",_78(_95.nodeName.toLowerCase()),"</span>");
if(_95.id){
_96.push("<span class=\"selectorId\">#",_78(_95.id),"</span>");
}
if(_95.className){
_96.push("<span class=\"selectorClass\">.",_78(_95.className),"</span>");
}
_96.push("</span>");
};
function _26(_97,_98){
if(_97.nodeType==1){
_98.push("<div class=\"objectBox-element\">","&lt;<span class=\"nodeTag\">",_97.nodeName.toLowerCase(),"</span>");
for(var i=0;i<_97.attributes.length;++i){
var _99=_97.attributes[i];
if(!_99.specified){
continue;
}
_98.push("&nbsp;<span class=\"nodeName\">",_99.nodeName.toLowerCase(),"</span>=&quot;<span class=\"nodeValue\">",_78(_99.nodeValue),"</span>&quot;");
}
if(_97.firstChild){
_98.push("&gt;</div><div class=\"nodeChildren\">");
for(var _9a=_97.firstChild;_9a;_9a=_9a.nextSibling){
_26(_9a,_98);
}
_98.push("</div><div class=\"objectBox-element\">&lt;/<span class=\"nodeTag\">",_97.nodeName.toLowerCase(),"&gt;</span></div>");
}else{
_98.push("/&gt;</div>");
}
}else{
if(_97.nodeType==3){
_98.push("<div class=\"nodeText\">",_78(_97.nodeValue),"</div>");
}
}
};
function _46(_9b,_9c,_9d){
if(document.all){
_9b.attachEvent("on"+_9c,_9d);
}else{
_9b.addEventListener(_9c,_9d,false);
}
};
function _9e(_9f,_a0,_a1){
if(document.all){
_9f.detachEvent("on"+_a0,_a1);
}else{
_9f.removeEventListener(_a0,_a1,false);
}
};
function _a2(_a3){
if(document.all){
_a3.cancelBubble=true;
}else{
_a3.stopPropagation();
}
};
function _a4(msg,_a5,_a6){
var _a7=_a5.lastIndexOf("/");
var _a8=_a7==-1?_a5:_a5.substr(_a7+1);
var _a9=["<span class=\"errorMessage\">",msg,"</span>","<div class=\"objectBox-sourceLink\">",_a8," (line ",_a6,")</div>"];
_23(_a9,"error");
};
var _aa=new Date().getTime();
function _48(_ab){
var _ac=(new Date()).getTime();
if(_ac>_aa+200){
_ab=_1.fixEvent(_ab);
var _ad=_1.keys;
var ekc=_ab.keyCode;
_aa=_ac;
if(ekc==_ad.F12){
_31();
}else{
if((ekc==_ad.NUMPAD_ENTER||ekc==76)&&_ab.shiftKey&&(_ab.metaKey||_ab.ctrlKey)){
_36();
}else{
return;
}
}
_a2(_ab);
}
};
function _47(e){
var dk=_1.keys;
if(e.keyCode==13&&_f.value){
_ae(_f.value);
_4c();
}else{
if(e.keyCode==27){
_f.value="";
}else{
if(e.keyCode==dk.UP_ARROW||e.charCode==dk.UP_ARROW){
_af("older");
}else{
if(e.keyCode==dk.DOWN_ARROW||e.charCode==dk.DOWN_ARROW){
_af("newer");
}else{
if(e.keyCode==dk.HOME||e.charCode==dk.HOME){
_b0=1;
_af("older");
}else{
if(e.keyCode==dk.END||e.charCode==dk.END){
_b0=999999;
_af("newer");
}
}
}
}
}
}
};
var _b0=-1;
var _b1=null;
function _ae(_b2){
var _b3=_b4("firebug_history");
_b3=(_b3)?_1.fromJson(_b3):[];
var pos=_1.indexOf(_b3,_b2);
if(pos!=-1){
_b3.splice(pos,1);
}
_b3.push(_b2);
_b4("firebug_history",_1.toJson(_b3),30);
while(_b3.length&&!_b4("firebug_history")){
_b3.shift();
_b4("firebug_history",_1.toJson(_b3),30);
}
_b1=null;
_b0=-1;
};
function _af(_b5){
var _b6=_b4("firebug_history");
_b6=(_b6)?_1.fromJson(_b6):[];
if(!_b6.length){
return;
}
if(_b1===null){
_b1=_f.value;
}
if(_b0==-1){
_b0=_b6.length;
}
if(_b5=="older"){
--_b0;
if(_b0<0){
_b0=0;
}
}else{
if(_b5=="newer"){
++_b0;
if(_b0>_b6.length){
_b0=_b6.length;
}
}
}
if(_b0==_b6.length){
_f.value=_b1;
_b1=null;
}else{
_f.value=_b6[_b0];
}
};
function _b4(_b7,_b8){
var c=document.cookie;
if(arguments.length==1){
var _b9=c.match(new RegExp("(?:^|; )"+_b7+"=([^;]*)"));
return _b9?decodeURIComponent(_b9[1]):undefined;
}else{
var d=new Date();
d.setMonth(d.getMonth()+1);
document.cookie=_b7+"="+encodeURIComponent(_b8)+((d.toUtcString)?"; expires="+d.toUTCString():"");
}
};
function _ba(it){
return it&&it instanceof Array||typeof it=="array";
};
function _bb(o){
var cnt=0;
for(var nm in o){
cnt++;
}
return cnt;
};
function _22(o,i,txt,_bc){
var ind=" \t";
txt=txt||"";
i=i||ind;
_bc=_bc||[];
var _bd;
if(o&&o.nodeType==1){
var _be=[];
_26(o,_be);
return _be.join("");
}
var br=",\n",cnt=0,_bf=_bb(o);
if(o instanceof Date){
return i+o.toString()+br;
}
looking:
for(var nm in o){
cnt++;
if(cnt==_bf){
br="\n";
}
if(o[nm]===window||o[nm]===document){
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
for(var j=0,_c0;_c0=_bc[j];j++){
if(o[nm]===_c0){
txt+=i+nm+" : RECURSION"+br;
continue looking;
}
}
_bc.push(o[nm]);
_bd=(_ba(o[nm]))?["[","]"]:["{","}"];
txt+=i+nm+" : "+_bd[0]+"\n";
txt+=_22(o[nm],i+ind,"",_bc);
txt+=i+_bd[1]+br;
}else{
if(typeof o[nm]=="undefined"){
txt+=i+nm+" : undefined"+br;
}else{
if(nm=="toString"&&typeof o[nm]=="function"){
var _c1=o[nm]();
if(typeof _c1=="string"&&_c1.match(/function ?(.*?)\(/)){
_c1=_78(_6d(o[nm]));
}
txt+=i+nm+" : "+_c1+br;
}else{
txt+=i+nm+" : "+_78(_6d(o[nm]))+br;
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
function _6d(obj){
var _c2=(obj instanceof Error);
if(obj.nodeType==1){
return _78("< "+obj.tagName.toLowerCase()+" id=\""+obj.id+"\" />");
}
if(obj.nodeType==3){
return _78("[TextNode: \""+obj.nodeValue+"\"]");
}
var nm=(obj&&(obj.id||obj.name||obj.ObjectID||obj.widgetId));
if(!_c2&&nm){
return "{"+nm+"}";
}
var _c3=2;
var _c4=4;
var cnt=0;
if(_c2){
nm="[ Error: "+(obj.message||obj.description||obj)+" ]";
}else{
if(_ba(obj)){
nm="["+obj.slice(0,_c4).join(",");
if(obj.length>_c4){
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
if(cnt>_c3){
break;
}
nm+=i+":"+_78(obj[i])+"  ";
}
nm+="}";
}
}
}
}
return nm;
};
_46(document,_4("ie")||_4("safari")?"keydown":"keypress",_48);
if((document.documentElement.getAttribute("debug")=="true")||(_1.config.isDebug)){
_31(true);
}
_1.addOnWindowUnload(function(){
_9e(document,_4("ie")||_4("safari")?"keydown":"keypress",_48);
window.onFirebugResize=null;
window.console=null;
});
});
