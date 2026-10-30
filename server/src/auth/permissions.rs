use sqlx::SqlitePool;

pub async fn has_permission(
    pool: &SqlitePool,
    user_id: i64,
    permission: &str,
) -> Result<bool, sqlx::Error> {
    let exists: i64 = sqlx::query_scalar(
        r#"
        SELECT EXISTS (
            SELECT 1
            FROM user_roles AS ur
            JOIN role_permissions AS rp
                ON rp.role_id = ur.role_id
            JOIN permissions AS p
                ON p.id = rp.permission_id
            WHERE ur.user_id = ?
              AND p.name = ?
        )
        "#,
    )
    .bind(user_id)
    .bind(permission)
    .fetch_one(pool)
    .await?;

    Ok(exists == 1)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

    async fn test_database() -> SqlitePool {
        let options = SqliteConnectOptions::new()
            .in_memory(true)
            .foreign_keys(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .expect("Gagal membuat database pengujian");

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Migrasi database gagal");

        pool
    }

    async fn create_user_with_role(pool: &SqlitePool, email: &str, role: &str) -> i64 {
        let user_id = sqlx::query(
            "INSERT INTO users (email, display_name)
             VALUES (?, ?)",
        )
        .bind(email)
        .bind(role)
        .execute(pool)
        .await
        .expect("Gagal membuat pengguna")
        .last_insert_rowid();

        sqlx::query(
            "INSERT INTO user_roles (user_id, role_id)
             SELECT ?, id FROM roles WHERE name = ?",
        )
        .bind(user_id)
        .bind(role)
        .execute(pool)
        .await
        .expect("Gagal memasang role");

        user_id
    }

    #[tokio::test]
    async fn admin_has_all_permissions() {
        let pool = test_database().await;
        let admin = create_user_with_role(&pool, "admin@test.local", "Admin").await;

        for permission in [
            "users.read",
            "users.create",
            "users.update",
            "users.delete",
            "roles.manage",
        ] {
            assert!(
                has_permission(&pool, admin, permission).await.unwrap(),
                "Admin seharusnya memiliki {permission}"
            );
        }
    }

    #[tokio::test]
    async fn operator_cannot_delete_or_manage_roles() {
        let pool = test_database().await;
        let operator = create_user_with_role(&pool, "operator@test.local", "Operator").await;

        for permission in ["users.read", "users.create", "users.update"] {
            assert!(has_permission(&pool, operator, permission).await.unwrap());
        }

        for permission in ["users.delete", "roles.manage"] {
            assert!(!has_permission(&pool, operator, permission).await.unwrap());
        }
    }

    #[tokio::test]
    async fn viewer_can_only_read_users() {
        let pool = test_database().await;
        let viewer = create_user_with_role(&pool, "viewer@test.local", "Viewer").await;

        assert!(has_permission(&pool, viewer, "users.read").await.unwrap());

        for permission in [
            "users.create",
            "users.update",
            "users.delete",
            "roles.manage",
        ] {
            assert!(!has_permission(&pool, viewer, permission).await.unwrap());
        }
    }

    #[tokio::test]
    async fn user_without_role_has_no_permissions() {
        let pool = test_database().await;

        let user_id = sqlx::query(
            "INSERT INTO users (email, display_name)
             VALUES (?, ?)",
        )
        .bind("no-role@test.local")
        .bind("No Role")
        .execute(&pool)
        .await
        .unwrap()
        .last_insert_rowid();

        assert!(!has_permission(&pool, user_id, "users.read").await.unwrap());

        assert!(!has_permission(&pool, 999999, "users.read").await.unwrap());
    }
}
