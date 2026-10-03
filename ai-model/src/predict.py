import argparse
import json
from pathlib import Path

import torch
from PIL import Image
from torch import nn
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CHECKPOINT = ROOT / "artifacts" / "civictrack_mobilenetv3_small.pt"
CLASSES = ("garbage", "illegal_dumping", "pothole", "streetlight")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Classify one image using a trained CivicTrack model."
    )
    parser.add_argument("--image", type=Path, required=True, help="Path to an image file.")
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    return parser.parse_args()


def load_checkpoint(path: Path, device: torch.device) -> dict:
    if not path.is_file():
        raise FileNotFoundError(
            f"Trained model checkpoint not found: {path}. Train the model first "
            "with `python src/train.py` after adding the dataset."
        )

    checkpoint = torch.load(path, map_location=device, weights_only=True)
    if (
        not isinstance(checkpoint, dict)
        or checkpoint.get("architecture") != "mobilenet_v3_small"
        or checkpoint.get("classes") != list(CLASSES)
        or not isinstance(checkpoint.get("state_dict"), dict)
    ):
        raise ValueError(f"Checkpoint has an unsupported or invalid format: {path}")
    return checkpoint


def main() -> None:
    args = parse_args()
    if not args.image.is_file():
        raise FileNotFoundError(f"Input image not found: {args.image}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = load_checkpoint(args.checkpoint, device)
    model = mobilenet_v3_small(weights=None)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, len(CLASSES))
    model.load_state_dict(checkpoint["state_dict"])
    model = model.to(device)
    model.eval()

    image_transform = MobileNet_V3_Small_Weights.DEFAULT.transforms()
    with Image.open(args.image) as source:
        image = source.convert("RGB")
    tensor = image_transform(image).unsqueeze(0).to(device)

    with torch.inference_mode():
        probabilities = torch.softmax(model(tensor), dim=1)[0]
        confidence, class_index = probabilities.max(dim=0)

    print(
        json.dumps(
            {
                "category": CLASSES[class_index.item()],
                "confidence": confidence.item(),
            }
        )
    )


if __name__ == "__main__":
    main()
