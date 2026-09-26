// Golden fixture: well-shaped code — must produce no findings.
using System.Collections.Generic;
using System.Linq;

public class Clean
{
    private static readonly Dictionary<string, int> Fees = new() { ["new"] = 1, ["paid"] = 2 };

    public int Fee(string status) => Fees.TryGetValue(status, out var f) ? f : 0;

    public void Ship(Order? order)
    {
        if (order is not { Paid: true }) return;
        foreach (var item in order.Items)
        {
            if (item == null) continue;
            Log(item);
        }
    }

    public async Task<List<User>> LoadAll(List<int> ids)
    {
        return await db.Users.Where(u => ids.Contains(u.Id)).ToListAsync();
    }

    public void SetVisible(bool visible) {}
}
