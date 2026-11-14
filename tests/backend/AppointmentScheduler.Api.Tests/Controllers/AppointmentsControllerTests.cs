using System.Reflection;
using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Services;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class AppointmentsControllerTests {
    private sealed class FakeUser(string? id) : ICurrentUser {
        public string? UserId => id;
    }

    private static AppointmentsController CreateController() {
        return new AppointmentsController(new InMemoryAppointmentStore());
    }

    private static (AppointmentsController c, InMemoryAppointmentStore store, InMemoryAppointmentAuditStore audit, InMemoryNotificationStore notes)
        ClientController(string? userId = SeedIds.ClientUser) {
        var store = new InMemoryAppointmentStore();
        var users = new InMemoryUserStore();
        var notifications = new InMemoryNotificationStore();
        var audit = new InMemoryAppointmentAuditStore();
        var service = new NotificationService(notifications, users);
        var c = new AppointmentsController(store, null, new FakeUser(userId), users, service, null, audit);
        return (c, store, audit, notifications);
    }

    private static CreateAppointmentDto ValidDto() => new() {
        Title = "Dental checkup",
        Category = AppointmentCategory.Medical,
        StartDateTime = DateTimeOffset.UtcNow.AddDays(1),
        EndDateTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
        ProviderId = "provider-1",
        Location = "Clinic A"
    };

    private static Appointment AddAt(InMemoryAppointmentStore store, double hours, string? userId, AppointmentStatus status) {
        var start = DateTimeOffset.UtcNow.AddHours(hours);
        return store.Add(new Appointment {
            Title = "Seeded", ProviderId = SeedIds.ProviderUser, StartDateTime = start,
            EndDateTime = start.AddMinutes(30), UserId = userId, Status = status,
        });
    }

    private static AppointmentsController Mine(InMemoryAppointmentStore store, string? userId) =>
        new(store, null, new FakeUser(userId), new InMemoryUserStore());

    [Fact]
    public void Create_ReturnsCreatedAppointment() {
        var controller = CreateController();

        var result = controller.Create(ValidDto());

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<Appointment>(created.Value);
        Assert.Equal("Dental checkup", payload.Title);
        Assert.Equal(AppointmentStatus.Booked, payload.Status);
    }

    [Fact]
    public void Create_RejectsEndBeforeStart() {
        var controller = CreateController();
        var dto = ValidDto();
        dto.EndDateTime = dto.StartDateTime!.Value.AddHours(-1);

        var result = controller.Create(dto);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public void List_FiltersByCategory() {
        var controller = CreateController();
        controller.Create(ValidDto());
        var fitness = ValidDto();
        fitness.Title = "Yoga";
        fitness.Category = AppointmentCategory.Fitness;
        controller.Create(fitness);

        var result = controller.List(null, null, AppointmentCategory.Fitness, null, null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<PagedResult<Appointment>>(ok.Value);
        Assert.Equal(1, payload.Total);
        Assert.Single(payload.Items);
        Assert.Equal("Yoga", payload.Items[0].Title);
    }

    [Fact]
    public void GetMine_ReturnsOnlyCallersBookedAppointments_SoonestFirst() {
        var store = new InMemoryAppointmentStore();
        var later = AddAt(store, 48, SeedIds.ClientUser, AppointmentStatus.Booked);
        var sooner = AddAt(store, 24, SeedIds.ClientUser, AppointmentStatus.Booked);
        AddAt(store, 30, SeedIds.ClientUser, AppointmentStatus.Canceled);
        AddAt(store, 31, "someone-else", AppointmentStatus.Booked);
        AddAt(store, 32, null, AppointmentStatus.Available);

        var items = Assert.IsType<List<Appointment>>(
            Assert.IsType<OkObjectResult>(Mine(store, SeedIds.ClientUser).GetMine().Result).Value);
        Assert.Equal([sooner.Id, later.Id], items.Select(a => a.Id));
    }

    [Fact]
    public void GetMine_NoUser_401() =>
        Assert.IsType<UnauthorizedResult>(Mine(new InMemoryAppointmentStore(), null).GetMine().Result);

    [Fact]
    public void GetMine_NotAClient_403() =>
        Assert.IsType<ForbidResult>(Mine(new InMemoryAppointmentStore(), SeedIds.ProviderUser).GetMine().Result);

    [Fact]
    public void Update_And_Delete_RoundTrip() {
        var controller = CreateController();
        var created = Assert.IsType<CreatedAtActionResult>(controller.Create(ValidDto()).Result);
        var id = Assert.IsType<Appointment>(created.Value).Id;

        var updated = controller.Update(id, new UpdateAppointmentDto { Title = "Renamed" });
        Assert.Equal("Renamed", Assert.IsType<Appointment>(Assert.IsType<OkObjectResult>(updated.Result).Value).Title);

        // DELETE is a soft cancel: record stays with Status = Cancelled.
        Assert.IsType<NoContentResult>(controller.Delete(id));
        var cancelled = Assert.IsType<Appointment>(Assert.IsType<OkObjectResult>(controller.GetById(id).Result).Value);
        Assert.Equal(AppointmentStatus.Canceled, cancelled.Status);
    }

    [Fact]
    public void Delete_IsIdempotent_And_KeepsHistory() {
        var controller = CreateController();
        var created = Assert.IsType<CreatedAtActionResult>(controller.Create(ValidDto()).Result);
        var id = Assert.IsType<Appointment>(created.Value).Id;

        Assert.IsType<NoContentResult>(controller.Delete(id));
        Assert.IsType<NoContentResult>(controller.Delete(id));

        var list = controller.List(null, null, null, AppointmentStatus.Canceled, null);
        var ok = Assert.IsType<OkObjectResult>(list.Result);
        var payload = Assert.IsType<PagedResult<Appointment>>(ok.Value);
        Assert.Contains(payload.Items, a => a.Id == id);
    }

    [Fact]
    public void List_RejectsToBeforeFrom() {
        var controller = CreateController();

        var result = controller.List(
            new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            null, null, null);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public void Update_ProviderId_ResolvesProviderName() {
        var appointmentStore = new InMemoryAppointmentStore();
        var providerStore = new InMemoryProviderStore();
        var provider = providerStore.GetAll()[0];
        var controller = new AppointmentsController(appointmentStore, providerStore);

        var created = Assert.IsType<CreatedAtActionResult>(controller.Create(ValidDto()).Result);
        var id = Assert.IsType<Appointment>(created.Value).Id;

        var updated = controller.Update(id, new UpdateAppointmentDto { ProviderId = provider.Id });
        var payload = Assert.IsType<Appointment>(Assert.IsType<OkObjectResult>(updated.Result).Value);

        Assert.Equal(provider.Id, payload.ProviderId);
        Assert.Equal(provider.Name, payload.ProviderName);
    }

    [Fact]
    public void Update_ProviderId_ExplicitNameWins() {
        var appointmentStore = new InMemoryAppointmentStore();
        var providerStore = new InMemoryProviderStore();
        var provider = providerStore.GetAll()[0];
        var controller = new AppointmentsController(appointmentStore, providerStore);

        var created = Assert.IsType<CreatedAtActionResult>(controller.Create(ValidDto()).Result);
        var id = Assert.IsType<Appointment>(created.Value).Id;

        var updated = controller.Update(id, new UpdateAppointmentDto {
            ProviderId = provider.Id,
            ProviderName = "Custom name"
        });
        var payload = Assert.IsType<Appointment>(Assert.IsType<OkObjectResult>(updated.Result).Value);

        Assert.Equal("Custom name", payload.ProviderName);
    }

    [Fact]
    public void Create_RejectsUnapprovedProvider() {
        var appointmentStore = new InMemoryAppointmentStore();
        var providerStore = new InMemoryProviderStore();
        var unapproved = providerStore.GetAll()[0];
        unapproved.IsApproved = false;
        var controller = new AppointmentsController(appointmentStore, providerStore);

        var dto = ValidDto();
        dto.ProviderId = unapproved.Id;

        var result = controller.Create(dto);

        Assert.Equal(StatusCodes.Status403Forbidden, Assert.IsType<ObjectResult>(result.Result).StatusCode);
        Assert.Empty(appointmentStore.GetAll());
    }

    [Fact]
    public void List_HidesSlotsFromUnapprovedProviders() {
        var appointmentStore = new InMemoryAppointmentStore();
        var providerStore = new InMemoryProviderStore();
        var approved = providerStore.GetAll()[0];
        var unapproved = providerStore.GetAll()[1];
        unapproved.IsApproved = false;
        var controller = new AppointmentsController(appointmentStore, providerStore);

        var visible = ValidDto();
        visible.Title = "Visible slot";
        visible.ProviderId = approved.Id;
        controller.Create(visible);

        var hidden = ValidDto();
        hidden.Title = "Hidden slot";
        hidden.ProviderId = unapproved.Id;
        controller.Create(hidden);

        var result = controller.List(null, null, null, null, null);

        var payload = Assert.IsType<PagedResult<Appointment>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        var item = Assert.Single(payload.Items);
        Assert.Equal("Visible slot", item.Title);
        Assert.Equal(approved.Id, item.ProviderId);
    }

    [Fact]
    public void List_ShowsAppointmentsOfApprovedProviders() {
        var appointmentStore = new InMemoryAppointmentStore();
        var providerStore = new InMemoryProviderStore();
        var approved = providerStore.GetAll()[0];
        var controller = new AppointmentsController(appointmentStore, providerStore);

        var dto = ValidDto();
        dto.ProviderId = approved.Id;
        controller.Create(dto);

        var result = controller.List(null, null, null, null, null);

        var payload = Assert.IsType<PagedResult<Appointment>>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Single(payload.Items);
    }

    [Fact]
    public void Update_And_Delete_RequireAdminRole() {
        Assert.NotNull(typeof(AppointmentsController).GetMethod(nameof(AppointmentsController.Update))!
            .GetCustomAttribute<AuthorizeAttribute>());
        Assert.Equal("Admin", typeof(AppointmentsController).GetMethod(nameof(AppointmentsController.Update))!
            .GetCustomAttribute<AuthorizeAttribute>()!.Roles);
        Assert.Equal("Admin", typeof(AppointmentsController).GetMethod(nameof(AppointmentsController.Delete))!
            .GetCustomAttribute<AuthorizeAttribute>()!.Roles);
    }

    [Fact]
    public void UpdateNotes_ChangesOnlyNotes_AndNotifiesProvider() {
        var (c, store, _, notes) = ClientController();
        var booked = AddAt(store, 24, SeedIds.ClientUser, AppointmentStatus.Booked);
        booked.Title = "Checkup";
        booked.Category = AppointmentCategory.Medical;
        var originalStart = booked.StartDateTime;

        var updated = Assert.IsType<Appointment>(
            Assert.IsType<OkObjectResult>(c.UpdateNotes(booked.Id, new UpdateNotesDto { Notes = "  bring forms  " }).Result).Value);

        Assert.Equal("bring forms", updated.Notes);
        Assert.Equal(originalStart, updated.StartDateTime);
        Assert.Equal(AppointmentStatus.Booked, updated.Status);
        Assert.Equal(SeedIds.ClientUser, updated.UserId);
        Assert.Contains(notes.GetAll(SeedIds.ProviderUser), n => n.Event == "appointment-edited");
    }

    [Fact]
    public void UpdateNotes_UnauthorizedForbiddenNotFoundConflict() {
        var (c, store, _, _) = ClientController();
        var booked = AddAt(store, 24, SeedIds.ClientUser, AppointmentStatus.Booked);
        var past = AddAt(store, -1, SeedIds.ClientUser, AppointmentStatus.Booked);
        var other = AddAt(store, 24, "someone-else", AppointmentStatus.Booked);

        Assert.IsType<UnauthorizedResult>(ClientController(null).c.UpdateNotes(booked.Id, new UpdateNotesDto()).Result);
        Assert.IsType<ForbidResult>(ClientController(SeedIds.ProviderUser).c.UpdateNotes(booked.Id, new UpdateNotesDto()).Result);
        Assert.IsType<NotFoundResult>(c.UpdateNotes("missing", new UpdateNotesDto()).Result);
        Assert.IsType<ForbidResult>(c.UpdateNotes(other.Id, new UpdateNotesDto()).Result);
        Assert.IsType<ConflictObjectResult>(c.UpdateNotes(past.Id, new UpdateNotesDto()).Result);
    }

    [Fact]
    public void CancelBooking_ReleasesSlot_WritesAudit_AndNotifiesProvider() {
        var (c, store, audit, notes) = ClientController();
        var booked = AddAt(store, 24, SeedIds.ClientUser, AppointmentStatus.Booked);
        booked.Title = "Checkup";
        booked.Notes = "keep me";

        var released = Assert.IsType<Appointment>(
            Assert.IsType<OkObjectResult>(c.CancelBooking(booked.Id).Result).Value);

        Assert.Equal(AppointmentStatus.Available, released.Status);
        Assert.Null(released.UserId);
        Assert.Equal("", released.Notes);
        var entry = Assert.Single(audit.Query(action: AppointmentAuditEntry.Cancelled));
        Assert.Equal(booked.Id, entry.AppointmentId);
        Assert.Equal(SeedIds.ClientUser, entry.ChangedByUserId);
        Assert.Equal(AppointmentStatus.Booked, entry.OldStatus);
        Assert.Equal(AppointmentStatus.Available, entry.NewStatus);
        Assert.Contains(notes.GetAll(SeedIds.ProviderUser), n => n.Event == "appointment-cancelled");
    }

    [Fact]
    public void CancelBooking_PastOrWrongOwner_409Or403() {
        var (c, store, _, _) = ClientController();
        var past = AddAt(store, -2, SeedIds.ClientUser, AppointmentStatus.Booked);
        var other = AddAt(store, 24, "someone-else", AppointmentStatus.Booked);

        Assert.IsType<ConflictObjectResult>(c.CancelBooking(past.Id).Result);
        Assert.IsType<ForbidResult>(c.CancelBooking(other.Id).Result);
    }
}
