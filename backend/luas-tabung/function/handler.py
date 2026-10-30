import json
import math
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
        jari_jari = float(data["jari_jari"])
        tinggi = float(data["tinggi"])

        if jari_jari <= 0 or tinggi <= 0:
            return _respond(
                400,
                {"error": "Jari-jari dan tinggi harus lebih dari 0"}
            )

        # Memanggil microservice luas-lingkaran
        circle = call_service(
            "luas-lingkaran",
            {"jari_jari": jari_jari}
        )
        luas_lingkaran = float(circle["luas"])

        # Menghitung keliling lingkaran
        keliling = 2 * math.pi * jari_jari

        # Memanggil microservice luas-persegi untuk menghitung luas persegi panjang
        rectangle = call_service(
            "luas-persegi",
            {"panjang": keliling, "lebar": tinggi}
        )

        luas_selimut = round(float(rectangle["luas"]), 2)

        return _respond(200, {"luas_selimut": luas_selimut})

    except urllib.error.URLError:
        return _respond(
            502,
            {"error": "Gagal menghubungi microservice lain"}
        )
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return _respond(400, {"error": "Input tidak valid"})
