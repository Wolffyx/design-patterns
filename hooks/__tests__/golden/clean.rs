// Golden fixture: well-shaped code — must produce no findings.
use std::collections::HashMap;

pub enum Shape { Circle(f64), Square(f64) }

pub fn area(s: &Shape) -> f64 {
    match s {
        Shape::Circle(r) => 3.14 * r * r,
        Shape::Square(x) => x * x,
    }
}

pub fn ship(o: Option<&Order>) -> Result<(), ShipError> {
    let Some(o) = o.filter(|o| o.paid) else {
        return Err(ShipError::Unpaid);
    };
    for item in &o.items {
        if item.is_empty() {
            continue;
        }
        log(item);
    }
    Ok(())
}

pub async fn load_all(ids: &[i64], pool: &PgPool) -> Vec<User> {
    sqlx::query_as!(User, "select * from users where id = any($1)", ids).fetch_all(pool).await.unwrap_or_default()
}

pub fn set_visible(visible: bool) {}
