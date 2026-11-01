"""Serve the frontend and forward API requests to faasd, using only stdlib."""

import argparse
import json
import os
import socket
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


FRONTEND_DIRECTORY = Path(__file__).resolve().parent
FAASD_GATEWAY = os.environ.get("FAASD_GATEWAY", "http://52.54.0.92:8080").rstrip("/")
FUNCTIONS = {"luas-persegi", "luas-kubus", "luas-lingkaran", "luas-tabung"}
UPSTREAM_TIMEOUT_SECONDS = 25


class FrontendHandler(SimpleHTTPRequestHandler):
    """Keep API requests on the same origin as the static frontend."""

    def send_payload(self, status, body, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                # The browser may cancel when dimensions or shapes change.
                pass

    def send_json_error(self, status, message):
        self.send_payload(status, json.dumps({"error": message}).encode())

    def is_api_request(self):
        path = urlsplit(self.path).path
        return path == "/api" or path.startswith("/api/")

    def do_GET(self):
        if self.is_api_request():
            self.send_json_error(405, "Gunakan POST dengan body JSON untuk menghitung.")
            return
        super().do_GET()

    def do_HEAD(self):
        if self.is_api_request():
            self.send_json_error(405, "Gunakan POST dengan body JSON untuk menghitung.")
            return
        super().do_HEAD()

    def do_POST(self):
        path = urlsplit(self.path).path
        function = path.removeprefix("/api/")
        if not path.startswith("/api/") or function not in FUNCTIONS:
            self.send_json_error(404, "Endpoint tidak ditemukan.")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_json_error(400, "Panjang request tidak valid.")
            return

        if length <= 0 or length > 8192:
            self.send_json_error(400, "Body JSON tidak valid atau terlalu besar.")
            return

        request = Request(
            f"{FAASD_GATEWAY}/function/{function}",
            data=self.rfile.read(length),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=UPSTREAM_TIMEOUT_SECONDS) as response:
                self.send_payload(
                    response.status,
                    response.read(),
                    response.headers.get("Content-Type", "application/json"),
                )
        except HTTPError as error:
            with error:
                self.send_payload(
                    error.code,
                    error.read(),
                    error.headers.get("Content-Type", "application/json"),
                )
        except (TimeoutError, socket.timeout):
            self.send_json_error(
                504, "Backend terlalu lama merespons. Silakan coba lagi."
            )
        except (URLError, ConnectionError, OSError):
            self.send_json_error(
                502, "Backend tidak dapat dihubungi. Silakan coba lagi."
            )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    args = parser.parse_args()
    gateway = urlsplit(FAASD_GATEWAY)
    if gateway.scheme not in {"http", "https"} or not gateway.netloc:
        parser.error("FAASD_GATEWAY harus berupa URL http(s) gateway faasd.")

    handler = partial(FrontendHandler, directory=str(FRONTEND_DIRECTORY))
    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Frontend: http://{args.host}:{args.port}", flush=True)
    print(f"API gateway: {FAASD_GATEWAY}/function/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
