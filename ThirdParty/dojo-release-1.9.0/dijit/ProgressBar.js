//>>built
define("dijit/ProgressBar",["require","dojo/_base/declare","dojo/dom-class","dojo/_base/lang","dojo/number","./_Widget","./_TemplatedMixin","dojo/text!./templates/ProgressBar.html"],function(_1,_2,_3,_4,_5,_6,_7,_8){
return _2("dijit.ProgressBar",[_6,_7],{progress:"0",value:"",maximum:100,places:0,indeterminate:false,label:"",name:"",templateString:_8,_indeterminateHighContrastImagePath:_1.toUrl("./themes/a11y/indeterminate_progress.gif"),postMixInProperties:function(){
this.inherited(arguments);
if(!(this.params&&"value" in this.params)){
this.value=this.indeterminate?Infinity:this.progress;
}
},buildRendering:function(){
this.inherited(arguments);
this.indeterminateHighContrastImage.setAttribute("src",this._indeterminateHighContrastImagePath.toString());
this.update();
},_setDirAttr:function(_9){
_3.toggle(this.domNode,"dijitProgressBarRtl",_9=="rtl");
this.inherited(arguments);
},update:function(_a){
_4.mixin(this,_a||{});
var _b=this.internalProgress,ap=this.domNode;
var _c=1;
if(this.indeterminate){
ap.removeAttribute("aria-valuenow");
}else{
if(String(this.progress).indexOf("%")!=-1){
_c=Math.min(parseFloat(this.progress)/100,1);
this.progress=_c*this.maximum;
}else{
this.progress=Math.min(this.progress,this.maximum);
_c=this.maximum?this.progress/this.maximum:0;
}
ap.setAttribute("aria-valuenow",this.progress);
}
ap.setAttribute("aria-labelledby",this.labelNode.id);
ap.setAttribute("aria-valuemin",0);
ap.setAttribute("aria-valuemax",this.maximum);
this.labelNode.innerHTML=this.report(_c);
_3.toggle(this.domNode,"dijitProgressBarIndeterminate",this.indeterminate);
_b.style.width=(_c*100)+"%";
this.onChange();
},_setValueAttr:function(v){
this._set("value",v);
if(v==Infinity){
this.update({indeterminate:true});
}else{
this.update({indeterminate:false,progress:v});
}
},_setLabelAttr:function(_d){
this._set("label",_d);
this.update();
},_setIndeterminateAttr:function(_e){
this._set("indeterminate",_e);
this.update();
},report:function(_f){
return this.label?this.label:(this.indeterminate?"&#160;":_5.format(_f,{type:"percent",places:this.places,locale:this.lang}));
},onChange:function(){
}});
});
require({cache:{"url:dijit/templates/ProgressBar.html":"<div class=\"dijitProgressBar dijitProgressBarEmpty\" role=\"progressbar\"\n\t><div  data-dojo-attach-point=\"internalProgress\" class=\"dijitProgressBarFull\"\n\t\t><div class=\"dijitProgressBarTile\" role=\"presentation\"></div\n\t\t><span style=\"visibility:hidden\">&#160;</span\n\t></div\n\t><div data-dojo-attach-point=\"labelNode\" class=\"dijitProgressBarLabel\" id=\"${id}_label\"></div\n\t><span data-dojo-attach-point=\"indeterminateHighContrastImage\"\n\t\t   class=\"dijitInline dijitProgressBarIndeterminateHighContrastImage\"></span\n></div>\n"}});
