import json
import math

# Service : luas-lingkaran
# Pemilik : TODO (isi nama)
# Request : {"jari_jari": 7}
# Response: {"luas": 153.94}
# Rumus   : L = pi * r * r

def _respond(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }


def handle(event, context):
    try:
        data = json.loads(event.get("body") or "{}")
        jari_jari = float(data["jari_jari"])

        if jari_jari <= 0:
            return _respond(400, {"error": "Jari-jari harus lebih dari 0"})

        luas = round(math.pi * jari_jari ** 2, 2)

        return _respond(200, {"luas": luas})

    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return _respond(400, {"error": "Input tidak valid"})
