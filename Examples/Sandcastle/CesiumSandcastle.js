require({
		baseUrl: '../../ThirdParty/dojo-release-1.7.2-src',
		packages: [
			'dojo',
			'dijit',
			'dojox']
	}, [
        'dojo/parser',
        'dojo/dom-class',
        'dojo/dom-construct',
        'dojo/_base/window',
        'dijit/form/Button',
        'dijit/form/DropDownButton',
        'dijit/form/ToggleButton',
        'dijit/form/DropDownButton',
        'dijit/form/TextBox',
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
    function (parser, domClass, domConstruct, win) {
        parser.parse();
        domConstruct.destroy('loading');
    });
