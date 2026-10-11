# Campus basemap data

`campus-basemap.json` contains building footprints, green space, roads and paths
from OpenStreetMap, bounded to the University of Houston campus:
west −95.349, south 29.716, east −95.336, north 29.726.

Source: https://api.openstreetmap.org/api/0.6/map?bbox=-95.349,29.716,-95.336,29.726
Retrieved for this local map update on 2026-10-10.

© OpenStreetMap contributors. This derived geographical dataset is distributed
under the [Open Data Commons Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
See [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright).
The application code is separate from this dataset.

Only geometry, OSM way identifiers and road classification are retained. There
are no contributor account details, parking symbols, POI labels or road shields.
The dataset contains map context; it does not assert food availability.

To update the snapshot, obtain an OSM XML extract for the same bounding box from
an appropriate read-only source such as Overpass or a regional extract. Then run:

```sh
python scripts/build-campus-basemap.py path/to/campus.osm
```

The browser renders the committed extract locally. It makes no tile or OSM API
requests, and does not download or cache public raster tiles.
