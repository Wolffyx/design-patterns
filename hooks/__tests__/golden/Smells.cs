// Golden fixture: every line flagged here is intentional.
using System.Collections.Generic;

public class Smells
{
    private Smells() {}
    public static Smells Instance { get; } = new Smells();

    public string Describe(object x)
    {
        if (x is int)
        {
            return "int";
        }
        else if (x is string)
        {
            return "str";
        }
        else if (x is List<int>)
        {
            return "list";
        }
        return "?";
    }

    public void Ship(Order order)
    {
        if (order != null)
        {
            if (order.Paid)
            {
                foreach (var item in order.Items)
                {
                    Log(item);
                }
            }
        }
    }

    public string Render(List<string> items, bool compact) { return ""; }

    public async Task LoadAll(List<int> ids)
    {
        foreach (var id in ids)
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id);
        }
        try { Risky(); } catch { }
    }
}
