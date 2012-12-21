/*global define*/
define(['./Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * An enumeration of CSS hexadecimal colors values and names.
     *
     * @see Color
     * @see <a href="http://www.w3.org/TR/css3-color/#svg-color">Represents the CSS color values</a>
     *
     * @exports NamedColors
     */
    var NamedColors = {
        /**
         * Represents the CSS color #F0F8FF
         *
         * @constant
         * @type {Color}
         */
        ALICE_BLUE : new Enumeration('#F0F8FF', 'aliceblue'),

        /**
         * Represents the CSS color #FAEBD7
         *
         * @constant
         * @type {Color}
         */
        ANTIQUE_WHITE : new Enumeration('#FAEBD7', 'antiquewhite'),

        /**
         * Represents the CSS color #00FFFF
         *
         * @constant
         * @type {Color}
         */
        AQUA : new Enumeration('#00FFFF', 'aqua'),

        /**
         * Represents the CSS color #7FFFD4
         *
         * @constant
         * @type {Color}
         */
        AQUAMARINE : new Enumeration('#7FFFD4', 'aquamarine'),

        /**
         * Represents the CSS color #F0FFFF
         *
         * @constant
         * @type {Color}
         */
        AZURE : new Enumeration('#F0FFFF', 'azure'),

        /**
         * Represents the CSS color #F5F5DC
         *
         * @constant
         * @type {Color}
         */
        BEIGE: new Enumeration('#F5F5DC', 'beige'),

        /**
         * Represents the CSS color #FFE4C4
         *
         * @constant
         * @type {Color}
         */
        BISQUE : new Enumeration('#FFE4C4', 'bisque'),

        /**
         * Represents the CSS color #000000
         *
         * @constant
         * @type {Color}
         */
        BLACK : new Enumeration('#000000', 'black'),

        /**
         * Represents the CSS color #FFEBCD
         *
         * @constant
         * @type {Color}
         */
        BLANCHED_ALMOND : new Enumeration('#FFEBCD', 'blanchedalmond'),

        /**
         * Represents the CSS color #0000FF
         *
         * @constant
         * @type {Color}
         */
        BLUE : new Enumeration('#0000FF', 'blue'),

        /**
         * Represents the CSS color #8A2BE2
         *
         * @constant
         * @type {Color}
         */
        BLUE_VIOLET : new Enumeration('#8A2BE2', 'blueviolet'),

        /**
         * Represents the CSS color #A52A2A
         *
         * @constant
         * @type {Color}
         */
        BROWN : new Enumeration('#A52A2A', 'brown'),

        /**
         * Represents the CSS color #DEB887
         *
         * @constant
         * @type {Color}
         */
        BURLY_WOOD : new Enumeration('#DEB887', 'burlywood'),

        /**
         * Represents the CSS color #5F9EA0
         *
         * @constant
         * @type {Color}
         */
        CADET_BLUE : new Enumeration('#5F9EA0', 'cadetblue'),

        /**
         * Represents the CSS color #7FFF00
         *
         * @constant
         * @type {Color}
         */
        CHARTREUSE : new Enumeration('#7FFF00', 'chartreuse'),

        /**
         * Represents the CSS color #D2691E
         *
         * @constant
         * @type {Color}
         */
        CHOCOLATE : new Enumeration('#D2691E', 'chocolate'),

        /**
         * Represents the CSS color #FF7F50
         *
         * @constant
         * @type {Color}
         */
        CORAL : new Enumeration('#FF7F50', 'coral'),

        /**
         * Represents the CSS color #6495ED
         *
         * @constant
         * @type {Color}
         */
        CORNFLOWER_BLUE : new Enumeration('#6495ED', 'cornflowerblue'),

        /**
         * Represents the CSS color #FFF8DC
         *
         * @constant
         * @type {Color}
         */
        CORNSILK : new Enumeration('#FFF8DC', 'cornsilk'),

        /**
         * Represents the CSS color #DC143C
         *
         * @constant
         * @type {Color}
         */
        CRIMSON : new Enumeration('#DC143C', 'crimson'),

        /**
         * Represents the CSS color #00FFFF
         *
         * @constant
         * @type {Color}
         */
        CYAN : new Enumeration('#00FFFF', 'cyan'),

        /**
         * Represents the CSS color #00008B
         *
         * @constant
         * @type {Color}
         */
        DARK_BLUE : new Enumeration('#00008B', 'darkblue'),

        /**
         * Represents the CSS color #008B8B
         *
         * @constant
         * @type {Color}
         */
        DARK_CYAN : new Enumeration('#008B8B', 'darkcyan'),

        /**
         * Represents the CSS color #B8860B
         *
         * @constant
         * @type {Color}
         */
        DARK_GOLDENROD : new Enumeration('#B8860B', 'darkgoldenrod'),

        /**
         * Represents the CSS color #A9A9A9
         *
         * @constant
         * @type {Color}
         */
        DARK_GRAY : new Enumeration('#A9A9A9', 'darkgray'),

        /**
         * Represents the CSS color #006400
         *
         * @constant
         * @type {Color}
         */
        DARK_GREEN : new Enumeration('#006400', 'darkgreen'),

        /**
         * Represents the CSS color #A9A9A9
         *
         * @constant
         * @type {Color}
         */
        DARK_GREY : new Enumeration('#A9A9A9', 'darkgray'),

        /**
         * Represents the CSS color #BDB76B
         *
         * @constant
         * @type {Color}
         */
        DARK_KHAKI : new Enumeration('#BDB76B', 'darkkhaki'),

        /**
         * Represents the CSS color #8B008B
         *
         * @constant
         * @type {Color}
         */
        DARK_MAGENTA : new Enumeration('#8B008B', 'darkmagenta'),

        /**
         * Represents the CSS color #556B2F
         *
         * @constant
         * @type {Color}
         */
        DARK_OLIVE_GREEN : new Enumeration('#556B2F', 'darkolivegreen'),

        /**
         * Represents the CSS color #FF8C00
         *
         * @constant
         * @type {Color}
         */
        DARK_ORANGE : new Enumeration('#FF8C00', 'darkorange'),

        /**
         * Represents the CSS color #9932CC
         *
         * @constant
         * @type {Color}
         */
        DARK_ORCHID : new Enumeration('#9932CC', 'darkorchid'),

        /**
         * Represents the CSS color #8B0000
         *
         * @constant
         * @type {Color}
         */
        DARK_RED : new Enumeration('#8B0000', 'darkred'),

        /**
         * Represents the CSS color #E9967A
         *
         * @constant
         * @type {Color}
         */
        DARK_SALMON : new Enumeration('#E9967A', 'darksalmon'),

        /**
         * Represents the CSS color #8FBC8F
         *
         * @constant
         * @type {Color}
         */
        DARK_SEAGREEN : new Enumeration('#8FBC8F', 'darkseagreen'),

        /**
         * Represents the CSS color #483D8B
         *
         * @constant
         * @type {Color}
         */
        DARK_SLATE_BLUE : new Enumeration('#483D8B', 'darkslateblue'),

        /**
         * Represents the CSS color #2F4F4F
         *
         * @constant
         * @type {Color}
         */
        DARK_SLATE_GRAY : new Enumeration('#2F4F4F', 'darkslategray'),

        /**
         * Represents the CSS color #2F4F4F
         *
         * @constant
         * @type {Color}
         */
        DARK_SLATE_GREY : new Enumeration('#2F4F4F', 'darkslategrey'),

        /**
         * Represents the CSS color #00CED1
         *
         * @constant
         * @type {Color}
         */
        DARK_TURQUOISE : new Enumeration('#00CED1', 'darktruquoise'),

        /**
         * Represents the CSS color #9400D3
         *
         * @constant
         * @type {Color}
         */
        DARK_VIOLET : new Enumeration('#9400D3', 'darkviolet'),

        /**
         * Represents the CSS color #FF1493
         *
         * @constant
         * @type {Color}
         */
        DEEP_PINK : new Enumeration('#FF1493', 'deeppink'),

        /**
         * Represents the CSS color #00BFFF
         *
         * @constant
         * @type {Color}
         */
        DEEP_SKY_BLUE : new Enumeration('#00BFFF', 'deepskyblue'),

        /**
         * Represents the CSS color #696969
         *
         * @constant
         * @type {Color}
         */
        DIM_GRAY : new Enumeration('#696969', 'dimgray'),

        /**
         * Represents the CSS color #696969
         *
         * @constant
         * @type {Color}
         */
        DIM_GREY : new Enumeration('#696969', 'dimgrey'),

        /**
         * Represents the CSS color #1E90FF
         *
         * @constant
         * @type {Color}
         */
        DODGER_BLUE : new Enumeration('#1E90FF', 'dodgerblue'),

        /**
         * Represents the CSS color #B22222
         *
         * @constant
         * @type {Color}
         */
        FIREBRICK : new Enumeration('#B22222', 'firebrick'),

        /**
         * Represents the CSS color #FFFAF0
         *
         * @constant
         * @type {Color}
         */
        FLORAL_WHITE : new Enumeration('#FFFAF0', 'floralwhite'),

        /**
         * Represents the CSS color #228B22
         *
         * @constant
         * @type {Color}
         */
        FOREST_GREEN : new Enumeration('#228B22', 'forestgreen'),

        /**
         * Represents the CSS color #FF00FF
         *
         * @constant
         * @type {Color}
         */
        FUSCHIA : new Enumeration('#FF00FF', 'fuschia'),

        /**
         * Represents the CSS color #DCDCDC
         *
         * @constant
         * @type {Color}
         */
        GAINSBORO : new Enumeration('#DCDCDC', 'gainsboro'),

        /**
         * Represents the CSS color #F8F8FF
         *
         * @constant
         * @type {Color}
         */
        GHOST_WHITE : new Enumeration('#F8F8FF', 'ghostwhite'),

        /**
         * Represents the CSS color #FFD700
         *
         * @constant
         * @type {Color}
         */
        GOLD : new Enumeration('#FFD700', 'gold'),

        /**
         * Represents the CSS color #DAA520
         *
         * @constant
         * @type {Color}
         */
        GOLDENROD : new Enumeration('#DAA520', 'goldenrod'),

        /**
         * Represents the CSS color #808080
         *
         * @constant
         * @type {Color}
         */
        GRAY : new Enumeration('#808080', 'gray'),

        /**
         * Represents the CSS color #008000
         *
         * @constant
         * @type {Color}
         */
        GREEN : new Enumeration('#008000', 'green'),

        /**
         * Represents the CSS color #ADFF2F
         *
         * @constant
         * @type {Color}
         */
        GREEN_YELLOW : new Enumeration('#ADFF2F', 'greenyellow'),

        /**
         * Represents the CSS color #808080
         *
         * @constant
         * @type {Color}
         */
        GREY : new Enumeration('#808080', 'grey'),

        /**
         * Represents the CSS color #F0FFF0
         *
         * @constant
         * @type {Color}
         */
        HONEYDEW : new Enumeration('#F0FFF0', 'honeydew'),

        /**
         * Represents the CSS color #FF69B4
         *
         * @constant
         * @type {Color}
         */
        HOT_PINK : new Enumeration('#FF69B4', 'hotpink'),

        /**
         * Represents the CSS color #CD5C5C
         *
         * @constant
         * @type {Color}
         */
        INDIAN_RED : new Enumeration('#CD5C5C', 'indianred'),

        /**
         * Represents the CSS color #4B0082
         *
         * @constant
         * @type {Color}
         */
        INDIGO : new Enumeration('#4B0082', 'indigo'),

        /**
         * Represents the CSS color #FFFFF0
         *
         * @constant
         * @type {Color}
         */
        IVORY : new Enumeration('#FFFFF0', 'ivory'),

        /**
         * Represents the CSS color #F0E68C
         *
         * @constant
         * @type {Color}
         */
        KHAKI : new Enumeration('#F0E68C', 'khaki'),

        /**
         * Represents the CSS color #E6E6FA
         *
         * @constant
         * @type {Color}
         */
        LAVENDER : new Enumeration('#E6E6FA', 'lavendar'),

        /**
         * Represents the CSS color #FF00FF
         *
         * @constant
         * @type {Color}
         */
        LAVENDAR_BLUSH : new Enumeration('#FFF0F5', 'lavendarblush'),

        /**
         * Represents the CSS color #FF00FF
         *
         * @constant
         * @type {Color}
         */
        LAWN_GREEN : new Enumeration('#7CFC00', 'lawngreen'),

        /**
         * Represents the CSS color #FFFACD
         *
         * @constant
         * @type {Color}
         */
        LEMON_CHIFFON : new Enumeration('#FFFACD', 'lemonchiffon'),

        /**
         * Represents the CSS color #ADD8E6
         *
         * @constant
         * @type {Color}
         */
        LIGHT_BLUE : new Enumeration('#ADD8E6', 'lightblue'),

        /**
         * Represents the CSS color #F08080
         *
         * @constant
         * @type {Color}
         */
        LIGHT_CORAL : new Enumeration('#F08080', 'lightcoral'),

        /**
         * Represents the CSS color #E0FFFF
         *
         * @constant
         * @type {Color}
         */
        LIGHT_CYAN : new Enumeration('#E0FFFF', 'lightcyan'),

        /**
         * Represents the CSS color #FAFAD2
         *
         * @constant
         * @type {Color}
         */
        LIGHT_GOLDENROD_YELLOW : new Enumeration('#FAFAD2', 'lightgoldenrodyellow'),

        /**
         * Represents the CSS color #D3D3D3
         *
         * @constant
         * @type {Color}
         */
        LIGHT_GRAY : new Enumeration('#D3D3D3', 'lightgray'),

        /**
         * Represents the CSS color #90EE90
         *
         * @constant
         * @type {Color}
         */
        LIGHT_GREEN : new Enumeration('#90EE90', 'lightgreen'),

        /**
         * Represents the CSS color #D3D3D3
         *
         * @constant
         * @type {Color}
         */
        LIGHT_GREY : new Enumeration('#D3D3D3', 'lightgrey'),

        /**
         * Represents the CSS color #FFB6C1
         *
         * @constant
         * @type {Color}
         */
        LIGHT_PINK : new Enumeration('#FFB6C1', 'lightpink'),

        /**
         * Represents the CSS color #20B2AA
         *
         * @constant
         * @type {Color}
         */
        LIGHT_SEAGREEN : new Enumeration('#20B2AA', 'lightseagreen'),

        /**
         * Represents the CSS color #87CEFA
         *
         * @constant
         * @type {Color}
         */
        LIGHT_SKY_BLUE : new Enumeration('#87CEFA', 'lightskyblue'),

        /**
         * Represents the CSS color #778899
         *
         * @constant
         * @type {Color}
         */
        LIGHT_SLATE_GRAY : new Enumeration('#778899', 'lightslategray'),

        /**
         * Represents the CSS color #778899
         *
         * @constant
         * @type {Color}
         */
        LIGHT_SLATE_GREY : new Enumeration('#778899', 'lightslategrey'),

        /**
         * Represents the CSS color #B0C4DE
         *
         * @constant
         * @type {Color}
         */
        LIGHT_STEE_LBLUE : new Enumeration('#B0C4DE', 'lightsteelblue'),

        /**
         * Represents the CSS color #FFFFE0
         *
         * @constant
         * @type {Color}
         */
        LIGHT_YELLOW : new Enumeration('#FFFFE0', 'lightyellow'),

        /**
         * Represents the CSS color #00FF00
         *
         * @constant
         * @type {Color}
         */
        LIME : new Enumeration('#00FF00', 'lime'),

        /**
         * Represents the CSS color #32CD32
         *
         * @constant
         * @type {Color}
         */
        LIME_GREEN : new Enumeration('#32CD32', 'limegreen'),

        /**
         * Represents the CSS color #FAF0E6
         *
         * @constant
         * @type {Color}
         */
        LINEN : new Enumeration('#FAF0E6', 'linen'),

        /**
         * Represents the CSS color #FF00FF
         *
         * @constant
         * @type {Color}
         */
        MAGENTA : new Enumeration('#FF00FF', 'magenta'),

        /**
         * Represents the CSS color #800000
         *
         * @constant
         * @type {Color}
         */
        MAROON : new Enumeration('#800000', 'maroon'),

        /**
         * Represents the CSS color #66CDAA
         *
         * @constant
         * @type {Color}
         */
        MEDIUM__AQUAMARINE : new Enumeration('#66CDAA', 'mediumaquamarine'),

        /**
         * Represents the CSS color #0000CD
         *
         * @constant
         * @type {Color}
         */
        MEDIUM_BLUE : new Enumeration('#0000CD', 'mediumblue'),

        /**
         * Represents the CSS color #BA55D3
         *
         * @constant
         * @type {Color}
         */
        MEDIUM_ORCHID : new Enumeration('#BA55D3', 'mediumorchid'),

        /**
         * Represents the CSS color #9370DB
         *
         * @constant
         * @type {Color}
         */
        MEDIUM_PURPLE : new Enumeration('#9370DB', 'mediumpurple'),

        /**
         * Represents the CSS color #3CB371
         *
         * @constant
         * @type {Color}
         */
        MEDIUM_SEAGREEN : new Enumeration('#3CB371', 'mediumseagreen'),

        /**
         * Represents the CSS color #7B68EE
         *
         * @constant
         * @type {Color}
         */
        MEDIUM_SLATE_BLUE : new Enumeration('#7B68EE', 'mediumslateblue'),

        /**
         * Represents the CSS color #00FA9A
         *
         * @constant
         * @type {Color}
         */
        MEDIUM_SPRING_GREEN : new Enumeration('#00FA9A', 'mediumspringgreen'),

        /**
         * Represents the CSS color #48D1CC
         *
         * @constant
         * @type {Color}
         */
        MEDIUM_TURQUOISE : new Enumeration('#48D1CC', 'mediumturquoise'),

        /**
         * Represents the CSS color #C71585
         *
         * @constant
         * @type {Color}
         */
        MEDIUM_VIOLET_RED : new Enumeration('#C71585', 'mediumvioletred'),

        /**
         * Represents the CSS color #191970
         *
         * @constant
         * @type {Color}
         */
        MIDNIGHT_BLUE : new Enumeration('#191970', 'MIDNIGHTBLUE'),

        /**
         * Represents the CSS color #F5FFFA
         *
         * @constant
         * @type {Color}
         */
        MINT_CREAM : new Enumeration('#F5FFFA', 'mintcream'),

        /**
         * Represents the CSS color #FFE4E1
         *
         * @constant
         * @type {Color}
         */
        MISTY_ROSE : new Enumeration('#FFE4E1', 'mistyrose'),

        /**
         * Represents the CSS color #FFE4B5
         *
         * @constant
         * @type {Color}
         */
        MOCCASIN : new Enumeration('#FFE4B5', 'moccasin'),

        /**
         * Represents the CSS color #FFDEAD
         *
         * @constant
         * @type {Color}
         */
        NAVAJO_WHITE : new Enumeration('#FFDEAD', 'navajowhite'),

        /**
         * Represents the CSS color #000080
         *
         * @constant
         * @type {Color}
         */
        NAVY : new Enumeration('#000080','navy'),

        /**
         * Represents the CSS color #FDF5E6
         *
         * @constant
         * @type {Color}
         */
        OLD_LACE : new Enumeration('#FDF5E6', 'oldlace'),

        /**
         * Represents the CSS color #808000
         *
         * @constant
         * @type {Color}
         */
        OLIVE : new Enumeration('#808000', 'olive'),

        /**
         * Represents the CSS color #6B8E23
         *
         * @constant
         * @type {Color}
         */
        OLIVE_DRAB : new Enumeration('#6B8E23', 'olivedrab'),

        /**
         * Represents the CSS color #FFA500
         *
         * @constant
         * @type {Color}
         */
        ORANGE : new Enumeration('#FFA500', 'orange'),

        /**
         * Represents the CSS color #FF4500
         *
         * @constant
         * @type {Color}
         */
        ORANGE_RED : new Enumeration('#FF4500', 'orangered'),

        /**
         * Represents the CSS color #DA70D6
         *
         * @constant
         * @type {Color}
         */
        ORCHID : new Enumeration('#DA70D6', 'orchid'),

        /**
         * Represents the CSS color #EEE8AA
         *
         * @constant
         * @type {Color}
         */
        PALE__GOLDENROD : new Enumeration('#EEE8AA', 'palegoldenrod'),

        /**
         * Represents the CSS color #98FB98
         *
         * @constant
         * @type {Color}
         */
        PALE__GREEN : new Enumeration('#98FB98', 'palegreen'),

        /**
         * Represents the CSS color #AFEEEE
         *
         * @constant
         * @type {Color}
         */
        PALE_TURQUOISE : new Enumeration('#AFEEEE', 'paleturquoise'),

        /**
         * Represents the CSS color #DB7093
         *
         * @constant
         * @type {Color}
         */
        PALE_VIOLET_RED : new Enumeration('#DB7093', 'palevioletred'),

        /**
         * Represents the CSS color #FFEFD5
         *
         * @constant
         * @type {Color}
         */
        PAPAYA_WHIP : new Enumeration('#FFEFD5', 'papayawhip'),

        /**
         * Represents the CSS color #FFDAB9
         *
         * @constant
         * @type {Color}
         */
        PEACH_PUFF : new Enumeration('#FFDAB9', 'peachpuff'),

        /**
         * Represents the CSS color #CD853F
         *
         * @constant
         * @type {Color}
         */
        PERU : new Enumeration('#CD853F', 'peru'),

        /**
         * Represents the CSS color #FFC0CB
         *
         * @constant
         * @type {Color}
         */
        PINK : new Enumeration('#FFC0CB', 'pink'),

        /**
         * Represents the CSS color #DDA0DD
         *
         * @constant
         * @type {Color}
         */
        PLUM : new Enumeration('#DDA0DD', 'plum'),

        /**
         * Represents the CSS color #B0E0E6
         *
         * @constant
         * @type {Color}
         */
        POWDER_BLUE : new Enumeration('#B0E0E6', 'powderblue'),

        /**
         * Represents the CSS color #800080
         *
         * @constant
         * @type {Color}
         */
        PURPLE : new Enumeration('#800080', 'purple'),

        /**
         * Represents the CSS color #FF0000
         *
         * @constant
         * @type {Color}
         */
        RED : new Enumeration('#FF0000', 'red'),

        /**
         * Represents the CSS color ##BC8F8F
         *
         * @constant
         * @type {Color}
         */
        ROSY_BROWN : new Enumeration('##BC8F8F', 'rosybrown'),

        /**
         * Represents the CSS color #4169E1
         *
         * @constant
         * @type {Color}
         */
        ROYAL_BLUE : new Enumeration('#4169E1', 'royalblue'),

        /**
         * Represents the CSS color #8B4513
         *
         * @constant
         * @type {Color}
         */
        SADDLE_BROWN : new Enumeration('#8B4513', 'saddlebrown'),

        /**
         * Represents the CSS color #FA8072
         *
         * @constant
         * @type {Color}
         */
        SALMON : new Enumeration('#FA8072', 'salmon'),

        /**
         * Represents the CSS color #F4A460
         *
         * @constant
         * @type {Color}
         */
        SANDY_BROWN : new Enumeration('#F4A460', 'sandybrown'),

        /**
         * Represents the CSS color #2E8B57
         *
         * @constant
         * @type {Color}
         */
        SEAGREEN : new Enumeration('#2E8B57', 'seagreen'),

        /**
         * Represents the CSS color #FFF5EE
         *
         * @constant
         * @type {Color}
         */
        SEASHELL : new Enumeration('#FFF5EE', 'seashell'),

        /**
         * Represents the CSS color #A0522D
         *
         * @constant
         * @type {Color}
         */
        SIENNA : new Enumeration('#A0522D', 'sienna'),

        /**
         * Represents the CSS color #C0C0C0
         *
         * @constant
         * @type {Color}
         */
        SILVER : new Enumeration('#C0C0C0', 'silver'),

        /**
         * Represents the CSS color #87CEEB
         *
         * @constant
         * @type {Color}
         */
        SKY_BLUE : new Enumeration('#87CEEB', 'skyblue'),

        /**
         * Represents the CSS color #6A5ACD
         *
         * @constant
         * @type {Color}
         */
        SLATE_BLUE : new Enumeration('#6A5ACD', 'slateblue'),

        /**
         * Represents the CSS color #708090
         *
         * @constant
         * @type {Color}
         */
        SLATE_GRAY : new Enumeration('#708090', 'slategray'),

        /**
         * Represents the CSS color #708090
         *
         * @constant
         * @type {Color}
         */
        SLATE_GREY : new Enumeration('#708090', 'slategrey'),

        /**
         * Represents the CSS color #FFFAFA
         *
         * @constant
         * @type {Color}
         */
        SNOW : new Enumeration('#FFFAFA', 'snow'),

        /**
         * Represents the CSS color #00FF7F
         *
         * @constant
         * @type {Color}
         */
        SPRING_GREEN : new Enumeration('#00FF7F', 'springgreen'),

        /**
         * Represents the CSS color #98FB98
         *
         * @constant
         * @type {Color}
         */
        STEEL_BLUE : new Enumeration('#4682B4', 'steelblue'),

        /**
         * Represents the CSS color #D2B48C
         *
         * @constant
         * @type {Color}
         */
        TAN : new Enumeration('#D2B48C', 'tan'),

        /**
         * Represents the CSS color #008080
         *
         * @constant
         * @type {Color}
         */
        TEAL : new Enumeration('#008080', 'teal'),

        /**
         * Represents the CSS color #D8BFD8
         *
         * @constant
         * @type {Color}
         */
        THISTLE : new Enumeration('#D8BFD8', 'thistle'),

        /**
         * Represents the CSS color #FF6347
         *
         * @constant
         * @type {Color}
         */
        TOMATO : new Enumeration('#FF6347', 'tomato'),

        /**
         * Represents the CSS color #40E0D0
         *
         * @constant
         * @type {Color}
         */
        TURQUOISE : new Enumeration('#40E0D0', 'turquoise'),

        /**
         * Represents the CSS color #EE82EE
         *
         * @constant
         * @type {Color}
         */
        VIOLET : new Enumeration('#EE82EE', 'violet'),

        /**
         * Represents the CSS color #F5DEB3
         *
         * @constant
         * @type {Color}
         */
        WHEAT : new Enumeration('#F5DEB3', 'wheat'),

        /**
         * Represents the CSS color #FFFFFF
         *
         * @constant
         * @type {Color}
         */
        WHITE : new Enumeration('#FFFFFF', 'white'),

        /**
         * Represents the CSS color #F5F5F5
         *
         * @constant
         * @type {Color}
         */
        WHITE_SMOKE : new Enumeration('#F5F5F5', 'whitesmoke'),

        /**
         * Represents the CSS color #FFFF00
         *
         * @constant
         * @type {Color}
         */
        YELLOW : new Enumeration('#FFFF00', 'yellow'),

        /**
         * Represents the CSS color #9ACD32
         *
         * @constant
         * @type {Color}
         */
        YELLOW_GREEN : new Enumeration('#9ACD32', 'yellowgreen')
    };

    return NamedColors;
});
