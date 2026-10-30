import json

# Service : luas-lingkaran
# Pemilik : TODO (isi nama)
# Request : {"jari_jari": 7}
# Response: {"luas": 153.94}
# Rumus   : L = pi * r^2


def _respond(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }


def handle(event, context):
    # TODO: baca "jari_jari" dari event.body, validasi, hitung luas, kembalikan {"luas": ...}
    return _respond(501, {"error": "luas-lingkaran belum diimplementasi"})
