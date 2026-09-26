import { UserStore } from './user-store';

export class UserService {
  constructor(private readonly store: UserStore) {}
  getUser(id: string) {
    return this.store.byId(id);
  }
}
