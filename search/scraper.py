from pathlib import Path
from datetime import datetime
import json
import time

import requests
from bs4 import BeautifulSoup

# ==========================================
# Configuration
# ==========================================

BASE_URL = "https://www.m-1gp.com/combi/{}.html"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

REQUEST_INTERVAL = 0.5
MAX_CONSECUTIVE_MISS = 100

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

COMBI_FILE = DATA_DIR / "combiList.json"
META_FILE = DATA_DIR / "metadata.json"

# ==========================================
# Utility
# ==========================================

def load_json(path: Path, default):
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default


def save_json(path: Path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


# ==========================================
# HTML Parser
# ==========================================

def parse_combi(html: str, url: str, combi_id: int):

    soup = BeautifulSoup(html, "html.parser")

    name = soup.select_one(".name-txt-full")
    kana = soup.select_one(".name-txt-kana")

    if name is None:
        return None

    members = []

    for member in soup.select(".member-list-con"):

        profile = {}

        dts = member.select("dt")
        dds = member.select("dd")

        for dt, dd in zip(dts, dds):
            profile[dt.get_text(strip=True)] = dd.get_text(strip=True)

        members.append({
            "name": profile.get("名前", ""),
            "kana": profile.get("フリガナ", "")
        })

    return {
        "id": combi_id,
        "url": url,
        "combi": {
            "name": name.get_text(strip=True),
            "kana": kana.get_text(strip=True)
        },
        "members": members,
        "scraped_at": datetime.now().isoformat(timespec="seconds")
    }


# ==========================================
# Fetch
# ==========================================

def fetch(session: requests.Session, combi_id: int):

    url = BASE_URL.format(combi_id)

    try:

        response = session.get(
            url,
            timeout=10,
            allow_redirects=False
        )

        if response.status_code != 200:
            return None

        return parse_combi(response.text, url, combi_id)

    except Exception as e:

        print(f"[ERROR] {e}")

        return None


# ==========================================
# Main
# ==========================================

def main():

    print("[INFO] Starting scraper...")

    DATA_DIR.mkdir(exist_ok=True)

    combis = load_json(COMBI_FILE, [])

    metadata = load_json(META_FILE, {
        "last_id": 0,
        "updated": None
    })

    current_id = metadata["last_id"] + 1

    print(f"[INFO] Start ID: {current_id}")

    session = requests.Session()
    session.headers.update(HEADERS)

    consecutive_miss = 0

    while consecutive_miss < MAX_CONSECUTIVE_MISS:

        print(f"[INFO] Checking ID {current_id}")

        result = fetch(session, current_id)

        if result is None:

            consecutive_miss += 1

            print(f"[WARN] ID {current_id} not found ({consecutive_miss}/{MAX_CONSECUTIVE_MISS})")

        else:

            consecutive_miss = 0

            combis.append(result)

            metadata["last_id"] = current_id
            metadata["updated"] = datetime.now().isoformat(timespec="seconds")

            save_json(COMBI_FILE, combis)
            save_json(META_FILE, metadata)

            print(f"[OK] Found : {result['combi']['name']}")
            print("[OK] Saved.")

        current_id += 1

        time.sleep(REQUEST_INTERVAL)

    print("[DONE] Scraping completed.")


if __name__ == "__main__":
    main()