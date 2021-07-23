import knockout from '../../ThirdParty/npm/knockout-3.5.1.js';
import knockout_es5 from '../../ThirdParty/npm/knockout-es5.js';
import SvgPathBindingHandler from './SvgPathBindingHandler.js';

// install the Knockout-ES5 plugin
knockout_es5.attachToKo(knockout);

// Register all Cesium binding handlers
SvgPathBindingHandler.register(knockout);

export default knockout;
