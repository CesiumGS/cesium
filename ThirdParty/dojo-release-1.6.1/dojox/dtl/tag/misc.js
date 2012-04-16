/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.tag.misc"]){
dojo._hasResource["dojox.dtl.tag.misc"]=true;
dojo.provide("dojox.dtl.tag.misc");
dojo.require("dojox.dtl._base");
(function(){
var dd=dojox.dtl;
var _1=dd.tag.misc;
_1.DebugNode=dojo.extend(function(_2){
this.text=_2;
},{render:function(_3,_4){
var _5=_3.getKeys();
var _6=[];
var _7={};
for(var i=0,_8;_8=_5[i];i++){
_7[_8]=_3[_8];
_6+="["+_8+": "+typeof _3[_8]+"]\n";
}
return this.text.set(_6).render(_3,_4,this);
},unrender:function(_9,_a){
return _a;
},clone:function(_b){
return new this.constructor(this.text.clone(_b));
},toString:function(){
return "ddtm.DebugNode";
}});
_1.FilterNode=dojo.extend(function(_c,_d){
this._varnode=_c;
this._nodelist=_d;
},{render:function(_e,_f){
var _10=this._nodelist.render(_e,new dojox.string.Builder());
_e=_e.update({"var":_10.toString()});
var _11=this._varnode.render(_e,_f);
_e=_e.pop();
return _f;
},unrender:function(_12,_13){
return _13;
},clone:function(_14){
return new this.constructor(this._expression,this._nodelist.clone(_14));
}});
_1.FirstOfNode=dojo.extend(function(_15,_16){
this._vars=_15;
this.vars=dojo.map(_15,function(_17){
return new dojox.dtl._Filter(_17);
});
this.contents=_16;
},{render:function(_18,_19){
for(var i=0,_1a;_1a=this.vars[i];i++){
var _1b=_1a.resolve(_18);
if(typeof _1b!="undefined"){
if(_1b===null){
_1b="null";
}
this.contents.set(_1b);
return this.contents.render(_18,_19);
}
}
return this.contents.unrender(_18,_19);
},unrender:function(_1c,_1d){
return this.contents.unrender(_1c,_1d);
},clone:function(_1e){
return new this.constructor(this._vars,this.contents.clone(_1e));
}});
_1.SpacelessNode=dojo.extend(function(_1f,_20){
this.nodelist=_1f;
this.contents=_20;
},{render:function(_21,_22){
if(_22.getParent){
var _23=[dojo.connect(_22,"onAddNodeComplete",this,"_watch"),dojo.connect(_22,"onSetParent",this,"_watchParent")];
_22=this.nodelist.render(_21,_22);
dojo.disconnect(_23[0]);
dojo.disconnect(_23[1]);
}else{
var _24=this.nodelist.dummyRender(_21);
this.contents.set(_24.replace(/>\s+</g,"><"));
_22=this.contents.render(_21,_22);
}
return _22;
},unrender:function(_25,_26){
return this.nodelist.unrender(_25,_26);
},clone:function(_27){
return new this.constructor(this.nodelist.clone(_27),this.contents.clone(_27));
},_isEmpty:function(_28){
return (_28.nodeType==3&&!_28.data.match(/[^\s\n]/));
},_watch:function(_29){
if(this._isEmpty(_29)){
var _2a=false;
if(_29.parentNode.firstChild==_29){
_29.parentNode.removeChild(_29);
}
}else{
var _2b=_29.parentNode.childNodes;
if(_29.nodeType==1&&_2b.length>2){
for(var i=2,_2c;_2c=_2b[i];i++){
if(_2b[i-2].nodeType==1&&this._isEmpty(_2b[i-1])){
_29.parentNode.removeChild(_2b[i-1]);
return;
}
}
}
}
},_watchParent:function(_2d){
var _2e=_2d.childNodes;
if(_2e.length){
while(_2d.childNodes.length){
var _2f=_2d.childNodes[_2d.childNodes.length-1];
if(!this._isEmpty(_2f)){
return;
}
_2d.removeChild(_2f);
}
}
}});
_1.TemplateTagNode=dojo.extend(function(tag,_30){
this.tag=tag;
this.contents=_30;
},{mapping:{openblock:"{%",closeblock:"%}",openvariable:"{{",closevariable:"}}",openbrace:"{",closebrace:"}",opencomment:"{#",closecomment:"#}"},render:function(_31,_32){
this.contents.set(this.mapping[this.tag]);
return this.contents.render(_31,_32);
},unrender:function(_33,_34){
return this.contents.unrender(_33,_34);
},clone:function(_35){
return new this.constructor(this.tag,this.contents.clone(_35));
}});
_1.WidthRatioNode=dojo.extend(function(_36,max,_37,_38){
this.current=new dd._Filter(_36);
this.max=new dd._Filter(max);
this.width=_37;
this.contents=_38;
},{render:function(_39,_3a){
var _3b=+this.current.resolve(_39);
var max=+this.max.resolve(_39);
if(typeof _3b!="number"||typeof max!="number"||!max){
this.contents.set("");
}else{
this.contents.set(""+Math.round((_3b/max)*this.width));
}
return this.contents.render(_39,_3a);
},unrender:function(_3c,_3d){
return this.contents.unrender(_3c,_3d);
},clone:function(_3e){
return new this.constructor(this.current.getExpression(),this.max.getExpression(),this.width,this.contents.clone(_3e));
}});
_1.WithNode=dojo.extend(function(_3f,_40,_41){
this.target=new dd._Filter(_3f);
this.alias=_40;
this.nodelist=_41;
},{render:function(_42,_43){
var _44=this.target.resolve(_42);
_42=_42.push();
_42[this.alias]=_44;
_43=this.nodelist.render(_42,_43);
_42=_42.pop();
return _43;
},unrender:function(_45,_46){
return _46;
},clone:function(_47){
return new this.constructor(this.target.getExpression(),this.alias,this.nodelist.clone(_47));
}});
dojo.mixin(_1,{comment:function(_48,_49){
_48.skip_past("endcomment");
return dd._noOpNode;
},debug:function(_4a,_4b){
return new _1.DebugNode(_4a.create_text_node());
},filter:function(_4c,_4d){
var _4e=_4d.contents.split(null,1)[1];
var _4f=_4c.create_variable_node("var|"+_4e);
var _50=_4c.parse(["endfilter"]);
_4c.next_token();
return new _1.FilterNode(_4f,_50);
},firstof:function(_51,_52){
var _53=_52.split_contents().slice(1);
if(!_53.length){
throw new Error("'firstof' statement requires at least one argument");
}
return new _1.FirstOfNode(_53,_51.create_text_node());
},spaceless:function(_54,_55){
var _56=_54.parse(["endspaceless"]);
_54.delete_first_token();
return new _1.SpacelessNode(_56,_54.create_text_node());
},templatetag:function(_57,_58){
var _59=_58.contents.split();
if(_59.length!=2){
throw new Error("'templatetag' statement takes one argument");
}
var tag=_59[1];
var _5a=_1.TemplateTagNode.prototype.mapping;
if(!_5a[tag]){
var _5b=[];
for(var key in _5a){
_5b.push(key);
}
throw new Error("Invalid templatetag argument: '"+tag+"'. Must be one of: "+_5b.join(", "));
}
return new _1.TemplateTagNode(tag,_57.create_text_node());
},widthratio:function(_5c,_5d){
var _5e=_5d.contents.split();
if(_5e.length!=4){
throw new Error("widthratio takes three arguments");
}
var _5f=+_5e[3];
if(typeof _5f!="number"){
throw new Error("widthratio final argument must be an integer");
}
return new _1.WidthRatioNode(_5e[1],_5e[2],_5f,_5c.create_text_node());
},with_:function(_60,_61){
var _62=_61.split_contents();
if(_62.length!=4||_62[2]!="as"){
throw new Error("do_width expected format as 'with value as name'");
}
var _63=_60.parse(["endwith"]);
_60.next_token();
return new _1.WithNode(_62[1],_62[3],_63);
}});
})();
}
