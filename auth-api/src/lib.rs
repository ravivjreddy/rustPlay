use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

pub const JWT_SECRET: &str = "demo-secret-change-in-production";
pub const DEMO_USERNAME: &str = "demo";
pub const DEMO_PASSWORD: &str = "hello123";

#[derive(Clone)]
pub struct AppState {
    jwt_secret: Arc<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct LoginResponse {
    pub token: String,
    pub username: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct VerifyResponse {
    pub valid: bool,
    pub username: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct ErrorResponse {
    pub error: String,
}

pub fn create_app(jwt_secret: impl Into<String>) -> Router {
    let state = AppState {
        jwt_secret: Arc::new(jwt_secret.into()),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health))
        .route("/api/login", post(login))
        .route("/api/verify", get(verify))
        .layer(cors)
        .with_state(state)
}

pub async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, Json<ErrorResponse>)> {
    if body.username != DEMO_USERNAME || body.password != DEMO_PASSWORD {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "Invalid username or password".into(),
            }),
        ));
    }

    let exp = (std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as usize)
        + 3600;

    let claims = Claims {
        sub: body.username.clone(),
        exp,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: "Failed to create token".into(),
            }),
        )
    })?;

    Ok(Json(LoginResponse {
        token,
        username: body.username,
    }))
}

pub async fn verify(State(state): State<AppState>, headers: HeaderMap) -> Json<VerifyResponse> {
    let token = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    let Some(token) = token else {
        return Json(VerifyResponse {
            valid: false,
            username: None,
        });
    };

    match decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => Json(VerifyResponse {
            valid: true,
            username: Some(data.claims.sub),
        }),
        Err(_) => Json(VerifyResponse {
            valid: false,
            username: None,
        }),
    }
}

pub async fn health() -> &'static str {
    "ok"
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    fn test_app() -> Router {
        create_app("test-secret")
    }

    async fn body_to_string(body: Body) -> String {
        let bytes = axum::body::to_bytes(body, usize::MAX).await.unwrap();
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    #[tokio::test]
    async fn health_returns_ok() {
        let app = test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(body_to_string(response.into_body()).await, "ok");
    }

    #[tokio::test]
    async fn login_with_valid_credentials_returns_token() {
        let app = test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/login")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"username":"demo","password":"hello123"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = body_to_string(response.into_body()).await;
        let login: LoginResponse = serde_json::from_str(&body).unwrap();
        assert_eq!(login.username, DEMO_USERNAME);
        assert!(!login.token.is_empty());
    }

    #[tokio::test]
    async fn login_with_invalid_credentials_returns_unauthorized() {
        let app = test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/login")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"username":"demo","password":"wrong"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        let body = body_to_string(response.into_body()).await;
        let error: ErrorResponse = serde_json::from_str(&body).unwrap();
        assert_eq!(error.error, "Invalid username or password");
    }

    #[tokio::test]
    async fn verify_without_token_returns_invalid() {
        let app = test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/verify")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = body_to_string(response.into_body()).await;
        let verify: VerifyResponse = serde_json::from_str(&body).unwrap();
        assert_eq!(
            verify,
            VerifyResponse {
                valid: false,
                username: None,
            }
        );
    }

    #[tokio::test]
    async fn verify_with_valid_token_returns_username() {
        let app = test_app();

        let login_response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/api/login")
                    .header("content-type", "application/json")
                    .body(Body::from(r#"{"username":"demo","password":"hello123"}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        let login_body = body_to_string(login_response.into_body()).await;
        let login: LoginResponse = serde_json::from_str(&login_body).unwrap();

        let verify_response = app
            .oneshot(
                Request::builder()
                    .uri("/api/verify")
                    .header("authorization", format!("Bearer {}", login.token))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(verify_response.status(), StatusCode::OK);

        let verify_body = body_to_string(verify_response.into_body()).await;
        let verify: VerifyResponse = serde_json::from_str(&verify_body).unwrap();
        assert_eq!(
            verify,
            VerifyResponse {
                valid: true,
                username: Some(DEMO_USERNAME.to_string()),
            }
        );
    }

    #[tokio::test]
    async fn verify_with_invalid_token_returns_invalid() {
        let app = test_app();
        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/verify")
                    .header("authorization", "Bearer not-a-valid-token")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = body_to_string(response.into_body()).await;
        let verify: VerifyResponse = serde_json::from_str(&body).unwrap();
        assert_eq!(
            verify,
            VerifyResponse {
                valid: false,
                username: None,
            }
        );
    }
}
