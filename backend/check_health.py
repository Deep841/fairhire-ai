import urllib.request, time

for i in range(8):
    try:
        r = urllib.request.urlopen("http://localhost:8001/health", timeout=2)
        print("Server UP:", r.read().decode())
        break
    except Exception as e:
        print(f"Attempt {i+1}: {e}")
        time.sleep(1)
else:
    print("Server did not respond")
