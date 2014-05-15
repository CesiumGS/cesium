/*global define*/
define([
        'dijit/_CssStateMixin',
        'dijit/_TemplatedMixin',
        'dijit/_WidgetBase',
        'dojo/_base/declare',
        'dojo/dom-class',
        'dojo/text!./templates/LinkButton.html'
    ], function(
        _CssStateMixin,
        _TemplatedMixin,
        _WidgetBase,
        declare,
        domClass,
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