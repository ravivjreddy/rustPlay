use auth_api::{create_app, JWT_SECRET};

#[tokio::main]
async fn main() {
    let app = create_app(JWT_SECRET);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080")
        .await
        .expect("failed to bind auth API");

    println!("Rust auth API will be listening on http://127.0.0.1:8080");
    axum::serve(listener, app).await.expect("server failed");
}
