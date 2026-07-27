import json
import random
import uuid
import hashlib
from datetime import datetime, timedelta
from faker import Faker

fake = Faker("tr_TR")
random.seed(42)
Faker.seed(42)

# ---------------------------------------------------------
# 1. KULLANICI HAVUZU
# ---------------------------------------------------------
USER_POOL = [
    hashlib.sha256(fake.user_name().encode()).hexdigest()
    for _ in range(300)
]

MENTION_POOL = [
    f"@{fake.user_name()[:15].replace('.', '').replace('_', '')}"
    for _ in range(80)
]

# ---------------------------------------------------------
# 2. POST BAĞLAMI
# ---------------------------------------------------------
POST_TYPES = {
    "fashion": {
        "weight": 0.30,
        "objects": ["kombin", "elbise", "stil", "look", "outfit"],
        "items": ["kombinin", "elbisenin", "çantanın", "ayakkabının", "ceketin"],
        "places": ["mağazanın", "butiğin"],
        "hashtags": ["#ootd", "#moda", "#kombin", "#stil", "#fashion"],
        "short_positive": ["🔥", "çok iyi", "bayıldım", "link?", "nereden?"],
        "short_negative": ["beğenmedim", "eski moda", "pahalı duruyor"],
    },
    "travel": {
        "weight": 0.25,
        "objects": ["video", "reels", "rota", "vlog", "paylaşım"],
        "items": ["mekanın", "otelin", "rotanın", "restoranın", "manzaranın"],
        "places": ["otelin", "rotanın", "şehrin", "restoranın", "cafenin"],
        "hashtags": ["#travel", "#gezi", "#tatil", "#vlog", "#kesfet"],
        "short_positive": ["gitmek istiyorum", "rota not alındı", "harika yer"],
        "short_negative": ["abartılmış", "pahalı geldi", "kalabalıkmış"],
    },
    "food": {
        "weight": 0.20,
        "objects": ["tarif", "reels", "video", "paylaşım", "içerik"],
        "items": ["sosun", "tarifin", "malzemenin", "tatlının", "yemeğin"],
        "places": ["restoranın", "cafenin", "mekanın"],
        "hashtags": ["#yemek", "#tarif", "#foodie", "#lezzet", "#mutfak"],
        "short_positive": ["deneyeceğim", "çok lezzetli duruyor", "tarif için teşekkürler"],
        "short_negative": ["fazla yağlı", "kolay olmaz gibi", "beğenmedim"],
    },
    "lifestyle": {
        "weight": 0.15,
        "objects": ["içerik", "video", "reels", "paylaşım", "vlog"],
        "items": ["müziğin", "dekorasyonun", "ürünün", "rutinin"],
        "places": ["mekanın", "evin", "studionun"],
        "hashtags": ["#vlog", "#günlük", "#lifestyle", "#keşfet", "#reels"],
        "short_positive": ["çok samimi", "devam et", "motivasyon verdin"],
        "short_negative": ["sıkıcı", "eski içerik", "samimiyetsiz"],
    },
    "fitness": {
        "weight": 0.10,
        "objects": ["antrenman", "video", "reels", "program", "içerik"],
        "items": ["hareketin", "programın", "sporun", "egzersizin"],
        "places": ["salonun", "parkurun"],
        "hashtags": ["#fitness", "#spor", "#workout", "#motivasyon"],
        "short_positive": ["hemen deniyorum", "çok faydalı", "form süper"],
        "short_negative": ["yanlış form", "tehlikeli duruyor", "profesyonel değil"],
    },
}

POST_CONTEXT = {}
for post_id in range(1, 101):
    post_type = random.choices(
        list(POST_TYPES.keys()),
        weights=[POST_TYPES[k]["weight"] for k in POST_TYPES],
        k=1,
    )[0]
    POST_CONTEXT[post_id] = POST_CONTEXT.get(post_type, POST_CONTEXT)  # noqa: placeholder
    POST_CONTEXT[post_id] = post_type

NUM_ACCOUNTS = 10

POST_OWNERS = {
    post_id: ((post_id - 1) % NUM_ACCOUNTS) + 1
    for post_id in range(1, 101)
}

# ---------------------------------------------------------
# 3. ŞABLONLAR
# ---------------------------------------------------------
POS_ADJECTIVES = [
    "harika", "muhteşem", "efsane", "süper", "çok kaliteli",
    "inanılmaz", "favorim", "gerçekten iyi", "çok başarılı",
]
NEG_ADJECTIVES = [
    "çok kötü", "gereksiz", "kalitesiz", "sıkıcı", "samimiyetsiz",
    "bomboş", "yüzeysel", "abartılı",
]

POS_TEMPLATES = [
    "{adj} bir {obj} olmuş",
    "Bu {obj} gerçekten {adj}!",
    "{obj} için teşekkürler, {adj} görünüyor",
    "Yine {adj} bir {obj} ile gelmişsiniz",
    "Gördüğüm en {adj} {obj} olabilir",
    "Ellerinize sağlık, {adj} bir {obj}",
    "Bu {obj}ı sürekli izlemekten kendimi alamıyorum",
    "Aradığım {obj} tam olarak buydu",
    "Keşfete düşmesi lazım, {adj} {obj}",
    "Bunu kaydettim, {adj} olmuş",
    "Çok beğendim, özellikle {detail} kısmı",
    "Her zamanki gibi {adj}, devam 👏",
]

NEG_TEMPLATES = [
    "Bu {obj} tam bir hayal kırıklığı",
    "Eski kaliteniz kalmamış, bu {obj} {adj} olmuş",
    "Sadece izlenme almak için yapılmış {adj} bir {obj}",
    "Hiç beğenmedim, {detail} kısmı özellikle kötü",
    "Çok {adj} bir {obj} olmuş, yakıştıramadım",
    "DM'lere neden cevap vermiyorsunuz? İlgisizlik diz boyu",
    "Sürekli aynı tarz, {obj}larınız artık sıkıcılaşmaya başladı",
    "Eski samimiyetiniz kalmadı, her şey reklam olmuş",
    "Bu sefer olmamış bence",
    "{detail} kısmını hiç beğenmedim açıkçası",
    "Daha iyi yapabilirdiniz, {adj} duruyor",
]

QUESTION_TEMPLATES = [
    "Üzerinizdeki {item} linki gelir mi acaba?",
    "Videodaki {item} adını bilen var mı?",
    "Çekim yaparken hangi {tech} kullanıyorsunuz?",
    "Gittiğiniz {place} tam adını öğrenebilir miyiz?",
    "{item} detaylarını hikayede paylaşır mısınız?",
    "Fiyat nedir acaba?",
    "Konum neresi tam olarak?",
    "DM üzerinden bilgi verebilir misiniz?",
    "Markası ne acaba?",
    "Beden kaç giydiniz?",
    "Bu {item} nereden aldınız?",
    "Tarifi atar mısınız?",
]

TECH_TOOLS = ["kamerayı", "telefonu", "edit uygulamasını", "ışığı", "mikrofonu"]
DETAILS = ["müzik", "kurgu", "başlangıç", "son", "geçiş", "anlatım", "renk", "ışık"]

SPAMS = [
    "Takip et kazan 👉 https://fake-link.com",
    "1000 takipçi için DM",
    "Evden para kazanmak isteyenler profilime gelsin 💰",
    "Ucuz hesap satılır.",
    "Kripto yatırım fırsatı kaçırma!",
    "Geri takip yapılır 🚀 Profilime bak!",
    "Kilo vermek isteyenler profildeki linke tıklasın 🍏",
    "Keşfetten gelenler takip etmeyi unutmayın 🔥",
    "DM'den yazın hemen dönüş yapıyorum",
    "Ücretsiz danışmanlık için bio linki",
]

SARCASTIC = [
    "Çok profesyonelsiniz gerçekten...",
    "Bravo ya yine şaşırtmadınız.",
    "Helal gerçekten (!) 😂",
    "Harika hizmet (!) 👏",
    "Aynen çok samimi içerik kesinlikle sponsorlu değil 😂",
    "Müşteri ilişkileri mükemmel (cevap vermiyorlar) 👏",
    "Vay be ne kadar özgün (!)",
    "Kesinlikle organik yorum değilim (!) 😂",
]

POS_EMOJIS = ["🔥🔥🔥", "❤️❤️❤️", "😍😍", "👏👏👏", "💯", "✨✨", "🥹❤️", "🙌🏼🙌🏼"]
NEG_EMOJIS = ["😴", "🤮👎", "👎", "😬", "🙄"]
NEUTRAL_EMOJIS = ["👀", "🤔", "😂", "😅"]

# ---------------------------------------------------------
# 4. YARDIMCI FONKSİYONLAR
# ---------------------------------------------------------

def random_like(intent):
    """Negatif/spam yorumlar genelde daha az like alır."""
    r = random.random()
    if intent in ("negative", "spam"):
        if r < 0.85:
            return random.randint(0, 3)
        elif r < 0.97:
            return random.randint(4, 15)
        return random.randint(16, 80)
    if r < 0.70:
        return random.randint(0, 5)
    elif r < 0.90:
        return random.randint(6, 20)
    return random.randint(21, 150)


def power_law_comment_counts(post_ids, total_comments):
    """Bazı postlar viral, çoğu post az yorum alır."""
    weights = [random.paretovariate(3) for _ in post_ids]
    raw = [max(1, int(w * total_comments / sum(weights))) for w in weights]
    diff = total_comments - sum(raw)
    while diff != 0:
        idx = random.randrange(len(raw))
        if diff > 0:
            raw[idx] += 1
            diff -= 1
        elif raw[idx] > 1:
            raw[idx] -= 1
            diff += 1
        else:
            break
    return dict(zip(post_ids, raw))


def convert_tr_to_en(text):
    tr_map = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    return text.translate(tr_map)


def maybe_typo(word):
    typos = {
        "çok": ["cok", "çok", "çooook"],
        "harika": ["harika", "harikaa", "harik"],
        "güzel": ["guzel", "güzel", "güzelll"],
        "beğendim": ["begendim", "beğendim"],
        "için": ["icin", "için"],
        "değil": ["degil", "değil"],
    }
    if word.lower() in typos and random.random() < 0.25:
        return random.choice(typos[word.lower()])
    return word


def distort(text):
    words = text.split()
    if random.random() < 0.20:
        words = [maybe_typo(w) for w in words]
        text = " ".join(words)

    if random.random() < 0.50 and text.endswith("."):
        text = text[:-1]

    if random.random() < 0.15:
        text = convert_tr_to_en(text)

    rand_case = random.random()
    if rand_case < 0.35:
        text = text.lower()
    elif rand_case < 0.40:
        text = text.upper()

    return text


def decorate(text, intent, post_type):
    ctx = POST_TYPES[post_type]

    if random.random() < 0.22:
        text += " " + random.choice(ctx["hashtags"])

    if random.random() < 0.15:
        text += " " + random.choice(MENTION_POOL)

    emoji_pool = {
        "positive": POS_EMOJIS,
        "negative": NEG_EMOJIS,
        "question": NEUTRAL_EMOJIS,
        "spam": [],
        "emoji": POS_EMOJIS + NEG_EMOJIS,
    }.get(intent, NEUTRAL_EMOJIS)

    if emoji_pool and random.random() < 0.22:
        text += " " + random.choice(emoji_pool)

    return text.strip()


def build_comment(category, post_type):
    ctx = POST_TYPES[post_type]
    obj = random.choice(ctx["objects"])
    item = random.choice(ctx["items"])
    place = random.choice(ctx["places"])
    detail = random.choice(DETAILS)

    if category == "positive":
        if random.random() < 0.18:
            raw = random.choice(ctx["short_positive"])
        else:
            tmpl = random.choice(POS_TEMPLATES)
            raw = tmpl.format(
                adj=random.choice(POS_ADJECTIVES),
                obj=obj,
                detail=detail,
            )
        intent = "positive"

    elif category == "negative":
        if random.random() < 0.15:
            raw = random.choice(ctx["short_negative"])
        else:
            tmpl = random.choice(NEG_TEMPLATES)
            raw = tmpl.format(
                adj=random.choice(NEG_ADJECTIVES),
                obj=obj,
                detail=detail,
            )
        intent = "negative"

    elif category == "question":
        tmpl = random.choice(QUESTION_TEMPLATES)
        raw = tmpl.format(
            item=item,
            tech=random.choice(TECH_TOOLS),
            place=place,
        )
        intent = "question"

    elif category == "spam":
        raw = random.choice(SPAMS)
        intent = "spam"

    elif category == "emoji":
        raw = random.choice(POS_EMOJIS + NEG_EMOJIS + ["🔥", "❤️", "👏", "😍", "👎"])
        intent = "emoji"

    elif category == "sarcastic":
        raw = random.choice(SARCASTIC)
        intent = "sarcastic"

    else:
        raw = random.choice(ctx["short_positive"])
        intent = "positive"

    text = distort(raw)
    text = decorate(text, intent, post_type)
    return text, intent


def pick_author(post_id, used_pairs):
    """Aynı kullanıcı aynı posta nadiren birden fazla yorum yapar."""
    for _ in range(20):
        author = random.choice(USER_POOL)
        if (post_id, author) not in used_pairs:
            used_pairs.add((post_id, author))
            return author
    return random.choice(USER_POOL)


def random_created_at(now):
    created = now - timedelta(
        days=random.randint(0, 180),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
        seconds=random.randint(0, 59),
        microseconds=random.randint(0, 999999),
    )
    return created.isoformat()


# ---------------------------------------------------------
# 5. DATASET ÜRETİCİSİ
# ---------------------------------------------------------

def generate_dataset(total=2500):
    dataset = []
    used_pairs = set()
    seen_texts = set()

    categories = (
        ["positive"] * 37 +
        ["negative"] * 25 +
        ["question"] * 17 +
        ["spam"] * 10 +
        ["emoji"] * 6 +
        ["sarcastic"] * 5
    )

    post_ids = list(range(1, 101))
    post_comment_plan = power_law_comment_counts(post_ids, total)
    now = datetime.now()

    for post_id, count in post_comment_plan.items():
        post_type = POST_CONTEXT[post_id]

        for _ in range(count):
            # Tekrar oranını düşürmek için birkaç deneme
            for _attempt in range(8):
                cat = random.choice(categories)
                text, intent = build_comment(cat, post_type)
                if text not in seen_texts or random.random() < 0.15:
                    seen_texts.add(text)
                    break

            dataset.append({
                "id": str(uuid.uuid4()),
                "postId": post_id,
                "post_type": post_type,
                "account_id": POST_OWNERS[post_id],
                "authorHash": pick_author(post_id, used_pairs),
                "text": text,
                "commentedAt": random_created_at(now),
                "likes_count": random_like(intent),
                "language": "tr",
                "mock_category": intent,
            })

    random.shuffle(dataset)
    return dataset


# ---------------------------------------------------------
# 6. ÇALIŞTIR VE KAYDET
# ---------------------------------------------------------

if __name__ == "__main__":
    comments = generate_dataset(2500)

    output_path = "src/mock_comments.json"
    with open(output_path, "w", encoding="utf8") as f:
        json.dump(comments, f, ensure_ascii=False, indent=2)

    dup = len(comments) - len({c["text"] for c in comments})
    print(f"✅ {len(comments)} adet mock yorum '{output_path}' konumuna kaydedildi.")