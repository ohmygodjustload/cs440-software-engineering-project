using System;
using System.Globalization;
using System.Linq;

namespace AppointmentScheduler.Api.Models;

public static class ActivityChangeFormatter
{
    public static string Describe(
        params (string Field, object? Before, object? After)[] changes)
    {
        return DescribeInTimeZone(TimeZoneInfo.Utc, changes);
    }

    public static string DescribeInTimeZone(
        TimeZoneInfo timeZone,
        params (string Field, object? Before, object? After)[] changes)
    {
        return string.Join("; ", changes
            .Where(change => !Equals(change.Before, change.After))
            .Select(change =>
                $"{change.Field}: {Format(change.Before, timeZone)}" +
                $" -> {Format(change.After, timeZone)}"));
    }

    public static string Summary(string changes) =>
        string.IsNullOrWhiteSpace(changes)
            ? "Changed: no tracked fields"
            : $"Changed: {changes}";

    private static string Format(object? value, TimeZoneInfo timeZone) =>
        value switch
        {
            null => "(empty)",
            DateTimeOffset dateTime => FormatDateTime(dateTime, timeZone),
            _ => value.ToString() ?? "(empty)"
        };

    private static string FormatDateTime(
        DateTimeOffset value,
        TimeZoneInfo timeZone)
    {
        // Keep the conversion so the displayed time matches the editor.
        var local = TimeZoneInfo.ConvertTime(value, timeZone);

        // Display only the date and 12-hour time, without a UTC offset.
        return local.ToString(
            "yyyy-MM-dd h:mm tt",
            CultureInfo.InvariantCulture);
    }
}
