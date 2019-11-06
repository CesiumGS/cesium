import knockout from './knockout-3.5.0.js';
import knockout_es5 from './knockout-es5.js';
import SvgPathBindingHandler from '../Widgets/SvgPathBindingHandler.js';

// install the Knockout-ES5 plugin
knockout_es5.attachToKo(knockout);

// Register all Cesium binding handlers
SvgPathBindingHandler.register(knockout);

export default knockout;
