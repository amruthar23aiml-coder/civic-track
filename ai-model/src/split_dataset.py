from pathlib import Path
import shutil
import random


DATASET_DIR = Path(__file__).resolve().parent.parent / "dataset"
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
CLASSES = ["garbage", "illegal_dumping", "pothole", "streetlight"]
RANDOM_SEED = 42
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15


def list_image_files(class_dir: Path):
    return [
        path
        for path in class_dir.iterdir()
        if path.is_file() and path.suffix.lower() in VALID_EXTENSIONS
    ]


def ensure_split_dirs():
    for class_name in CLASSES:
        for split_name in ("train", "val", "test"):
            split_dir = DATASET_DIR / split_name / class_name
            split_dir.mkdir(parents=True, exist_ok=True)


def split_class_images(class_name: str):
    source_dir = DATASET_DIR / class_name
    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory not found: {source_dir}")

    image_files = list_image_files(source_dir)
    if not image_files:
        print(f"{class_name}: no valid images found")
        return {"train": 0, "val": 0, "test": 0}

    random.Random(RANDOM_SEED).shuffle(image_files)

    total = len(image_files)
    train_count = int(total * TRAIN_RATIO)
    val_count = int(total * VAL_RATIO)
    test_count = total - train_count - val_count

    # Ensure at least one item goes to each split when possible.
    if total > 0:
        if train_count == 0 and total >= 1:
            train_count = 1
        if val_count == 0 and total - train_count >= 1 and test_count == 0:
            val_count = 1
        if test_count == 0 and total - train_count - val_count >= 1:
            test_count = 1

    # Rebalance if the totals exceed the class size.
    while train_count + val_count + test_count > total:
        if test_count > 0:
            test_count -= 1
        elif val_count > 0:
            val_count -= 1
        else:
            train_count -= 1

    allocations = {
        "train": image_files[:train_count],
        "val": image_files[train_count : train_count + val_count],
        "test": image_files[train_count + val_count : train_count + val_count + test_count],
    }

    for split_name, files in allocations.items():
        dest_dir = DATASET_DIR / split_name / class_name
        for file_path in files:
            dest_path = dest_dir / file_path.name
            if dest_path.exists():
                raise FileExistsError(
                    f"Destination already contains file: {dest_path}. "
                    "Refusing to overwrite or duplicate."
                )

    for split_name, files in allocations.items():
        dest_dir = DATASET_DIR / split_name / class_name
        for file_path in files:
            dest_path = dest_dir / file_path.name
            shutil.copy2(file_path, dest_path)

    return {
        "train": len(allocations["train"]),
        "val": len(allocations["val"]),
        "test": len(allocations["test"]),
    }


def main():
    ensure_split_dirs()

    counts = {}
    for class_name in CLASSES:
        source_dir = DATASET_DIR / class_name
        if not source_dir.exists():
            print(f"{class_name}: source directory missing")
            counts[class_name] = {"train": 0, "val": 0, "test": 0}
            continue

        image_files = list_image_files(source_dir)
        if not image_files:
            print(f"{class_name}: no valid images found")
            counts[class_name] = {"train": 0, "val": 0, "test": 0}
            continue

        # Detect if any destination split directory already has files for this class.
        for split_name in ("train", "val", "test"):
            dest_dir = DATASET_DIR / split_name / class_name
            if any(dest_dir.iterdir()):
                raise FileExistsError(
                    f"Destination directory already contains files: {dest_dir}. "
                    "Stopping without overwriting or duplicating content."
                )

        counts[class_name] = split_class_images(class_name)
        print(f"{class_name}: train={counts[class_name]['train']}, val={counts[class_name]['val']}, test={counts[class_name]['test']}")

    print("Summary:")
    for class_name in CLASSES:
        print(
            f"{class_name}: train={counts.get(class_name, {}).get('train', 0)}, "
            f"val={counts.get(class_name, {}).get('val', 0)}, "
            f"test={counts.get(class_name, {}).get('test', 0)}"
        )


if __name__ == "__main__":
    main()
