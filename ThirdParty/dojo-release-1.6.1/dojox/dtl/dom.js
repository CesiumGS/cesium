/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.dom"]){
dojo._hasResource["dojox.dtl.dom"]=true;
dojo.provide("dojox.dtl.dom");
dojo.require("dojox.dtl._base");
dojo.require("dojox.dtl.Context");
(function(){
var dd=dojox.dtl;
dd.BOOLS={checked:1,disabled:1,readonly:1};
dd.TOKEN_CHANGE=-11;
dd.TOKEN_ATTR=-12;
dd.TOKEN_CUSTOM=-13;
dd.TOKEN_NODE=1;
var _1=dd.text;
var _2=dd.dom={_attributes:{},_uppers:{},_re4:/^function anonymous\(\)\s*{\s*(.*)\s*}$/,_reTrim:/(?:^[\n\s]*(\{%)?\s*|\s*(%\})?[\n\s]*$)/g,_reSplit:/\s*%\}[\n\s]*\{%\s*/g,getTemplate:function(_3){
if(typeof this._commentable=="undefined"){
this._commentable=false;
var _4=document.createElement("div");
_4.innerHTML="<!--Test comment handling, and long comments, using comments whenever possible.-->";
if(_4.childNodes.length&&_4.childNodes[0].nodeType==8&&_4.childNodes[0].data=="comment"){
this._commentable=true;
}
}
if(!this._commentable){
_3=_3.replace(/<!--({({|%).*?(%|})})-->/g,"$1");
}
if(dojo.isIE){
_3=_3.replace(/\b(checked|disabled|readonly|style)="/g,"t$1=\"");
}
_3=_3.replace(/\bstyle="/g,"tstyle=\"");
var _5;
var _6=dojo.isWebKit;
var _7=[[true,"select","option"],[_6,"tr","td|th"],[_6,"thead","tr","th"],[_6,"tbody","tr","td"],[_6,"table","tbody|thead|tr","tr","td"]];
var _8=[];
for(var i=0,_9;_9=_7[i];i++){
if(!_9[0]){
continue;
}
if(_3.indexOf("<"+_9[1])!=-1){
var _a=new RegExp("<"+_9[1]+"(?:.|\n)*?>((?:.|\n)+?)</"+_9[1]+">","ig");
tagLoop:
while(_5=_a.exec(_3)){
var _b=_9[2].split("|");
var _c=[];
for(var j=0,_d;_d=_b[j];j++){
_c.push("<"+_d+"(?:.|\n)*?>(?:.|\n)*?</"+_d+">");
}
var _e=[];
var _f=dojox.string.tokenize(_5[1],new RegExp("("+_c.join("|")+")","ig"),function(_10){
var tag=/<(\w+)/.exec(_10)[1];
if(!_e[tag]){
_e[tag]=true;
_e.push(tag);
}
return {data:_10};
});
if(_e.length){
var tag=(_e.length==1)?_e[0]:_9[2].split("|")[0];
var _11=[];
for(var j=0,jl=_f.length;j<jl;j++){
var _12=_f[j];
if(dojo.isObject(_12)){
_11.push(_12.data);
}else{
var _13=_12.replace(this._reTrim,"");
if(!_13){
continue;
}
_12=_13.split(this._reSplit);
for(var k=0,kl=_12.length;k<kl;k++){
var _14="";
for(var p=2,pl=_9.length;p<pl;p++){
if(p==2){
_14+="<"+tag+" dtlinstruction=\"{% "+_12[k].replace("\"","\\\"")+" %}\">";
}else{
if(tag==_9[p]){
continue;
}else{
_14+="<"+_9[p]+">";
}
}
}
_14+="DTL";
for(var p=_9.length-1;p>1;p--){
if(p==2){
_14+="</"+tag+">";
}else{
if(tag==_9[p]){
continue;
}else{
_14+="</"+_9[p]+">";
}
}
}
_11.push("ÿ"+_8.length);
_8.push(_14);
}
}
}
_3=_3.replace(_5[1],_11.join(""));
}
}
}
}
for(var i=_8.length;i--;){
_3=_3.replace("ÿ"+i,_8[i]);
}
var re=/\b([a-zA-Z_:][a-zA-Z0-9_\-\.:]*)=['"]/g;
while(_5=re.exec(_3)){
var _15=_5[1].toLowerCase();
if(_15=="dtlinstruction"){
continue;
}
if(_15!=_5[1]){
this._uppers[_15]=_5[1];
}
this._attributes[_15]=true;
}
var _4=document.createElement("div");
_4.innerHTML=_3;
var _16={nodes:[]};
while(_4.childNodes.length){
_16.nodes.push(_4.removeChild(_4.childNodes[0]));
}
return _16;
},tokenize:function(_17){
var _18=[];
for(var i=0,_19;_19=_17[i++];){
if(_19.nodeType!=1){
this.__tokenize(_19,_18);
}else{
this._tokenize(_19,_18);
}
}
return _18;
},_swallowed:[],_tokenize:function(_1a,_1b){
var _1c=false;
var _1d=this._swallowed;
var i,j,tag,_1e;
if(!_1b.first){
_1c=_1b.first=true;
var _1f=dd.register.getAttributeTags();
for(i=0;tag=_1f[i];i++){
try{
(tag[2])({swallowNode:function(){
throw 1;
}},new dd.Token(dd.TOKEN_ATTR,""));
}
catch(e){
_1d.push(tag);
}
}
}
for(i=0;tag=_1d[i];i++){
var _20=_1a.getAttribute(tag[0]);
if(_20){
var _1d=false;
var _21=(tag[2])({swallowNode:function(){
_1d=true;
return _1a;
}},new dd.Token(dd.TOKEN_ATTR,tag[0]+" "+_20));
if(_1d){
if(_1a.parentNode&&_1a.parentNode.removeChild){
_1a.parentNode.removeChild(_1a);
}
_1b.push([dd.TOKEN_CUSTOM,_21]);
return;
}
}
}
var _22=[];
if(dojo.isIE&&_1a.tagName=="SCRIPT"){
_22.push({nodeType:3,data:_1a.text});
_1a.text="";
}else{
for(i=0;_1e=_1a.childNodes[i];i++){
_22.push(_1e);
}
}
_1b.push([dd.TOKEN_NODE,_1a]);
var _23=false;
if(_22.length){
_1b.push([dd.TOKEN_CHANGE,_1a]);
_23=true;
}
for(var key in this._attributes){
var _24=false;
var _25="";
if(key=="class"){
_25=_1a.className||_25;
}else{
if(key=="for"){
_25=_1a.htmlFor||_25;
}else{
if(key=="value"&&_1a.value==_1a.innerHTML){
continue;
}else{
if(_1a.getAttribute){
_25=_1a.getAttribute(key,2)||_25;
if(key=="href"||key=="src"){
if(dojo.isIE){
var _26=location.href.lastIndexOf(location.hash);
var _27=location.href.substring(0,_26).split("/");
_27.pop();
_27=_27.join("/")+"/";
if(_25.indexOf(_27)==0){
_25=_25.replace(_27,"");
}
_25=decodeURIComponent(_25);
}
}else{
if(key=="tstyle"){
_24=key;
key="style";
}else{
if(dd.BOOLS[key.slice(1)]&&dojo.trim(_25)){
key=key.slice(1);
}else{
if(this._uppers[key]&&dojo.trim(_25)){
_24=this._uppers[key];
}
}
}
}
}
}
}
}
if(_24){
_1a.setAttribute(_24,"");
_1a.removeAttribute(_24);
}
if(typeof _25=="function"){
_25=_25.toString().replace(this._re4,"$1");
}
if(!_23){
_1b.push([dd.TOKEN_CHANGE,_1a]);
_23=true;
}
_1b.push([dd.TOKEN_ATTR,_1a,key,_25]);
}
for(i=0,_1e;_1e=_22[i];i++){
if(_1e.nodeType==1){
var _28=_1e.getAttribute("dtlinstruction");
if(_28){
_1e.parentNode.removeChild(_1e);
_1e={nodeType:8,data:_28};
}
}
this.__tokenize(_1e,_1b);
}
if(!_1c&&_1a.parentNode&&_1a.parentNode.tagName){
if(_23){
_1b.push([dd.TOKEN_CHANGE,_1a,true]);
}
_1b.push([dd.TOKEN_CHANGE,_1a.parentNode]);
_1a.parentNode.removeChild(_1a);
}else{
_1b.push([dd.TOKEN_CHANGE,_1a,true,true]);
}
},__tokenize:function(_29,_2a){
var _2b=_29.data;
switch(_29.nodeType){
case 1:
this._tokenize(_29,_2a);
return;
case 3:
if(_2b.match(/[^\s\n]/)&&(_2b.indexOf("{{")!=-1||_2b.indexOf("{%")!=-1)){
var _2c=_1.tokenize(_2b);
for(var j=0,_2d;_2d=_2c[j];j++){
if(typeof _2d=="string"){
_2a.push([dd.TOKEN_TEXT,_2d]);
}else{
_2a.push(_2d);
}
}
}else{
_2a.push([_29.nodeType,_29]);
}
if(_29.parentNode){
_29.parentNode.removeChild(_29);
}
return;
case 8:
if(_2b.indexOf("{%")==0){
var _2d=dojo.trim(_2b.slice(2,-2));
if(_2d.substr(0,5)=="load "){
var _2e=dojo.trim(_2d).split(/\s+/g);
for(var i=1,_2f;_2f=_2e[i];i++){
dojo["require"](_2f);
}
}
_2a.push([dd.TOKEN_BLOCK,_2d]);
}
if(_2b.indexOf("{{")==0){
_2a.push([dd.TOKEN_VAR,dojo.trim(_2b.slice(2,-2))]);
}
if(_29.parentNode){
_29.parentNode.removeChild(_29);
}
return;
}
}};
dd.DomTemplate=dojo.extend(function(obj){
if(!obj.nodes){
var _30=dojo.byId(obj);
if(_30&&_30.nodeType==1){
dojo.forEach(["class","src","href","name","value"],function(_31){
_2._attributes[_31]=true;
});
obj={nodes:[_30]};
}else{
if(typeof obj=="object"){
obj=_1.getTemplateString(obj);
}
obj=_2.getTemplate(obj);
}
}
var _32=_2.tokenize(obj.nodes);
if(dd.tests){
this.tokens=_32.slice(0);
}
var _33=new dd._DomParser(_32);
this.nodelist=_33.parse();
},{_count:0,_re:/\bdojo:([a-zA-Z0-9_]+)\b/g,setClass:function(str){
this.getRootNode().className=str;
},getRootNode:function(){
return this.buffer.rootNode;
},getBuffer:function(){
return new dd.DomBuffer();
},render:function(_34,_35){
_35=this.buffer=_35||this.getBuffer();
this.rootNode=null;
var _36=this.nodelist.render(_34||new dd.Context({}),_35);
for(var i=0,_37;_37=_35._cache[i];i++){
if(_37._cache){
_37._cache.length=0;
}
}
return _36;
},unrender:function(_38,_39){
return this.nodelist.unrender(_38,_39);
}});
dd.DomBuffer=dojo.extend(function(_3a){
this._parent=_3a;
this._cache=[];
},{concat:function(_3b){
var _3c=this._parent;
if(_3c&&_3b.parentNode&&_3b.parentNode===_3c&&!_3c._dirty){
return this;
}
if(_3b.nodeType==1&&!this.rootNode){
this.rootNode=_3b||true;
return this;
}
if(!_3c){
if(_3b.nodeType==3&&dojo.trim(_3b.data)){
throw new Error("Text should not exist outside of the root node in template");
}
return this;
}
if(this._closed){
if(_3b.nodeType==3&&!dojo.trim(_3b.data)){
return this;
}else{
throw new Error("Content should not exist outside of the root node in template");
}
}
if(_3c._dirty){
if(_3b._drawn&&_3b.parentNode==_3c){
var _3d=_3c._cache;
if(_3d){
for(var i=0,_3e;_3e=_3d[i];i++){
this.onAddNode&&this.onAddNode(_3e);
_3c.insertBefore(_3e,_3b);
this.onAddNodeComplete&&this.onAddNodeComplete(_3e);
}
_3d.length=0;
}
}
_3c._dirty=false;
}
if(!_3c._cache){
_3c._cache=[];
this._cache.push(_3c);
}
_3c._dirty=true;
_3c._cache.push(_3b);
return this;
},remove:function(obj){
if(typeof obj=="string"){
if(this._parent){
this._parent.removeAttribute(obj);
}
}else{
if(obj.nodeType==1&&!this.getRootNode()&&!this._removed){
this._removed=true;
return this;
}
if(obj.parentNode){
this.onRemoveNode&&this.onRemoveNode(obj);
if(obj.parentNode){
obj.parentNode.removeChild(obj);
}
}
}
return this;
},setAttribute:function(key,_3f){
var old=dojo.attr(this._parent,key);
if(this.onChangeAttribute&&old!=_3f){
this.onChangeAttribute(this._parent,key,old,_3f);
}
if(key=="style"){
this._parent.style.cssText=_3f;
}else{
dojo.attr(this._parent,key,_3f);
}
return this;
},addEvent:function(_40,_41,fn,_42){
if(!_40.getThis()){
throw new Error("You must use Context.setObject(instance)");
}
this.onAddEvent&&this.onAddEvent(this.getParent(),_41,fn);
var _43=fn;
if(dojo.isArray(_42)){
_43=function(e){
this[fn].apply(this,[e].concat(_42));
};
}
return dojo.connect(this.getParent(),_41,_40.getThis(),_43);
},setParent:function(_44,up,_45){
if(!this._parent){
this._parent=this._first=_44;
}
if(up&&_45&&_44===this._first){
this._closed=true;
}
if(up){
var _46=this._parent;
var _47="";
var ie=dojo.isIE&&_46.tagName=="SCRIPT";
if(ie){
_46.text="";
}
if(_46._dirty){
var _48=_46._cache;
var _49=(_46.tagName=="SELECT"&&!_46.options.length);
for(var i=0,_4a;_4a=_48[i];i++){
if(_4a!==_46){
this.onAddNode&&this.onAddNode(_4a);
if(ie){
_47+=_4a.data;
}else{
_46.appendChild(_4a);
if(_49&&_4a.defaultSelected&&i){
_49=i;
}
}
this.onAddNodeComplete&&this.onAddNodeComplete(_4a);
}
}
if(_49){
_46.options.selectedIndex=(typeof _49=="number")?_49:0;
}
_48.length=0;
_46._dirty=false;
}
if(ie){
_46.text=_47;
}
}
this._parent=_44;
this.onSetParent&&this.onSetParent(_44,up,_45);
return this;
},getParent:function(){
return this._parent;
},getRootNode:function(){
return this.rootNode;
}});
dd._DomNode=dojo.extend(function(_4b){
this.contents=_4b;
},{render:function(_4c,_4d){
this._rendered=true;
return _4d.concat(this.contents);
},unrender:function(_4e,_4f){
if(!this._rendered){
return _4f;
}
this._rendered=false;
return _4f.remove(this.contents);
},clone:function(_50){
return new this.constructor(this.contents);
}});
dd._DomNodeList=dojo.extend(function(_51){
this.contents=_51||[];
},{push:function(_52){
this.contents.push(_52);
},unshift:function(_53){
this.contents.unshift(_53);
},render:function(_54,_55,_56){
_55=_55||dd.DomTemplate.prototype.getBuffer();
if(_56){
var _57=_55.getParent();
}
for(var i=0;i<this.contents.length;i++){
_55=this.contents[i].render(_54,_55);
if(!_55){
throw new Error("Template node render functions must return their buffer");
}
}
if(_57){
_55.setParent(_57);
}
return _55;
},dummyRender:function(_58,_59,_5a){
var div=document.createElement("div");
var _5b=_59.getParent();
var old=_5b._clone;
_5b._clone=div;
var _5c=this.clone(_59,div);
if(old){
_5b._clone=old;
}else{
_5b._clone=null;
}
_59=dd.DomTemplate.prototype.getBuffer();
_5c.unshift(new dd.ChangeNode(div));
_5c.unshift(new dd._DomNode(div));
_5c.push(new dd.ChangeNode(div,true));
_5c.render(_58,_59);
if(_5a){
return _59.getRootNode();
}
var _5d=div.innerHTML;
return (dojo.isIE)?_5d.replace(/\s*_(dirty|clone)="[^"]*"/g,""):_5d;
},unrender:function(_5e,_5f,_60){
if(_60){
var _61=_5f.getParent();
}
for(var i=0;i<this.contents.length;i++){
_5f=this.contents[i].unrender(_5e,_5f);
if(!_5f){
throw new Error("Template node render functions must return their buffer");
}
}
if(_61){
_5f.setParent(_61);
}
return _5f;
},clone:function(_62){
var _63=_62.getParent();
var _64=this.contents;
var _65=new dd._DomNodeList();
var _66=[];
for(var i=0;i<_64.length;i++){
var _67=_64[i].clone(_62);
if(_67 instanceof dd.ChangeNode||_67 instanceof dd._DomNode){
var _68=_67.contents._clone;
if(_68){
_67.contents=_68;
}else{
if(_63!=_67.contents&&_67 instanceof dd._DomNode){
var _69=_67.contents;
_67.contents=_67.contents.cloneNode(false);
_62.onClone&&_62.onClone(_69,_67.contents);
_66.push(_69);
_69._clone=_67.contents;
}
}
}
_65.push(_67);
}
for(var i=0,_67;_67=_66[i];i++){
_67._clone=null;
}
return _65;
},rtrim:function(){
while(1){
var i=this.contents.length-1;
if(this.contents[i] instanceof dd._DomTextNode&&this.contents[i].isEmpty()){
this.contents.pop();
}else{
break;
}
}
return this;
}});
dd._DomVarNode=dojo.extend(function(str){
this.contents=new dd._Filter(str);
},{render:function(_6a,_6b){
var str=this.contents.resolve(_6a);
var _6c="text";
if(str){
if(str.render&&str.getRootNode){
_6c="injection";
}else{
if(str.safe){
if(str.nodeType){
_6c="node";
}else{
if(str.toString){
str=str.toString();
_6c="html";
}
}
}
}
}
if(this._type&&_6c!=this._type){
this.unrender(_6a,_6b);
}
this._type=_6c;
switch(_6c){
case "text":
this._rendered=true;
this._txt=this._txt||document.createTextNode(str);
if(this._txt.data!=str){
var old=this._txt.data;
this._txt.data=str;
_6b.onChangeData&&_6b.onChangeData(this._txt,old,this._txt.data);
}
return _6b.concat(this._txt);
case "injection":
var _6d=str.getRootNode();
if(this._rendered&&_6d!=this._root){
_6b=this.unrender(_6a,_6b);
}
this._root=_6d;
var _6e=this._injected=new dd._DomNodeList();
_6e.push(new dd.ChangeNode(_6b.getParent()));
_6e.push(new dd._DomNode(_6d));
_6e.push(str);
_6e.push(new dd.ChangeNode(_6b.getParent()));
this._rendered=true;
return _6e.render(_6a,_6b);
case "node":
this._rendered=true;
if(this._node&&this._node!=str&&this._node.parentNode&&this._node.parentNode===_6b.getParent()){
this._node.parentNode.removeChild(this._node);
}
this._node=str;
return _6b.concat(str);
case "html":
if(this._rendered&&this._src!=str){
_6b=this.unrender(_6a,_6b);
}
this._src=str;
if(!this._rendered){
this._rendered=true;
this._html=this._html||[];
var div=(this._div=this._div||document.createElement("div"));
div.innerHTML=str;
var _6f=div.childNodes;
while(_6f.length){
var _70=div.removeChild(_6f[0]);
this._html.push(_70);
_6b=_6b.concat(_70);
}
}
return _6b;
default:
return _6b;
}
},unrender:function(_71,_72){
if(!this._rendered){
return _72;
}
this._rendered=false;
switch(this._type){
case "text":
return _72.remove(this._txt);
case "injection":
return this._injection.unrender(_71,_72);
case "node":
if(this._node.parentNode===_72.getParent()){
return _72.remove(this._node);
}
return _72;
case "html":
for(var i=0,l=this._html.length;i<l;i++){
_72=_72.remove(this._html[i]);
}
return _72;
default:
return _72;
}
},clone:function(){
return new this.constructor(this.contents.getExpression());
}});
dd.ChangeNode=dojo.extend(function(_73,up,_74){
this.contents=_73;
this.up=up;
this.root=_74;
},{render:function(_75,_76){
return _76.setParent(this.contents,this.up,this.root);
},unrender:function(_77,_78){
if(!_78.getParent()){
return _78;
}
return _78.setParent(this.contents);
},clone:function(){
return new this.constructor(this.contents,this.up,this.root);
}});
dd.AttributeNode=dojo.extend(function(key,_79){
this.key=key;
this.value=_79;
this.contents=_79;
if(this._pool[_79]){
this.nodelist=this._pool[_79];
}else{
if(!(this.nodelist=dd.quickFilter(_79))){
this.nodelist=(new dd.Template(_79,true)).nodelist;
}
this._pool[_79]=this.nodelist;
}
this.contents="";
},{_pool:{},render:function(_7a,_7b){
var key=this.key;
var _7c=this.nodelist.dummyRender(_7a);
if(dd.BOOLS[key]){
_7c=!(_7c=="false"||_7c=="undefined"||!_7c);
}
if(_7c!==this.contents){
this.contents=_7c;
return _7b.setAttribute(key,_7c);
}
return _7b;
},unrender:function(_7d,_7e){
this.contents="";
return _7e.remove(this.key);
},clone:function(_7f){
return new this.constructor(this.key,this.value);
}});
dd._DomTextNode=dojo.extend(function(str){
this.contents=document.createTextNode(str);
this.upcoming=str;
},{set:function(_80){
this.upcoming=_80;
return this;
},render:function(_81,_82){
if(this.contents.data!=this.upcoming){
var old=this.contents.data;
this.contents.data=this.upcoming;
_82.onChangeData&&_82.onChangeData(this.contents,old,this.upcoming);
}
return _82.concat(this.contents);
},unrender:function(_83,_84){
return _84.remove(this.contents);
},isEmpty:function(){
return !dojo.trim(this.contents.data);
},clone:function(){
return new this.constructor(this.contents.data);
}});
dd._DomParser=dojo.extend(function(_85){
this.contents=_85;
},{i:0,parse:function(_86){
var _87={};
var _88=this.contents;
if(!_86){
_86=[];
}
for(var i=0;i<_86.length;i++){
_87[_86[i]]=true;
}
var _89=new dd._DomNodeList();
while(this.i<_88.length){
var _8a=_88[this.i++];
var _8b=_8a[0];
var _8c=_8a[1];
if(_8b==dd.TOKEN_CUSTOM){
_89.push(_8c);
}else{
if(_8b==dd.TOKEN_CHANGE){
var _8d=new dd.ChangeNode(_8c,_8a[2],_8a[3]);
_8c[_8d.attr]=_8d;
_89.push(_8d);
}else{
if(_8b==dd.TOKEN_ATTR){
var fn=_1.getTag("attr:"+_8a[2],true);
if(fn&&_8a[3]){
if(_8a[3].indexOf("{%")!=-1||_8a[3].indexOf("{{")!=-1){
_8c.setAttribute(_8a[2],"");
}
_89.push(fn(null,new dd.Token(_8b,_8a[2]+" "+_8a[3])));
}else{
if(dojo.isString(_8a[3])){
if(_8a[2]=="style"||_8a[3].indexOf("{%")!=-1||_8a[3].indexOf("{{")!=-1){
_89.push(new dd.AttributeNode(_8a[2],_8a[3]));
}else{
if(dojo.trim(_8a[3])){
try{
dojo.attr(_8c,_8a[2],_8a[3]);
}
catch(e){
}
}
}
}
}
}else{
if(_8b==dd.TOKEN_NODE){
var fn=_1.getTag("node:"+_8c.tagName.toLowerCase(),true);
if(fn){
_89.push(fn(null,new dd.Token(_8b,_8c),_8c.tagName.toLowerCase()));
}
_89.push(new dd._DomNode(_8c));
}else{
if(_8b==dd.TOKEN_VAR){
_89.push(new dd._DomVarNode(_8c));
}else{
if(_8b==dd.TOKEN_TEXT){
_89.push(new dd._DomTextNode(_8c.data||_8c));
}else{
if(_8b==dd.TOKEN_BLOCK){
if(_87[_8c]){
--this.i;
return _89;
}
var cmd=_8c.split(/\s+/g);
if(cmd.length){
cmd=cmd[0];
var fn=_1.getTag(cmd);
if(typeof fn!="function"){
throw new Error("Function not found for "+cmd);
}
var tpl=fn(this,new dd.Token(_8b,_8c));
if(tpl){
_89.push(tpl);
}
}
}
}
}
}
}
}
}
}
if(_86.length){
throw new Error("Could not find closing tag(s): "+_86.toString());
}
return _89;
},next_token:function(){
var _8e=this.contents[this.i++];
return new dd.Token(_8e[0],_8e[1]);
},delete_first_token:function(){
this.i++;
},skip_past:function(_8f){
return dd._Parser.prototype.skip_past.call(this,_8f);
},create_variable_node:function(_90){
return new dd._DomVarNode(_90);
},create_text_node:function(_91){
return new dd._DomTextNode(_91||"");
},getTemplate:function(loc){
return new dd.DomTemplate(_2.getTemplate(loc));
}});
})();
}
