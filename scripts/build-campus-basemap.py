"""Build the local, unlabeled campus basemap from an OpenStreetMap XML extract.

Usage: python scripts/build-campus-basemap.py path/to/campus.osm
Only building footprints, green space, roads, and paths are retained.
OpenStreetMap data remains licensed under ODbL 1.0; see campus-basemap-source.md.
"""

import json
import pathlib
import sys
import xml.etree.ElementTree as ET


def build(source):
    root = ET.parse(source).getroot()
    nodes = {
        node.attrib["id"]: [round(float(node.attrib["lon"]), 7), round(float(node.attrib["lat"]), 7)]
        for node in root.findall("node")
    }
    features = []
    for way in root.findall("way"):
        tags = {tag.attrib["k"]: tag.attrib["v"] for tag in way.findall("tag")}
        refs = [node.attrib["ref"] for node in way.findall("nd")]
        if any(ref not in nodes for ref in refs):
            continue
        coordinates = [nodes[ref] for ref in refs]
        closed = len(coordinates) >= 4 and coordinates[0] == coordinates[-1]
        if "building" in tags and tags["building"] != "no" and closed:
            kind = "building"
        elif closed and (tags.get("landuse") in {"grass", "forest", "recreation_ground"}
                         or tags.get("natural") in {"grassland", "wood"}
                         or tags.get("leisure") in {"park", "garden"}):
            kind = "green"
        elif "highway" in tags and len(coordinates) >= 2 and tags["highway"] not in {"proposed", "construction"}:
            kind = "road"
        else:
            continue
        geometry = {"type": "Polygon", "coordinates": [coordinates]} if kind != "road" else {"type": "LineString", "coordinates": coordinates}
        properties = {"kind": kind}
        if kind == "road":
            properties["highway"] = tags["highway"]
        features.append({"type": "Feature", "id": "way/" + way.attrib["id"], "properties": properties, "geometry": geometry})
    features.sort(key=lambda feature: {"green": 0, "road": 1, "building": 2}[feature["properties"]["kind"]])
    return {
        "type": "FeatureCollection",
        "attribution": "© OpenStreetMap contributors",
        "license": "https://opendatacommons.org/licenses/odbl/1-0/",
        "bbox": [-95.349, 29.716, -95.336, 29.726],
        "features": features,
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/build-campus-basemap.py path/to/campus.osm")
    output = pathlib.Path(__file__).resolve().parents[1] / "components" / "home" / "campus-basemap.json"
    data = build(sys.argv[1])
    output.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Saved {len(data['features'])} campus features ({output.stat().st_size:,} bytes).")
