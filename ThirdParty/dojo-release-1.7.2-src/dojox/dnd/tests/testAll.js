dojo.provide('dojox.dnd.tests.testAll');

try {
	doh.registerUrl('dojox.dnd.tests.selector', dojo.moduleUrl('dojox.dnd.tests', 'test_selector.html'));
	doh.registerUrl('dojox.dnd.tests.boundingbox', dojo.moduleUrl('dojox.dnd.tests', 'test_boundingBoxController.html'));
}catch (e) {
	doh.debug(e);
}