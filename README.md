# SDE PRO MAX — LUNAR PILOT

Interactive lunar landing site explorer for NASA Space Apps. This repository contains the integrated static website delivered by the team, with English as the default language and a Spanish language switch.

Planned production address: https://sdepromax.club/ (Porkbun Secure Static Hosting).

## Run locally

No frontend build or npm installation is required. Serve this directory over HTTP:

```sh
python -m http.server 8080
```

Open http://localhost:8080/. The JavaScript libraries, images, terrain grids and packaged astronomy data are included locally. Google Fonts is the only external presentation dependency; system font fallbacks are defined in the stylesheet.

## Contents

- `index.html`: bilingual educational and professional interface.
- `css/estilos.css`: presentation and responsive layouts.
- `js/app.js`: astronomy calculations, comparisons, language controls and interactive 3D scenes.
- `js/imagenes.js`: embedded image resources and terrain tiles.
- `lib/`: bundled Three.js, OrbitControls and Astronomy Engine.

The application includes lunar surface and terrain views, arrival comparisons, Sun/Earth visibility, illustrative battery behavior and a local sky explorer for Santiago del Estero. It supports a selectable analysis period; the supplied default is 30 days.

## Data and model scope

The delivered application contains packaged JPL Horizons samples, embedded LOLA-derived horizon masks and terrain tiles, and lunar imagery. Astronomy Engine supplies calculations and interpolation support; outside packaged Horizons coverage the application labels the fallback model. The source and interface describe assumptions and limitations. These are educational models, not certified landing or communications predictions. Runtime checks do not independently validate scientific accuracy or source provenance.

An optional local Python API is referenced by `app.js`, but its server was not included in the team's `web` delivery. The public static site does not require it: on public hosting it uses bundled data and client-side calculations.

## Checks

Node.js 24 or newer:

```sh
node scripts/check.mjs
```

Checks cover JavaScript syntax, local asset paths, default language and language controls, numerical invariants for the 14 supplied reference sites, and embedded terrain/image integrity. A separate browser check is required for visual layout, language switching and WebGL interaction.

## Publish to Porkbun

Create a ZIP containing `index.html`, `css/`, `js/` and `lib/` at its root. Upload through the domain's Website → Publishing → Upload a ZIP panel. Do not add an extra enclosing `web/` folder. A GitHub push does not automatically publish to Porkbun.

Keep a backup before replacing the deployed site. After uploading, check HTTPS, English initial load, Español/English switching, scenario changes, playback and both 3D views.

## Credits

Project: SDE PRO MAX team. This repository preserves the integrated website received from the teammate; it is separate from the earlier React prototype at `lcarreras88/lunar-landing-site-navigator`.

Scientific and visual source links are included in the site's footer. Retain bundled library notices and source credits. See `AI_DISCLOSURE.md` for the supplied AI-use disclosure and publication preparation.
