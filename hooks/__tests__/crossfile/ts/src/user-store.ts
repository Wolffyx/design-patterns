export class UserStore {
  constructor(private prisma: any) {}
  async byId(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
