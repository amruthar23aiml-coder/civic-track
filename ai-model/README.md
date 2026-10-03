# CivicTrack image classification

This project trains an image classifier to suggest one of five CivicTrack
report categories from an uploaded issue photo:

- `pothole`
- `garbage`
- `illegal_dumping`
- `drainage`
- `streetlight`

The first version uses transfer learning with ImageNet-pretrained
MobileNetV3-Small. It always predicts one of these five classes; its softmax
confidence is a model score, not a guarantee that the image belongs to a
supported category.

## Dataset

The dataset will be added later. No dataset images or trained weights are
included in this repository. Organize the images as follows, with the five
class folders under each split:

```text
dataset/
  train/
    pothole/
    garbage/
    illegal_dumping/
    drainage/
    streetlight/
  val/
    pothole/
    garbage/
    illegal_dumping/
    drainage/
    streetlight/
  test/
    pothole/
    garbage/
    illegal_dumping/
    drainage/
    streetlight/
```

Use real, correctly labeled images. Keep images from the same report or other
near-duplicates in only one split to reduce data leakage.

## Environment and training

Training can be performed in Google Colab or another Python 3.10+ environment
with the required PyTorch and torchvision versions. In a fresh environment:

```bash
python -m pip install -r requirements.txt
python src/train.py
```

The training script expects `dataset/train/` and `dataset/val/`. It uses
ImageNet-pretrained weights for MobileNetV3-Small and saves the best
validation-loss checkpoint to `artifacts/civictrack_mobilenetv3_small.pt`.
The pretrained weights may be downloaded by torchvision the first time the
training script runs. The dataset is not downloaded automatically.

Optional training arguments:

```bash
python src/train.py --data-dir dataset --epochs 10 --batch-size 32 --lr 0.001
```

## Evaluation and inference

After training, evaluate against the held-out test split:

```bash
python src/evaluate.py
```

Run inference on one local image:

```bash
python src/predict.py path/to/issue.jpg
```

The inference script prints JSON with `category` and `confidence`. A future
server endpoint can use the same prediction code to accept the CivicTrack
frontend's uploaded image and return this JSON response.

Training, evaluation, and inference scripts fail with a clear message when
their required dataset split or trained checkpoint is missing.

## Reporting results

No accuracy or other performance result is claimed here. Do not report model
accuracy until the model has actually been trained and evaluated on a held-out
test set. Record the dataset provenance, split method, and evaluation results
when that work is done.
