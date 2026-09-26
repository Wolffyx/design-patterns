import { UserService } from './users.service';
import { loadProfile, formatName } from './profiles';
import * as profiles from './profiles';

export class Report {
  constructor(private readonly userService: UserService) {}

  async build(ids: string[]) {
    for (const id of ids) {
      await this.userService.getUser(id);
    }
    for (const id of ids) {
      await loadProfile(id);
    }
    for (const id of ids) {
      await profiles.loadProfile(id);
    }
    for (const id of ids) {
      formatName(id, id);
    }
  }
}
