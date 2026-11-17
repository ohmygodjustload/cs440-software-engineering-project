using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class CalendarControllerTests
{
    [Fact]
    public void Get_ReturnsItemsInRange()
    {
        var store = new InMemoryAppointmentStore();
        var start = new DateTimeOffset(2026, 10, 5, 9, 0, 0, TimeSpan.Zero);
        store.Add(new Appointment
        {
            Title = "Haircut",
            Category = AppointmentCategory.Beauty,
            StartDateTime = start,
            EndDateTime = start.AddHours(1),
            ProviderId = "p1",
            Status = AppointmentStatus.Booked
        });
        var controller = new CalendarController(store);

        var result = controller.Get(
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
            null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsType<List<CalendarItem>>(ok.Value);
        Assert.Single(items);
        Assert.Equal("Haircut", items[0].Title);
    }

    [Fact]
    public void Get_Unauthenticated_IncludesCanceledButExcludesAvailable()
    {
        var store = new InMemoryAppointmentStore();
        var start = new DateTimeOffset(2026, 10, 5, 9, 0, 0, TimeSpan.Zero);
        store.Add(new Appointment
        {
            Title = "Canceled visit",
            Category = AppointmentCategory.Medical,
            StartDateTime = start,
            EndDateTime = start.AddHours(1),
            ProviderId = "p1",
            Status = AppointmentStatus.Canceled
        });
        store.Add(new Appointment
        {
            Title = "Open slot",
            Category = AppointmentCategory.Medical,
            StartDateTime = start.AddHours(2),
            EndDateTime = start.AddHours(3),
            ProviderId = "p1",
            Status = AppointmentStatus.Available
        });
        var controller = new CalendarController(store);

        var result = controller.Get(
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
            null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsType<List<CalendarItem>>(ok.Value);
        var item = Assert.Single(items);
        Assert.Equal("Canceled visit", item.Title);
        Assert.Equal(AppointmentStatus.Canceled, item.Status);
    }

    [Fact]
    public void Get_AuthenticatedUser_IncludesAvailableAndCanceledForUser()
    {
        var store = new InMemoryAppointmentStore();
        var start = new DateTimeOffset(2026, 10, 5, 9, 0, 0, TimeSpan.Zero);

        store.Add(new Appointment
        {
            Title = "User canceled",
            Category = AppointmentCategory.Medical,
            StartDateTime = start,
            EndDateTime = start.AddHours(1),
            ProviderId = "p1",
            UserId = "user-1",
            Status = AppointmentStatus.Canceled
        });
        store.Add(new Appointment
        {
            Title = "User available",
            Category = AppointmentCategory.Medical,
            StartDateTime = start.AddHours(2),
            EndDateTime = start.AddHours(3),
            ProviderId = "p1",
            UserId = "user-1",
            Status = AppointmentStatus.Available
        });
        store.Add(new Appointment
        {
            Title = "Other user appointment",
            Category = AppointmentCategory.Medical,
            StartDateTime = start.AddHours(4),
            EndDateTime = start.AddHours(5),
            ProviderId = "p1",
            UserId = "user-2",
            Status = AppointmentStatus.Booked
        });

        var controller = new CalendarController(store, new FakeCurrentUser("user-1"));

        var result = controller.Get(
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
            null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsType<List<CalendarItem>>(ok.Value);
        Assert.Equal(2, items.Count);
        Assert.Contains(items, i => i.Title == "User canceled" && i.Status == AppointmentStatus.Canceled);
        Assert.Contains(items, i => i.Title == "User available" && i.Status == AppointmentStatus.Available);
    }

    [Fact]
    public void Get_ExcludesAppointmentStartingExactlyAtTo()
    {
        // Half-open [from, to): midnight Nov 1 belongs to November, not October.
        var store = new InMemoryAppointmentStore();
        var boundary = new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero);
        store.Add(new Appointment
        {
            Title = "Midnight next month",
            Category = AppointmentCategory.Beauty,
            StartDateTime = boundary,
            EndDateTime = boundary.AddHours(1),
            ProviderId = "p1",
            Status = AppointmentStatus.Booked
        });
        var controller = new CalendarController(store);

        var result = controller.Get(
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            boundary,
            null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(Assert.IsType<List<CalendarItem>>(ok.Value));
    }

    [Fact]
    public void Get_RejectsToBeforeFrom()
    {
        var controller = new CalendarController(new InMemoryAppointmentStore());

        var result = controller.Get(
            new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            null);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    private sealed class FakeCurrentUser(string? userId) : ICurrentUser
    {
        public string? UserId => userId;
    }
}