package report

func fetchOne(id int) error {
	_, err := http.Get(fmt.Sprintf("/x/%d", id))
	return err
}
