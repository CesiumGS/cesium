define([
	"./_base",
	"./compat",
	"./Button",
	"./Carousel",
	"./CheckBox",
	"./ComboBox",
	"./ContentPane",
	"./EdgeToEdgeDataList",
	"./ExpandingTextArea",
	"./FixedSplitter",
	"./FixedSplitterPane",
	"./FlippableView",
	"./IconContainer",
	"./IconItem",
	"./Opener",
	"./Overlay",
	"./PageIndicator",
	"./RadioButton",
	"./RoundRectDataList",
	"./ScrollableView",
	"./Slider",
	"./SpinWheel",
	"./SpinWheelDatePicker",
	"./SpinWheelSlot",
	"./SpinWheelTimePicker",
	"./SwapView",
	"./Switch",
	"./TabBar",
	"./TabBarButton",
	"./TextArea",
	"./TextBox",
	"./ToggleButton",
	"./Tooltip",
	"./transition",
	"./TransitionEvent",
	"./ViewController"
], function(common){
	// module:
	//		dojox/mobile/mobile-all
	// summary:
	//		A rollup that includes every mobile module. You probably don't need this.

	console.warn("mobile-all may include much more code than your application actually requires. We strongly recommend that you investigate a custom build.");

	return common;
});
