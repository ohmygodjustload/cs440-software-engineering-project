using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Services;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public sealed class NotificationsControllerTests
{
    private sealed class FakeCurrentUser(string? userId) : ICurrentUser
    {
        public string? UserId => userId;
    }

    [Fact]
    public void List_ReturnsPersistedProviderAndClientNotifications()
    {
        var users = new InMemoryUserStore();
        var notifications = new InMemoryNotificationStore();
        var service = new NotificationService(notifications, users);

        service.OnAppointmentCreated(
            SeedIds.ProviderUser, "appointment-1", AppointmentCategory.Medical, "Annual physical");
        service.OnAppointmentBooked(
            SeedIds.ClientUser, SeedIds.ProviderUser, "appointment-1",
            AppointmentCategory.Medical, "Annual physical", "Jane Porter");

        var providerResult = new NotificationsController(
            new FakeCurrentUser(SeedIds.ProviderUser), users, notifications).List(mine: true);
        var clientResult = new NotificationsController(
            new FakeCurrentUser(SeedIds.ClientUser), users, notifications).List(mine: true);

        var providerItems = Assert.IsType<OkObjectResult>(providerResult.Result).Value
            as IReadOnlyList<Notification>;
        var clientItems = Assert.IsType<OkObjectResult>(clientResult.Result).Value
            as IReadOnlyList<Notification>;

        Assert.NotNull(providerItems);
        Assert.NotNull(clientItems);
        Assert.Contains(providerItems!, item =>
            item.Event == "appointment-booked" && item.Message == "Jane Porter booked your slot.");
        Assert.Contains(clientItems!, item =>
            item.Event == "appointment-booked" && item.Message == "Annual physical");
    }

    [Fact]
    public void List_RequiresBooleanMineFlag()
    {
        var result = new NotificationsController(
            new FakeCurrentUser(SeedIds.ClientUser),
            new InMemoryUserStore(),
            new InMemoryNotificationStore()).List();

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
