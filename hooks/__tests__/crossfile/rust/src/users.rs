pub fn load(id: i64) -> String {
    reqwest::blocking::get(format!("/users/{id}")).unwrap().text().unwrap()
}
