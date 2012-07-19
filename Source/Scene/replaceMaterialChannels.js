/*global define*/
define([
        '../Core/DeveloperError'
    ], function(
        DeveloperError) {
    "use strict";

    /**
     * @private
     */

    // Some materials have the ability to sample textures through user-specified channels,
    // such as an AlphaMapMaterial using the 'a' component of an RGBA image or using the
    // 'r' component of a grayscale image. The material's glsl code has placeholder values that need
    // to be replaced with the correct channels, such as 'alpha_map_material_channels' being
    // replaced with 'r'. First, this method checks that the number of channels the user
    // specifies matches the expected number of channels. Next it checks if the channels
    // contain nothing but r, g, b, and a. If these pass, the channels are inserted into the code.

    // source: The material's glsl source code.
    // channelsName: The name in the source code that needs to be replaced with channels.
    // channels: The channels to replace the channelsName.
    // numChannels: The number of expected channels.

    // example:
    // shaderSource = replaceMaterialChannels(shaderSource, 'alpha_map_material_channels', 'r', 1);

    function replaceMaterialChannels(source, channelsName, channels, numChannels) {
        channels = channels.toLowerCase();
        if (channels.length !== numChannels) {
            throw new DeveloperError('number of texture channels does not match numChannels');
        }
        // Matches r, g, b, or a in any order.
        if (/[^rgba]/.test(channels)) {
            throw new DeveloperError('channels should only contain r, g, b, or a');
        }
        return source.replace(new RegExp(channelsName, 'g'), channels);
    }

    return replaceMaterialChannels;
});