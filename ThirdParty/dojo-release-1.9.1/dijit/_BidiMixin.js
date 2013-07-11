//>>built
define("dijit/_BidiMixin",[],function(){
var _1={LRM:"‎",LRE:"‪",PDF:"‬",RLM:"‏",RLE:"‫"};
return {textDir:"",getTextDir:function(_2){
return this.textDir=="auto"?this._checkContextual(_2):this.textDir;
},_checkContextual:function(_3){
var _4=/[A-Za-z\u05d0-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(_3);
return _4?(_4[0]<="z"?"ltr":"rtl"):this.dir?this.dir:this.isLeftToRight()?"ltr":"rtl";
},applyTextDir:function(_5,_6){
if(this.textDir){
var _7=this.textDir;
if(_7=="auto"){
if(typeof _6==="undefined"){
var _8=_5.tagName.toLowerCase();
_6=(_8=="input"||_8=="textarea")?_5.value:_5.innerText||_5.textContent||"";
}
_7=this._checkContextual(_6);
}
if(_5.dir!=_7){
_5.dir=_7;
}
}
},enforceTextDirWithUcc:function(_9,_a){
if(this.textDir){
if(_9){
_9.originalText=_a;
}
var _b=this.textDir=="auto"?this._checkContextual(_a):this.textDir;
return (_b=="ltr"?_1.LRE:_1.RLE)+_a+_1.PDF;
}
return _a;
},restoreOriginalText:function(_c){
if(_c.originalText){
_c.text=_c.originalText;
delete _c.originalText;
}
return _c;
},_setTextDirAttr:function(_d){
if(!this._created||this.textDir!=_d){
this._set("textDir",_d);
var _e=null;
if(this.displayNode){
_e=this.displayNode;
this.displayNode.align=this.dir=="rtl"?"right":"left";
}else{
_e=this.textDirNode||this.focusNode||this.textbox;
}
if(_e){
this.applyTextDir(_e);
}
}
}};
});
