dojo.provide('dojox.gesture.tests.module');

try {
	doh.registerUrl('dojox.gesture.tests.tap', dojo.moduleUrl('dojox.gesture.tests', 'doh/tap.html'));
	doh.registerUrl('dojox.gesture.tests.swipe', dojo.moduleUrl('dojox.gesture.tests', 'doh/swipe.html'));
	doh.registerUrl('dojox.gesture.tests.bubble', dojo.moduleUrl('dojox.gesture.tests', 'doh/bubble.html'));
}catch (e) {
	doh.debug(e);
}