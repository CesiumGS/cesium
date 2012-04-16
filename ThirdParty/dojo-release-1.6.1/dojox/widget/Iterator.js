/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Iterator"]){
dojo._hasResource["dojox.widget.Iterator"]=true;
dojo.provide("dojox.widget.Iterator");
dojo.require("dijit.Declaration");
dojo.experimental("dojox.widget.Iterator");
dojo.declare("dojox.widget.Iterator",[dijit.Declaration],{constructor:(function(){
var _1=0;
return function(){
this.attrs=[];
this.children=[];
this.widgetClass="dojox.widget.Iterator._classes._"+(_1++);
};
})(),start:0,fetchMax:1000,query:{name:"*"},attrs:[],defaultValue:"",widgetCtor:null,dataValues:[],data:null,store:null,_srcIndex:0,_srcParent:null,_setSrcIndex:function(s){
this._srcIndex=0;
this._srcParent=s.parentNode;
var ts=s;
while(ts.previousSibling){
this._srcIndex++;
ts=ts.previousSibling;
}
},postscript:function(p,s){
this._setSrcIndex(s);
this.inherited("postscript",arguments);
var wc=this.widgetCtor=dojo.getObject(this.widgetClass);
this.attrs=dojo.map(wc.prototype.templateString.match(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g),function(s){
return s.slice(2,-1);
});
dojo.forEach(this.attrs,function(m){
wc.prototype[m]="";
});
this.update();
},clear:function(){
if(this.children.length){
this._setSrcIndex(this.children[0].domNode);
}
dojo.forEach(this.children,"item.destroy();");
this.children=[];
},update:function(){
if(this.store){
this.fetch();
}else{
this.onDataAvailable(this.data||this.dataValues);
}
},_addItem:function(_2,_3){
if(dojo.isString(_2)){
_2={value:_2};
}
var _4=new this.widgetCtor(_2);
this.children.push(_4);
dojo.place(_4.domNode,this._srcParent,this._srcIndex+_3);
},getAttrValuesObj:function(_5){
var _6={};
if(dojo.isString(_5)){
dojo.forEach(this.attrs,function(_7){
_6[_7]=(_7=="value")?_5:this.defaultValue;
},this);
}else{
dojo.forEach(this.attrs,function(_8){
if(this.store){
_6[_8]=this.store.getValue(_5,_8)||this.defaultValue;
}else{
_6[_8]=_5[_8]||this.defaultValue;
}
},this);
}
return _6;
},onDataAvailable:function(_9){
this.clear();
dojo.forEach(_9,function(_a,_b){
this._addItem(this.getAttrValuesObj(_a),_b);
},this);
},fetch:function(_c,_d,_e){
this.store.fetch({query:_c||this.query,start:_d||this.start,count:_e||this.fetchMax,onComplete:dojo.hitch(this,"onDataAvailable")});
}});
dojox.widget.Iterator._classes={};
}
