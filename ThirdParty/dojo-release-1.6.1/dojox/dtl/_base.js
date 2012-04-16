/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl._base"]){
dojo._hasResource["dojox.dtl._base"]=true;
dojo.provide("dojox.dtl._base");
dojo.require("dojox.string.Builder");
dojo.require("dojox.string.tokenize");
dojo.experimental("dojox.dtl");
(function(){
var dd=dojox.dtl;
dd.TOKEN_BLOCK=-1;
dd.TOKEN_VAR=-2;
dd.TOKEN_COMMENT=-3;
dd.TOKEN_TEXT=3;
dd._Context=dojo.extend(function(_1){
if(_1){
dojo._mixin(this,_1);
if(_1.get){
this._getter=_1.get;
delete this.get;
}
}
},{push:function(){
var _2=this;
var _3=dojo.delegate(this);
_3.pop=function(){
return _2;
};
return _3;
},pop:function(){
throw new Error("pop() called on empty Context");
},get:function(_4,_5){
var n=this._normalize;
if(this._getter){
var _6=this._getter(_4);
if(typeof _6!="undefined"){
return n(_6);
}
}
if(typeof this[_4]!="undefined"){
return n(this[_4]);
}
return _5;
},_normalize:function(_7){
if(_7 instanceof Date){
_7.year=_7.getFullYear();
_7.month=_7.getMonth()+1;
_7.day=_7.getDate();
_7.date=_7.year+"-"+("0"+_7.month).slice(-2)+"-"+("0"+_7.day).slice(-2);
_7.hour=_7.getHours();
_7.minute=_7.getMinutes();
_7.second=_7.getSeconds();
_7.microsecond=_7.getMilliseconds();
}
return _7;
},update:function(_8){
var _9=this.push();
if(_8){
dojo._mixin(this,_8);
}
return _9;
}});
var _a=/("(?:[^"\\]*(?:\\.[^"\\]*)*)"|'(?:[^'\\]*(?:\\.[^'\\]*)*)'|[^\s]+)/g;
var _b=/\s+/g;
var _c=function(_d,_e){
_d=_d||_b;
if(!(_d instanceof RegExp)){
_d=new RegExp(_d,"g");
}
if(!_d.global){
throw new Error("You must use a globally flagged RegExp with split "+_d);
}
_d.exec("");
var _f,_10=[],_11=0,i=0;
while(_f=_d.exec(this)){
_10.push(this.slice(_11,_d.lastIndex-_f[0].length));
_11=_d.lastIndex;
if(_e&&(++i>_e-1)){
break;
}
}
_10.push(this.slice(_11));
return _10;
};
dd.Token=function(_12,_13){
this.token_type=_12;
this.contents=new String(dojo.trim(_13));
this.contents.split=_c;
this.split=function(){
return String.prototype.split.apply(this.contents,arguments);
};
};
dd.Token.prototype.split_contents=function(_14){
var bit,_15=[],i=0;
_14=_14||999;
while(i++<_14&&(bit=_a.exec(this.contents))){
bit=bit[0];
if(bit.charAt(0)=="\""&&bit.slice(-1)=="\""){
_15.push("\""+bit.slice(1,-1).replace("\\\"","\"").replace("\\\\","\\")+"\"");
}else{
if(bit.charAt(0)=="'"&&bit.slice(-1)=="'"){
_15.push("'"+bit.slice(1,-1).replace("\\'","'").replace("\\\\","\\")+"'");
}else{
_15.push(bit);
}
}
}
return _15;
};
var ddt=dd.text={_get:function(_16,_17,_18){
var _19=dd.register.get(_16,_17.toLowerCase(),_18);
if(!_19){
if(!_18){
throw new Error("No tag found for "+_17);
}
return null;
}
var fn=_19[1];
var _1a=_19[2];
var _1b;
if(fn.indexOf(":")!=-1){
_1b=fn.split(":");
fn=_1b.pop();
}
dojo["require"](_1a);
var _1c=dojo.getObject(_1a);
return _1c[fn||_17]||_1c[_17+"_"]||_1c[fn+"_"];
},getTag:function(_1d,_1e){
return ddt._get("tag",_1d,_1e);
},getFilter:function(_1f,_20){
return ddt._get("filter",_1f,_20);
},getTemplate:function(_21){
return new dd.Template(ddt.getTemplateString(_21));
},getTemplateString:function(_22){
return dojo._getText(_22.toString())||"";
},_resolveLazy:function(_23,_24,_25){
if(_24){
if(_25){
return dojo.fromJson(dojo._getText(_23))||{};
}else{
return dd.text.getTemplateString(_23);
}
}else{
return dojo.xhrGet({handleAs:(_25)?"json":"text",url:_23});
}
},_resolveTemplateArg:function(arg,_26){
if(ddt._isTemplate(arg)){
if(!_26){
var d=new dojo.Deferred();
d.callback(arg);
return d;
}
return arg;
}
return ddt._resolveLazy(arg,_26);
},_isTemplate:function(arg){
return (typeof arg=="undefined")||(typeof arg=="string"&&(arg.match(/^\s*[<{]/)||arg.indexOf(" ")!=-1));
},_resolveContextArg:function(arg,_27){
if(arg.constructor==Object){
if(!_27){
var d=new dojo.Deferred;
d.callback(arg);
return d;
}
return arg;
}
return ddt._resolveLazy(arg,_27,true);
},_re:/(?:\{\{\s*(.+?)\s*\}\}|\{%\s*(load\s*)?(.+?)\s*%\})/g,tokenize:function(str){
return dojox.string.tokenize(str,ddt._re,ddt._parseDelims);
},_parseDelims:function(_28,_29,tag){
if(_28){
return [dd.TOKEN_VAR,_28];
}else{
if(_29){
var _2a=dojo.trim(tag).split(/\s+/g);
for(var i=0,_2b;_2b=_2a[i];i++){
dojo["require"](_2b);
}
}else{
return [dd.TOKEN_BLOCK,tag];
}
}
}};
dd.Template=dojo.extend(function(_2c,_2d){
var str=_2d?_2c:ddt._resolveTemplateArg(_2c,true)||"";
var _2e=ddt.tokenize(str);
var _2f=new dd._Parser(_2e);
this.nodelist=_2f.parse();
},{update:function(_30,_31){
return ddt._resolveContextArg(_31).addCallback(this,function(_32){
var _33=this.render(new dd._Context(_32));
if(_30.forEach){
_30.forEach(function(_34){
_34.innerHTML=_33;
});
}else{
dojo.byId(_30).innerHTML=_33;
}
return this;
});
},render:function(_35,_36){
_36=_36||this.getBuffer();
_35=_35||new dd._Context({});
return this.nodelist.render(_35,_36)+"";
},getBuffer:function(){
dojo.require("dojox.string.Builder");
return new dojox.string.Builder();
}});
var _37=/\{\{\s*(.+?)\s*\}\}/g;
dd.quickFilter=function(str){
if(!str){
return new dd._NodeList();
}
if(str.indexOf("{%")==-1){
return new dd._QuickNodeList(dojox.string.tokenize(str,_37,function(_38){
return new dd._Filter(_38);
}));
}
};
dd._QuickNodeList=dojo.extend(function(_39){
this.contents=_39;
},{render:function(_3a,_3b){
for(var i=0,l=this.contents.length;i<l;i++){
if(this.contents[i].resolve){
_3b=_3b.concat(this.contents[i].resolve(_3a));
}else{
_3b=_3b.concat(this.contents[i]);
}
}
return _3b;
},dummyRender:function(_3c){
return this.render(_3c,dd.Template.prototype.getBuffer()).toString();
},clone:function(_3d){
return this;
}});
dd._Filter=dojo.extend(function(_3e){
if(!_3e){
throw new Error("Filter must be called with variable name");
}
this.contents=_3e;
var _3f=this._cache[_3e];
if(_3f){
this.key=_3f[0];
this.filters=_3f[1];
}else{
this.filters=[];
dojox.string.tokenize(_3e,this._re,this._tokenize,this);
this._cache[_3e]=[this.key,this.filters];
}
},{_cache:{},_re:/(?:^_\("([^\\"]*(?:\\.[^\\"])*)"\)|^"([^\\"]*(?:\\.[^\\"]*)*)"|^([a-zA-Z0-9_.]+)|\|(\w+)(?::(?:_\("([^\\"]*(?:\\.[^\\"])*)"\)|"([^\\"]*(?:\\.[^\\"]*)*)"|([a-zA-Z0-9_.]+)|'([^\\']*(?:\\.[^\\']*)*)'))?|^'([^\\']*(?:\\.[^\\']*)*)')/g,_values:{0:"\"",1:"\"",2:"",8:"\""},_args:{4:"\"",5:"\"",6:"",7:"'"},_tokenize:function(){
var pos,arg;
for(var i=0,has=[];i<arguments.length;i++){
has[i]=(typeof arguments[i]!="undefined"&&typeof arguments[i]=="string"&&arguments[i]);
}
if(!this.key){
for(pos in this._values){
if(has[pos]){
this.key=this._values[pos]+arguments[pos]+this._values[pos];
break;
}
}
}else{
for(pos in this._args){
if(has[pos]){
var _40=arguments[pos];
if(this._args[pos]=="'"){
_40=_40.replace(/\\'/g,"'");
}else{
if(this._args[pos]=="\""){
_40=_40.replace(/\\"/g,"\"");
}
}
arg=[!this._args[pos],_40];
break;
}
}
var fn=ddt.getFilter(arguments[3]);
if(!dojo.isFunction(fn)){
throw new Error(arguments[3]+" is not registered as a filter");
}
this.filters.push([fn,arg]);
}
},getExpression:function(){
return this.contents;
},resolve:function(_41){
if(typeof this.key=="undefined"){
return "";
}
var str=this.resolvePath(this.key,_41);
for(var i=0,_42;_42=this.filters[i];i++){
if(_42[1]){
if(_42[1][0]){
str=_42[0](str,this.resolvePath(_42[1][1],_41));
}else{
str=_42[0](str,_42[1][1]);
}
}else{
str=_42[0](str);
}
}
return str;
},resolvePath:function(_43,_44){
var _45,_46;
var _47=_43.charAt(0);
var _48=_43.slice(-1);
if(!isNaN(parseInt(_47))){
_45=(_43.indexOf(".")==-1)?parseInt(_43):parseFloat(_43);
}else{
if(_47=="\""&&_47==_48){
_45=_43.slice(1,-1);
}else{
if(_43=="true"){
return true;
}
if(_43=="false"){
return false;
}
if(_43=="null"||_43=="None"){
return null;
}
_46=_43.split(".");
_45=_44.get(_46[0]);
if(dojo.isFunction(_45)){
var _49=_44.getThis&&_44.getThis();
if(_45.alters_data){
_45="";
}else{
if(_49){
_45=_45.call(_49);
}else{
_45="";
}
}
}
for(var i=1;i<_46.length;i++){
var _4a=_46[i];
if(_45){
var _4b=_45;
if(dojo.isObject(_45)&&_4a=="items"&&typeof _45[_4a]=="undefined"){
var _4c=[];
for(var key in _45){
_4c.push([key,_45[key]]);
}
_45=_4c;
continue;
}
if(_45.get&&dojo.isFunction(_45.get)&&_45.get.safe){
_45=_45.get(_4a);
}else{
if(typeof _45[_4a]=="undefined"){
_45=_45[_4a];
break;
}else{
_45=_45[_4a];
}
}
if(dojo.isFunction(_45)){
if(_45.alters_data){
_45="";
}else{
_45=_45.call(_4b);
}
}else{
if(_45 instanceof Date){
_45=dd._Context.prototype._normalize(_45);
}
}
}else{
return "";
}
}
}
}
return _45;
}});
dd._TextNode=dd._Node=dojo.extend(function(obj){
this.contents=obj;
},{set:function(_4d){
this.contents=_4d;
return this;
},render:function(_4e,_4f){
return _4f.concat(this.contents);
},isEmpty:function(){
return !dojo.trim(this.contents);
},clone:function(){
return this;
}});
dd._NodeList=dojo.extend(function(_50){
this.contents=_50||[];
this.last="";
},{push:function(_51){
this.contents.push(_51);
return this;
},concat:function(_52){
this.contents=this.contents.concat(_52);
return this;
},render:function(_53,_54){
for(var i=0;i<this.contents.length;i++){
_54=this.contents[i].render(_53,_54);
if(!_54){
throw new Error("Template must return buffer");
}
}
return _54;
},dummyRender:function(_55){
return this.render(_55,dd.Template.prototype.getBuffer()).toString();
},unrender:function(){
return arguments[1];
},clone:function(){
return this;
},rtrim:function(){
while(1){
i=this.contents.length-1;
if(this.contents[i] instanceof dd._TextNode&&this.contents[i].isEmpty()){
this.contents.pop();
}else{
break;
}
}
return this;
}});
dd._VarNode=dojo.extend(function(str){
this.contents=new dd._Filter(str);
},{render:function(_56,_57){
var str=this.contents.resolve(_56);
if(!str.safe){
str=dd._base.escape(""+str);
}
return _57.concat(str);
}});
dd._noOpNode=new function(){
this.render=this.unrender=function(){
return arguments[1];
};
this.clone=function(){
return this;
};
};
dd._Parser=dojo.extend(function(_58){
this.contents=_58;
},{i:0,parse:function(_59){
var _5a={},_5b;
_59=_59||[];
for(var i=0;i<_59.length;i++){
_5a[_59[i]]=true;
}
var _5c=new dd._NodeList();
while(this.i<this.contents.length){
_5b=this.contents[this.i++];
if(typeof _5b=="string"){
_5c.push(new dd._TextNode(_5b));
}else{
var _5d=_5b[0];
var _5e=_5b[1];
if(_5d==dd.TOKEN_VAR){
_5c.push(new dd._VarNode(_5e));
}else{
if(_5d==dd.TOKEN_BLOCK){
if(_5a[_5e]){
--this.i;
return _5c;
}
var cmd=_5e.split(/\s+/g);
if(cmd.length){
cmd=cmd[0];
var fn=ddt.getTag(cmd);
if(fn){
_5c.push(fn(this,new dd.Token(_5d,_5e)));
}
}
}
}
}
}
if(_59.length){
throw new Error("Could not find closing tag(s): "+_59.toString());
}
this.contents.length=0;
return _5c;
},next_token:function(){
var _5f=this.contents[this.i++];
return new dd.Token(_5f[0],_5f[1]);
},delete_first_token:function(){
this.i++;
},skip_past:function(_60){
while(this.i<this.contents.length){
var _61=this.contents[this.i++];
if(_61[0]==dd.TOKEN_BLOCK&&_61[1]==_60){
return;
}
}
throw new Error("Unclosed tag found when looking for "+_60);
},create_variable_node:function(_62){
return new dd._VarNode(_62);
},create_text_node:function(_63){
return new dd._TextNode(_63||"");
},getTemplate:function(_64){
return new dd.Template(_64);
}});
dd.register={_registry:{attributes:[],tags:[],filters:[]},get:function(_65,_66){
var _67=dd.register._registry[_65+"s"];
for(var i=0,_68;_68=_67[i];i++){
if(typeof _68[0]=="string"){
if(_68[0]==_66){
return _68;
}
}else{
if(_66.match(_68[0])){
return _68;
}
}
}
},getAttributeTags:function(){
var _69=[];
var _6a=dd.register._registry.attributes;
for(var i=0,_6b;_6b=_6a[i];i++){
if(_6b.length==3){
_69.push(_6b);
}else{
var fn=dojo.getObject(_6b[1]);
if(fn&&dojo.isFunction(fn)){
_6b.push(fn);
_69.push(_6b);
}
}
}
return _69;
},_any:function(_6c,_6d,_6e){
for(var _6f in _6e){
for(var i=0,fn;fn=_6e[_6f][i];i++){
var key=fn;
if(dojo.isArray(fn)){
key=fn[0];
fn=fn[1];
}
if(typeof key=="string"){
if(key.substr(0,5)=="attr:"){
var _70=fn;
if(_70.substr(0,5)=="attr:"){
_70=_70.slice(5);
}
dd.register._registry.attributes.push([_70.toLowerCase(),_6d+"."+_6f+"."+_70]);
}
key=key.toLowerCase();
}
dd.register._registry[_6c].push([key,fn,_6d+"."+_6f]);
}
}
},tags:function(_71,_72){
dd.register._any("tags",_71,_72);
},filters:function(_73,_74){
dd.register._any("filters",_73,_74);
}};
var _75=/&/g;
var _76=/</g;
var _77=/>/g;
var _78=/'/g;
var _79=/"/g;
dd._base.escape=function(_7a){
return dd.mark_safe(_7a.replace(_75,"&amp;").replace(_76,"&lt;").replace(_77,"&gt;").replace(_79,"&quot;").replace(_78,"&#39;"));
};
dd._base.safe=function(_7b){
if(typeof _7b=="string"){
_7b=new String(_7b);
}
if(typeof _7b=="object"){
_7b.safe=true;
}
return _7b;
};
dd.mark_safe=dd._base.safe;
dd.register.tags("dojox.dtl.tag",{"date":["now"],"logic":["if","for","ifequal","ifnotequal"],"loader":["extends","block","include","load","ssi"],"misc":["comment","debug","filter","firstof","spaceless","templatetag","widthratio","with"],"loop":["cycle","ifchanged","regroup"]});
dd.register.filters("dojox.dtl.filter",{"dates":["date","time","timesince","timeuntil"],"htmlstrings":["linebreaks","linebreaksbr","removetags","striptags"],"integers":["add","get_digit"],"lists":["dictsort","dictsortreversed","first","join","length","length_is","random","slice","unordered_list"],"logic":["default","default_if_none","divisibleby","yesno"],"misc":["filesizeformat","pluralize","phone2numeric","pprint"],"strings":["addslashes","capfirst","center","cut","fix_ampersands","floatformat","iriencode","linenumbers","ljust","lower","make_list","rjust","slugify","stringformat","title","truncatewords","truncatewords_html","upper","urlencode","urlize","urlizetrunc","wordcount","wordwrap"]});
dd.register.filters("dojox.dtl",{"_base":["escape","safe"]});
})();
}
