using System;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;

namespace AppointmentScheduler.Api.Services;

public sealed class NotificationService : INotificationService
{
    private readonly INotificationStore _notifications;
    private readonly IUserStore _users;
    private readonly IActivityStore? _activity;

    public NotificationService(INotificationStore notifications, IUserStore users, IActivityStore? activity = null)
    {
        _notifications = notifications;
        _users = users;
        _activity = activity;
    }

    public void OnAppointmentCreated(string userId, string appointmentId, AppointmentCategory category, string title)
    {
        Ensure(
            userId,
            category,
            () => new Notification
            {
                UserId = userId,
                Event = NotificationEvent.AppointmentCreated.ToEventKind(),
                EventLabel = "Appointment created",
                Message = title,
                AppointmentId = appointmentId,
                Category = category,
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        NotifyAdmins("APPOINTMENT_CREATED", "Appointment created", title, appointmentId, category, userId);
    }

    public void OnSlotCreated(string providerId, string slotId, AppointmentCategory category, string title)
    {
        Ensure(
            providerId,
            category,
            () => new Notification
            {
                UserId = providerId,
                Event = NotificationEvent.AppointmentCreated.ToEventKind(),
                EventLabel = "Appointment created",
                Message = title,
                AppointmentId = slotId,
                Category = category,
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        NotifyAdmins("APPOINTMENT_CREATED", "Appointment slot created", title, slotId, category, providerId);
    }

    public void OnAppointmentBooked(string clientId, string providerId, string appointmentId, AppointmentCategory category, string title, string? clientName = null)
    {
        Ensure(
            clientId,
            category,
            () => new Notification
            {
                UserId = clientId,
                Event = NotificationEvent.AppointmentBooked.ToEventKind(),
                EventLabel = "Appointment booked",
                Message = title,
                AppointmentId = appointmentId,
                Category = category,
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        NotifyAdmins("APPOINTMENT_BOOKED", "Appointment booked", title, appointmentId, category, clientId);

        Ensure(
            providerId,
            category,
            () => new Notification
            {
                UserId = providerId,
                Event = NotificationEvent.AppointmentBooked.ToEventKind(),
                EventLabel = "Slot booked by client",
                Message = clientName is null ? "Your slot was booked." : $"{clientName} booked your slot.",
                AppointmentId = appointmentId,
                Category = category,
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow,
            });
    }

    public void OnAppointmentUpdated(
        string appointmentId,
        AppointmentCategory category,
        string title,
        string? actorUserId = null,
        string? changes = null) =>
        NotifyAdmins("APPOINTMENT_UPDATED", "Appointment updated", Detail(title, changes), appointmentId, category, actorUserId);

    public void OnAccountCreated(User user) =>
        NotifyAdmins("ACCOUNT_CREATED", "New account created", user.Username, user.Id, null, user.Id);

    public void OnAccountUpdated(User user, string? actorUserId = null, string? changes = null) =>
        NotifyAdmins("ACCOUNT_UPDATED", "Account updated", Detail(user.Username, changes), user.Id, null, actorUserId ?? user.Id);

    public void OnProviderRequestSubmitted(ProviderRequest request) =>
        NotifyAdmins("PROVIDER_REQUEST_SUBMITTED", "New approval request", request.ProviderName, request.Id, null, request.UserId);

    public void OnProviderRequestDecision(ProviderRequest request, bool approved) =>
        NotifyAdmins(approved ? "PROVIDER_APPROVED" : "PROVIDER_REJECTED",
            approved ? "Provider approved" : "Provider denied", request.ProviderName, request.Id, null, request.UserId);

    public void OnNotificationSettingsUpdated(User user) =>
        NotifyAdmins("NOTIFICATION_SETTINGS_UPDATED", "Notification settings updated", user.Username, user.Id, null, user.Id);

    public void OnAppointmentCancelled(string clientId, string providerId, string appointmentId, AppointmentCategory category, string title, string reason)
    {
        Ensure(
            clientId,
            category,
            () => new Notification
            {
                UserId = clientId,
                Event = NotificationEvent.AppointmentCancelled.ToEventKind(),
                EventLabel = "Appointment cancelled",
                Message = title,
                AppointmentId = appointmentId,
                Category = category,
                Reason = reason,
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow,
            });

        Ensure(
            providerId,
            category,
            () => new Notification
            {
                UserId = providerId,
                Event = NotificationEvent.AppointmentCancelled.ToEventKind(),
                EventLabel = "Appointment cancelled",
                Message = title,
                AppointmentId = appointmentId,
                Category = category,
                Reason = reason,
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow,
            });

        NotifyAdmins("APPOINTMENT_CANCELLED", "Appointment cancelled", title, appointmentId, category, clientId);
    }

    public int GetUnreadCount(string userId) => _notifications.GetUnreadCount(userId);

    private void Ensure(string userId, AppointmentCategory category, Func<Notification> create)
    {
        var user = _users.GetById(userId);
        if (user is null || !ShouldNotifyForCategory(user, category)) return;
        _notifications.Add(create());
    }

    private void NotifyAdmins(
        string eventKind,
        string eventLabel,
        string message,
        string? entityId,
        AppointmentCategory? category,
        string? actorUserId)
    {
        foreach (var admin in _users.GetAll().Where(user => user.IsAdmin && user.IsActive))
        {
            _notifications.Add(new Notification
            {
                UserId = admin.Id,
                Event = eventKind.ToLowerInvariant().Replace('_', '-'),
                EventLabel = eventLabel,
                Message = message,
                AppointmentId = entityId,
                Category = category,
                IsRead = false,
                CreatedAt = DateTimeOffset.UtcNow
            });
        }

        if (eventKind != "ACCOUNT_UPDATED" && eventKind != "APPOINTMENT_UPDATED")
        {
            _activity?.Add(eventKind, $"{eventLabel}: {message}", actorUserId, entityId);
        }
    }

    private static string Detail(string subject, string? changes) =>
        string.IsNullOrWhiteSpace(changes) ? $"{subject}; Changed: no tracked fields" : $"{subject}; Changed: {changes}";

    public static bool ShouldNotifyForCategory(User user, AppointmentCategory category)
    {
        return category switch
        {
            AppointmentCategory.Medical => user.NotifyMedical,
            AppointmentCategory.Beauty => user.NotifyBeauty,
            AppointmentCategory.Fitness => user.NotifyFitness,
            _ => false
        };
    }
}
