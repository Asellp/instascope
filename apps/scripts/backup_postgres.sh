#!/bin/bash
#
# backup_postgres.sh
#
# instascope_db veritabanının, zaman damgalı, sıkıştırılmış bir yedeğini alır.
# 7 günden eski yedekleri otomatik siler (disk şişmesin diye).
#
# NEDEN GEREKLİ: 20 Ağustos 2026'da yaşanan olay (Postgres'in 19 Ağustos
# akşamki başarısız yeniden başlatma denemeleri sonrası WAL segmentlerini
# kaybedip 16 Ağustos'a "geri sarması") gösterdi ki, yerel Postgres kurulumu
# çökme/kesinti anında GERÇEK ANLAMDA kalıcı değil. Bulut barındırma (gerçek
# çözüm) takım kararı bekliyor — bu script, o karar çıkana kadar "en azından
# birkaç saatten eski bir yedeğimiz olsun" diyen bir güvenlik ağı.
#
# KULLANIM: elle çalıştırılabilir, ama asıl değeri launchd ile (bkz.
# com.instascope.postgres-backup.plist) OTOMATİK, periyodik çalıştırılmasında.

set -euo pipefail

# --- Ayarlar ---
BACKUP_DIR="$HOME/instascope-backups"
DB_NAME="instascope_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/instascope_db_${TIMESTAMP}.sql.gz"

echo "[$(date)] Yedekleme başlıyor -> $BACKUP_FILE"

# pg_dump: veritabanının o anki, tutarlı bir anlık görüntüsünü alır.
# WAL/checkpoint durumuna bakılmaksızın, TAM ve BAĞIMSIZ bir kopya —
# bu yüzden 19 Ağustos'ta yaşanan türden bir çökme, bu yedeği ETKİLEMEZ.
if PGPASSWORD="${DB_PASSWORD:-postgres}" pg_dump \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges \
    | gzip > "$BACKUP_FILE"; then
  echo "[$(date)] Yedekleme başarılı: $(du -h "$BACKUP_FILE" | cut -f1)"
else
  echo "[$(date)] HATA: Yedekleme başarısız oldu!" >&2
  rm -f "$BACKUP_FILE"  # yarım kalmış/bozuk dosyayı bırakma
  exit 1
fi

# --- Eski yedekleri temizle (disk şişmesin diye) ---
echo "[$(date)] ${RETENTION_DAYS} günden eski yedekler temizleniyor..."
find "$BACKUP_DIR" -name "instascope_db_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Tamamlandı. Mevcut yedekler:"
ls -lh "$BACKUP_DIR"