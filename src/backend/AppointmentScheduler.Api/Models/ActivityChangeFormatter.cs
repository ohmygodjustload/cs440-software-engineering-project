namespace AppointmentScheduler.Api.Models;

public static class ActivityChangeFormatter
{
    public static string Describe(params (string Field, object? Before, object? After)[] changes)
    {
        return string.Join("; ", changes
            .Where(change => !Equals(change.Before, change.After))
            .Select(change => $"{change.Field}: {Format(change.Before)} -> {Format(change.After)}"));
    }

    public static string Summary(string changes) =>
        string.IsNullOrWhiteSpace(changes) ? "Changed: no tracked fields" : $"Changed: {changes}";

    private static string Format(object? value) => value switch
    {
        null => "(empty)",
        DateTimeOffset dateTime => dateTime.ToUniversalTime().ToString("u"),
        _ => value.ToString() ?? "(empty)"
    };
}
