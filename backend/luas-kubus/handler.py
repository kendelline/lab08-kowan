import json
import urllib.request
import urllib.error

GATEWAY = "http://gateway:8080/function"

def _respond(status, payload):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }

def call_service(name, payload):
    request = urllib.request.Request(
        f"{GATEWAY}/{name}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode())

def handle(event, context):
    try:
        data = json.loads(event.body or "{}")
        sisi = float(data["sisi"])

        if sisi <= 0:
            return _respond(400, {"error": "Sisi harus lebih dari 0"})

        result = call_service("luas-persegi", {"sisi": sisi})
        luas_satu_sisi = float(result["luas"])
        luas_permukaan = luas_satu_sisi * 6

        if luas_permukaan.is_integer():
            luas_permukaan = int(luas_permukaan)

        return _respond(200, {"luas_permukaan": luas_permukaan})

    except urllib.error.URLError:
        return _respond(502, {"error": "Gagal menghubungi luas-persegi"})
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return _respond(400, {"error": "Input tidak valid"})
