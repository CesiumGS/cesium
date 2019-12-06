import defaultValue from '../../Source/Core/defaultValue.js';
import defined from '../../Source/Core/defined.js';
import defineProperties from '../../Source/Core/defineProperties.js';
import CesiumEvent from '../../Source/Core/Event.js';
import Knockout from '../../Source/ThirdParty/knockout.js';
import registerKnockoutBindings from './Core/registerKnockoutBindings.js';
import DistanceLegendViewModel from './ViewModels/DistanceLegendViewModel.js';
import NavigationViewModel from './ViewModels/NavigationViewModel.js';

//Выдрано из скомпилированного файла, по сути задание страницы стилей для компонента навигации
(function(c) {
    var d = document
      , a = "appendChild"
      , i = "styleSheet"
      , s = d.createElement("style");
    s.type = "text/css";
    d.getElementsByTagName("head")[0][a](s);
    s[i] ? s[i].cssText = c : s[a](d.createTextNode(c))
}
)(".full-window{position:absolute;top:0;left:0;right:0;bottom:0;margin:0;overflow:hidden;padding:0;-webkit-transition:left .25s ease-out;-moz-transition:left .25s ease-out;-ms-transition:left .25s ease-out;-o-transition:left .25s ease-out;transition:left .25s ease-out}.transparent-to-input{pointer-events:none}.opaque-to-input{pointer-events:auto}.clickable{cursor:pointer}.markdown a:hover,.markdown u,a:hover{text-decoration:underline}.modal,.modal-background{top:0;left:0;bottom:0;right:0}.modal-background{pointer-events:auto;background-color:rgba(0,0,0,.5);z-index:1000;position:fixed}.modal{position:absolute;margin:auto;background-color:#2f353c;max-height:100%;max-width:100%;font-family:'Roboto',sans-serif;color:#fff}.modal-header{background-color:rgba(0,0,0,.2);border-bottom:1px solid rgba(100,100,100,.6);font-size:15px;line-height:40px;margin:0}.modal-header h1{font-size:15px;color:#fff;margin-left:15px}.modal-content{margin-left:15px;margin-right:15px;margin-bottom:15px;padding-top:15px;overflow:auto}.modal-close-button{position:absolute;right:15px;cursor:pointer;font-size:18px;color:#fff}#ui{z-index:2100}@media print{.full-window{position:initial}}.markdown img{max-width:100%}.markdown svg{max-height:100%}.markdown fieldset,.markdown input,.markdown select,.markdown textarea{font-family:inherit;font-size:1rem;box-sizing:border-box;margin-top:0;margin-bottom:0}.markdown label{vertical-align:middle}.markdown h1,.markdown h2,.markdown h3,.markdown h4,.markdown h5,.markdown h6{font-family:inherit;font-weight:700;line-height:1.25;margin-top:1em;margin-bottom:.5em}.markdown h1{font-size:2rem}.markdown h2{font-size:1.5rem}.markdown h3{font-size:1.25rem}.markdown h4{font-size:1rem}.markdown h5{font-size:.875rem}.markdown h6{font-size:.75rem}.markdown dl,.markdown ol,.markdown p,.markdown ul{margin-top:0;margin-bottom:1rem}.markdown strong{font-weight:700}.markdown em{font-style:italic}.markdown small{font-size:80%}.markdown mark{color:#000;background:#ff0}.markdown s{text-decoration:line-through}.markdown ol{list-style:decimal inside}.markdown ul{list-style:disc inside}.markdown code,.markdown pre,.markdown samp{font-family:monospace;font-size:inherit}.markdown pre{margin-top:0;margin-bottom:1rem;overflow-x:scroll}.markdown a{color:#68adfe;text-decoration:none}.markdown code,.markdown pre{background-color:transparent;border-radius:3px}.markdown hr{border:0;border-bottom-style:solid;border-bottom-width:1px;border-bottom-color:rgba(0,0,0,.125)}.markdown .left-align{text-align:left}.markdown .center{text-align:center}.markdown .right-align{text-align:right}.markdown .justify{text-align:justify}.markdown .truncate{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.markdown ol.upper-roman{list-style-type:upper-roman}.markdown ol.lower-alpha{list-style-type:lower-alpha}.markdown ul.circle{list-style-type:circle}.markdown ul.square{list-style-type:square}.markdown .list-reset{list-style:none;padding-left:0}.floating,.floating-horizontal,.floating-vertical{pointer-events:auto;position:absolute;border-radius:15px;background-color:rgba(0,60,136,0.3)}.floating-horizontal{padding-left:5px;padding-right:5px}.floating-vertical{padding-top:5px;padding-bottom:5px}@media print{.floating{display:none}}.distance-legend{pointer-events:auto;position:absolute;border-radius:15px;background-color:rgba(0,60,136,0.3);padding-left:5px;padding-right:5px;right:25px;bottom:30px;height:30px;width:125px;border:1px solid rgba(255,255,255,.1);box-sizing:content-box}.distance-legend-label{display:inline-block;font-family:'Roboto',sans-serif;font-size:14px;font-weight:lighter;line-height:30px;color:#fff;width:125px;text-align:center}.distance-legend-scale-bar{border-left:1px solid #fff;border-right:1px solid #fff;border-bottom:1px solid #fff;position:absolute;height:10px;top:15px}@media print{.distance-legend{display:none}}@media screen and (max-width:700px),screen and (max-height:420px){.distance-legend{display:none}}.navigation-controls{position:absolute;right:30px;top:210px;width:30px;border:1px solid rgba(255,255,255,.1);font-weight:300;-webkit-touch-callout:none;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.navigation-control{cursor:pointer;border-bottom:1px solid #555}.naviagation-control:active{color:#fff}.navigation-control-last{cursor:pointer;border-bottom:0}.navigation-control-icon-zoom-in{padding-bottom:4px}.navigation-control-icon-zoom-in,.navigation-control-icon-zoom-out{position:relative;text-align:center;font-size:20px;color:#fff}.navigation-control-icon-reset{position:relative;left:10px;width:10px;height:10px;fill:rgba(255,255,255,.8);padding-top:6px;padding-bottom:6px;box-sizing:content-box}.compass,.compass-outer-ring{position:absolute;width:95px;height:95px}.compass{pointer-events:auto;right:0;overflow:hidden;top:50px}.compass-outer-ring{top:0;fill:rgba(255,255,255,.5)}.compass-outer-ring-background{position:absolute;top:14px;left:14px;width:44px;height:44px;border-radius:44px;border:12px solid rgba(0,60,136,0.3);box-sizing:content-box}.compass-gyro{pointer-events:none;position:absolute;top:0;width:95px;height:95px;fill:#ccc}.compass-gyro-active,.compass-gyro-background:hover+.compass-gyro{fill:#68adfe}.compass-gyro-background{position:absolute;top:30px;left:30px;width:33px;height:33px;border-radius:33px;background-color:rgba(0,60,136,0.3);border:1px solid rgba(255,255,255,.2);box-sizing:content-box}.compass-rotation-marker{position:absolute;top:0;width:95px;height:95px;fill:#68adfe}@media screen and (max-width:700px),screen and (max-height:420px){.compass,.navigation-controls{display:none}}@media print{.compass,.navigation-controls{display:none}}");



/**
 * @alias CesiumNavigation
 * @constructor
 *
 * @param {Viewer|CesiumWidget} viewerCesiumWidget The Viewer or CesiumWidget instance
 */
var CesiumNavigation = function (viewerCesiumWidget) {
    initialize.apply(this, arguments);

    this._onDestroyListeners = [];
};

CesiumNavigation.prototype.distanceLegendViewModel = undefined;
CesiumNavigation.prototype.navigationViewModel = undefined;
CesiumNavigation.prototype.navigationDiv = undefined;
CesiumNavigation.prototype.distanceLegendDiv = undefined;
CesiumNavigation.prototype.terria = undefined;
CesiumNavigation.prototype.container = undefined;
CesiumNavigation.prototype._onDestroyListeners = undefined;

CesiumNavigation.prototype.destroy = function ()
{
    if (defined(this.navigationViewModel))
    {
        this.navigationViewModel.destroy();
    }
    if (defined(this.distanceLegendViewModel))
    {
        this.distanceLegendViewModel.destroy();
    }

    if (defined(this.navigationDiv))
    {
        this.navigationDiv.parentNode.removeChild(this.navigationDiv);
    }
    delete this.navigationDiv;

    if (defined(this.distanceLegendDiv))
    {
        this.distanceLegendDiv.parentNode.removeChild(this.distanceLegendDiv);
    }
    delete this.distanceLegendDiv;

    if (defined(this.container))
    {
        this.container.parentNode.removeChild(this.container);
    }
    delete this.container;

    for (var i = 0; i < this._onDestroyListeners.length; i++)
    {
        this._onDestroyListeners[i]();
    }
};

CesiumNavigation.prototype.addOnDestroyListener = function (callback)
{
    if (typeof callback === "function")
    {
        this._onDestroyListeners.push(callback);
    }
};

/**
 * @param {Viewer|CesiumWidget} viewerCesiumWidget The Viewer or CesiumWidget instance
 * @param options
 */
function initialize(viewerCesiumWidget, options) {
    if (!defined(viewerCesiumWidget)) {
        throw new DeveloperError('CesiumWidget or Viewer is required.');
    }

//        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

    var cesiumWidget = defined(viewerCesiumWidget.cesiumWidget) ? viewerCesiumWidget.cesiumWidget : viewerCesiumWidget;

    var container = document.createElement('div');
    container.className = 'cesium-widget-cesiumNavigationContainer';
    cesiumWidget.container.appendChild(container);

    this.terria = viewerCesiumWidget;
    this.terria.options = (defined(options))?options :{};
    this.terria.afterWidgetChanged = new CesiumEvent();
    this.terria.beforeWidgetChanged = new CesiumEvent();
    this.container = container;

    //this.navigationDiv.setAttribute("id", "navigationDiv");


      // Register custom Knockout.js bindings.  If you're not using the TerriaJS user interface, you can remove this.
    registerKnockoutBindings();

    if (!defined(this.terria.options.enableDistanceLegend) || this.terria.options.enableDistanceLegend)
    {
        this.distanceLegendDiv = document.createElement('div');
         container.appendChild(this.distanceLegendDiv);
        this.distanceLegendDiv.setAttribute("id", "distanceLegendDiv");
        this.distanceLegendViewModel = DistanceLegendViewModel.create({
            container: this.distanceLegendDiv,
            terria: this.terria,
            mapElement: container,
            enableDistanceLegend: true
        });

    }


    if ((!defined(this.terria.options.enableZoomControls) || this.terria.options.enableZoomControls) && (!defined(this.terria.options.enableCompass) || this.terria.options.enableCompass))
    {
        this.navigationDiv = document.createElement('div');
        this.navigationDiv.setAttribute("id", "navigationDiv");
        container.appendChild(this.navigationDiv);
        // Create the navigation controls.
        this.navigationViewModel = NavigationViewModel.create({
            container: this.navigationDiv,
            terria: this.terria,
            enableZoomControls: true,
            enableCompass: true
        });
    }
    else  if ((defined(this.terria.options.enableZoomControls) && !this.terria.options.enableZoomControls) && (!defined(this.terria.options.enableCompass) || this.terria.options.enableCompass))
    {
        this.navigationDiv = document.createElement('div');
        this.navigationDiv.setAttribute("id", "navigationDiv");
        container.appendChild(this.navigationDiv);
        // Create the navigation controls.
        this.navigationViewModel = NavigationViewModel.create({
            container: this.navigationDiv,
            terria: this.terria,
            enableZoomControls: false,
            enableCompass: true
        });
    }
    else  if ((!defined(this.terria.options.enableZoomControls) || this.terria.options.enableZoomControls) && (defined(this.terria.options.enableCompass) && !this.terria.options.enableCompass))
    {
        this.navigationDiv = document.createElement('div');
        this.navigationDiv.setAttribute("id", "navigationDiv");
        container.appendChild(this.navigationDiv);
        // Create the navigation controls.
        this.navigationViewModel = NavigationViewModel.create({
            container: this.navigationDiv,
            terria: this.terria,
            enableZoomControls: true,
            enableCompass: false
        });
    }
    else  if ((defined(this.terria.options.enableZoomControls) &&  !this.terria.options.enableZoomControls) && (defined(this.terria.options.enableCompass) &&  !this.terria.options.enableCompass))
    {
        //this.navigationDiv.setAttribute("id", "navigationDiv");
       // container.appendChild(this.navigationDiv);
        // Create the navigation controls.
//            this.navigationViewModel = NavigationViewModel.create({
//                container: this.navigationDiv,
//                terria: this.terria,
//                enableZoomControls: false,
//                enableCompass: false
//            });
    }

}

export default CesiumNavigation;
