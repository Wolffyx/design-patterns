package users

type Store struct{ db *sql.DB }

func (s *Store) Get(ctx context.Context, id int) error {
	return s.db.QueryRowContext(ctx, "select name from users where id = $1", id).Err()
}

func Load(id int) error {
	_, err := http.Get(fmt.Sprintf("/users/%d", id))
	return err
}
