/**
 * Regular expressions and patterns for code transformation
 */

// Token patterns
export const TOKEN_PLACEHOLDER = 'YOUR_CESIUM_ION_ACCESS_TOKEN';
export const TOKEN_PLACEHOLDER_REGEX = /YOUR_CESIUM_ION_ACCESS_TOKEN/g;
export const TOKEN_ASSIGNMENT_REGEX = /Cesium\.Ion\.defaultAccessToken\s*=\s*['"][^'"]*['"];?\s*\n?/g;
export const TOKEN_COMMENT_REGEX = /\/\/.*Cesium\.Ion\.defaultAccessToken.*\n?/g;

// HTML/Script tag patterns
export const CESIUM_CDN_SCRIPT_REGEX = /<script[^>]*src=["']https:\/\/cesium\.com\/downloads\/cesiumjs\/[^"']*["'][^>]*><\/script>/gi;
export const CESIUM_CDN_LINK_REGEX = /<link[^>]*href=["']https:\/\/cesium\.com\/downloads\/cesiumjs\/[^"']*["'][^>]*>/gi;
export const MAIN_JS_SCRIPT_REGEX = /<script([^>]*)src=["'](\.\/)?main\.js["']([^>]*)>/gi;
export const MAIN_JS_SRC_REGEX = /src=["']\.\/main\.js["']/gi;

// ES6 import patterns
export const CESIUM_ENGINE_IMPORT_NAMED_REGEX = /import\s*{[^}]+}\s*from\s*['"]@cesium\/engine['"];?\s*\n*/g;
export const CESIUM_ENGINE_IMPORT_NAMESPACE_REGEX = /import\s+\*\s+as\s+Cesium\s+from\s*['"]@cesium\/engine['"];?\s*\n*/g;
export const CESIUM_IMPORT_NAMESPACE_REGEX = /import\s+\*\s+as\s+Cesium\s+from\s+['"]cesium['"];?\s*\n?/g;
export const CESIUM_WIDGETS_CSS_IMPORT_REGEX = /import\s+['"]cesium\/Build\/Cesium\/Widgets\/widgets\.css['"];?\s*\n?/g;

// Cesium namespace patterns
export const ION_TOKEN_ASSIGNMENT = 'Ion.defaultAccessToken';
export const CESIUM_ION_TOKEN_ASSIGNMENT = 'Cesium.Ion.defaultAccessToken';
export const CESIUM_VIEWER_PATTERN = 'new Cesium.Viewer(';
export const CESIUM_MATH_PATTERN = 'Cesium.Math.';
export const CESIUM_CARTESIAN3_PATTERN = 'Cesium.Cartesian3.';
export const CESIUM_COLOR_PATTERN = 'Cesium.Color.';
export const CESIUM_RECTANGLE_PATTERN = 'Cesium.Rectangle.';
export const CESIUM_ENTITY_PATTERN = 'Cesium.Entity(';

// Environment variable patterns
export const ENV_TOKEN_KEY = 'CESIUM_ION_ACCESS_TOKEN';
export const ENV_TOKEN_ASSIGNMENT_REGEX = /CESIUM_ION_ACCESS_TOKEN=.*/;
