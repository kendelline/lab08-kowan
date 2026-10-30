import json

# Service : luas-persegi
# Pemilik : TODO (isi nama)
# Request : {"sisi": 5}
# Response: {"luas": 25}
# Rumus   : L = s * s


def _respond(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }


def handle(event, context):
    # TODO: baca "sisi" dari event.body, validasi, hitung luas, kembalikan {"luas": ...}
    return _respond(501, {"error": "luas-persegi belum diimplementasi"})
