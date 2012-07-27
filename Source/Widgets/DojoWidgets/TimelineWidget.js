/*global define*/
define(['dojo/_base/declare',
        'dojo/ready',
        'dojo/dom-construct',
        'dijit/_WidgetBase',
        '../Timeline'
    ], function(
        declare,
        ready,
        domConstruct,
        _WidgetBase,
        Timeline) {
    "use strict";

    return declare('Cesium.TimelineWidget', [_WidgetBase], {
        buildRendering : function() {
            this.domNode = domConstruct.create('div');
        },

        postCreate : function() {
            ready(this, 'setupTimeline');
        },

        resize : function(size) {
            if (size && size.h) {
                var height = size.h - 2;
                this.domNode.style.height = height.toString() + 'px';
            }
            this._resizeTimeline();
        },

        setupTimeline : function() {
            if (this.clock && (!this.timeline)) {
                this.timeline = new Timeline(this.domNode, this.clock);
                if (this.setupCallback) {
                    this.setupCallback(this.timeline);
                }
            }
        },

        _resizeTimeline : function() {
            if (this.timeline) {
                this.timeline.handleResize();
            }
        }
    });
});