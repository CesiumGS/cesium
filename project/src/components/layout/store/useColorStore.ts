import { defineStore } from "pinia";
import ColorUnit from "../utils/color";

export const useColorStore = defineStore("color", () => {
  function setThemeColor(colorMap) {
    const _namespace = "el";
    colorMap.forEach((colorItem) => {
      setPropertyColor(`--${_namespace}-color-${colorItem[0]}`, colorItem[1]);
      themeColorGradient(`--${_namespace}-color-${colorItem[0]}-light-#level#`,"lighten",colorItem[1]);
      setPropertyColor(`--${_namespace}-color-${colorItem[0]}-dark-2`,colorItem[1],"darken");
      // themeColorGradient(`--${_namespace}-color-${colorItem[0]}-dark-#level#`,"darken",colorItem[1]);
    });
  }

  /**
   * 将css3变量设置到document中方便全局调用
   */
  function setPropertyColor(varName, color, funName, level) {
    level = level ? level : 0;
    funName = funName ? funName : "lighten";
    document.documentElement.style.setProperty(
      varName,
      ColorUnit[funName](color, level / 10)
    );
  }

  /**
   * 生成主色的其余渐变色并修改对应CSS3变量值
   */
  function themeColorGradient(varName, funName, themeColor, themeLevel) {
    themeColor = themeColor ? themeColor : '#409eff';
    themeLevel = themeLevel ? themeLevel : [3, 5, 7, 8, 9];

    themeLevel.forEach(function (level) {
      setPropertyColor(
        varName.replace("#level#", level),
        themeColor,
        funName,
        level
      );
    });
  }

  return {
    setThemeColor,
  };
});

