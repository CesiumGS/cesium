/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.tag.loader"]){
dojo._hasResource["dojox.dtl.tag.loader"]=true;
dojo.provide("dojox.dtl.tag.loader");
dojo.require("dojox.dtl._base");
(function(){
var dd=dojox.dtl;
var _1=dd.tag.loader;
_1.BlockNode=dojo.extend(function(_2,_3){
this.name=_2;
this.nodelist=_3;
},{"super":function(){
if(this.parent){
var _4=this.parent.nodelist.dummyRender(this.context,null,true);
if(typeof _4=="string"){
_4=new String(_4);
}
_4.safe=true;
return _4;
}
return "";
},render:function(_5,_6){
var _7=this.name;
var _8=this.nodelist;
var _9;
if(_6.blocks){
var _a=_6.blocks[_7];
if(_a){
_9=_a.parent;
_8=_a.nodelist;
_a.used=true;
}
}
this.rendered=_8;
_5=_5.push();
this.context=_5;
this.parent=null;
if(_8!=this.nodelist){
this.parent=this;
}
_5.block=this;
if(_6.getParent){
var _b=_6.getParent();
var _c=dojo.connect(_6,"onSetParent",function(_d,up,_e){
if(up&&_e){
_6.setParent(_b);
}
});
}
_6=_8.render(_5,_6,this);
_c&&dojo.disconnect(_c);
_5=_5.pop();
return _6;
},unrender:function(_f,_10){
return this.rendered.unrender(_f,_10);
},clone:function(_11){
return new this.constructor(this.name,this.nodelist.clone(_11));
},toString:function(){
return "dojox.dtl.tag.loader.BlockNode";
}});
_1.ExtendsNode=dojo.extend(function(_12,_13,_14,_15,key){
this.getTemplate=_12;
this.nodelist=_13;
this.shared=_14;
this.parent=_15;
this.key=key;
},{parents:{},getParent:function(_16){
var _17=this.parent;
if(!_17){
var _18;
_17=this.parent=_16.get(this.key,false);
if(!_17){
throw new Error("extends tag used a variable that did not resolve");
}
if(typeof _17=="object"){
var url=_17.url||_17.templatePath;
if(_17.shared){
this.shared=true;
}
if(url){
_17=this.parent=url.toString();
}else{
if(_17.templateString){
_18=_17.templateString;
_17=this.parent=" ";
}else{
_17=this.parent=this.parent.toString();
}
}
}
if(_17&&_17.indexOf("shared:")===0){
this.shared=true;
_17=this.parent=_17.substring(7,_17.length);
}
}
if(!_17){
throw new Error("Invalid template name in 'extends' tag.");
}
if(_17.render){
return _17;
}
if(this.parents[_17]){
return this.parents[_17];
}
this.parent=this.getTemplate(_18||dojox.dtl.text.getTemplateString(_17));
if(this.shared){
this.parents[_17]=this.parent;
}
return this.parent;
},render:function(_19,_1a){
var _1b=this.getParent(_19);
_1b.blocks=_1b.blocks||{};
_1a.blocks=_1a.blocks||{};
for(var i=0,_1c;_1c=this.nodelist.contents[i];i++){
if(_1c instanceof dojox.dtl.tag.loader.BlockNode){
var old=_1b.blocks[_1c.name];
if(old&&old.nodelist!=_1c.nodelist){
_1a=old.nodelist.unrender(_19,_1a);
}
_1b.blocks[_1c.name]=_1a.blocks[_1c.name]={shared:this.shared,nodelist:_1c.nodelist,used:false};
}
}
this.rendered=_1b;
return _1b.nodelist.render(_19,_1a,this);
},unrender:function(_1d,_1e){
return this.rendered.unrender(_1d,_1e,this);
},toString:function(){
return "dojox.dtl.block.ExtendsNode";
}});
_1.IncludeNode=dojo.extend(function(_1f,_20,_21,_22,_23){
this._path=_1f;
this.constant=_20;
this.path=(_20)?_1f:new dd._Filter(_1f);
this.getTemplate=_21;
this.text=_22;
this.parsed=(arguments.length==5)?_23:true;
},{_cache:[{},{}],render:function(_24,_25){
var _26=((this.constant)?this.path:this.path.resolve(_24)).toString();
var _27=Number(this.parsed);
var _28=false;
if(_26!=this.last){
_28=true;
if(this.last){
_25=this.unrender(_24,_25);
}
this.last=_26;
}
var _29=this._cache[_27];
if(_27){
if(!_29[_26]){
_29[_26]=dd.text._resolveTemplateArg(_26,true);
}
if(_28){
var _2a=this.getTemplate(_29[_26]);
this.rendered=_2a.nodelist;
}
return this.rendered.render(_24,_25,this);
}else{
if(this.text instanceof dd._TextNode){
if(_28){
this.rendered=this.text;
this.rendered.set(dd.text._resolveTemplateArg(_26,true));
}
return this.rendered.render(_24,_25);
}else{
if(!_29[_26]){
var _2b=[];
var div=document.createElement("div");
div.innerHTML=dd.text._resolveTemplateArg(_26,true);
var _2c=div.childNodes;
while(_2c.length){
var _2d=div.removeChild(_2c[0]);
_2b.push(_2d);
}
_29[_26]=_2b;
}
if(_28){
this.nodelist=[];
var _2e=true;
for(var i=0,_2f;_2f=_29[_26][i];i++){
this.nodelist.push(_2f.cloneNode(true));
}
}
for(var i=0,_30;_30=this.nodelist[i];i++){
_25=_25.concat(_30);
}
}
}
return _25;
},unrender:function(_31,_32){
if(this.rendered){
_32=this.rendered.unrender(_31,_32);
}
if(this.nodelist){
for(var i=0,_33;_33=this.nodelist[i];i++){
_32=_32.remove(_33);
}
}
return _32;
},clone:function(_34){
return new this.constructor(this._path,this.constant,this.getTemplate,this.text.clone(_34),this.parsed);
}});
dojo.mixin(_1,{block:function(_35,_36){
var _37=_36.contents.split();
var _38=_37[1];
_35._blocks=_35._blocks||{};
_35._blocks[_38]=_35._blocks[_38]||[];
_35._blocks[_38].push(_38);
var _39=_35.parse(["endblock","endblock "+_38]).rtrim();
_35.next_token();
return new dojox.dtl.tag.loader.BlockNode(_38,_39);
},extends_:function(_3a,_3b){
var _3c=_3b.contents.split();
var _3d=false;
var _3e=null;
var key=null;
if(_3c[1].charAt(0)=="\""||_3c[1].charAt(0)=="'"){
_3e=_3c[1].substring(1,_3c[1].length-1);
}else{
key=_3c[1];
}
if(_3e&&_3e.indexOf("shared:")==0){
_3d=true;
_3e=_3e.substring(7,_3e.length);
}
var _3f=_3a.parse();
return new dojox.dtl.tag.loader.ExtendsNode(_3a.getTemplate,_3f,_3d,_3e,key);
},include:function(_40,_41){
var _42=_41.contents.split();
if(_42.length!=2){
throw new Error(_42[0]+" tag takes one argument: the name of the template to be included");
}
var _43=_42[1];
var _44=false;
if((_43.charAt(0)=="\""||_43.slice(-1)=="'")&&_43.charAt(0)==_43.slice(-1)){
_43=_43.slice(1,-1);
_44=true;
}
return new _1.IncludeNode(_43,_44,_40.getTemplate,_40.create_text_node());
},ssi:function(_45,_46){
var _47=_46.contents.split();
var _48=false;
if(_47.length==3){
_48=(_47.pop()=="parsed");
if(!_48){
throw new Error("Second (optional) argument to ssi tag must be 'parsed'");
}
}
var _49=_1.include(_45,new dd.Token(_46.token_type,_47.join(" ")));
_49.parsed=_48;
return _49;
}});
})();
}
