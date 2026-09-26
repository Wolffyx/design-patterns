use crate::users;
use crate::users::load;

pub fn build(ids: &[i64]) {
    for id in ids {
        users::load(*id);
    }
    for id in ids {
        load(*id);
    }
}
