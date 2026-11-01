# World timeline v1

This fork adds a separate world view and navigation without rewriting any of the
original China data bundles or the China controller. The original view remains at
`../`; the world view is `./?year=741`.

## Sources and versions

- China: DeanChensj/jiangshan-map, commit
  `c4afe439e3102addbedb0c9775129b53109cf2d8`, GPL-3.0. All eight original JS bundles
  listed in `data/manifest.json` are byte-identical; the world view reads them
  directly, including Taiwan province geometry, island rings and the `_JD` layer.
- Worldwide polities: Seshat Global History Databank, Cliopatria, commit
  `5f433377139a6eeaeacbdc894b70f8805b72c8b5`, CC BY 4.0.
  Original data: https://github.com/Seshat-Global-History-Databank/cliopatria
  License: https://creativecommons.org/licenses/by/4.0/
  Citation: Bennett et al. (2025), *Cliopatria: A geospatial database of world-wide
  political entities from 3400 BCE to 2024 CE*, Scientific Data,
  https://doi.org/10.1038/s41597-025-04516-9
- Land background: Natural Earth 1:110m land, v5.1.2, public domain,
  https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_land.geojson
- D3 7.9.0, ISC, vendored locally; see `vendor/D3-LICENSE`.

## China source priority

The world view uses the original controller's dynasty-start and phase-until
selection rules. Non-neighbor polities come directly from its chosen snapshot.
For 1949 onward the China surface concatenates all original non-`_JD` province
rings, without simplification, including Taiwan; the original `_JD` rings are
rendered separately. The original China view still exposes all its detailed
provinces, historical place genealogies and person routes.

Cliopatria polygons are clipped against the original modern-China footprint
before shipping. The renderer also masks those polygons against that footprint
and the selected historical China polities. Foreign labels are excluded from
the protected geometries. The mask and source geometry are derived at runtime
from the immutable upstream files; no substitute modern China dataset is used.
From circa -2070 through -404, an independent official-source evidence layer
shows activity-region representative points, archaeological sites and capitals.
Its five periods are Xia, Shang (early/late phases), Western Zhou, Spring and
Autumn, and an early Warring States bridge (-475 through -404). The bridge leaves
the original -403 start unchanged. Before circa -2070, China coverage remains
unavailable. Cliopatria does not fill either interval inside the protected area.

`../js/early_china_data.js` contains 21 reviewed official-institution references,
21 records, period chronology, source links and uncertainty notes. It is a new
factual compilation under CC BY 4.0; source texts and images retain their rights.
Coordinates are project-added regional representative points, not official survey
coordinates. Contextual period evidence does not establish occupation, capital
status or existence in every selected year. Approximate archaeological date spans
are displayed separately from dynasty dates. No early political boundary polygons
are inferred from archaeological cultures, cultural contacts or later snapshots.

The legacy China view uses a runtime addon (`../js/early_china.js`), which prepends
the five periods and extends the existing settlements/timeline UI. It preserves
original source objects, lazy-loads the original snapshots, and restores evidence
snapshots after lazy loading. Early years do not borrow later royal era labels.
The world view uses `early.mjs` and renders the same evidence as points on both
the globe and flat view. Every point exposes its precision and official links.

This is a source-composition rule for this edition. The original intervals,
occupational descriptions and historical names of the China view are retained.

## Transformation and limitations

The source ZIP contains 13,797 records. The builder excludes entities whose representative point or majority area lies
inside the protected China footprint, leaving those to the upstream China layers.
It repairs invalid overseas geometry, removes foreign data inside the original modern-China footprint,
simplifies overseas geometry at 0.035 degree tolerance with topology preservation,
rounds overseas coordinates to four decimals and produces 100-year shards.
This does not modify the original China geometry. `data/manifest.json` records
versions, hashes, record counts and transformation settings.

Each record is shown only within its inclusive `FromYear` and `ToYear`. Geometry
is not interpolated. Missing data is not a statement that an area was uninhabited
or independent. Political entities, dependencies and historical interpretations
can overlap. Modern coastlines are a visual reference, not historical shoreline
reconstructions. The world view ends in 2024, the source dataset's endpoint.

Labels retain source names and show Simplified Chinese reference names from a
curated common-name dictionary and a pinned Wikidata label snapshot. QIDs in the
source are not assumed correct: Wikidata references are used only when the source
name or Wikipedia title matches the entity's English label or aliases. Unmatched
names stay in the original language. The original name is always available in the
list/detail. See `data/translations.json` for source revisions and language.

The original colored bands, year bubble, playback controls and four speeds
(0.25×, 0.5×, 1×, 2×) are retained. Each source-name polity has an independent
track; all tracks share one proportional timescale, one vertical playhead and a
draggable top handle. The default folds small/out-of-view entities; a bilingual
fuzzy-search checkbox picker retains manual choices in local browser storage.
Out-of-view and inactive manual selections fold without clearing those choices.
A pin button beside each country name fixes that track ahead of automatic/manual
rows in insertion order. Pins survive viewport changes, year changes and browser
reloads in local storage. Inactive pinned tracks remain with a No record this year
label and an available unpin button; clicking the country name still focuses the
map when a contemporary record exists. Unchecking a pinned item in the picker
also removes its pin.
The disclosure button explicitly says Expand/Collapse country tracks. If the panel
was automatically collapsed on mobile, it automatically opens on a desktop
viewport; explicit user disclosure choices are respected. When automatic viewport
filtering finds no contemporaries, a visible notice and Outside viewport labels
retain a small set of contemporary tracks. Clicking a track name flies to that
polity. Explicit viewport-only and manual filters retain their selected scope.
Keyboard arrows move one year, Shift+arrows move ten, and Home/End move to range
ends. Mobile starts with comparison tracks collapsed.
The local Ma Shan Zheng subset is from Google Fonts under OFL-1.1 (see
`vendor/fonts/OFL.txt`). The world map defaults to an orthographic globe facing China. Drag to rotate;
country and continent selections animate a spherical shortest-path rotation,
zoom out for long travel, then zoom in at the destination. Dragging cancels the
flight. Reduced-motion settings use an immediate camera update. The flat Equal
Earth overview remains available; its central meridian now passes through China.
Both modes read the identical immutable China source geometry. While moving, a
canvas renderer draws those same coordinates and protection masks without SVG
path-string allocation; the settled view uses the original detailed SVG paths. Backside globe
labels and viewport tracks are filtered by visible projected positions.

Pinch the timeline on a trackpad (ctrl+wheel events, plus Safari GestureEvent) or
with two touchscreen contacts to zoom around the gesture midpoint. Horizontal
trackpad scrolling pans the visible interval. All tracks share that interval,
clamped to 10–5,425 years; zooming does not seek the selected year. An offscreen
playhead has a Locate action. Explicit zoom/fit controls offer the same operation.
The globe canvas and timeline toolbar adapt to the actual mobile viewport.
Module and stylesheet release queries prevent stale dependencies during upgrades.
The current and adjacent century shards are cached; hidden-page autoplay stops.

## Rebuild and checks

Download the exact source ZIP from the pinned Cliopatria commit above. Then:

```sh
python3 -m venv /tmp/world-build
/tmp/world-build/bin/pip install shapely==2.1.2 opencc-python-reimplemented==0.1.7
/tmp/world-build/bin/python scripts/build_world_data.py /path/to/cliopatria.geojson.zip
node scripts/build_world_timeline.cjs
node --test tests/world.test.mjs
node scripts/validate_atlas.js
```

The raw ZIP is intentionally not redistributed in this repository. Generated
shards retain the required source attribution and their original validity fields.
No household deployment address, credential or NAS private configuration belongs
in this public repository.
