//>>built
define("dijit/form/_ExpandingTextAreaMixin",["dojo/_base/declare","dojo/dom-construct","dojo/has","dojo/_base/lang","dojo/on","dojo/_base/window","../Viewport"],function(_1,_2,_3,_4,on,_5,_6){
_3.add("textarea-needs-help-shrinking",function(){
var _7=_5.body(),te=_2.create("textarea",{rows:"5",cols:"20",value:" ",style:{zoom:1,fontSize:"12px",height:"96px",overflow:"hidden",visibility:"hidden",position:"absolute",border:"5px solid white",margin:"0",padding:"0",boxSizing:"border-box",MsBoxSizing:"border-box",WebkitBoxSizing:"border-box",MozBoxSizing:"border-box"}},_7,"last");
var _8=te.scrollHeight>=te.clientHeight;
_7.removeChild(te);
return _8;
});
return _1("dijit.form._ExpandingTextAreaMixin",null,{_setValueAttr:function(){
this.inherited(arguments);
this.resize();
},postCreate:function(){
this.inherited(arguments);
var _9=this.textbox;
_9.style.overflowY="hidden";
this.own(on(_9,"focus, resize",_4.hitch(this,"_resizeLater")));
},startup:function(){
this.inherited(arguments);
this.own(_6.on("resize",_4.hitch(this,"_resizeLater")));
this._resizeLater();
},_onInput:function(e){
this.inherited(arguments);
this.resize();
},_estimateHeight:function(){
var _a=this.textbox;
_a.rows=(_a.value.match(/\n/g)||[]).length+1;
},_resizeLater:function(){
this.defer("resize");
},resize:function(){
var _b=this.textbox;
function _c(){
var _d=false;
if(_b.value===""){
_b.value=" ";
_d=true;
}
var sh=_b.scrollHeight;
if(_d){
_b.value="";
}
return sh;
};
if(_b.style.overflowY=="hidden"){
_b.scrollTop=0;
}
if(this.busyResizing){
return;
}
this.busyResizing=true;
if(_c()||_b.offsetHeight){
var _e=_c()+Math.max(_b.offsetHeight-_b.clientHeight,0);
var _f=_e+"px";
if(_f!=_b.style.height){
_b.style.height=_f;
_b.rows=1;
}
if(_3("textarea-needs-help-shrinking")){
var _10=_c(),_11=_10,_12=_b.style.minHeight,_13=4,_14,_15=_b.scrollTop;
_b.style.minHeight=_f;
_b.style.height="auto";
while(_e>0){
_b.style.minHeight=Math.max(_e-_13,4)+"px";
_14=_c();
var _16=_11-_14;
_e-=_16;
if(_16<_13){
break;
}
_11=_14;
_13<<=1;
}
_b.style.height=_e+"px";
_b.style.minHeight=_12;
_b.scrollTop=_15;
}
_b.style.overflowY=_c()>_b.clientHeight?"auto":"hidden";
if(_b.style.overflowY=="hidden"){
_b.scrollTop=0;
}
}else{
this._estimateHeight();
}
this.busyResizing=false;
}});
});
