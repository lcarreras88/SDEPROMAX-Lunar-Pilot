# Production publication — 2026-11-15

- URL: https://sdepromax.club/
- Hosting: Porkbun Secure Static Hosting.
- Method: Publishing → Upload a ZIP, using the authenticated Porkbun session in Orca's browser.
- Application source commit: `a578237ef093509294a345e28723a237b9ee802b`.
- Archive: `LUNAR-PILOT-PORKBUN.zip`, 1,731,355 bytes, seven public files with `index.html` at the root.
- Archive SHA-256: `fb77f76ec6d2dd354c9655b0dec52ffc5eb549ff512e8d370d4d51803adf0aa3`.

## Verification

After upload, HTTPS GET requests returned HTTP 200 and exact SHA-256 matches against the local release for:

- `index.html`
- `css/estilos.css`
- `js/app.js`
- `js/imagenes.js`
- `lib/three.min.js`
- `lib/OrbitControls.js`
- `lib/astronomy.browser.min.js`

`node scripts/check.mjs` passed syntax checks, local-resource checks, English default and Spanish-selector checks, numerical invariants for all 14 reference sites, three terrain-grid size checks and ten embedded-image checks.

This publication did not independently revalidate the scientific models. A complete interactive browser pass covering both languages, all controls, WebGL and mobile layouts was not completed in this session.

## Backups and working directories

The teammate's original `C:\SpaceChallenge\web` directory and `web.rar` were preserved. The new checkout is `C:\SpaceChallenge\SDEPROMAX-Lunar-Pilot`.

Local backups are in `C:\SpaceChallenge\backups\20261115-182311`:

- `original-local-source.zip`: earlier project's local source, including working changes; generated outputs and dependencies excluded.
- `original-repository.bundle`: earlier project's Git history.
- `received-web.zip` and `received-web.rar`: original teammate delivery.
- `production-before-replacement.zip`: prior live site, 16 public files including referenced dynamic assets, data and textures.
- `production-backup-report.json`: file hashes and retrieval results for the prior live site.

For rollback, upload `production-before-replacement.zip` through the same Porkbun publishing control and verify the prior interface. The ZIP restores the prior entry point and its assets; files from later deployments may remain on the host.
