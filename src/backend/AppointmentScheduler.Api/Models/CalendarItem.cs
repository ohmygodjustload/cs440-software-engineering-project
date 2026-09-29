namespace AppointmentScheduler.Api.Models;

/// <summary>Lightweight calendar payload so the calendar page does not over-fetch.</summary>
public sealed record CalendarItem(
    string Id,
    string Title,
    AppointmentCategory Category,
    DateTimeOffset Start,
    DateTimeOffset End,
    AppointmentStatus Status);
