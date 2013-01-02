/*global define*/
define([
        'dojo/_base/declare',
        'dojo/dom-class', // domClass.toggle
        'dijit/_WidgetBase',
        'dijit/_CssStateMixin',
        'dijit/_TemplatedMixin',
        'dojo/text!./templates/LinkButton.html'
    ], function (
        declare,
        domClass,
        _WidgetBase,
        _CssStateMixin,
        _TemplatedMixin,
        template) {
    "use strict";

    return declare('Sandcastle.LinkButton', [_WidgetBase, _TemplatedMixin, _CssStateMixin], {
        baseClass : "dijitButton",
        templateString : template,
        showLabel : true,

        _setShowLabelAttr : function(val) {
            if (this.containerNode) {
                domClass.toggle(this.containerNode, "dijitDisplayNone", !val);
            }
            this._set("showLabel", val);
        },

        _setLabelAttr : function(/*String*/content) {
            this._set("label", content);
            (this.containerNode || this.focusNode).innerHTML = content;
        }
    });
});