import json
import pandas as pd

CSV_FILE = "../src/ai/data/Emoji_Sentiment_Data_v1.0.csv"
OUTPUT_FILE = "../src/ai/data/esr_emojis.json"

df = pd.read_csv(CSV_FILE)

emoji_map = {}

for _, row in df.iterrows():

    emoji_char = row["Emoji"]

    positive = float(row["Positive"])
    negative = float(row["Negative"])

    score = positive - negative

    if score >= 0.30:
        label = "POZITIF"
    elif score <= -0.30:
        label = "NEGATIF"
    else:
        label = "NOTR"

    emoji_map[emoji_char] = label

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(
        emoji_map,
        f,
        ensure_ascii=False,
        indent=4
    )

print(f"{len(emoji_map)} emoji kaydedildi.")
print(f"Dosya oluşturuldu: {OUTPUT_FILE}")