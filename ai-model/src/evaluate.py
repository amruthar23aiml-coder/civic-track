import argparse
from pathlib import Path

import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CHECKPOINT = ROOT / "artifacts" / "civictrack_mobilenetv3_small.pt"
CLASSES = ("garbage", "illegal_dumping", "pothole", "streetlight")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate a trained CivicTrack classifier on the test split."
    )
    parser.add_argument("--data-dir", type=Path, default=ROOT / "dataset")
    parser.add_argument("--checkpoint", type=Path, default=DEFAULT_CHECKPOINT)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--workers", type=int, default=2)
    return parser.parse_args()


def load_checkpoint(path: Path, device: torch.device) -> dict:
    if not path.is_file():
        raise FileNotFoundError(
            f"Trained model checkpoint not found: {path}. Train the model first "
            "with `python src/train.py` after adding the dataset."
        )

    checkpoint = torch.load(path, map_location=device, weights_only=True)

    if not isinstance(checkpoint, dict):
        raise ValueError(f"Checkpoint is not a dictionary: {path}")

    if checkpoint.get("architecture") != "mobilenet_v3_small":
        raise ValueError(
            f"Unexpected architecture: {checkpoint.get('architecture')}"
        )

    if checkpoint.get("classes") != list(CLASSES):
        raise ValueError(
            f"Unexpected classes: {checkpoint.get('classes')}"
        )

    if not isinstance(checkpoint.get("state_dict"), dict):
        raise ValueError("Checkpoint does not contain a valid state_dict.")

    return checkpoint


def main() -> None:
    args = parse_args()
    if args.batch_size < 1 or args.workers < 0:
        raise SystemExit("batch-size must be positive and workers nonnegative.")

    test_dir = args.data_dir / "test"
    if not test_dir.is_dir():
        raise FileNotFoundError(
            f"Test dataset split not found: {test_dir}. Add the dataset using "
            "the folder structure documented in ai-model/README.md."
        )

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = load_checkpoint(args.checkpoint, device)
    test_dataset = datasets.ImageFolder(
        test_dir, transform=MobileNet_V3_Small_Weights.DEFAULT.transforms()
    )
    if tuple(test_dataset.classes) != CLASSES:
        raise ValueError(
            f"{test_dir} must contain exactly these class folders: "
            f"{', '.join(CLASSES)}. Found: {', '.join(test_dataset.classes) or '(none)'}."
        )

    counts = [0] * len(CLASSES)
    for label in test_dataset.targets:
        counts[label] += 1
    empty_classes = [name for name, count in zip(CLASSES, counts) if count == 0]
    if empty_classes:
        raise ValueError(
            f"{test_dir} has no readable images for: {', '.join(empty_classes)}."
        )

    loader = DataLoader(
        test_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.workers,
    )
    model = mobilenet_v3_small(weights=None)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, len(CLASSES))
    model.load_state_dict(checkpoint["state_dict"])
    model = model.to(device)
    model.eval()

    loss_function = nn.CrossEntropyLoss(reduction="sum")
    total_loss = 0.0
    correct = 0
    total = 0
    confusion_matrix = torch.zeros(
        (len(CLASSES), len(CLASSES)), dtype=torch.int64
    )
        
    with torch.inference_mode():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)
            logits = model(images)
            total_loss += loss_function(logits, labels).item()
            predictions = logits.argmax(dim=1)
            correct += (predictions == labels).sum().item()
            
            for actual, predicted in zip(labels.cpu(), predictions.cpu()):
                confusion_matrix[int(actual), int(predicted)] += 1
            total += labels.size(0)

    print(f"Test images: {total}")
    print(f"Test loss: {total_loss / total:.4f}")
    print(f"Test accuracy: {correct / total:.4f}")
    print("\nConfusion matrix:")
    print("                 " + " ".join(f"{name:>16}" for name in CLASSES))

    for i, name in enumerate(CLASSES):
        row = " ".join(f"{confusion_matrix[i, j].item():>16}" for j in range(len(CLASSES)))
        print(f"{name:>16} {row}")

    print("\nPer-class metrics:")

    for i, name in enumerate(CLASSES):
        true_positive = confusion_matrix[i, i].item()
        actual_total = confusion_matrix[i, :].sum().item()
        predicted_total = confusion_matrix[:, i].sum().item()

        precision = true_positive / predicted_total if predicted_total else 0.0
        recall = true_positive / actual_total if actual_total else 0.0
        f1 = (
            2 * precision * recall / (precision + recall)
            if precision + recall
            else 0.0
        )

        print(
            f"{name:>16} | "
            f"Precision: {precision:.4f} | "
            f"Recall: {recall:.4f} | "
            f"F1: {f1:.4f}"
        )


if __name__ == "__main__":
    main()
