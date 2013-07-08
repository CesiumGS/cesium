//>>built
define("dijit/form/_SearchMixin",["dojo/_base/declare","dojo/keys","dojo/_base/lang","dojo/query","dojo/string","dojo/when","../registry"],function(_1,_2,_3,_4,_5,_6,_7){
return _1("dijit.form._SearchMixin",null,{pageSize:Infinity,store:null,fetchProperties:{},query:{},searchDelay:200,searchAttr:"name",queryExpr:"${0}*",ignoreCase:true,_patternToRegExp:function(_8){
return new RegExp("^"+_8.replace(/(\\.)|(\*)|(\?)|\W/g,function(_9,_a,_b,_c){
return _b?".*":_c?".":_a?_a:"\\"+_9;
})+"$",this.ignoreCase?"mi":"m");
},_abortQuery:function(){
if(this.searchTimer){
this.searchTimer=this.searchTimer.remove();
}
if(this._queryDeferHandle){
this._queryDeferHandle=this._queryDeferHandle.remove();
}
if(this._fetchHandle){
if(this._fetchHandle.abort){
this._cancelingQuery=true;
this._fetchHandle.abort();
this._cancelingQuery=false;
}
if(this._fetchHandle.cancel){
this._cancelingQuery=true;
this._fetchHandle.cancel();
this._cancelingQuery=false;
}
this._fetchHandle=null;
}
},_processInput:function(_d){
if(this.disabled||this.readOnly){
return;
}
var _e=_d.charOrCode;
if("type" in _d&&_d.type.substring(0,3)=="key"&&(_d.altKey||((_d.ctrlKey||_d.metaKey)&&(_e!="x"&&_e!="v"))||_e==_2.SHIFT)){
return;
}
var _f=false;
this._prev_key_backspace=false;
switch(_e){
case _2.DELETE:
case _2.BACKSPACE:
this._prev_key_backspace=true;
this._maskValidSubsetError=true;
_f=true;
break;
default:
_f=typeof _e=="string"||_e==229;
}
if(_f){
if(!this.store){
this.onSearch();
}else{
this.searchTimer=this.defer("_startSearchFromInput",1);
}
}
},onSearch:function(){
},_startSearchFromInput:function(){
this._startSearch(this.focusNode.value);
},_startSearch:function(_10){
this._abortQuery();
var _11=this,_4=_3.clone(this.query),_12={start:0,count:this.pageSize,queryOptions:{ignoreCase:this.ignoreCase,deep:true}},qs=_5.substitute(this.queryExpr,[_10.replace(/([\\\*\?])/g,"\\$1")]),q,_13=function(){
var _14=_11._fetchHandle=_11.store.query(_4,_12);
if(_11.disabled||_11.readOnly||(q!==_11._lastQuery)){
return;
}
_6(_14,function(res){
_11._fetchHandle=null;
if(!_11.disabled&&!_11.readOnly&&(q===_11._lastQuery)){
_6(_14.total,function(_15){
res.total=_15;
var _16=_11.pageSize;
if(isNaN(_16)||_16>res.total){
_16=res.total;
}
res.nextPage=function(_17){
_12.direction=_17=_17!==false;
_12.count=_16;
if(_17){
_12.start+=res.length;
if(_12.start>=res.total){
_12.count=0;
}
}else{
_12.start-=_16;
if(_12.start<0){
_12.count=Math.max(_16+_12.start,0);
_12.start=0;
}
}
if(_12.count<=0){
res.length=0;
_11.onSearch(res,_4,_12);
}else{
_13();
}
};
_11.onSearch(res,_4,_12);
});
}
},function(err){
_11._fetchHandle=null;
if(!_11._cancelingQuery){
console.error(_11.declaredClass+" "+err.toString());
}
});
};
_3.mixin(_12,this.fetchProperties);
if(this.store._oldAPI){
q=qs;
}else{
q=this._patternToRegExp(qs);
q.toString=function(){
return qs;
};
}
this._lastQuery=_4[this.searchAttr]=q;
this._queryDeferHandle=this.defer(_13,this.searchDelay);
},constructor:function(){
this.query={};
this.fetchProperties={};
},postMixInProperties:function(){
if(!this.store){
var _18=this.list;
if(_18){
this.store=_7.byId(_18);
}
}
this.inherited(arguments);
}});
});
