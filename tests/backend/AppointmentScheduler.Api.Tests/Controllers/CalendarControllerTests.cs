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
            Status = AppointmentStatus.Scheduled
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
    public void Get_ExcludesCancelled()
    {
        var store = new InMemoryAppointmentStore();
        var start = new DateTimeOffset(2026, 10, 5, 9, 0, 0, TimeSpan.Zero);
        store.Add(new Appointment
        {
            Title = "Cancelled visit",
            Category = AppointmentCategory.Medical,
            StartDateTime = start,
            EndDateTime = start.AddHours(1),
            ProviderId = "p1",
            Status = AppointmentStatus.Cancelled
        });
        var controller = new CalendarController(store);

        var result = controller.Get(
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
            null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(Assert.IsType<List<CalendarItem>>(ok.Value));
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
            Status = AppointmentStatus.Scheduled
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
}
