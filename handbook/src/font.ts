import inter from "../generated/InterVariable.woff2";

/**
 * The page's typeface, inside the page. StrataKit's Root requests Inter from
 * its usual host unless the family is already there, so this must run first.
 */
document.fonts.add(
  new FontFace("InterVariable", `url(${inter}) format("woff2")`, {
    display: "swap",
    weight: "100 900",
    style: "normal",
  }),
);
