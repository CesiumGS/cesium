define([
		'dojo/_base/declare',
		'dijit/_WidgetBase',
		'dijit/_CssStateMixin',
		'dijit/_TemplatedMixin',
		'dojo/text!./templates/LinkButton.html'
	], function (
		declare,
		_WidgetBase,
		_CssStateMixin,
		_TemplatedMixin,
		template) {

		return declare('Sandcastle.LinkButton', [_WidgetBase, _TemplatedMixin, _CssStateMixin], {
			baseClass: "dijitButton",
			templateString: template
		});
	});