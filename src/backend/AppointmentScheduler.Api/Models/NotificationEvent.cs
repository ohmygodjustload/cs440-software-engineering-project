namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Machine-readable event kinds for account notifications.
/// The values mirror the front-end <see cref="NotificationEventKind"/> strings so the
/// two halves of the system stay in sync without sharing code.
/// </summary>
public enum NotificationEvent
{
    /// <summary>A user (client or provider) created an appointment or slot.</summary>
    AppointmentCreated,

    /// <summary>A client booked an open slot owned by a provider.</summary>
    AppointmentBooked,

    /// <summary>An appointment or slot was cancelled, typically with a reason.</summary>
    AppointmentCancelled,

    /// <summary>System message shown when a user returns with multiple missed notifications.</summary>
    MissedNotifications
}

/// <summary>
/// Converts a <see cref="NotificationEvent"/> into the matching front-end string.
/// </summary>
public static class NotificationEventExtensions
{
    public static string ToEventKind(this NotificationEvent value) => value switch
    {
        NotificationEvent.AppointmentCreated => "appointment-created",
        NotificationEvent.AppointmentBooked => "appointment-booked",
        NotificationEvent.AppointmentCancelled => "appointment-cancelled",
        NotificationEvent.MissedNotifications => "missed-notifications",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };
}
