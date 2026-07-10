import urllib.request

try:
    urllib.request.urlopen("http://localhost:8080/")
    print("Server is running.")
except Exception as e:
    print(f"Error connecting to server: {e}")
