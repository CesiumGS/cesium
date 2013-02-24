define(["dojo/_base/declare", "dojo/dom-geometry", "dojo/dom-style", "dojo/parser", "dijit/_WidgetBase", "dijit/_TemplatedMixin"],
    function(declare, geometry, style, parser, _WidgetBase, _TemplatedMixin){

return declare("dojox.widget._PagerItem",
    [_WidgetBase, _TemplatedMixin],
    {

    templateString: '<li class="pagerItem" data-dojo-attach-point="containerNode"></li>',

    resizeChildren: function(){
        var box = geometry.getMarginBox(this.containerNode);
        style.set(this.containerNode.firstChild, {
            width: box.w +'px',
            height: box.h + 'px'
        });
    },

    parseChildren: function(){
        parser.parse(this.containerNode);
    }
});

});