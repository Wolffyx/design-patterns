package report

import (
	"context"

	"example.com/shop/users"
)

type Report struct {
	store *users.Store
}

func (r *Report) Build(ctx context.Context, ids []int) {
	for _, id := range ids {
		r.store.Get(ctx, id)
	}
	for _, id := range ids {
		users.Load(id)
	}
	for _, id := range ids {
		fetchOne(id)
	}
}
