// Golden fixture: every line flagged here is intentional.
use std::sync::OnceLock;

static CONFIG: OnceLock<Config> = OnceLock::new();

pub struct Config;

pub struct Order;

impl Order {
    pub fn new(id: u64, customer: u64, total: u64, currency: String, notes: String) -> Self { Order }
}

pub fn ship(o: Option<&Order>) {
    if let Some(o) = o {
        if o.paid {
            for item in &o.items {
                log(item);
            }
        }
    }
}

pub fn render(items: &[String], compact: bool) -> String { String::new() }

pub async fn load_all(ids: &[i64], pool: &PgPool) {
    for id in ids {
        let row = sqlx::query!("select name from users where id = $1", id).fetch_one(pool).await;
    }
    match risky() {
        Ok(v) => use_it(v),
        Err(_) => {}
    }
}
