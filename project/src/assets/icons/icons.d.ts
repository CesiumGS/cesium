declare module '@icons/icons' {
  export interface Glyphs {
    icon_id: string;
    name: string;
    font_class: string;
    unicode: string;
    unicode_decimal: number;
  }
  export interface IconsInfo {
    id: string;
    name: string;
    font_family: string;
    css_prefix_text: string;
    description: string;
    glyphs: Glyphs[];
  }
  export interface Icons {
    alarm: IconsInfo;
    disaster: IconsInfo;
    el: IconsInfo;
    observe: IconsInfo;
    serve: IconsInfo;
    shadow: IconsInfo;
    warn: IconsInfo;
  }

  const icons: Icons;
  export default icons;
}
