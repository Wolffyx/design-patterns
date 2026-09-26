public class UserService : IUserService
{
    private readonly AppDb _db;

    public async Task<User> GetUser(int id)
    {
        return await _db.Users.FindAsync(id);
    }
}
