from pathlib import Path

import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


from PIL import Image
from torch import nn
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small

app = FastAPI(title="CivicTrack AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://civic-track-murex.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT_PATH = ROOT / "artifacts" / "civictrack_mobilenetv3_small.pt"

CLASSES = ("garbage", "illegal_dumping", "pothole", "streetlight")


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_model():
    if not CHECKPOINT_PATH.is_file():
        raise FileNotFoundError(
            f"Model checkpoint not found: {CHECKPOINT_PATH}"
        )

    checkpoint = torch.load(
        CHECKPOINT_PATH,
        map_location=device,
        weights_only=True,
    )

    if checkpoint.get("architecture") != "mobilenet_v3_small":
        raise ValueError("Unexpected model architecture.")

    if checkpoint.get("classes") != list(CLASSES):
        raise ValueError("Model classes do not match the API classes.")

    model = mobilenet_v3_small(weights=None)
    model.classifier[-1] = nn.Linear(
        model.classifier[-1].in_features,
        len(CLASSES),
    )

    model.load_state_dict(checkpoint["state_dict"])
    model.to(device)
    model.eval()

    return model


model = load_model()
image_transform = MobileNet_V3_Small_Weights.DEFAULT.transforms()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "civictrack_mobilenetv3_small",
        "classes": list(CLASSES),
        "device": str(device),
    }


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be an image.",
        )

    try:
        image_bytes = await image.read()

        from io import BytesIO

        with Image.open(BytesIO(image_bytes)) as source:
            pil_image = source.convert("RGB")

        tensor = image_transform(pil_image).unsqueeze(0).to(device)

        with torch.inference_mode():
            probabilities = torch.softmax(model(tensor), dim=1)[0]
            confidence, class_index = probabilities.max(dim=0)

        return {
            "category": CLASSES[class_index.item()],
            "confidence": float(confidence.item()),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not process image: {exc}",
        ) from exc