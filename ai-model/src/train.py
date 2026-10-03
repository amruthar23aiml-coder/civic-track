import argparse
from pathlib import Path

import torch
from PIL import ImageFile
from torch import nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small


ROOT = Path(__file__).resolve().parents[1]
CLASSES = ("garbage", "illegal_dumping", "pothole", "streetlight")
IMAGE_SIZE = 224
CHECKPOINT_NAME = "civictrack_mobilenetv3_small.pt"
ImageFile.LOAD_TRUNCATED_IMAGES = False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train CivicTrack's MobileNetV3-Small issue classifier."
    )
    parser.add_argument("--data-dir", type=Path, default=ROOT / "dataset")
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts" / CHECKPOINT_NAME)
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--workers", type=int, default=2)
    return parser.parse_args()


def load_split(
    split_dir: Path, image_transform: transforms.Compose
) -> datasets.ImageFolder:
    if not split_dir.is_dir():
        raise FileNotFoundError(
            f"Dataset split not found: {split_dir}. Add the dataset using the "
            "folder structure documented in ai-model/README.md."
        )

    dataset = datasets.ImageFolder(split_dir, transform=image_transform)
    if tuple(dataset.classes) != CLASSES:
        raise ValueError(
            f"{split_dir} must contain exactly these class folders: "
            f"{', '.join(CLASSES)}. Found: {', '.join(dataset.classes) or '(none)'}."
        )

    counts = [0] * len(CLASSES)
    for label in dataset.targets:
        counts[label] += 1
    empty_classes = [name for name, count in zip(CLASSES, counts) if count == 0]
    if empty_classes:
        raise ValueError(
            f"{split_dir} has no readable images for: {', '.join(empty_classes)}."
        )

    return dataset


def run_epoch(
    model: nn.Module,
    loader: DataLoader,
    loss_function: nn.Module,
    device: torch.device,
    optimizer: torch.optim.Optimizer | None,
) -> tuple[float, float]:
    training = optimizer is not None
    model.train(training)
    model.features.eval()

    total_loss = 0.0
    correct = 0
    total = 0

    for images, labels in loader:
        images = images.to(device)
        labels = labels.to(device)

        if training:
            optimizer.zero_grad()

        with torch.set_grad_enabled(training):
            logits = model(images)
            loss = loss_function(logits, labels)
            if training:
                loss.backward()
                optimizer.step()

        total_loss += loss.item() * labels.size(0)
        correct += (logits.argmax(dim=1) == labels).sum().item()
        total += labels.size(0)

    return total_loss / total, correct / total


def main() -> None:
    args = parse_args()
    if args.epochs < 1 or args.batch_size < 1 or args.workers < 0 or args.lr <= 0:
        raise SystemExit("epochs and batch-size must be positive, workers nonnegative, and lr positive.")

    weights = MobileNet_V3_Small_Weights.DEFAULT
    train_transform = transforms.Compose(
        [
            transforms.RandomResizedCrop(IMAGE_SIZE),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(mean=weights.transforms().mean, std=weights.transforms().std),
        ]
    )
    train_dataset = load_split(args.data_dir / "train", train_transform)
    validation_dataset = load_split(args.data_dir / "val", weights.transforms())

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.workers,
    )
    validation_loader = DataLoader(
        validation_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.workers,
    )

    model = mobilenet_v3_small(weights=weights)
    for parameter in model.features.parameters():
        parameter.requires_grad = False
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, len(CLASSES))
    model = model.to(device)

    loss_function = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=args.lr)
    best_validation_loss = float("inf")

    for epoch in range(1, args.epochs + 1):
        train_loss, train_accuracy = run_epoch(
            model, train_loader, loss_function, device, optimizer
        )
        validation_loss, validation_accuracy = run_epoch(
            model, validation_loader, loss_function, device, None
        )
        print(
            f"Epoch {epoch}/{args.epochs} "
            f"train_loss={train_loss:.4f} train_accuracy={train_accuracy:.4f} "
            f"val_loss={validation_loss:.4f} val_accuracy={validation_accuracy:.4f}"
        )

        if validation_loss < best_validation_loss:
            best_validation_loss = validation_loss
            args.output.parent.mkdir(parents=True, exist_ok=True)
            torch.save(
                {
                    "architecture": "mobilenet_v3_small",
                    "classes": list(CLASSES),
                    "image_size": IMAGE_SIZE,
                    "state_dict": model.state_dict(),
                },
                args.output,
            )
            print(f"Saved best validation checkpoint to {args.output}")


if __name__ == "__main__":
    main()
