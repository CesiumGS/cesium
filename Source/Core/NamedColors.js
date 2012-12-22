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
         * @type {Enumeration}
         */
        ALICE_BLUE : new Enumeration('#F0F8FF', 'aliceblue'),

        /**
         * Represents the CSS color #FAEBD7
         *
         * @constant
         * @type {Enumeration}
         */
        ANTIQUE_WHITE : new Enumeration('#FAEBD7', 'antiquewhite'),

        /**
         * Represents the CSS color #00FFFF
         *
         * @constant
         * @type {Enumeration}
         */
        AQUA : new Enumeration('#00FFFF', 'aqua'),

        /**
         * Represents the CSS color #7FFFD4
         *
         * @constant
         * @type {Enumeration}
         */
        AQUAMARINE : new Enumeration('#7FFFD4', 'aquamarine'),

        /**
         * Represents the CSS color #F0FFFF
         *
         * @constant
         * @type {Enumeration}
         */
        AZURE : new Enumeration('#F0FFFF', 'azure'),

        /**
         * Represents the CSS color #F5F5DC
         *
         * @constant
         * @type {Enumeration}
         */
        BEIGE: new Enumeration('#F5F5DC', 'beige'),

        /**
         * Represents the CSS color #FFE4C4
         *
         * @constant
         * @type {Enumeration}
         */
        BISQUE : new Enumeration('#FFE4C4', 'bisque'),

        /**
         * Represents the CSS color #000000
         *
         * @constant
         * @type {Enumeration}
         */
        BLACK : new Enumeration('#000000', 'black'),

        /**
         * Represents the CSS color #FFEBCD
         *
         * @constant
         * @type {Enumeration}
         */
        BLANCHED_ALMOND : new Enumeration('#FFEBCD', 'blanchedalmond'),

        /**
         * Represents the CSS color #0000FF
         *
         * @constant
         * @type {Enumeration}
         */
        BLUE : new Enumeration('#0000FF', 'blue'),

        /**
         * Represents the CSS color #8A2BE2
         *
         * @constant
         * @type {Enumeration}
         */
        BLUE_VIOLET : new Enumeration('#8A2BE2', 'blueviolet'),

        /**
         * Represents the CSS color #A52A2A
         *
         * @constant
         * @type {Enumeration}
         */
        BROWN : new Enumeration('#A52A2A', 'brown'),

        /**
         * Represents the CSS color #DEB887
         *
         * @constant
         * @type {Enumeration}
         */
        BURLY_WOOD : new Enumeration('#DEB887', 'burlywood'),

        /**
         * Represents the CSS color #5F9EA0
         *
         * @constant
         * @type {Enumeration}
         */
        CADET_BLUE : new Enumeration('#5F9EA0', 'cadetblue'),

        /**
         * Represents the CSS color #7FFF00
         *
         * @constant
         * @type {Enumeration}
         */
        CHARTREUSE : new Enumeration('#7FFF00', 'chartreuse'),

        /**
         * Represents the CSS color #D2691E
         *
         * @constant
         * @type {Enumeration}
         */
        CHOCOLATE : new Enumeration('#D2691E', 'chocolate'),

        /**
         * Represents the CSS color #FF7F50
         *
         * @constant
         * @type {Enumeration}
         */
        CORAL : new Enumeration('#FF7F50', 'coral'),

        /**
         * Represents the CSS color #6495ED
         *
         * @constant
         * @type {Enumeration}
         */
        CORNFLOWER_BLUE : new Enumeration('#6495ED', 'cornflowerblue'),

        /**
         * Represents the CSS color #FFF8DC
         *
         * @constant
         * @type {Enumeration}
         */
        CORNSILK : new Enumeration('#FFF8DC', 'cornsilk'),

        /**
         * Represents the CSS color #DC143C
         *
         * @constant
         * @type {Enumeration}
         */
        CRIMSON : new Enumeration('#DC143C', 'crimson'),

        /**
         * Represents the CSS color #00FFFF
         *
         * @constant
         * @type {Enumeration}
         */
        CYAN : new Enumeration('#00FFFF', 'cyan'),

        /**
         * Represents the CSS color #00008B
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_BLUE : new Enumeration('#00008B', 'darkblue'),

        /**
         * Represents the CSS color #008B8B
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_CYAN : new Enumeration('#008B8B', 'darkcyan'),

        /**
         * Represents the CSS color #B8860B
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_GOLDENROD : new Enumeration('#B8860B', 'darkgoldenrod'),

        /**
         * Represents the CSS color #A9A9A9
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_GRAY : new Enumeration('#A9A9A9', 'darkgray'),

        /**
         * Represents the CSS color #006400
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_GREEN : new Enumeration('#006400', 'darkgreen'),

        /**
         * Represents the CSS color #A9A9A9
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_GREY : new Enumeration('#A9A9A9', 'darkgray'),

        /**
         * Represents the CSS color #BDB76B
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_KHAKI : new Enumeration('#BDB76B', 'darkkhaki'),

        /**
         * Represents the CSS color #8B008B
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_MAGENTA : new Enumeration('#8B008B', 'darkmagenta'),

        /**
         * Represents the CSS color #556B2F
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_OLIVE_GREEN : new Enumeration('#556B2F', 'darkolivegreen'),

        /**
         * Represents the CSS color #FF8C00
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_ORANGE : new Enumeration('#FF8C00', 'darkorange'),

        /**
         * Represents the CSS color #9932CC
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_ORCHID : new Enumeration('#9932CC', 'darkorchid'),

        /**
         * Represents the CSS color #8B0000
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_RED : new Enumeration('#8B0000', 'darkred'),

        /**
         * Represents the CSS color #E9967A
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_SALMON : new Enumeration('#E9967A', 'darksalmon'),

        /**
         * Represents the CSS color #8FBC8F
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_SEAGREEN : new Enumeration('#8FBC8F', 'darkseagreen'),

        /**
         * Represents the CSS color #483D8B
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_SLATE_BLUE : new Enumeration('#483D8B', 'darkslateblue'),

        /**
         * Represents the CSS color #2F4F4F
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_SLATE_GRAY : new Enumeration('#2F4F4F', 'darkslategray'),

        /**
         * Represents the CSS color #2F4F4F
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_SLATE_GREY : new Enumeration('#2F4F4F', 'darkslategrey'),

        /**
         * Represents the CSS color #00CED1
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_TURQUOISE : new Enumeration('#00CED1', 'darktruquoise'),

        /**
         * Represents the CSS color #9400D3
         *
         * @constant
         * @type {Enumeration}
         */
        DARK_VIOLET : new Enumeration('#9400D3', 'darkviolet'),

        /**
         * Represents the CSS color #FF1493
         *
         * @constant
         * @type {Enumeration}
         */
        DEEP_PINK : new Enumeration('#FF1493', 'deeppink'),

        /**
         * Represents the CSS color #00BFFF
         *
         * @constant
         * @type {Enumeration}
         */
        DEEP_SKY_BLUE : new Enumeration('#00BFFF', 'deepskyblue'),

        /**
         * Represents the CSS color #696969
         *
         * @constant
         * @type {Enumeration}
         */
        DIM_GRAY : new Enumeration('#696969', 'dimgray'),

        /**
         * Represents the CSS color #696969
         *
         * @constant
         * @type {Enumeration}
         */
        DIM_GREY : new Enumeration('#696969', 'dimgrey'),

        /**
         * Represents the CSS color #1E90FF
         *
         * @constant
         * @type {Enumeration}
         */
        DODGER_BLUE : new Enumeration('#1E90FF', 'dodgerblue'),

        /**
         * Represents the CSS color #B22222
         *
         * @constant
         * @type {Enumeration}
         */
        FIREBRICK : new Enumeration('#B22222', 'firebrick'),

        /**
         * Represents the CSS color #FFFAF0
         *
         * @constant
         * @type {Enumeration}
         */
        FLORAL_WHITE : new Enumeration('#FFFAF0', 'floralwhite'),

        /**
         * Represents the CSS color #228B22
         *
         * @constant
         * @type {Enumeration}
         */
        FOREST_GREEN : new Enumeration('#228B22', 'forestgreen'),

        /**
         * Represents the CSS color #FF00FF
         *
         * @constant
         * @type {Enumeration}
         */
        FUSCHIA : new Enumeration('#FF00FF', 'fuschia'),

        /**
         * Represents the CSS color #DCDCDC
         *
         * @constant
         * @type {Enumeration}
         */
        GAINSBORO : new Enumeration('#DCDCDC', 'gainsboro'),

        /**
         * Represents the CSS color #F8F8FF
         *
         * @constant
         * @type {Enumeration}
         */
        GHOST_WHITE : new Enumeration('#F8F8FF', 'ghostwhite'),

        /**
         * Represents the CSS color #FFD700
         *
         * @constant
         * @type {Enumeration}
         */
        GOLD : new Enumeration('#FFD700', 'gold'),

        /**
         * Represents the CSS color #DAA520
         *
         * @constant
         * @type {Enumeration}
         */
        GOLDENROD : new Enumeration('#DAA520', 'goldenrod'),

        /**
         * Represents the CSS color #808080
         *
         * @constant
         * @type {Enumeration}
         */
        GRAY : new Enumeration('#808080', 'gray'),

        /**
         * Represents the CSS color #008000
         *
         * @constant
         * @type {Enumeration}
         */
        GREEN : new Enumeration('#008000', 'green'),

        /**
         * Represents the CSS color #ADFF2F
         *
         * @constant
         * @type {Enumeration}
         */
        GREEN_YELLOW : new Enumeration('#ADFF2F', 'greenyellow'),

        /**
         * Represents the CSS color #808080
         *
         * @constant
         * @type {Enumeration}
         */
        GREY : new Enumeration('#808080', 'grey'),

        /**
         * Represents the CSS color #F0FFF0
         *
         * @constant
         * @type {Enumeration}
         */
        HONEYDEW : new Enumeration('#F0FFF0', 'honeydew'),

        /**
         * Represents the CSS color #FF69B4
         *
         * @constant
         * @type {Enumeration}
         */
        HOT_PINK : new Enumeration('#FF69B4', 'hotpink'),

        /**
         * Represents the CSS color #CD5C5C
         *
         * @constant
         * @type {Enumeration}
         */
        INDIAN_RED : new Enumeration('#CD5C5C', 'indianred'),

        /**
         * Represents the CSS color #4B0082
         *
         * @constant
         * @type {Enumeration}
         */
        INDIGO : new Enumeration('#4B0082', 'indigo'),

        /**
         * Represents the CSS color #FFFFF0
         *
         * @constant
         * @type {Enumeration}
         */
        IVORY : new Enumeration('#FFFFF0', 'ivory'),

        /**
         * Represents the CSS color #F0E68C
         *
         * @constant
         * @type {Enumeration}
         */
        KHAKI : new Enumeration('#F0E68C', 'khaki'),

        /**
         * Represents the CSS color #E6E6FA
         *
         * @constant
         * @type {Enumeration}
         */
        LAVENDER : new Enumeration('#E6E6FA', 'lavendar'),

        /**
         * Represents the CSS color #FF00FF
         *
         * @constant
         * @type {Enumeration}
         */
        LAVENDAR_BLUSH : new Enumeration('#FFF0F5', 'lavendarblush'),

        /**
         * Represents the CSS color #FF00FF
         *
         * @constant
         * @type {Enumeration}
         */
        LAWN_GREEN : new Enumeration('#7CFC00', 'lawngreen'),

        /**
         * Represents the CSS color #FFFACD
         *
         * @constant
         * @type {Enumeration}
         */
        LEMON_CHIFFON : new Enumeration('#FFFACD', 'lemonchiffon'),

        /**
         * Represents the CSS color #ADD8E6
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_BLUE : new Enumeration('#ADD8E6', 'lightblue'),

        /**
         * Represents the CSS color #F08080
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_CORAL : new Enumeration('#F08080', 'lightcoral'),

        /**
         * Represents the CSS color #E0FFFF
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_CYAN : new Enumeration('#E0FFFF', 'lightcyan'),

        /**
         * Represents the CSS color #FAFAD2
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_GOLDENROD_YELLOW : new Enumeration('#FAFAD2', 'lightgoldenrodyellow'),

        /**
         * Represents the CSS color #D3D3D3
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_GRAY : new Enumeration('#D3D3D3', 'lightgray'),

        /**
         * Represents the CSS color #90EE90
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_GREEN : new Enumeration('#90EE90', 'lightgreen'),

        /**
         * Represents the CSS color #D3D3D3
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_GREY : new Enumeration('#D3D3D3', 'lightgrey'),

        /**
         * Represents the CSS color #FFB6C1
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_PINK : new Enumeration('#FFB6C1', 'lightpink'),

        /**
         * Represents the CSS color #20B2AA
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_SEAGREEN : new Enumeration('#20B2AA', 'lightseagreen'),

        /**
         * Represents the CSS color #87CEFA
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_SKY_BLUE : new Enumeration('#87CEFA', 'lightskyblue'),

        /**
         * Represents the CSS color #778899
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_SLATE_GRAY : new Enumeration('#778899', 'lightslategray'),

        /**
         * Represents the CSS color #778899
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_SLATE_GREY : new Enumeration('#778899', 'lightslategrey'),

        /**
         * Represents the CSS color #B0C4DE
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_STEE_LBLUE : new Enumeration('#B0C4DE', 'lightsteelblue'),

        /**
         * Represents the CSS color #FFFFE0
         *
         * @constant
         * @type {Enumeration}
         */
        LIGHT_YELLOW : new Enumeration('#FFFFE0', 'lightyellow'),

        /**
         * Represents the CSS color #00FF00
         *
         * @constant
         * @type {Enumeration}
         */
        LIME : new Enumeration('#00FF00', 'lime'),

        /**
         * Represents the CSS color #32CD32
         *
         * @constant
         * @type {Enumeration}
         */
        LIME_GREEN : new Enumeration('#32CD32', 'limegreen'),

        /**
         * Represents the CSS color #FAF0E6
         *
         * @constant
         * @type {Enumeration}
         */
        LINEN : new Enumeration('#FAF0E6', 'linen'),

        /**
         * Represents the CSS color #FF00FF
         *
         * @constant
         * @type {Enumeration}
         */
        MAGENTA : new Enumeration('#FF00FF', 'magenta'),

        /**
         * Represents the CSS color #800000
         *
         * @constant
         * @type {Enumeration}
         */
        MAROON : new Enumeration('#800000', 'maroon'),

        /**
         * Represents the CSS color #66CDAA
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM__AQUAMARINE : new Enumeration('#66CDAA', 'mediumaquamarine'),

        /**
         * Represents the CSS color #0000CD
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM_BLUE : new Enumeration('#0000CD', 'mediumblue'),

        /**
         * Represents the CSS color #BA55D3
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM_ORCHID : new Enumeration('#BA55D3', 'mediumorchid'),

        /**
         * Represents the CSS color #9370DB
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM_PURPLE : new Enumeration('#9370DB', 'mediumpurple'),

        /**
         * Represents the CSS color #3CB371
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM_SEAGREEN : new Enumeration('#3CB371', 'mediumseagreen'),

        /**
         * Represents the CSS color #7B68EE
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM_SLATE_BLUE : new Enumeration('#7B68EE', 'mediumslateblue'),

        /**
         * Represents the CSS color #00FA9A
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM_SPRING_GREEN : new Enumeration('#00FA9A', 'mediumspringgreen'),

        /**
         * Represents the CSS color #48D1CC
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM_TURQUOISE : new Enumeration('#48D1CC', 'mediumturquoise'),

        /**
         * Represents the CSS color #C71585
         *
         * @constant
         * @type {Enumeration}
         */
        MEDIUM_VIOLET_RED : new Enumeration('#C71585', 'mediumvioletred'),

        /**
         * Represents the CSS color #191970
         *
         * @constant
         * @type {Enumeration}
         */
        MIDNIGHT_BLUE : new Enumeration('#191970', 'MIDNIGHTBLUE'),

        /**
         * Represents the CSS color #F5FFFA
         *
         * @constant
         * @type {Enumeration}
         */
        MINT_CREAM : new Enumeration('#F5FFFA', 'mintcream'),

        /**
         * Represents the CSS color #FFE4E1
         *
         * @constant
         * @type {Enumeration}
         */
        MISTY_ROSE : new Enumeration('#FFE4E1', 'mistyrose'),

        /**
         * Represents the CSS color #FFE4B5
         *
         * @constant
         * @type {Enumeration}
         */
        MOCCASIN : new Enumeration('#FFE4B5', 'moccasin'),

        /**
         * Represents the CSS color #FFDEAD
         *
         * @constant
         * @type {Enumeration}
         */
        NAVAJO_WHITE : new Enumeration('#FFDEAD', 'navajowhite'),

        /**
         * Represents the CSS color #000080
         *
         * @constant
         * @type {Enumeration}
         */
        NAVY : new Enumeration('#000080','navy'),

        /**
         * Represents the CSS color #FDF5E6
         *
         * @constant
         * @type {Enumeration}
         */
        OLD_LACE : new Enumeration('#FDF5E6', 'oldlace'),

        /**
         * Represents the CSS color #808000
         *
         * @constant
         * @type {Enumeration}
         */
        OLIVE : new Enumeration('#808000', 'olive'),

        /**
         * Represents the CSS color #6B8E23
         *
         * @constant
         * @type {Enumeration}
         */
        OLIVE_DRAB : new Enumeration('#6B8E23', 'olivedrab'),

        /**
         * Represents the CSS color #FFA500
         *
         * @constant
         * @type {Enumeration}
         */
        ORANGE : new Enumeration('#FFA500', 'orange'),

        /**
         * Represents the CSS color #FF4500
         *
         * @constant
         * @type {Enumeration}
         */
        ORANGE_RED : new Enumeration('#FF4500', 'orangered'),

        /**
         * Represents the CSS color #DA70D6
         *
         * @constant
         * @type {Enumeration}
         */
        ORCHID : new Enumeration('#DA70D6', 'orchid'),

        /**
         * Represents the CSS color #EEE8AA
         *
         * @constant
         * @type {Enumeration}
         */
        PALE__GOLDENROD : new Enumeration('#EEE8AA', 'palegoldenrod'),

        /**
         * Represents the CSS color #98FB98
         *
         * @constant
         * @type {Enumeration}
         */
        PALE__GREEN : new Enumeration('#98FB98', 'palegreen'),

        /**
         * Represents the CSS color #AFEEEE
         *
         * @constant
         * @type {Enumeration}
         */
        PALE_TURQUOISE : new Enumeration('#AFEEEE', 'paleturquoise'),

        /**
         * Represents the CSS color #DB7093
         *
         * @constant
         * @type {Enumeration}
         */
        PALE_VIOLET_RED : new Enumeration('#DB7093', 'palevioletred'),

        /**
         * Represents the CSS color #FFEFD5
         *
         * @constant
         * @type {Enumeration}
         */
        PAPAYA_WHIP : new Enumeration('#FFEFD5', 'papayawhip'),

        /**
         * Represents the CSS color #FFDAB9
         *
         * @constant
         * @type {Enumeration}
         */
        PEACH_PUFF : new Enumeration('#FFDAB9', 'peachpuff'),

        /**
         * Represents the CSS color #CD853F
         *
         * @constant
         * @type {Enumeration}
         */
        PERU : new Enumeration('#CD853F', 'peru'),

        /**
         * Represents the CSS color #FFC0CB
         *
         * @constant
         * @type {Enumeration}
         */
        PINK : new Enumeration('#FFC0CB', 'pink'),

        /**
         * Represents the CSS color #DDA0DD
         *
         * @constant
         * @type {Enumeration}
         */
        PLUM : new Enumeration('#DDA0DD', 'plum'),

        /**
         * Represents the CSS color #B0E0E6
         *
         * @constant
         * @type {Enumeration}
         */
        POWDER_BLUE : new Enumeration('#B0E0E6', 'powderblue'),

        /**
         * Represents the CSS color #800080
         *
         * @constant
         * @type {Enumeration}
         */
        PURPLE : new Enumeration('#800080', 'purple'),

        /**
         * Represents the CSS color #FF0000
         *
         * @constant
         * @type {Enumeration}
         */
        RED : new Enumeration('#FF0000', 'red'),

        /**
         * Represents the CSS color ##BC8F8F
         *
         * @constant
         * @type {Enumeration}
         */
        ROSY_BROWN : new Enumeration('##BC8F8F', 'rosybrown'),

        /**
         * Represents the CSS color #4169E1
         *
         * @constant
         * @type {Enumeration}
         */
        ROYAL_BLUE : new Enumeration('#4169E1', 'royalblue'),

        /**
         * Represents the CSS color #8B4513
         *
         * @constant
         * @type {Enumeration}
         */
        SADDLE_BROWN : new Enumeration('#8B4513', 'saddlebrown'),

        /**
         * Represents the CSS color #FA8072
         *
         * @constant
         * @type {Enumeration}
         */
        SALMON : new Enumeration('#FA8072', 'salmon'),

        /**
         * Represents the CSS color #F4A460
         *
         * @constant
         * @type {Enumeration}
         */
        SANDY_BROWN : new Enumeration('#F4A460', 'sandybrown'),

        /**
         * Represents the CSS color #2E8B57
         *
         * @constant
         * @type {Enumeration}
         */
        SEAGREEN : new Enumeration('#2E8B57', 'seagreen'),

        /**
         * Represents the CSS color #FFF5EE
         *
         * @constant
         * @type {Enumeration}
         */
        SEASHELL : new Enumeration('#FFF5EE', 'seashell'),

        /**
         * Represents the CSS color #A0522D
         *
         * @constant
         * @type {Enumeration}
         */
        SIENNA : new Enumeration('#A0522D', 'sienna'),

        /**
         * Represents the CSS color #C0C0C0
         *
         * @constant
         * @type {Enumeration}
         */
        SILVER : new Enumeration('#C0C0C0', 'silver'),

        /**
         * Represents the CSS color #87CEEB
         *
         * @constant
         * @type {Enumeration}
         */
        SKY_BLUE : new Enumeration('#87CEEB', 'skyblue'),

        /**
         * Represents the CSS color #6A5ACD
         *
         * @constant
         * @type {Enumeration}
         */
        SLATE_BLUE : new Enumeration('#6A5ACD', 'slateblue'),

        /**
         * Represents the CSS color #708090
         *
         * @constant
         * @type {Enumeration}
         */
        SLATE_GRAY : new Enumeration('#708090', 'slategray'),

        /**
         * Represents the CSS color #708090
         *
         * @constant
         * @type {Enumeration}
         */
        SLATE_GREY : new Enumeration('#708090', 'slategrey'),

        /**
         * Represents the CSS color #FFFAFA
         *
         * @constant
         * @type {Enumeration}
         */
        SNOW : new Enumeration('#FFFAFA', 'snow'),

        /**
         * Represents the CSS color #00FF7F
         *
         * @constant
         * @type {Enumeration}
         */
        SPRING_GREEN : new Enumeration('#00FF7F', 'springgreen'),

        /**
         * Represents the CSS color #98FB98
         *
         * @constant
         * @type {Enumeration}
         */
        STEEL_BLUE : new Enumeration('#4682B4', 'steelblue'),

        /**
         * Represents the CSS color #D2B48C
         *
         * @constant
         * @type {Enumeration}
         */
        TAN : new Enumeration('#D2B48C', 'tan'),

        /**
         * Represents the CSS color #008080
         *
         * @constant
         * @type {Enumeration}
         */
        TEAL : new Enumeration('#008080', 'teal'),

        /**
         * Represents the CSS color #D8BFD8
         *
         * @constant
         * @type {Enumeration}
         */
        THISTLE : new Enumeration('#D8BFD8', 'thistle'),

        /**
         * Represents the CSS color #FF6347
         *
         * @constant
         * @type {Enumeration}
         */
        TOMATO : new Enumeration('#FF6347', 'tomato'),

        /**
         * Represents the CSS color #40E0D0
         *
         * @constant
         * @type {Enumeration}
         */
        TURQUOISE : new Enumeration('#40E0D0', 'turquoise'),

        /**
         * Represents the CSS color #EE82EE
         *
         * @constant
         * @type {Enumeration}
         */
        VIOLET : new Enumeration('#EE82EE', 'violet'),

        /**
         * Represents the CSS color #F5DEB3
         *
         * @constant
         * @type {Enumeration}
         */
        WHEAT : new Enumeration('#F5DEB3', 'wheat'),

        /**
         * Represents the CSS color #FFFFFF
         *
         * @constant
         * @type {Enumeration}
         */
        WHITE : new Enumeration('#FFFFFF', 'white'),

        /**
         * Represents the CSS color #F5F5F5
         *
         * @constant
         * @type {Enumeration}
         */
        WHITE_SMOKE : new Enumeration('#F5F5F5', 'whitesmoke'),

        /**
         * Represents the CSS color #FFFF00
         *
         * @constant
         * @type {Enumeration}
         */
        YELLOW : new Enumeration('#FFFF00', 'yellow'),

        /**
         * Represents the CSS color #9ACD32
         *
         * @constant
         * @type {Enumeration}
         */
        YELLOW_GREEN : new Enumeration('#9ACD32', 'yellowgreen')
    };

    return NamedColors;
});
