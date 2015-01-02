/*global define*/
define([
        './defined',
        './defineProperties',
        './DeveloperError'
    ], function(
        defined,
        defineProperties,
        DeveloperError) {
    "use strict";
    /* global console */
    /**
     * Object that returns the capabilities of an OGC server (WMS, "TMS",WMTS,WCS)
     * @alias OGCCapabilities
     * @constructor
     * @see OGCHGelper
     */
    var OGCCapabilities = function() {};

    /**
     * check if a proposition for a dimension can be used to request.
     * @function
     *
     * @param {Object} dimension see {@link OGCCapabilities#dimensions} with the following attributes
     * @param {String}
     *              dimension.Identifier identifier of the dimension
     * @param {String}
     *              [dimension.UOM] unit of measure of the dimension
     * @param {String}
     *              [dimension.Default] the default value of the dimension
     * @param {Array}
     *              dimension.Value an array of String that indicates the range of this dimension for each element of the array:
     * <table>
     *  <thead><tr><th>Syntax</th><th>Meaning</th></tr></thead>
     *  <tbody>
     *      <tr><td>value</td><td>A single value.</td></tr>
     *      <tr><td>value1,value2,value3,...</td><td>A list of multiple values.</td></tr>
     *      <tr><td>min/max/resolution</td><td>An interval defined by its lower and upper bounds and its resolution.</td></tr>
     *      <tr><td>min1/max1/res1,min2/max2/res2,...</td><td>A list of multiple intervals.</td></tr>
     *  </tbody>
     * </table>
     * @param {String} toValidate String to validate before sending a request to the server.
     * @return {Boolean|undefined} indicate if the String toValidate is a correct value for the dimension. If the function can't determine, it will return undefined
     */
    OGCCapabilities.dimensionValidator=function(dimension,toValidate){

        var isTimeDimension=/^time$/i.test(dimension.Identifier)|| /^iso8601$/i.test(dimension.UOM);
        var resultat;
        var tabResult=dimension.Value.map(function(element){
            //if it's (min/max/resolution)=> 1: get 3 values;2:check if values are numbers (or time dimension) then check from min to max with resolution as pace else undefined;
            //      remove (min/max/resolution)+ ',' from beginning of element and loop again until the partial result is positive
            // else if it's a list of values=> check each value (without conversion to a number) (think to remove used value!!)
            var retour;
            if(/\//.test(element)){
                //syntax of min1/max1/resolution1,min2/max2/resolution2...
                var reg=/[,\/]*([^\/,]+)\/([^\/,]+)\/([^\/,]+),?/;
                var tab;
                var toValidateDate=isTimeDimension?new Date(toValidate+' UTC'):undefined;
                while( (tab=reg.exec(element))!==null && !(defined(retour) && retour===true)){
                    var min=tab[1],max=tab[2],res=tab[3];
                    if(isTimeDimension){
                        try{
                            min=new Date(min+' UTC');
                            max=new Date(max+' UTC');
                            var tabPeriod=/^P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/.exec(res);
                            // /^P(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/.exec(period) return [ "P3Y6M5W4DT12H15M17S", "3Y", "6M", "5W", "4D", "T12H15M17S", "12H", "15M", "17S" ] for period="P3Y6M5W4DT12H15M17S"
                            var periodYear=defined(tabPeriod[1])?parseInt(tabPeriod[1].replace(/[\D]/,""),10):0;
                            var periodMonth=defined(tabPeriod[2])?parseInt(tabPeriod[2].replace(/[\D]/,""),10):0;
                            var periodWeek=defined(tabPeriod[3])?parseInt(tabPeriod[3].replace(/[\D]/,""),10):0;
                            var periodDay=defined(tabPeriod[4])?parseInt(tabPeriod[4].replace(/[\D]/,""),10):0;
                            var periodHour=defined(tabPeriod[6])?parseInt(tabPeriod[6].replace(/[\D]/,""),10):0;
                            var periodMinute=defined(tabPeriod[7])?parseInt(tabPeriod[7].replace(/[\D]/,""),10):0;
                            var periodSecond=defined(tabPeriod[8])?parseInt(tabPeriod[8].replace(/[\D]/,""),10):0;
                            var periodTotalSecondWithoutMonthAndYear=(((periodWeek*7+periodDay)*24+periodHour)*60+periodMinute)*60+periodSecond;
                            var deltaMilliSeconds=periodTotalSecondWithoutMonthAndYear*1000/10;
                            while(min.getTime()<=max.getTime() && !(defined(retour) && retour===true)){
                                if(Math.abs(min.getTime()-toValidateDate.getTime())<deltaMilliSeconds){
                                    retour=true;
                                }
                                min.setFullYear(min.getFullYear()+periodYear);
                                min.setMonth(min.getMonth()+periodMonth);
                                min.setSeconds(min.getSeconds()+periodTotalSecondWithoutMonthAndYear);
                            }
                            if(!(defined(retour) && retour===true)){
                                if(Math.abs(min.getTime()-max.getTime())<deltaMilliSeconds){
                                    retour=true;
                                }else{
                                    retour=false;
                                }
                            }
                        }catch(e) {
                            console.log(min+" or "+max+" or "+res+" isn't parsable as a ISO8601 date or period");
                        }
                    }else{
                        min=parseFloat(min);
                        max=parseFloat(max);
                        res=parseFloat(res);
                        toValidate=parseFloat(toValidate);
                        if(!isNaN(min+max+res+toValidate)){
                            if(min<=toValidate && toValidate<=max && Math.abs((toValidate-min)%res)<0.00001){
                                retour=true;
                            }else{
                                retour=false;
                            }
                        }
                    }
                    element=element.replace(tab[0],"");
                }
            }else{
                //syntax of value1,value2,value3,...
                var reg2=/,*([^\/,]+),?/;
                var tab2;
                while( (tab2=reg2.exec(element))!==null && !(defined(retour) && retour===true)){
                    if(tab2[1].trim()===toValidate){
                        retour=true;
                    }
                    element=element.replace(tab2[0],"");
                }
                if(!defined(retour)){
                    retour=false;
                }
            }
            return retour;
        }).filter(function(elt){return defined(elt);});
        tabResult.forEach(function(elt){
            if(!defined(resultat)){
                resultat=elt;
            }else{
                if(resultat===false){
                    resultat=elt;
                }
            }
        });

        return resultat;
    };

    defineProperties(OGCCapabilities.prototype, {
        /**
         * Gets a value indicating whether or not the capabilities were parsed without error.
         * @memberof OGCCapabilities.prototype
         * @type {Boolean}
         * @readonly
         */
        ready : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the width of each tile, in pixels.  This function should
         * not be called before {@link OGCCapabilities#ready} returns true.
         * @memberof OGCCapabilities.prototype
         * @type {Number}
         * @readonly
         */
        tileMapWidth : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the rectangle, in tiling units, describing the geographical limits. This function should
         * not be called before {@link OGCCapabilities#ready} returns true.
         * @memberof OGCCapabilities.prototype
         * @type {Rectangle}
         * @readonly
         */
        rectangle : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the maximum level proposed by server. Can be undefined if there is no limiting level. This function should
         * not be called before {@link OGCCapabilities#ready} returns true.
         * @memberof OGCCapabilities.prototype
         * @type {Number|undefined}
         * @readonly
         */
        maxLevel : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the height of each tile, in pixels.  This function should
         * not be called before {@link OGCCapabilities#ready} returns true.
         * @memberof OGCCapabilities.prototype
         * @type {Number}
         * @readonly
         */
        tileMapHeight : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the list of applicable styles. It's an array of strings where
         * first element (length always greater than 0 )is the default style.
         * This function should not be called before {@link OGCCapabilities#ready} returns true.
         * @memberof OGCCapabilities.prototype
         * @type {Array}
         * @readonly
         */
        styles : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the list of applicable dimensions (an object which attributes are Identifier, UOM (unit of measure that can be undefined), Default (default value) and Value=an array of possible values (see WMS specifications annex C)). The length of this array can be equals to 0.
         * This function should not be called before {@link OGCCapabilities#ready} returns true.
         * See {@link OGCCapabilities.dimensionValidator}
         * @memberof OGCCapabilities.prototype
         * @type {Array}
         * @readonly
         */
        dimensions : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the tiling scheme defined in this OGCCapabilities.  This function should
         * not be called before {@link OGCCapabilities#ready} returns true.
         * @memberof OGCCapabilities.prototype
         * @type {TilingScheme}
         * @readonly
         */
        tilingScheme : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the format image defined for this OGCCapabilities. See {@link OGCCapabilities#getURLImage} and {@link OGCHelper.FormatImage}.  This function should
         * not be called before {@link OGCCapabilities#ready} returns true. It's Undefined when there is no format available.
         * @memberof OGCCapabilities.prototype
         * @type {OGCHelper.FormatImage}
         * @readonly
         */
        formatImage : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the format array defined for this OGCCapabilities. See {@link OGCCapabilities#getURLArray} and {@link OGCHelper.FormatArray}.  This function should
         * not be called before {@link OGCCapabilities#ready} returns true. It's Undefined when there is no format available.
         * @memberof OGCCapabilities.prototype
         * @type {OGCHelper.FormatArray}
         * @readonly
         */
        formatArray : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the featureInfo format defined for this OGCCapabilities. See {@link OGCCapabilities#getURLFeatureInfo} and {@link OGCHelper.FormatFeatureInfo}.  This function should
         * not be called before {@link OGCCapabilities#ready} returns true. It's Undefined when there is no format available.
         * @memberof OGCCapabilities.prototype
         * @type {OGCHelper.FormatFeatureInfo}
         * @readonly
         */
        formatFeatureInfo : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Determines the URL to request an imaged tile. This function can be undefined if this capacity is not supported.
     * @function
     *
     * @param {Number} x The X coordinate of the tile for which to request image.
     * @param {Number} y The Y coordinate of the tile for which to request image.
     * @param {Number} level The level of the tile for which to request image.
     * @param {Object} [options] Object with the following attributes:
     * @param {String} [options.style=OGCCapabilities.prototype.styles[0]] the style to apply. see {@link OGCCapabilities#styles}
     * @param {Object} [options.dimensions] dimensions to apply. It's an array of Objects whose attributes are strings: <ul>
     * <li>name for identifier of the dimension</li>
     * <li>value for requested value for the dimension</li>
     * </ul>  see {@link OGCCapabilities#dimensions}
     * @returns {String} URL string to request an imaged tile. The returned string can be "" if the request isn't acceptable
     */
    OGCCapabilities.prototype.getURLImage=DeveloperError.throwInstantiationError;

    /**
     * Determines the URL to request an array that represents the requested tile. This function can be undefined if this capacity is not supported.
     * @function
     *
     * @param {Number} x The X coordinate of the tile for which to request array.
     * @param {Number} y The Y coordinate of the tile for which to request array.
     * @param {Number} level The level of the tile for which to request array.
     * @param {Object} [options] Object with the following attributes:
     * @param {String} [options.style=OGCCapabilities.prototype.styles[0]] the style to apply. see {@link OGCCapabilities#styles}
     * @param {Object} [options.dimensions] dimensions to apply. It's an array of Objects whose attributes are strings: <ul>
     * <li>name for identifier of the dimension</li>
     * <li>value for requested value for the dimension</li>
     * </ul>  see {@link OGCCapabilities#dimensions}
     * @returns {String} URL string to request an array representing tile. The returned string can be "" if the request isn't acceptable
     */
    OGCCapabilities.prototype.getURLArray=DeveloperError.throwInstantiationError;

    /**
     * Determines the URL to request a feature info that represents a pixel of the requested tile. This function can be undefined if this capacity is not supported.
     * It's the case if there is no OGCCapabilities.prototype.getURLImage
     * @function
     *
     * @param {Number} x The X coordinate of the tile for which to request feature info.
     * @param {Number} y The Y coordinate of the tile for which to request feature info .
     * @param {Number} level The level of the tile for which to request feature info.
     * @param {Object} [options] Object with the following attributes:
     * @param {String} [options.style=OGCCapabilities.prototype.styles[0]] the style to apply. see {@link OGCCapabilities#styles}
     * @param {String} [options.i=0] Column index of a pixel in the tile
     * @param {String} [options.j=0] Row index of a pixel in the tile
     * @param {Object} [options.dimensions] dimensions to apply. It's an array of Objects whose attributes are strings: <ul>
     * <li>name for identifier of the dimension</li>
     * <li>value for requested value for the dimension</li>
     * </ul>  see {@link OGCCapabilities#dimensions}
     * @returns {String} URL string to request a feature info representing 'the middle" of tile. The returned string can be "" if the request isn't acceptable
     */
    OGCCapabilities.prototype.getURLFeatureInfoImage=DeveloperError.throwInstantiationError;

    /**
     * Determines the URL to request a feature info that represents a pixel of the requested tile. This function can be undefined if this capacity is not supported.
     * It's the case if there is no OGCCapabilities.prototype.getURLArray
     * @function
     *
     * @param {Number} x The X coordinate of the tile for which to request feature info.
     * @param {Number} y The Y coordinate of the tile for which to request feature info .
     * @param {Number} level The level of the tile for which to request feature info.
     * @param {Object} [options] Object with the following attributes:
     * @param {String} [options.style=OGCCapabilities.prototype.styles[0]] the style to apply. see {@link OGCCapabilities#styles}
     * @param {String} [options.i=0] Column index of a pixel in the tile
     * @param {String} [options.j=0] Row index of a pixel in the tile
     * @param {Object} [options.dimensions] dimensions to apply. It's an array of Objects whose attributes are strings: <ul>
     * <li>name for identifier of the dimension</li>
     * <li>value for requested value for the dimension</li>
     * </ul>  see {@link OGCCapabilities#dimensions}
     * @returns {String} URL string to request a feature info representing 'the middle" of tile. The returned string can be "" if the request isn't acceptable
     */
    OGCCapabilities.prototype.getURLFeatureInfoArray=DeveloperError.throwInstantiationError;

    /**
     * Determines whether data for a tile is available to be loaded.
     * @function
     *
     * @param {Number} x The X coordinate of the tile for which to request geometry.
     * @param {Number} y The Y coordinate of the tile for which to request geometry.
     * @param {Number} level The level of the tile for which to request geometry.
     * @returns {Boolean} Undefined if not supported, otherwise true or false.
     */
    OGCCapabilities.prototype.getTileDataAvailable=DeveloperError.throwInstantiationError;

    return OGCCapabilities;
});