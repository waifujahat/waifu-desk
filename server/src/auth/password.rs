use argon2::{
    Argon2,
    password_hash::{PasswordHasher, PasswordVerifier, phc::PasswordHash},
};

pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let argon2 = Argon2::default();

    let hash = argon2.hash_password(password.as_bytes())?;

    Ok(hash.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    let Ok(parsed_hash) = PasswordHash::new(hash) else {
        return false;
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn password_hash_and_verify_successfully() {
        let hash = hash_password("WaifuDesk-Test-2026!").expect("Gagal melakukan hashing password");

        assert!(hash.starts_with("$argon2id$"));

        assert!(verify_password("WaifuDesk-Test-2026!", &hash));
    }

    #[test]
    fn wrong_password_is_rejected() {
        let hash = hash_password("CorrectPassword123!").expect("Gagal membuat hash");

        assert!(!verify_password("WrongPassword123!", &hash));
    }

    #[test]
    fn invalid_hash_is_rejected() {
        assert!(!verify_password("Password123!", "invalid-hash"));
    }

    #[test]
    fn same_password_generates_different_hashes() {
        let first = hash_password("SamePassword123!").expect("Hash pertama gagal");

        let second = hash_password("SamePassword123!").expect("Hash kedua gagal");

        assert_ne!(first, second);
    }
}
