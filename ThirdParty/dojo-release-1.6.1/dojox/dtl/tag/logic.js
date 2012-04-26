/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dtl.tag.logic"]){
dojo._hasResource["dojox.dtl.tag.logic"]=true;
dojo.provide("dojox.dtl.tag.logic");
dojo.require("dojox.dtl._base");
(function(){
var dd=dojox.dtl;
var _1=dd.text;
var _2=dd.tag.logic;
_2.IfNode=dojo.extend(function(_3,_4,_5,_6){
this.bools=_3;
this.trues=_4;
this.falses=_5;
this.type=_6;
},{render:function(_7,_8){
var i,_9,_a,_b,_c;
if(this.type=="or"){
for(i=0;_9=this.bools[i];i++){
_a=_9[0];
_b=_9[1];
_c=_b.resolve(_7);
if((_c&&!_a)||(_a&&!_c)){
if(this.falses){
_8=this.falses.unrender(_7,_8);
}
return (this.trues)?this.trues.render(_7,_8,this):_8;
}
}
if(this.trues){
_8=this.trues.unrender(_7,_8);
}
return (this.falses)?this.falses.render(_7,_8,this):_8;
}else{
for(i=0;_9=this.bools[i];i++){
_a=_9[0];
_b=_9[1];
_c=_b.resolve(_7);
if(_c==_a){
if(this.trues){
_8=this.trues.unrender(_7,_8);
}
return (this.falses)?this.falses.render(_7,_8,this):_8;
}
}
if(this.falses){
_8=this.falses.unrender(_7,_8);
}
return (this.trues)?this.trues.render(_7,_8,this):_8;
}
return _8;
},unrender:function(_d,_e){
_e=(this.trues)?this.trues.unrender(_d,_e):_e;
_e=(this.falses)?this.falses.unrender(_d,_e):_e;
return _e;
},clone:function(_f){
var _10=(this.trues)?this.trues.clone(_f):null;
var _11=(this.falses)?this.falses.clone(_f):null;
return new this.constructor(this.bools,_10,_11,this.type);
}});
_2.IfEqualNode=dojo.extend(function(_12,_13,_14,_15,_16){
this.var1=new dd._Filter(_12);
this.var2=new dd._Filter(_13);
this.trues=_14;
this.falses=_15;
this.negate=_16;
},{render:function(_17,_18){
var _19=this.var1.resolve(_17);
var _1a=this.var2.resolve(_17);
_19=(typeof _19!="undefined")?_19:"";
_1a=(typeof _19!="undefined")?_1a:"";
if((this.negate&&_19!=_1a)||(!this.negate&&_19==_1a)){
if(this.falses){
_18=this.falses.unrender(_17,_18,this);
}
return (this.trues)?this.trues.render(_17,_18,this):_18;
}
if(this.trues){
_18=this.trues.unrender(_17,_18,this);
}
return (this.falses)?this.falses.render(_17,_18,this):_18;
},unrender:function(_1b,_1c){
return _2.IfNode.prototype.unrender.call(this,_1b,_1c);
},clone:function(_1d){
var _1e=this.trues?this.trues.clone(_1d):null;
var _1f=this.falses?this.falses.clone(_1d):null;
return new this.constructor(this.var1.getExpression(),this.var2.getExpression(),_1e,_1f,this.negate);
}});
_2.ForNode=dojo.extend(function(_20,_21,_22,_23){
this.assign=_20;
this.loop=new dd._Filter(_21);
this.reversed=_22;
this.nodelist=_23;
this.pool=[];
},{render:function(_24,_25){
var i,j,k;
var _26=false;
var _27=this.assign;
for(k=0;k<_27.length;k++){
if(typeof _24[_27[k]]!="undefined"){
_26=true;
_24=_24.push();
break;
}
}
if(!_26&&_24.forloop){
_26=true;
_24=_24.push();
}
var _28=this.loop.resolve(_24)||[];
for(i=_28.length;i<this.pool.length;i++){
this.pool[i].unrender(_24,_25,this);
}
if(this.reversed){
_28=_28.slice(0).reverse();
}
var _29=dojo.isObject(_28)&&!dojo.isArrayLike(_28);
var _2a=[];
if(_29){
for(var key in _28){
_2a.push(_28[key]);
}
}else{
_2a=_28;
}
var _2b=_24.forloop={parentloop:_24.get("forloop",{})};
var j=0;
for(i=0;i<_2a.length;i++){
var _2c=_2a[i];
_2b.counter0=j;
_2b.counter=j+1;
_2b.revcounter0=_2a.length-j-1;
_2b.revcounter=_2a.length-j;
_2b.first=!j;
_2b.last=(j==_2a.length-1);
if(_27.length>1&&dojo.isArrayLike(_2c)){
if(!_26){
_26=true;
_24=_24.push();
}
var _2d={};
for(k=0;k<_2c.length&&k<_27.length;k++){
_2d[_27[k]]=_2c[k];
}
dojo.mixin(_24,_2d);
}else{
_24[_27[0]]=_2c;
}
if(j+1>this.pool.length){
this.pool.push(this.nodelist.clone(_25));
}
_25=this.pool[j++].render(_24,_25,this);
}
delete _24.forloop;
if(_26){
_24=_24.pop();
}else{
for(k=0;k<_27.length;k++){
delete _24[_27[k]];
}
}
return _25;
},unrender:function(_2e,_2f){
for(var i=0,_30;_30=this.pool[i];i++){
_2f=_30.unrender(_2e,_2f);
}
return _2f;
},clone:function(_31){
return new this.constructor(this.assign,this.loop.getExpression(),this.reversed,this.nodelist.clone(_31));
}});
dojo.mixin(_2,{if_:function(_32,_33){
var i,_34,_35,_36=[],_37=_33.contents.split();
_37.shift();
_33=_37.join(" ");
_37=_33.split(" and ");
if(_37.length==1){
_35="or";
_37=_33.split(" or ");
}else{
_35="and";
for(i=0;i<_37.length;i++){
if(_37[i].indexOf(" or ")!=-1){
throw new Error("'if' tags can't mix 'and' and 'or'");
}
}
}
for(i=0;_34=_37[i];i++){
var not=false;
if(_34.indexOf("not ")==0){
_34=_34.slice(4);
not=true;
}
_36.push([not,new dd._Filter(_34)]);
}
var _38=_32.parse(["else","endif"]);
var _39=false;
var _33=_32.next_token();
if(_33.contents=="else"){
_39=_32.parse(["endif"]);
_32.next_token();
}
return new _2.IfNode(_36,_38,_39,_35);
},_ifequal:function(_3a,_3b,_3c){
var _3d=_3b.split_contents();
if(_3d.length!=3){
throw new Error(_3d[0]+" takes two arguments");
}
var end="end"+_3d[0];
var _3e=_3a.parse(["else",end]);
var _3f=false;
var _3b=_3a.next_token();
if(_3b.contents=="else"){
_3f=_3a.parse([end]);
_3a.next_token();
}
return new _2.IfEqualNode(_3d[1],_3d[2],_3e,_3f,_3c);
},ifequal:function(_40,_41){
return _2._ifequal(_40,_41);
},ifnotequal:function(_42,_43){
return _2._ifequal(_42,_43,true);
},for_:function(_44,_45){
var _46=_45.contents.split();
if(_46.length<4){
throw new Error("'for' statements should have at least four words: "+_45.contents);
}
var _47=_46[_46.length-1]=="reversed";
var _48=(_47)?-3:-2;
if(_46[_46.length+_48]!="in"){
throw new Error("'for' tag received an invalid argument: "+_45.contents);
}
var _49=_46.slice(1,_48).join(" ").split(/ *, */);
for(var i=0;i<_49.length;i++){
if(!_49[i]||_49[i].indexOf(" ")!=-1){
throw new Error("'for' tag received an invalid argument: "+_45.contents);
}
}
var _4a=_44.parse(["endfor"]);
_44.next_token();
return new _2.ForNode(_49,_46[_46.length+_48+1],_47,_4a);
}});
})();
}
