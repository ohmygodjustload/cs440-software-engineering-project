using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class AdminAppointmentAuditTests
{
    private sealed class FakeUser(string? id) : ICurrentUser
    {
        public string? UserId => id;
    }

    private static AdminController Make(
        InMemoryAppointmentStore? appointments = null,
        InMemoryAppointmentAuditStore? audit = null,
        InMemoryUserStore? users = null) =>
        new(
            users ?? new InMemoryUserStore(),
            appointments ?? new InMemoryAppointmentStore(),
            new InMemoryActivityStore(),
            new FakeUser(SeedIds.AdminUser),
            audit: audit ?? new InMemoryAppointmentAuditStore());

    [Fact]
    public void AppointmentAudit_ReturnsNewestFirst_WithNames()
    {
        var appointments = new InMemoryAppointmentStore();
        var audit = new InMemoryAppointmentAuditStore();
        var appt = appointments.Add(new Appointment
        {
            Title = "Checkup",
            ProviderId = SeedIds.ProviderUser,
            StartDateTime = DateTimeOffset.UtcNow.AddDays(1),
            EndDateTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            Status = AppointmentStatus.Booked,
            UserId = SeedIds.ClientUser
        });
        audit.Add(new AppointmentAuditEntry
        {
            AppointmentId = appt.Id,
            ChangedByUserId = SeedIds.ClientUser,
            Action = AppointmentAuditEntry.Cancelled,
            Timestamp = DateTimeOffset.UtcNow.AddMinutes(-10),
            OldStatus = AppointmentStatus.Booked,
            NewStatus = AppointmentStatus.Available
        });
        audit.Add(new AppointmentAuditEntry
        {
            AppointmentId = appt.Id,
            ChangedByUserId = SeedIds.ProviderUser,
            Action = AppointmentAuditEntry.Created,
            Timestamp = DateTimeOffset.UtcNow.AddMinutes(-5),
            NewStatus = AppointmentStatus.Available
        });

        var items = Assert.IsType<List<AppointmentAuditListItem>>(
            Assert.IsType<OkObjectResult>(Make(appointments, audit).AppointmentAudit().Result).Value);

        Assert.Equal(2, items.Count);
        Assert.Equal(AppointmentAuditEntry.Created, items[0].Action);
        Assert.Equal("John Smith", items[0].ChangedByName);
        Assert.Equal("Checkup", items[0].AppointmentTitle);
        Assert.Equal(AppointmentAuditEntry.Cancelled, items[1].Action);
        Assert.Equal("Jane Porter", items[1].ChangedByName);
    }

    [Fact]
    public void AppointmentAudit_RejectsBadRangeOrAction()
    {
        var c = Make();
        Assert.IsType<BadRequestObjectResult>(c.AppointmentAudit(
            from: DateTimeOffset.UtcNow,
            to: DateTimeOffset.UtcNow.AddHours(-1)).Result);
        Assert.IsType<BadRequestObjectResult>(c.AppointmentAudit(action: "NOPE").Result);
    }

    [Fact]
    public void AppointmentAudit_FiltersByAction()
    {
        var appointments = new InMemoryAppointmentStore();
        var audit = new InMemoryAppointmentAuditStore();
        var appt = appointments.Add(new Appointment
        {
            Title = "Yoga",
            ProviderId = SeedIds.ProviderUser,
            StartDateTime = DateTimeOffset.UtcNow.AddDays(1),
            EndDateTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
            Status = AppointmentStatus.Available
        });
        audit.Add(new AppointmentAuditEntry
        {
            AppointmentId = appt.Id,
            ChangedByUserId = SeedIds.ProviderUser,
            Action = AppointmentAuditEntry.Created,
            NewStatus = AppointmentStatus.Available
        });
        audit.Add(new AppointmentAuditEntry
        {
            AppointmentId = appt.Id,
            ChangedByUserId = SeedIds.ClientUser,
            Action = AppointmentAuditEntry.StatusChange,
            OldStatus = AppointmentStatus.Available,
            NewStatus = AppointmentStatus.Booked
        });

        var items = Assert.IsType<List<AppointmentAuditListItem>>(
            Assert.IsType<OkObjectResult>(
                Make(appointments, audit).AppointmentAudit(action: AppointmentAuditEntry.StatusChange).Result).Value);
        Assert.Equal(AppointmentAuditEntry.StatusChange, Assert.Single(items).Action);
    }
}
