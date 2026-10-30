use sha2::{Digest, Sha256};
use sqlx::SqlitePool;

// Masa berlaku sesi: 24 jam.
const SESSION_DURATION_SECONDS: i64 = 24 * 60 * 60;

/// Membuat token acak 256-bit.
pub fn generate_session_token() -> String {
    let bytes: [u8; 32] = rand::random();

    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// Menghasilkan hash SHA-256 dari token sesi.
pub fn hash_session_token(token: &str) -> String {
    let digest = Sha256::digest(token.as_bytes());

    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// Membuat sesi baru dan menyimpan hash token di database.
/// Token asli hanya dikembalikan kepada pemanggil.
pub async fn create_session(pool: &SqlitePool, user_id: i64) -> Result<String, sqlx::Error> {
    let token = generate_session_token();
    let token_hash = hash_session_token(&token);

    sqlx::query(
        r#"
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (
            ?,
            ?,
            CAST(unixepoch('now') + ? AS TEXT)
        )
        "#,
    )
    .bind(&token_hash)
    .bind(user_id)
    .bind(SESSION_DURATION_SECONDS)
    .execute(pool)
    .await?;

    Ok(token)
}

/// Mengembalikan ID pengguna jika sesi tersedia
/// dan belum kedaluwarsa.
pub async fn get_session_user(pool: &SqlitePool, token: &str) -> Result<Option<i64>, sqlx::Error> {
    // Token sesi harus berupa 64 karakter hexadecimal.
    if token.len() != 64 || !token.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Ok(None);
    }

    let token_hash = hash_session_token(token);

    let user_id = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT user_id
        FROM sessions
        WHERE id = ?
          AND CAST(expires_at AS INTEGER) > unixepoch('now')
        "#,
    )
    .bind(token_hash)
    .fetch_optional(pool)
    .await?;

    Ok(user_id)
}

/// Mencabut sesi, misalnya ketika logout.
pub async fn revoke_session(pool: &SqlitePool, token: &str) -> Result<(), sqlx::Error> {
    let token_hash = hash_session_token(token);

    sqlx::query("DELETE FROM sessions WHERE id = ?")
        .bind(token_hash)
        .execute(pool)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

    async fn test_database() -> (SqlitePool, i64) {
        let options = SqliteConnectOptions::new()
            .in_memory(true)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .expect("Gagal membuat database testing");

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Gagal menjalankan migrasi");

        let user_id = sqlx::query(
            "INSERT INTO users (email, display_name)
             VALUES (?, ?)",
        )
        .bind("session@test.local")
        .bind("Session Test")
        .execute(&pool)
        .await
        .expect("Gagal membuat user")
        .last_insert_rowid();

        (pool, user_id)
    }

    #[test]
    fn generates_random_session_tokens() {
        let first = generate_session_token();
        let second = generate_session_token();

        assert_eq!(first.len(), 64);
        assert_eq!(second.len(), 64);
        assert_ne!(first, second);
    }

    #[test]
    fn session_hash_is_deterministic() {
        let first = hash_session_token("test-session-token");
        let second = hash_session_token("test-session-token");

        assert_eq!(first, second);
        assert_eq!(first.len(), 64);
    }

    #[test]
    fn different_tokens_produce_different_hashes() {
        assert_ne!(
            hash_session_token("token-one"),
            hash_session_token("token-two")
        );
    }

    #[test]
    fn session_token_is_not_stored_as_plaintext() {
        let token = generate_session_token();
        let hash = hash_session_token(&token);

        assert_ne!(token, hash);
    }

    #[tokio::test]
    async fn creates_and_validates_session() {
        let (pool, user_id) = test_database().await;

        let token = create_session(&pool, user_id)
            .await
            .expect("Gagal membuat sesi");

        let actual_user = get_session_user(&pool, &token)
            .await
            .expect("Gagal memeriksa sesi");

        assert_eq!(actual_user, Some(user_id));

        let stored_hash: String = sqlx::query_scalar("SELECT id FROM sessions WHERE user_id = ?")
            .bind(user_id)
            .fetch_one(&pool)
            .await
            .unwrap();

        assert_eq!(stored_hash, hash_session_token(&token));
        assert_ne!(stored_hash, token);
    }

    #[tokio::test]
    async fn expired_session_is_rejected() {
        let (pool, user_id) = test_database().await;

        let token = create_session(&pool, user_id).await.unwrap();

        sqlx::query(
            "UPDATE sessions SET expires_at = '0'
             WHERE id = ?",
        )
        .bind(hash_session_token(&token))
        .execute(&pool)
        .await
        .unwrap();

        let result = get_session_user(&pool, &token).await.unwrap();

        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn revoked_session_is_rejected() {
        let (pool, user_id) = test_database().await;

        let token = create_session(&pool, user_id).await.unwrap();

        revoke_session(&pool, &token).await.unwrap();

        let result = get_session_user(&pool, &token).await.unwrap();

        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn invalid_and_unknown_tokens_are_rejected() {
        let (pool, _) = test_database().await;

        assert_eq!(
            get_session_user(&pool, "invalid-token").await.unwrap(),
            None
        );

        let unknown_token = generate_session_token();

        assert_eq!(get_session_user(&pool, &unknown_token).await.unwrap(), None);
    }
}
