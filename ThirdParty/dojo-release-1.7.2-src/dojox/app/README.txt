-------------------------------------------------------------------------------
DojoX app 
-------------------------------------------------------------------------------
Version 0.1
Release date: 05/08/2011
-------------------------------------------------------------------------------
Project state: EXPERIMENTAL / Under Construction

This project is under active development with increasing capabilities beginning
in dojo 1.7, but is not yet capable or stable enough to use in production
-------------------------------------------------------------------------------
Project authors
	Dustin Machi
	Stephen Zhang
-------------------------------------------------------------------------------
Project description

dojox/app is a small application framework providing a set of classes to manage the the lifecycle and behavior of a single page application hosted on mobile or desktop platforms.    The main class, Application, is responsible for providing the lifecycle of the application, but is designed to be easily modified with additional custom behaviors.  An application instance contains scenes and views which provide the visible user interface.  The available views, scenes, module dependencies, and other information about the application are all passed into the Application class through a JSON configuration file.
-------------------------------------------------------------------------------
Dependencies:

Dojo Core (dijit, dojox/mobile).
-------------------------------------------------------------------------------
Documentation

config.json 

The config file defines all of the dependencies, application behaviors, top level views and scenes, and any other information required for the application to function.  

Example Config:
<code>
{
	/* global application dependencies */
	"dependencies": [
		"dojox/mobile/Heading",
		"dojo/mobile/RoundRect",
		"my/custom/module"
	],

	/* Application Modules.  These are implicitly added to the above set of dependencies */
	modules: [
		"dojox/app/module/history",
		"my/custom/appModule"
	],

	/* The html template for the application itself */
	template: "example.html",

	/* the view to start on by default */
	"defaultView": "home",

	/* transition to use if none has been provided */
	"defaultTransition": "slide",

	/* Views and Scenes */
	"views": {

		/* home is a top level dojox.app.view */
		"home": {

			/* class to instantiate this view as */
			"type": "dojox.app.view",

			/* dependencies specific to this view */
			"dependencies: [
				"dojox/mobile/ListItem",
				"dojox/mobile/EdgeToEdgeCategory"
			],

			/* template to use for this view */
			template: "views/home.html"
		},
	
		/* tabscene is a dojox.app.scene, and it contains three child views */

		"tabscene": { 
			/* class to instantiate, a scene in this case */
			"type": "dojox.app.scene",

			/* the scene's template */
			"template": "tabScene.html",

			/* the default view within this scene */	
			"defaultView": "tab1",

			/* when transitioning between tabs, use a flip animation by default */
			"defaultTransition": "flip",

			//the views available to this scene
			"views": { 
				"tab1":{
					"template": "views/tabs/tab1.html" 
				},
				"tab2":{
					"template": "views/tabs/tab2.html" 
				},
				"tab3":{
					"template": "views/tabs/tab3.html" 
				}
			},

			/* dependencies specific to this scene */
			"dependencies":["dojox/mobile/RoundRectList","dojox/mobile/ListItem", "dojox/mobile/EdgeToEdgeCategory"],
		}

	}
}

</code>

Property descriptions

	- dependencies -  These are the modules that are required for the application when defined at the root of the configuration.  When defined inside of a scene or a view, the dependency property defines modules which must be loaded before that view/scene can be instantiated.  

	- modules -  The modules property defines application modules that will mixed into the Application class to control the lifecycle and behavior of the application.  These properties will become the array of mixins provided to a dojo.declare() extending the base Application class.  In other words, the Application class that is instantiated is dynamically created at run time using the base class and this list of modules.

	- template - This is the template/html that is used for the application when defined at the root of the configuration.  Within the context of a view or a scene, it is the template/html for defining said component.  

	- defaultView - The default view defines the starting view for the application when loaded to its root. 

	- defaultTransition - This is the default transition method for top level views/scenes when defined at the root of the configuration.  When defined within a scene, it is the default transition method for the associated scene only.

	- views -   The views property is a nested set of objects defining the views and scenes available to the application.  Details of views and scene classes will be discussed below.

Some additional properties, such as models, stores, id, name, and description are reserved for future use, but their exact use is still under development.  

The Application Class:
	The application class itself doesn't currently exist as an exported class!  The base Application class is a very simple extension of the Scene Class (see below) defined in dojox/app/main.js.  This module file exports a generatation function, which when provided a configuration file will declare the application class that will actually be used on a page and then start it up at a specific node:

<code>
	require(["dojo/_base/html","dojox/app/main", "dojo/text!app/config.json"],function(dojo,Application,config){
		app = Application(json.parse(config));
	});
</code>


The Scene Class:

	The Scene Class provides a templated container for views.  Its purpose is to allow the layout of the scene to be provided through an html template and to have a set of children views which the scene transitions between.  For example, to display a set of tabs, you would use a Scene with a child view for each tab.  The scene's template would define where within the scene the views are displayed and where any tab buttons and such are displayed.

	Internally, the Scene steals some concepts layout and templated dijits provide.  The "template", for the base Scene is pretty simple and not really a template.  It is simply HTML content.  However, nodes within the template can be tagged with region="top" (bottom, left, right) to define where that node and its children should be displayed.  For example:

<code>
<div  style="background:#c5ccd3;" class="view mblView"> 
	<div region="top" dojoType="dojox.mobile.Heading">Tab Scene</div>
	<ul region="top" dojoType="dojox.mobile.TabBar" barType="segmentedControl">
		<li dojoType="dojox.mobile.TabBarButton" icon1="images/tab-icon-16.png" icon2="images/tab-icon-16h.png" transitionOptions='{title:"TabScene-Tab1",target:"tabscene,tab1",url: "#tabscene,tab1"}' selected="true">Tab 1</li>
		<li dojoType="dojox.mobile.TabBarButton" icon1="images/tab-icon-15.png" icon2="images/tab-icon-15h.png" transitionOptions='{title:"TabScene-Tab2",target:"tabscene,tab2",url: "#tabscene,tab2"}'>Tab 2</li>
		<li dojoType="dojox.mobile.TabBarButton" icon1="images/tab-icon-10.png" icon2="images/tab-icon-10h.png" transitionOptions='{title:"TabScene-Tab3",target:"tabscene,tab3",url: "#tabscene,tab3"}'>Tab 3</li>
	</ul>
</div>
</code>

This template for the tab scene defines two areas with region top, a header and the tab buttons.  The will be placed at the top of this scene when rendered.  

Normally, when using a BorderContainer, one would also have a region="center" section.  In the case of a Scene however, the "center" region will be applied to the currently active view (the current tab for example).

In addition to the code to support the appropriate lifecycle of the scene and its rendering, it provides a transition method which controls the transition of content from one child view to another.    This includes propogating transition events on to children if the active child is itself another scene.  Scene can container views and other scenes.  Views can only be leaf nodes in the view tree.

The View Class:

Views, like Scenes, are also containers of content.  However, instead of containing additional views as children, they contain only the content defined by their template.  The template may contain widgets.

All three of these classes are intended to, at their base, be as simple and feature free as possible providing only basic structure and lifecycle described above (though additional core methods/lifecycle hooks will be added as the are worked out).  A developer using the dojox/app framework can define additional custom  view or scene types simply by extending the base classes (or implementing equivalent functionality) and defining them in the applications configuration file.  The base application need not be extended, as its extensions are provided at run time through the modules config property.  Scenes and Views are easily extended and included in an app.

TODO:

dojox/app is still an experimental framework with several key pieces still under design and development before a final release.  This final release is expected to occur prior to the Dojo 2.0 release.  The following items are piece that are under development and testing and we see as requirements prior to the final release

- Model/Store support.  We have a couple of preliminary implementations of model/store support, including one for dojox/mvc.  However, additional work and testing are required to come to a simple and agreed up on API for these components.  While MVC systems such as dojox/mvc should be supported with first class capabilities, they should not be required.   An application developer can 'control' the html of any one view by simply extending the view class and using javascript if they so desired.

- Desktop/Mobile Branching -  Dojox/app is not to be specific to any one particular web platform.  Using css media selectors and definitions within the config, there will be support for choosing which set of views and parameters to use based on the users browser.  

- Intelligent build support -  For performance, especially on the mobile side, an appropriate build of the application is required.  Rather than adding a build profile for the app, there will be a wrapper utility that runs the build from the config.json.  This will allow us to intelligently build the base layers and dynamically loaded layers which should be defined by dependencies and default views as well as other information.
