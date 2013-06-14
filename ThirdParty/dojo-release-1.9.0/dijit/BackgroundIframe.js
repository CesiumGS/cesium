//>>built
define("dijit/BackgroundIframe",["require","./main","dojo/_base/config","dojo/dom-construct","dojo/dom-style","dojo/_base/lang","dojo/on","dojo/sniff"],function(_1,_2,_3,_4,_5,_6,on,_7){
_7.add("config-bgIframe",!_7("touch"));
var _8=new function(){
var _9=[];
this.pop=function(){
var _a;
if(_9.length){
_a=_9.pop();
_a.style.display="";
}else{
if(_7("ie")<9){
var _b=_3["dojoBlankHtmlUrl"]||_1.toUrl("dojo/resources/blank.html")||"javascript:\"\"";
var _c="<iframe src='"+_b+"' role='presentation'"+" style='position: absolute; left: 0px; top: 0px;"+"z-index: -1; filter:Alpha(Opacity=\"0\");'>";
_a=document.createElement(_c);
}else{
_a=_4.create("iframe");
_a.src="javascript:\"\"";
_a.className="dijitBackgroundIframe";
_a.setAttribute("role","presentation");
_5.set(_a,"opacity",0.1);
}
_a.tabIndex=-1;
}
return _a;
};
this.push=function(_d){
_d.style.display="none";
_9.push(_d);
};
}();
_2.BackgroundIframe=function(_e){
if(!_e.id){
throw new Error("no id");
}
if(_7("config-bgIframe")){
var _f=(this.iframe=_8.pop());
_e.appendChild(_f);
if(_7("ie")<7||_7("quirks")){
this.resize(_e);
this._conn=on(_e,"resize",_6.hitch(this,"resize",_e));
}else{
_5.set(_f,{width:"100%",height:"100%"});
}
}
};
_6.extend(_2.BackgroundIframe,{resize:function(_10){
if(this.iframe){
_5.set(this.iframe,{width:_10.offsetWidth+"px",height:_10.offsetHeight+"px"});
}
},destroy:function(){
if(this._conn){
this._conn.remove();
this._conn=null;
}
if(this.iframe){
_8.push(this.iframe);
delete this.iframe;
}
}});
return _2.BackgroundIframe;
});
