// Golden fixture: every line flagged here is intentional.
package golden

import "sync"

var (
	once     sync.Once
	instance *Config
)

type Config struct{}

func GetInstance() *Config {
	once.Do(func() { instance = &Config{} })
	return instance
}

func NewOrder(id, customer string, total int, currency, notes string) *Order {
	return &Order{}
}

func Describe(x interface{}) string {
	switch v := x.(type) {
	case int:
		return "int"
	case string:
		return "str"
	case []int:
		return "list"
	case bool:
		_ = v
		return "bool"
	}
	return "?"
}

func Ship(o *Order) error {
	if o != nil {
		if o.Paid {
			for _, item := range o.Items {
				log(item)
			}
		}
	}
	if o == nil {
		return nil
	} else {
		return nil
	}
}

func Render(items []string, compact bool) string { return "" }

func LoadAll(ids []int) {
	for _, id := range ids {
		row := db.QueryRowContext(ctx, "select name from users where id = $1", id)
		_ = row
	}
	if err := risky(); err != nil {
	}
}
