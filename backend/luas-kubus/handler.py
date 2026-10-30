import json
import os

import requests

# Service : luas-kubus
# Pemilik : TODO (isi nama)
# Request : {"sisi": 5}
# Response: {"luas_permukaan": 150}
# Rumus   : L = 6 * L_persegi  (L_persegi didapat dengan MEMANGGIL service luas-persegi)

# Dari dalam faasd, function saling memanggil lewat gateway internal.
GATEWAY = os.environ.get("GATEWAY_URL", "http://gateway.openfaas:8080")
PERSEGI_URL = f"{GATEWAY}/function/luas-persegi"


def _respond(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }


def handle(event, context):
    # TODO:
    # 1. baca "sisi" dari event.body dan validasi
    # 2. requests.post(PERSEGI_URL, json={"sisi": sisi}) -> ambil "luas"
    # 3. kembalikan {"luas_permukaan": 6 * luas}
    return _respond(501, {"error": "luas-kubus belum diimplementasi"})
