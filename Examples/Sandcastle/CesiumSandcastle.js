require({
		baseUrl: '../../ThirdParty/dojo-release-1.7.2-src',
		packages: [
			'dojo',
			'dijit',
			'dojox']
	}, [
		'dojo/parser',
		'dojo/dom-class',
		'dojo/_base/window',
		'dijit/form/Button',
        'dijit/form/DropDownButton',
		'dijit/form/ToggleButton',
		'dijit/form/DropDownButton',
		'dijit/TooltipDialog',
		'dijit/Menu',
		'dijit/MenuBar',
		'dijit/PopupMenuBarItem',
		'dijit/MenuItem',
		'dojox/mobile/Slider',

        'dijit/layout/AccordionContainer',
        'dijit/layout/BorderContainer',
        'dijit/layout/ContentPane',
        'dijit/layout/TabContainer',
        'dijit/Toolbar',
        'dijit/ToolbarSeparator',
		'dojo/domReady!'],
	function (parser, domClass, win) {
		parser.parse();
		domClass.remove(win.body(), 'loading');
	});