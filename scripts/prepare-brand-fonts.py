"""Prepare local web fonts from the client's extracted CAMBRIA/JANE archives.

Requires fonttools[woff] (FontTools + Brotli). No runtime application dependency.
Usage: python scripts/prepare-brand-fonts.py --source <extracted directory>
"""
import argparse
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--source", type=Path, required=True)
parser.add_argument("--output", type=Path, default=Path("src/app/fonts/brand"))
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)

faces = [
    ("CAMBRIA/cambria.ttc", "cambria-regular.woff2", 0),
    ("CAMBRIA/cambriab.ttf", "cambria-bold.woff2", None),
    ("JANE/Jane Regular W00 Regular.ttf", "jane-regular.woff2", None),
]
for source, destination, collection_index in faces:
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.layout_features = ["*"]
    options.drop_tables += ["MATH"]
    options.recalc_timestamp = False
    font = TTFont(args.source / source, fontNumber=collection_index or 0,
                  recalcTimestamp=False)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=subset.parse_unicodes(
        "U+0000-024F,U+1E00-1EFF,U+2000-206F,U+20A0-20CF,U+2100-214F,U+2190-21FF"))
    subsetter.subset(font)
    font.flavor = "woff2"
    target = args.output / destination
    font.save(target)
    print(f"{target}: {target.stat().st_size:,} bytes")
