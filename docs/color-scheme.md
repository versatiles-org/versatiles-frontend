# Map controls on dark map styles

A dark map style or satellite imagery needs dark controls on top of it: white buttons glare on a dark map. But a control that wasn't made for it turns unreadable when its colours are switched from outside, so each control decides for itself whether it follows the map.

This is the convention the VersaTiles libraries and frontends follow. We intend to propose it for MapLibre GL JS. Until MapLibre has it, `maplibre-versatiles-styler` provides the CSS for it.

## The convention

1. **Whoever picks the map style marks the map container with `data-color-scheme`**: `dark` for a dark style or satellite, `light` otherwise. The attribute changes nothing by itself.

   ```html
   <div class="maplibregl-map" data-color-scheme="dark">…</div>
   ```

2. **A control that follows the scheme opts in with the class `maplibregl-ctrl-scheme-aware`** on its container. It then gets the map's [`color-scheme`](https://developer.mozilla.org/docs/Web/CSS/color-scheme), which turns its form fields and scrollbars, and a background and text colour that follow it. Its buttons take the text colour, and so do icons drawn in `currentColor`.

   ```js
   container.className = 'maplibregl-ctrl maplibregl-ctrl-group maplibregl-ctrl-scheme-aware';
   ```

   A control that colours more than that uses [`light-dark()`](https://developer.mozilla.org/docs/Web/CSS/color_value/light-dark), which resolves by that `color-scheme`:

   ```css
   .my-control-panel {
   	background: light-dark(#fff, #161b22);
   	color: light-dark(#333, #e4e9ef);
   }
   ```

3. **The colours are variables**, which a page may set anywhere, e.g. on `:root`, to give all controls that follow the scheme its own colours. Each one is a `light-dark()` pair, and these are the defaults:

   | Variable                  | Default                                              |
   | ------------------------- | ---------------------------------------------------- |
   | `--maplibregl-ctrl-bg`    | `light-dark(#fff, #161b22)`                          |
   | `--maplibregl-ctrl-fg`    | `light-dark(#333, #e4e9ef)`                          |
   | `--maplibregl-ctrl-line`  | `light-dark(#ddd, #2a313b)`                          |
   | `--maplibregl-ctrl-hover` | `light-dark(rgb(0 0 0 / 5%), rgb(255 255 255 / 8%))` |

A control without the class stays exactly as it is drawn. So does every control on a map without the attribute, even on a dark page.

## Rules for the CSS

- **Gate every rule on the attribute**, e.g. `.maplibregl-map[data-color-scheme] …`. Without it, `light-dark()` follows the scheme of the page, and a dark page would turn the controls of a light map dark.
- **Wrap the rules in `@supports (color: light-dark(#000, #fff))`.** In an older browser the colours would be invalid and the controls transparent. There they stay light.
- **`prefers-color-scheme` is for the page around the map.** It is the visitor's system setting, and can't tell whether the map is dark.
- **`light-dark()` takes colours only.** A shadow that differs between the schemes needs a rule under `[data-color-scheme='dark']`.

Why not set `color-scheme` on the map container itself: it would reach every control inside, including those that never asked. Buttons would get light text, so icons drawn in `currentColor` would vanish on a white group, and unstyled form fields would turn dark inside white panels.

## When the class doesn't fit

The class gives its element a background, so it suits controls that are a box: a button group or a panel. Others follow the attribute with rules of their own:

- **A wrapper without a box of its own**, whose box is drawn by its children: the children get the colours.
- **A control without a box**, e.g. text on the map: it changes its own colours on a dark map.
- **A dialog or popup** gets the scheme only while it is inside the map container. One attached to `<body>` reads `data-color-scheme` from the container and sets `color-scheme` on itself.
- **A third-party control that doesn't opt in** can be opted in from outside: add the class to its container after `onAdd`, and restyle what the class doesn't reach, such as icons drawn as images in a fixed colour.

## In VersaTiles

| Where                                                                                                                             | What it does                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [maplibre-versatiles-styler](https://github.com/versatiles-org/maplibre-versatiles-styler#dark-mode)                              | Sets the attribute from the chosen style, unless `darkControls` is `false`. Provides the CSS for the class, and for MapLibre's own controls, the attribution and the scale.                                                           |
| [maplibre-svg-export](https://github.com/versatiles-org/versatiles-svg-renderer/tree/main/packages/maplibre-svg-export#dark-mode) | Its button opts in with the class, and its panel follows the scheme with `light-dark()`.                                                                                                                                              |
| `static/frontend/index.html`                                                                                                      | The editor link and the about box opt in with the class.                                                                                                                                                                              |
| `versatiles-geocoder`                                                                                                             | A wrapper: its input and results follow the attribute with their own rules.                                                                                                                                                           |
| `versatiles-brand`                                                                                                                | No box: on a dark map, its text is light with a dark halo.                                                                                                                                                                            |
| `versatiles-inspect`                                                                                                              | Sets up maplibre-gl-inspect from outside: its button opts in, its icons are masks in the text colour, its popup follows the scheme, and on a dark style the inspect map is black, in inspect's colours with their lightness mirrored. |
