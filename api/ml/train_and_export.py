import json
import sys
import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

MAX_FEATURES = 2000

def main(data_path: str, output_dir: str):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if len(data) < 20:
        print(f"Trop peu de données ({len(data)}) pour un entraînement fiable. Annulation.")
        sys.exit(1)

    df = pd.DataFrame(data)
    print(f"{len(df)} exemples chargés, {df['categorie'].nunique()} catégories")

    vectorizer = TfidfVectorizer(
        max_features=MAX_FEATURES,
        lowercase=True,
        ngram_range=(1, 1),
        norm="l2",
        sublinear_tf=False,
        stop_words=None,
    )
    X = vectorizer.fit_transform(df["texte"]).toarray().astype(np.float32)

    classes = sorted(df["categorie"].unique().tolist())
    class_to_idx = {c: i for i, c in enumerate(classes)}
    y = df["categorie"].map(class_to_idx).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf = LogisticRegression(max_iter=1000, multi_class="multinomial")
    clf.fit(X_train, y_train)

    print("Rapport de classification (jeu de test) :")
    print(classification_report(y_test, clf.predict(X_test), target_names=classes, zero_division=0))

    onnx_model = convert_sklearn(
        clf,
        initial_types=[("input", FloatTensorType([None, MAX_FEATURES]))],
        options={id(clf): {"zipmap": False}},
    )

    timestamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
    model_path = output_dir / f"model_{timestamp}.onnx"
    with open(model_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    vectorizer_export = {
        "vocabulary": vectorizer.vocabulary_,
        "idf": vectorizer.idf_.tolist(),
        "max_features": MAX_FEATURES,
    }
    vectorizer_path = output_dir / f"vectorizer_{timestamp}.json"
    with open(vectorizer_path, "w", encoding="utf-8") as f:
        json.dump(vectorizer_export, f, ensure_ascii=False)

    classes_path = output_dir / f"classes_{timestamp}.json"
    with open(classes_path, "w", encoding="utf-8") as f:
        json.dump(classes, f, ensure_ascii=False)

    manifest = {
        "model": str(model_path),
        "vectorizer": str(vectorizer_path),
        "classes": str(classes_path),
        "trained_at": timestamp,
        "n_samples": len(df),
    }
    manifest_path = output_dir / "current_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"Modèle exporté : {model_path}")
    print(f"Manifest écrit : {manifest_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    main(args.data, args.output)