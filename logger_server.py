from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.parse

class RequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        print("BROWSER LOG:", post_data.decode('utf-8'))
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        pass # Suppress standard logging

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8081), RequestHandler)
    print("Log server running on port 8081")
    server.serve_forever()
