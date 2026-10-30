import json

def _respond(status, payload):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(payload),
    }

def handle(event, context):
    try:
        data = json.loads(event.body or "{}")

        if "sisi" in data:
            sisi = float(data["sisi"])
            if sisi <= 0:
                return _respond(400, {"error": "Sisi harus lebih dari 0"})
            luas = sisi ** 2

        elif "panjang" in data and "lebar" in data:
            panjang = float(data["panjang"])
            lebar = float(data["lebar"])
            if panjang <= 0 or lebar <= 0:
                return _respond(400, {"error": "Panjang dan lebar harus lebih dari 0"})
            luas = panjang * lebar

        else:
            return _respond(400, {"error": "Input tidak valid"})

        if luas.is_integer():
            luas = int(luas)

        return _respond(200, {"luas": luas})

    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return _respond(400, {"error": "Input tidak valid"})
