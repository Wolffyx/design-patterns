// AST-only golden fixture: raw strings full of braces must not shift blocks.
pub fn render(items: &[Item]) -> String {
    let tpl = r#"{ "a": { "b": 1 } }"#;
    if items.is_empty() {
        if tpl.len() > 3 {
            return String::new();
        }
    }
    tpl.to_string()
}
