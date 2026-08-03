# Auth Token Flow

Bu akış `api/v1/auth/*` altında çalışır.

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant A as AuthController
  participant S as AuthService
  participant P as Prisma

  C->>A: POST /api/v1/auth/register
  A->>S: register(email, password)
  S->>S: argon2id hash(password)
  S->>P: user.create(email, passwordHash)
  P-->>S: user
  S-->>A: user
  A-->>C: 201 Created

  C->>A: POST /api/v1/auth/login
  A->>S: login(email, password)
  S->>P: user.findUnique(email)
  S->>S: argon2.verify(passwordHash, password)
  S->>S: jwt.sign(access, 15m)
  S->>S: jwt.sign(refresh, 7d, family)
  S->>P: refreshToken.create(token, family, userId)
  S-->>A: accessToken + refreshToken
  A-->>C: 200 OK

  C->>A: POST /api/v1/auth/refresh
  A->>S: refreshTokens(oldRefreshToken)
  S->>P: refreshToken.findUnique(token)
  alt token reused
    S->>P: refreshToken.deleteMany(family)
    S-->>A: 403 Forbidden
  else token valid
    S->>P: refreshToken.update(used=true)
    S->>S: jwt.sign(access, 15m)
    S->>S: jwt.sign(refresh, 7d, same family)
    S->>P: refreshToken.create(new token)
    S-->>A: new accessToken + refreshToken
    A-->>C: 200 OK
  end
```

## Davranış

- Access token 15 dakikadır.
- Refresh token 7 gündür.
- Refresh token family mantığı ile döner.
- Kullanılmış refresh token tekrar gelirse aynı family’deki tüm tokenlar silinir.
- Parola kaydı argon2id ile hashlenir.

## Neden

- Kısa access token, çalınma etkisini azaltır.
- Uzun refresh token, kullanıcıyı sık sık tekrar girişe zorlamaz.
- Rotasyon, tek refresh token sızıntısında oturumu kademeli güvenli tutar.
- Reuse tespiti, çalınmış refresh token tekrar kullanıldığında saldırıyı görünür hale getirir.
