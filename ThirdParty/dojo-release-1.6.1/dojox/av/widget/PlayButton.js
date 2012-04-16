/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.av.widget.PlayButton"]){
dojo._hasResource["dojox.av.widget.PlayButton"]=true;
dojo.provide("dojox.av.widget.PlayButton");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit.form.Button");
dojo.declare("dojox.av.widget.PlayButton",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.av.widget","resources/PlayButton.html","<div class=\"PlayPauseToggle Pause\" dojoAttachEvent=\"click:onClick\">\n    <div class=\"icon\"></div>\n</div>\n"),postCreate:function(){
this.showPlay();
},setMedia:function(_1){
this.media=_1;
dojo.connect(this.media,"onEnd",this,"showPlay");
dojo.connect(this.media,"onStart",this,"showPause");
},onClick:function(){
if(this._mode=="play"){
this.onPlay();
}else{
this.onPause();
}
},onPlay:function(){
if(this.media){
this.media.play();
}
this.showPause();
},onPause:function(){
if(this.media){
this.media.pause();
}
this.showPlay();
},showPlay:function(){
this._mode="play";
dojo.removeClass(this.domNode,"Pause");
dojo.addClass(this.domNode,"Play");
},showPause:function(){
this._mode="pause";
dojo.addClass(this.domNode,"Pause");
dojo.removeClass(this.domNode,"Play");
}});
}
