import json
import os

import requests

# Service : luas-tabung
# Pemilik : TODO (isi nama)
# Request : {"jari_jari": 7, "tinggi": 10}
# Response: {"luas_selimut": 439.82}
# Rumus   : L = 2 * pi * r * t
#
# Service ini harus MEMANGGIL luas-persegi dan luas-lingkaran dan memakai hasilnya.
# Aturan pemakaian hasilnya BELUM DISEPAKATI (lihat bagian "Pertanyaan terbuka" di README).

GATEWAY = os.environ.get("GATEWAY_URL", "http://gateway.openfaas:8080")
PERSEGI_URL = f"{GATEWAY}/function/luas-persegi"
LINGKARAN_URL = f"{GATEWAY}/function/luas-lingkaran"


def _respond(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }


def handle(event, context):
    # TODO:
    # 1. baca "jari_jari" dan "tinggi" dari event.body dan validasi
    # 2. panggil PERSEGI_URL dan LINGKARAN_URL sesuai aturan yang disepakati
    # 3. kembalikan {"luas_selimut": ...}
    return _respond(501, {"error": "luas-tabung belum diimplementasi"})
