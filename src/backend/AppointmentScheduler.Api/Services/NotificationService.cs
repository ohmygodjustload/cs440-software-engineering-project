using System;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;

namespace AppointmentScheduler.Api.Services;

public sealed class NotificationService : INotificationService
{
    private readonly INotificationStore _notifications;
    private readonly IUserStore _users;

    public NotificationService(INotificationStore notifications, IUserStore users)
    {
        _notifications = notifications;
        _users = users;
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
    }

    public int GetUnreadCount(string userId) => _notifications.GetUnreadCount(userId);

    private void Ensure(string userId, AppointmentCategory category, Func<Notification> create)
    {
        var user = _users.GetById(userId);
        if (user is null || !ShouldNotifyForCategory(user, category)) return;
        _notifications.Add(create());
    }

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
