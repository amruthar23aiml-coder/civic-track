from pathlib import Path
from PIL import Image

DATASET_DIR = Path(__file__).resolve().parent.parent / "dataset"

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

total_files = 0
valid_images = 0
non_images = []
broken_images = []

for class_dir in sorted(DATASET_DIR.iterdir()):
    if not class_dir.is_dir():
        continue

    print(f"\nChecking class: {class_dir.name}")

    for file in sorted(class_dir.iterdir()):
        if not file.is_file():
            continue

        total_files += 1

        if file.suffix.lower() not in VALID_EXTENSIONS:
            non_images.append(file)
            continue

        try:
            with Image.open(file) as image:
                image.verify()

            valid_images += 1

        except Exception as error:
            broken_images.append((file, str(error)))


print("\n" + "=" * 50)
print("DATASET CLEANING REPORT")
print("=" * 50)

print(f"Total files checked : {total_files}")
print(f"Valid images       : {valid_images}")
print(f"Non-image files    : {len(non_images)}")
print(f"Broken images      : {len(broken_images)}")

if non_images:
    print("\nNon-image files:")
    for file in non_images:
        print(f"  {file}")

if broken_images:
    print("\nBroken images:")
    for file, error in broken_images:
        print(f"  {file}")
        print(f"    Error: {error}")

if not non_images and not broken_images:
    print("\nAll files passed the basic image check.")