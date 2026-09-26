public class ReportService
{
    private readonly IUserService _users;

    public async Task Build(List<int> ids)
    {
        foreach (var id in ids)
        {
            await _users.GetUser(id);
        }
    }
}
