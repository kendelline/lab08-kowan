import json
import math

def _respond(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }

def handle(event, context):
    try:
        data = json.loads(event.body or "{}")
        jari_jari = float(data["jari_jari"])

        if jari_jari <= 0:
            return _respond(400, {"error": "Jari-jari harus lebih dari 0"})

        luas = round(math.pi * jari_jari ** 2, 6)

        return _respond(200, {"luas": luas})

    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return _respond(400, {"error": "Input tidak valid"})