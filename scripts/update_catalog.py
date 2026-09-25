"""Refresh the public clip catalog from publicly listed creator posts.

The app never downloads or rehosts video media. TikTok serves every clip through
its own Embed Player. Discovery is best effort; a failed refresh keeps the old
catalog intact.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "catalog.json"
CREATORS = [
    ("guinnessworldrecords", "Guinness World Records"),
    ("thepetcollective", "The Pet Collective"),
    ("zachking", "Zach King"),
    ("redbull", "Red Bull"),
    ("duolingo", "Duolingo"),
    ("gordonramsayofficial", "Gordon Ramsay"),
    ("bbcearth", "BBC Earth"),
    ("natgeo", "National Geographic"),
    ("mrbeast", "MrBeast"),
    ("nasa", "NASA"),
    ("neildegrassetyson", "Neil deGrasse Tyson"),
    ("therock", "Dwayne Johnson"),
]
VIDEO_PATH = re.compile(r"^/@([A-Za-z0-9._-]+)/video/(\d{15,22})/?$")


class JsonLdParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.in_json = False
        self.parts: list[str] = []
        self.blocks: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "script" and dict(attrs).get("type") == "application/ld+json":
            self.in_json = True
            self.parts = []

    def handle_data(self, data: str) -> None:
        if self.in_json:
            self.parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self.in_json:
            self.blocks.append("".join(self.parts))
            self.in_json = False


def get_creator_clips(handle: str, label: str) -> list[dict[str, str]]:
    url = f"https://tokgauge.com/@{handle}"
    request = urllib.request.Request(
        url, headers={"User-Agent": "SocialsDisplayCatalog/1.0 (+https://github.com/VexD1/Socials)"}
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        parser = JsonLdParser()
        parser.feed(response.read(500_000).decode("utf-8", errors="replace"))

    clips: list[dict[str, str]] = []
    for block in parser.blocks:
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        if data.get("@type") != "ItemList":
            continue
        for item in data.get("itemListElement", []):
            parsed = urlparse(item.get("url", ""))
            if parsed.scheme != "https" or parsed.netloc != "tokgauge.com":
                continue
            match = VIDEO_PATH.fullmatch(parsed.path)
            if not match or match.group(1).lower() != handle.lower():
                continue
            caption = " ".join(str(item.get("name", "Public TikTok clip")).split())
            clips.append({"id": match.group(2), "author": label, "caption": caption[:160]})
    return clips[:20]


def existing_clips() -> list[dict[str, str]]:
    try:
        data = json.loads(CATALOG.read_text(encoding="utf-8"))
        return [clip for clip in data["clips"] if re.fullmatch(r"\d{15,22}", clip["id"])]
    except (OSError, KeyError, ValueError, TypeError):
        return []


def round_robin(groups: list[list[dict[str, str]]]) -> list[dict[str, str]]:
    output: list[dict[str, str]] = []
    for position in range(max(map(len, groups), default=0)):
        for group in groups:
            if position < len(group):
                output.append(group[position])
    return output


def main() -> int:
    groups = []
    for handle, label in CREATORS:
        try:
            clips = get_creator_clips(handle, label)
            print(f"{handle}: {len(clips)} public links")
            if clips:
                groups.append(clips)
        except (OSError, urllib.error.URLError, ValueError) as error:
            print(f"{handle}: unavailable ({error})", file=sys.stderr)

    fresh = round_robin(groups)
    previous = existing_clips()
    if len(fresh) < 40:
        print("Too few fresh links; leaving last known catalog unchanged", file=sys.stderr)
        return 1

    seen: set[str] = set()
    merged: list[dict[str, str]] = []
    for clip in fresh + previous:
        if clip["id"] not in seen:
            seen.add(clip["id"])
            merged.append(clip)
    merged = merged[:300]
    result = {
        "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source": "Public creator clips",
        "clips": merged,
    }
    CATALOG.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(merged)} public links")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
