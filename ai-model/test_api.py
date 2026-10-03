import urllib.request

image_path = r".\ai-model\dataset\test\pothole\Img (1003).jpg"

with open(image_path, "rb") as file:
    image_data = file.read()

boundary = "CivicTrackBoundary"

body = (
    f"--{boundary}\r\n"
    'Content-Disposition: form-data; name="image"; filename="pothole.jpg"\r\n'
    "Content-Type: image/jpeg\r\n"
    "\r\n"
).encode() + image_data + f"\r\n--{boundary}--\r\n".encode()

request = urllib.request.Request(
    "http://127.0.0.1:8000/predict",
    data=body,
    headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    },
    method="POST",
)

print("Sending request...")

with urllib.request.urlopen(request) as response:
    print("Status:", response.status)
    print("Response:", repr(response.read().decode()))