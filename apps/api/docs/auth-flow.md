# Auth Akışı — JWT + Refresh Token Rotasyonu

**S2.1 kapsamı:** Access token (15 dk) + refresh token (7 gün, rotasyonlu, reuse tespitli) akışı.

## 1. Register / Login

```mermaid
sequenceDiagram
    participant C as Client
    participant API as AuthController
    participant S as AuthService
    participant DB as PostgreSQL

    C->>API: POST /auth/register {email, password}
    API->>S: register(name, email, password)
    S->>S: argon2id(password) → passwordHash
    S->>DB: INSERT users
    S->>S: generateTokens(userId, newFamily)
    S->>DB: INSERT refresh_tokens (hash, family, expiresAt: +7g)
    S-->>API: {user, accessToken, refreshToken}
    API-->>C: 200 OK + Set-Cookie (accessToken, refreshToken, httpOnly)

    Note over C,API: /auth/login akışı birebir aynı, sadece<br/>argon2Verify ile şifre doğrulanır.
```

## 2. Refresh Token Rotasyonu (Normal Akış)

```mermaid
sequenceDiagram
    participant C as Client
    participant API as AuthController
    participant S as AuthService
    participant DB as PostgreSQL

    C->>API: POST /auth/refresh (cookie veya body: refreshToken)
    API->>S: refreshTokens(rawToken)
    S->>S: hash = SHA256(rawToken)
    S->>DB: SELECT refresh_tokens WHERE token = hash
    DB-->>S: {used: false, expiresAt: gelecekte, family}

    S->>DB: UPDATE refresh_tokens SET used = true (eski token)
    S->>S: generateTokens(userId, aynı family)
    S->>DB: INSERT refresh_tokens (yeni hash, aynı family)
    S-->>API: {accessToken (yeni), refreshToken (yeni)}
    API-->>C: 200 OK + Set-Cookie (yeni token'lar)
```

## 3. Reuse (Yeniden Kullanım) Saldırı Tespiti

```mermaid
sequenceDiagram
    participant Attacker as Saldırgan<br/>(çalınmış eski token)
    participant Victim as Gerçek Kullanıcı<br/>(rotate edilmiş yeni token)
    participant API as AuthController
    participant S as AuthService
    participant DB as PostgreSQL

    Note over Attacker,Victim: Her ikisi de AYNI family'e ait token'lara sahip.<br/>Victim zaten refresh yaptı, eski token artık used=true.

    Attacker->>API: POST /auth/refresh (eski, used=true token)
    API->>S: refreshTokens(oldToken)
    S->>DB: SELECT WHERE token = hash(oldToken)
    DB-->>S: {used: true, family: "abc"}

    rect rgb(255, 230, 230)
    Note over S: used=true → REUSE TESPİT EDİLDİ
    S->>DB: DELETE FROM refresh_tokens WHERE family = "abc"
    Note over DB: Bu family'e ait TÜM token'lar<br/>(Victim'in yeni rotate ettiği dahil) silinir
    end

    S-->>API: throw ForbiddenException("Saldırı tespit edildi!")
    API-->>Attacker: 403 Forbidden

    Note over Victim: Victim bir sonraki refresh denemesinde de<br/>401 alır - session'ı da sonlandırılmış olur,<br/>tekrar login olması gerekir.

    Victim->>API: POST /auth/refresh (kendi geçerli sandığı token)
    API->>S: refreshTokens(victimToken)
    S->>DB: SELECT WHERE token = hash(victimToken)
    DB-->>S: null (family zaten silindi)
    S-->>API: throw UnauthorizedException("Geçersiz token")
    API-->>Victim: 401 Unauthorized
```

## Neden bu tasarım güvenli

- **Rotasyon:** Her refresh'te eski token `used=true` işaretlenir, yeni bir token üretilir. Bir token asla iki kez "normal" şekilde kullanılamaz.
- **Reuse tespiti:** `used=true` bir token tekrar geldiğinde, bu ya (a) bir race condition ya da (b) token'ın çalındığının işaretidir. Ayrım yapmadan güvenli tarafta kalıp **tüm family'i** iptal ediyoruz — meşru kullanıcı da etkilense bile (tekrar login olması gerekir), güvenlik önceliğimiz bu.
- **Family kavramı:** Aynı login oturumundan türeyen tüm refresh token'lar aynı `family` UUID'sini paylaşır. Bu, "bu token zinciri nereden başladı" bilgisini taşır ve reuse tespitinde toplu iptal için kullanılır.
- **Hash'li saklama:** DB'de asla ham refresh token tutulmaz, sadece SHA-256 hash'i. DB sızıntısı olsa bile token'lar doğrudan kullanılamaz.

## İlgili test

`test/auth-refresh-reuse.e2e-spec.ts` — reuse senaryosunu uçtan uca doğrular:
1. Login → refresh (rotate) → eski token'ı tekrar kullanmayı dene → 403 bekle
2. Rotate edilmiş yeni token'ı da dene → 401 bekle (family tamamen iptal olmuş olmalı)