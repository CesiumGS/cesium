# StrataKit feedback from Dyno

Dyno (CesiumJS 2.0's benchmark app) adopted StrataKit in r35 to battle-test
it. What got in the way, for the StrataKit team. Newest last; each item
says what we tried, what happened and what we did instead.

Versions: `@stratakit/mui` 1.2.0, `@stratakit/foundations` 1.0.4,
`@stratakit/structures` 0.6.2, `@stratakit/icons` 0.4.6, `@mui/material`
9.5.0, React 19.

1. **`@stratakit/bricks` looks current on npm.** 0.6.1 was published in
   October 2026 with no deprecation notice or README pointer, so we
   installed it first; only the docs' setup page (and the usage skill)
   say it is legacy. An `npm deprecate` message or a README banner would
   have saved the detour.
2. **Peer ranges move in lockstep with same-day releases.**
   `@stratakit/mui` 1.2.1 requires `@stratakit/foundations` ^1.0.5,
   published the same day; projects that wait before taking new versions
   have to pin the previous pair (1.2.0 with 1.0.4).
3. **No selectable chip.** StrataKit's `Chip` drops `color`, so there is
   no "filter chip" with a selected state (MUI's usual pattern for a few
   multi-select filters) and no colored status chip. We used a
   non-exclusive `ToggleButtonGroup` for filters and an inline `Badge`
   for status. A documented filter-chip pattern would help.
4. **Token discovery.** The full list of public tokens lives only in
   `@stratakit/foundations/dist/~styles.css.js`; the docs' token page
   isn't greppable from a project. Near-miss names
   (`--stratakit-color-border-neutral-faded`, `--stratakit-space-x4`
   from pre-1.0) fail silently. A `tokens.json` or a typed export, and
   a lint rule or stylelint plugin, would catch these.
5. **Icons are sized only by layered CSS.** Any unlayered host rule such
   as `svg { width: 100% }` (common in chart CSS) overrides `Icon`'s size
   and blows icons up. `width`/`height` attributes on the `<svg>` as a
   fallback would make icons robust in existing apps.
6. **Subtitles don't stand out.** `subtitle-*` Typography variants are
   regular weight and share sizes with `body-*`, and there are no
   font-weight tokens, so section headings need a hard-coded weight.
7. **Accordion headers can't hold actions.** The docs rule out
   interactive content in `AccordionSummary`, and there is no slot for
   secondary actions (help, menus) beside the summary; we positioned a
   sibling over the row. `markerPlacement="start"` also indents the
   details through an internal variable with no public way to turn it
   off.
8. **Focus from a menu into a dialog.** `autoFocus` on a `TextField` in a
   `Dialog` opened from a `MenuItem` loses to the menu's focus restore;
   it took `slotProps.transition.onEntered` to focus the field. A
   documented pattern would help.
9. **Compact search fields.** `TextField` always shows its label; a
   visually hidden label option for compact search fields (with the
   accessible name kept) is missing, so we used an `aria-label` and a
   placeholder.
10. **Status vocabulary.** `Badge` colors (`success`, `error`,
    `warning`) don't match the token tones (`positive`, `critical`,
    `attention`), and the docs don't say when to use `type="muted"`
    versus `"outlined"` for status.
11. **Details on non-interactive status.** The docs recommend tooltips
    only on interactive elements, but a status badge or a "1.3× faster"
    figure needs its detail (counts, raw ratio) somewhere reachable by
    keyboard. A pattern for this is missing.
12. **No page-level filter bar.** `unstable_Toolbar` targets icon-button
    toolbars; filter rows above content (selects, switches, search) are
    hand-rolled, and `FormControl` has no width option beyond
    `size="small"`.
13. **Icon set gaps.** `pin` has no filled variant (unlike `filter` and
    `filterFilled`), so a pinned state rests on the toggle's selected
    style alone.
14. **Text toggle buttons look broken by default.** A `ToggleButton` with
    a text label renders cramped and unpadded unless it is rendered as
    `render={<Button variant="outlined" />}`; that should be the default
    for text content.
15. **Primary is opt-in.** `Button` defaults to the neutral `secondary`
    color, so every primary action needs `color="primary"`; easy to miss
    coming from MUI.
16. **Links rendered as buttons.** `Button`/`CardActionArea` with
    `render={<a />}` or a router `Link` log a console error unless
    `nativeButton={false}` is also passed; the render prop could infer
    it. The docs also say navigation should be a `Link`, yet header and
    toolbar navigation ("Open the report") needs button weight; a
    documented button-styled link pattern is missing.
17. **No external-link icon.** `@stratakit/icons` has no "opens in a new
    tab" glyph; the `Link` external example falls back to "↗".
18. **Examples import undeclared packages.** The `Link` external example
    imports `visuallyHidden` from `@mui/utils`, not a declared
    dependency of apps (fails `n/no-extraneous-import`); StrataKit could
    export a visually hidden utility.
19. **Clickable card headings are deep.** A clickable card heading needs
    `CardActionArea` inside `CardHeader`'s title plus `slotProps.title`
    with `variant` and `render`: three nested props for one heading.
20. **Code blocks.** No documented pattern for a muted command or code
    block (copyable command lines are common in developer tools).
21. **Status labels are verbose.** A status word as an inline `Badge`
    needs `variant`, `size`, `type` and `badgeContent`; a status label
    shorthand would be simpler. Heading variants likewise always need
    `render={<h2 />}`.
22. **Tabs leave ARIA wiring to the app.** Ids, `aria-controls` and the
    tab panel are built by hand, as in the example.
23. **`Card` variant.** `variant` is typed `@deprecated` ("not
    supported"), while MUI habit says `variant="outlined"`; the outlined
    look is the only one and the default, which the docs could state.
24. **Silent runtime mismatches.** Leaving out `nativeButton={false}` on a
    `CardActionArea` rendered as a router link gives no type error, only
    a runtime warning; the types could require it.
25. **Row headers are wordy.** `TableCell component="th"` is deprecated in
    favor of `render={<th scope="row" />}`, which is wordier for the most
    common table accessibility need.
26. **Examples use `sx`.** `Switch.sizes` and `Slider.sizes` examples use
    `sx` while the usage skill says to avoid it.
27. **Selected list rows.** No documented pattern for a selectable list
    (a review queue); `ListItemButton selected` worked but renders as a
    shrink-wrapped `<button>` that needs `inline-size: 100%`.
28. **Neutral badge naming.** `Badge` disables `default` and `primary`;
    `secondary` is the only neutral and its name doesn't say so.
29. **Mixed toolbars.** The Explorer's toolbar mixes selects, toggle
    groups and switches; `unstable_Toolbar` is for icon actions only, so
    there is no StrataKit component for it (see 12).
30. **Sort labels widen headers.** `TableSortLabel`'s icon can't be
    customized (`IconComponent` and `hideSortIcon` are deprecated), and
    the default arrow-plus-letters glyph widens header cells; headers
    needed `white-space: nowrap`.
31. **Status badges wrap.** An inline `Badge` with an icon and a word
    wraps the icon above the text in narrow table cells; nowrap should
    be the default for status badges.
32. **No stat tile.** Dashboards need KPI tiles (label, value, change);
    none exists, and the `Card` docs discourage card-wide links.
33. **Dense tables and checkboxes.** `Checkbox` deprecates `size` with no
    small option, so selection checkboxes make `size="small"` table rows
    taller.
34. **Missing tokens.** No neutral muted background, no font-weight
    tokens, no focus-ring token; hover and focus colors for custom
    elements were guesses (`bg-glow-on-surface-neutral-hover`,
    `border-accent-strong`).
35. **Which components take the extended text colors.** `Typography`
    accepts `color="textTertiary"`, while the `Link` docs say those colors
    were removed; which components accept them is unclear.

36. **Patterns aren't published.** The docs intro mentions patterns for
    construction and infrastructure apps, but no pattern pages (or the
    PDFs some remember) are public; the sandbox's source was the best
    reference for a docked panel beside a canvas.
37. **No docked or resizable panel.** The sandbox's panel and splitter
    come from `react-resizable-panels`; a `Panel` structure (header with
    title and dock or collapse action, subheader, resize handle, folded
    rail) would save every 3D app from rebuilding it.
38. **Toolbars need bricks.** `unstable_Toolbar.Item` expects a bricks
    `IconButton` (with `active` for toggles), while the MUI theme's
    `IconButton` and `ToggleButton` are what MUI apps already use; mixing
    both on one page works but isn't documented.
39. **Look-alike icons.** `fit-to-view`, `object-zoom-to` and
    `window-expand` all read as "full screen" at 16 px; guidance on which
    icon means frame content, overview map and full screen would help.
40. **Popups in full screen.** Tooltips portal to the document body, so
    they vanish when an element (a canvas card) goes full screen; the
    portal container should follow `document.fullscreenElement`.
41. **Deprecations hide in JSDoc.** `AccordionItem`, `Banner` and `Table`
    in `@stratakit/structures` 0.6.2 are deprecated (for MUI's `Accordion`
    and `Alert`, and `@stratakit/bricks`'s `Table`, itself legacy), but only
    their JSDoc says so; the package index and docs' component list show
    them as current, so a plan written from the docs named all three (the
    frames explorer). A deprecation list on the docs' structures page, or
    `unstable_`-style renames, would catch it at planning time.
42. **Every host element rule beats StrataKit.** StrataKit's styles are in
    a cascade layer, so any unlayered rule in the host app restyles its
    components: Dyno's example panel styles plain `button`, `label`, `p`
    and `h3` for DOM-built panels, and they turned StrataKit's `Tabs`,
    `IconButton` and tree toggles into bordered boxes until scoped away
    (`:where(.examples-panel:not(.react))`). Item 5 is one case of this;
    the docs could say it outright, with the `:where()` scoping pattern.
43. **No spinner color for status.** `CircularProgress` rejects
    `color="inherit"`, so a spinner inside an info `Badge` (a "fetching"
    pill) takes the theme's primary color, invisible on the badge; it
    needed a `currentColor` rule. A `Badge` with a built-in busy state, or
    `inherit` allowed, would fit the common "loading" status.
44. **No categorical palette.** Apps that color data by category (here,
    frame families on a globe and in a tree) have no StrataKit palette
    with validated contrast on its surfaces in both schemes, so they
    hard-code one with `light-dark()` and check it themselves.
45. **Tree items have no trailing value.** `Tree.Item` has a label, a
    description and actions, but no slot for a right-aligned value (a
    size, an accuracy), which ends up in the description line.
46. **The accent is close to positive.** StrataKit's default accent (teal,
    oklch hue 170) sits about 30° from the positive green (hue 140), so a
    page of passing results, a primary button, a selected toggle and a
    selected table row all read as one green: selection and success blur.
    A selected-row treatment that isn't a tinted wash (a neutral surface
    and an accent bar) had to be built by hand; an accent further from
    the status hues, or a documented neutral selection style, would help.

## What worked well

- Setup was small: one `Root`, one types entry, one Vite option, and MUI
  components looked consistent with no further theming.
- `NavigationRail` gave a good app frame (collapsed icons with tooltips,
  expandable labels, footer) with little code.
- The usage skill and the docs' per-component "Do / Don't" sections
  answered most questions, and the type augmentations caught deprecated
  props early.
- Dark and light schemes worked everywhere without per-view work.
