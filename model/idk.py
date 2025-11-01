import requests
import json

URL = "https://gamma-api.polymarket.com/events/slug/what-bills-will-be-signed-into-law-by-december-31"

# Fetch data
resp = requests.get(URL)
data = resp.json()

# Extract each market and its probability
for market in data.get("markets", []):
    bill = market.get("groupItemTitle") or "Unknown"
    try:
        # outcomePrices is a JSON string like ["0.53","0.47"]
        yes_price = float(json.loads(market["outcomePrices"])[0])
        pct = round(yes_price * 100, 1)
        print(f"{bill}: {pct}%")
    except Exception as e:
        print(f"{bill}: error parsing price ({e})")
