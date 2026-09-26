// Golden fixture: well-shaped code — must produce no findings.
package golden

var fees = map[string]int{"new": 1, "paid": 2}

func Fee(status string) int {
	return fees[status]
}

func Ship(o *Order) error {
	if o == nil || !o.Paid {
		return ErrUnpaid
	}
	for _, item := range o.Items {
		if item == "" {
			continue
		}
		log(item)
	}
	return nil
}

func LoadAll(ids []int) error {
	rows, err := db.QueryContext(ctx, "select name from users where id = any($1)", ids)
	if err != nil {
		return err
	}
	defer rows.Close()
	for {
		resp, err := client.Next()
		if err != nil {
			return err
		}
		_ = resp
	}
}

func SetVisible(visible bool) {}
