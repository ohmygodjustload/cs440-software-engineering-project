using System.Reflection;
using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class SlotsControllerTests {
    private sealed class FakeUser(string? id) : ICurrentUser {
        public string? UserId => id;
    }

    private static (SlotsController c, InMemoryAppointmentStore appts) Make(
        string? userId = SeedIds.ProviderUser, InMemoryUserStore? users = null) {
        var appts = new InMemoryAppointmentStore();
        var c = new SlotsController(appts, users ?? new InMemoryUserStore(), new InMemoryAppointmentTypeStore(),
            new InMemoryLocationStore(), new FakeUser(userId));
        return (c, appts);
    }

    private static CreateSlotDto Dto(int hoursFromNow = 24) =>
        new() { AppointmentTypeId = SeedIds.Type, StartTime = DateTimeOffset.UtcNow.AddHours(hoursFromNow) };

    private const string OtherProvider = "6abc2000a313dfdf8ecc0010";
    private const string InactiveProvider = "6abc2000a313dfdf8ecc0011";

    private static InMemoryUserStore UsersWith(params User[] extra) {
        var users = new InMemoryUserStore();
        foreach (var u in extra) users.Add(u);
        return users;
    }

    private static Appointment Seed(InMemoryAppointmentStore appts, double hoursFromNow,
        string providerId = SeedIds.ProviderUser, string? typeId = SeedIds.Type,
        AppointmentCategory category = AppointmentCategory.Medical,
        AppointmentStatus status = AppointmentStatus.Available, string? userId = null) {
        var start = DateTimeOffset.UtcNow.AddHours(hoursFromNow);
        return appts.Add(new Appointment {
            Title = "Seeded", Category = category, ProviderId = providerId, AppointmentTypeId = typeId,
            StartDateTime = start, EndDateTime = start.AddMinutes(30), Status = status, UserId = userId,
        });
    }

    private static List<Appointment> Available(ActionResult<IReadOnlyList<Appointment>> result) =>
        Assert.IsType<List<Appointment>>(Assert.IsType<OkObjectResult>(result.Result).Value);

    private static string[] Ids(ActionResult<IReadOnlyList<Appointment>> result) =>
        [.. Available(result).Select(s => s.Id)];

    private const string DualRoleUser = "6abc2000a313dfdf8ecc0012";
    private const string InactiveClient = "6abc2000a313dfdf8ecc0013";

    private static Appointment Booked(ActionResult<Appointment> result) =>
        Assert.IsType<Appointment>(Assert.IsType<OkObjectResult>(result.Result).Value);

    [Fact]
    public void GetAvailable_ReturnsOnlyOpenFutureSlots_SoonestFirst() {
        var (c, appts) = Make();
        var later = Seed(appts, 48);
        var sooner = Seed(appts, 24);
        Seed(appts, -1); // past
        Seed(appts, 30, status: AppointmentStatus.Booked, userId: SeedIds.ClientUser); // booked
        Seed(appts, 31, userId: SeedIds.ClientUser); // Available but has a client
        appts.SoftDeleteSlot(Seed(appts, 32).Id); // deleted

        Assert.Equal(new[] { sooner.Id, later.Id }, Ids(c.GetAvailable()));
    }

    [Fact]
    public void GetAvailable_AllowsAnonymousCallers() {
        var method = typeof(SlotsController).GetMethod(nameof(SlotsController.GetAvailable))!;
        Assert.NotNull(method.GetCustomAttribute<AllowAnonymousAttribute>());

        var (c, appts) = Make(userId: null);
        Seed(appts, 24);
        Assert.Single(Available(c.GetAvailable()));
    }

    [Fact]
    public void GetAvailable_ExcludesSlotsOfUnapprovedProviders() {
        var users = UsersWith(new User {
            Id = InactiveProvider, FirstName = "Ina", LastName = "Active", Username = "InaActive",
            IsServiceProvider = true, IsActive = false,
        });
        var (c, appts) = Make(users: users);
        var approved = Seed(appts, 24);
        Seed(appts, 25, providerId: InactiveProvider, typeId: null);
        Seed(appts, 26, providerId: SeedIds.ClientUser, typeId: null); // active, but not a provider
        Seed(appts, 27, providerId: "unknown-user", typeId: null);

        Assert.Equal(new[] { approved.Id }, Ids(c.GetAvailable()));
    }

    [Fact]
    public void GetAvailable_IncludesProviderServiceLocationAndTimes() {
        var (c, appts) = Make();
        var seeded = Seed(appts, 24);

        var slot = Assert.Single(Available(c.GetAvailable()));
        Assert.Equal("John Smith", slot.ProviderName);
        Assert.Equal("General checkup", slot.Title); // from the appointment type, not the stored title
        Assert.Equal("1 Main St, Chicago, IL, 60601", slot.Location);
        Assert.Equal(seeded.StartDateTime, slot.StartDateTime);
        Assert.Equal(seeded.EndDateTime, slot.EndDateTime);
        Assert.Equal(AppointmentStatus.Available, slot.Status);
        Assert.Null(slot.UserId);
    }

    [Fact]
    public void GetAvailable_FiltersByCategoryProviderAndStartRange() {
        var users = UsersWith(new User {
            Id = OtherProvider, FirstName = "Bea", LastName = "Stylist", Username = "BeaStylist",
            IsServiceProvider = true, IsActive = true, ServiceTypes = [AppointmentCategory.Beauty],
        });
        var (c, appts) = Make(users: users);
        var medical = Seed(appts, 24, category: AppointmentCategory.Fitness); // the seeded type says Medical
        var beauty = Seed(appts, 48, providerId: OtherProvider, typeId: null, category: AppointmentCategory.Beauty);
        var cutoff = DateTimeOffset.UtcNow.AddHours(36);

        Assert.Equal(new[] { medical.Id }, Ids(c.GetAvailable(category: AppointmentCategory.Medical)));
        Assert.Empty(Ids(c.GetAvailable(category: AppointmentCategory.Fitness)));
        Assert.Equal(new[] { beauty.Id }, Ids(c.GetAvailable(category: AppointmentCategory.Beauty)));
        Assert.Equal(new[] { beauty.Id }, Ids(c.GetAvailable(providerId: OtherProvider)));
        Assert.Equal(new[] { medical.Id }, Ids(c.GetAvailable(providerId: SeedIds.ProviderUser)));
        Assert.Equal(new[] { beauty.Id }, Ids(c.GetAvailable(from: cutoff)));
        Assert.Equal(new[] { medical.Id }, Ids(c.GetAvailable(to: cutoff)));
        Assert.Empty(Ids(c.GetAvailable(category: AppointmentCategory.Medical, from: cutoff)));
    }

    [Fact]
    public void GetAvailable_FromNotBeforeTo_400() {
        var now = DateTimeOffset.UtcNow;
        Assert.IsType<BadRequestObjectResult>(
            Make().c.GetAvailable(from: now.AddDays(2), to: now.AddDays(1)).Result);
    }

    [Fact]
    public void Create_Succeeds_WithComputedEnd_AndAvailableStatus() {
        var (c, _) = Make();
        var dto = Dto();
        var slot = Assert.IsType<Appointment>(Assert.IsType<CreatedAtActionResult>(c.Create(dto).Result).Value);
        Assert.Equal(AppointmentStatus.Available, slot.Status);
        Assert.Null(slot.UserId);
        Assert.Equal(dto.StartTime!.Value.AddMinutes(30), slot.EndDateTime); // seeded type = 30 min
    }

    [Fact]
    public void Create_NoUser_401() => Assert.IsType<UnauthorizedResult>(Make(null).c.Create(Dto()).Result);

    [Fact]
    public void Create_ClientUser_403() => Assert.IsType<ForbidResult>(Make(SeedIds.ClientUser).c.Create(Dto()).Result);

    [Fact]
    public void Create_UnknownType_400() {
        var dto = Dto();
        dto.AppointmentTypeId = "nope";
        Assert.IsType<BadRequestObjectResult>(Make().c.Create(dto).Result);
    }

    [Fact]
    public void Create_PastStart_400() => Assert.IsType<BadRequestObjectResult>(Make().c.Create(Dto(-1)).Result);

    [Fact]
    public void Create_Overlap_409_ButBackToBackIsAllowed() {
        var (c, _) = Make();
        c.Create(Dto(24)); // 24h -> 24h30
        Assert.IsType<ConflictObjectResult>(c.Create(new CreateSlotDto {
            AppointmentTypeId = SeedIds.Type,
            StartTime = DateTimeOffset.UtcNow.AddHours(24).AddMinutes(15)
        }).Result);
        Assert.IsType<CreatedAtActionResult>(c.Create(new CreateSlotDto {
            AppointmentTypeId = SeedIds.Type,
            StartTime = DateTimeOffset.UtcNow.AddHours(24).AddMinutes(30)
        }).Result); // starts exactly at end
    }

    [Fact]
    public void GetMine_ReturnsOnlyOwnAvailable_NotDeleted() {
        var (c, appts) = Make();
        var id = Assert.IsType<Appointment>(Assert.IsType<CreatedAtActionResult>(c.Create(Dto()).Result).Value).Id;
        Assert.Single(Assert.IsType<List<Appointment>>(Assert.IsType<OkObjectResult>(c.GetMine().Result).Value));
        c.Delete(id);
        Assert.Empty(Assert.IsType<List<Appointment>>(Assert.IsType<OkObjectResult>(c.GetMine().Result).Value));
    }

    [Fact]
    public void Update_RecomputesEnd_AndMayOverlapItself() {
        var (c, _) = Make();
        var id = Assert.IsType<Appointment>(Assert.IsType<CreatedAtActionResult>(c.Create(Dto(24)).Result).Value).Id;
        var res = c.Update(id, new UpdateSlotDto { StartTime = DateTimeOffset.UtcNow.AddHours(24).AddMinutes(10) });
        Assert.IsType<OkObjectResult>(res.Result);
    }

    [Fact]
    public void Update_And_Delete_Return409_WhenBooked() {
        var (c, appts) = Make();
        var slot = Assert.IsType<Appointment>(Assert.IsType<CreatedAtActionResult>(c.Create(Dto()).Result).Value);
        slot.Status = AppointmentStatus.Booked; // simulate a client booking
        Assert.IsType<ConflictObjectResult>(c.Update(slot.Id, new UpdateSlotDto()).Result);
        Assert.IsType<ConflictObjectResult>(c.Delete(slot.Id));
    }

    [Fact]
    public void Delete_UnknownId_404() => Assert.IsType<NotFoundResult>(Make().c.Delete("missing"));

    [Fact]
    public void Book_SetsClientStatusAndNotes_AndReturnsConfirmationDetails() {
        var (c, appts) = Make(SeedIds.ClientUser);
        var seeded = Seed(appts, 24);

        var booked = Booked(c.Book(seeded.Id, new BookSlotDto { Notes = "  First visit  " }));

        Assert.Equal(seeded.Id, booked.Id);
        Assert.Equal(SeedIds.ClientUser, booked.UserId);
        Assert.Equal(AppointmentStatus.Booked, booked.Status);
        Assert.Equal("First visit", booked.Notes);
        Assert.Equal(SeedIds.ProviderUser, booked.ProviderId);
        Assert.Equal("John Smith", booked.ProviderName);
        Assert.Equal("General checkup", booked.Title); // from the appointment type, not the stored "Seeded"
        Assert.Equal("1 Main St, Chicago, IL, 60601", booked.Location);
        Assert.Equal(seeded.StartDateTime, booked.StartDateTime);
        Assert.Equal(seeded.EndDateTime, booked.EndDateTime);

        var stored = appts.GetById(seeded.Id)!;
        Assert.Equal(SeedIds.ClientUser, stored.UserId);
        Assert.Equal(AppointmentStatus.Booked, stored.Status);
        Assert.Equal("First visit", stored.Notes);
    }

    [Fact]
    public void Book_WithoutNotes_StoresEmptyNotes() {
        var (c, appts) = Make(SeedIds.ClientUser);
        Assert.Equal("", Booked(c.Book(Seed(appts, 24).Id)).Notes);
    }

    [Fact]
    public void Book_NoUser_401() {
        var (c, appts) = Make(null);
        Assert.IsType<UnauthorizedResult>(c.Book(Seed(appts, 24).Id).Result);
    }

    [Theory]
    [InlineData(SeedIds.ProviderUser)]
    [InlineData(SeedIds.AdminUser)]
    [InlineData(InactiveClient)]
    [InlineData("unknown-user")]
    public void Book_NotAnActiveClient_403(string userId) {
        var users = UsersWith(new User {
            Id = InactiveClient, FirstName = "Ina", LastName = "Client", Username = "InaClient",
            IsClient = true, IsActive = false,
        });
        var (c, appts) = Make(userId, users);
        var slot = Seed(appts, 24);

        Assert.IsType<ForbidResult>(c.Book(slot.Id).Result);
        Assert.Equal(AppointmentStatus.Available, appts.GetById(slot.Id)!.Status);
    }

    [Fact]
    public void Book_OwnSlot_403() {
        var users = UsersWith(new User {
            Id = DualRoleUser, FirstName = "Dee", LastName = "Dual", Username = "DeeDual",
            IsClient = true, IsServiceProvider = true, IsActive = true,
        });
        var (c, appts) = Make(DualRoleUser, users);
        Assert.IsType<ForbidResult>(c.Book(Seed(appts, 24, providerId: DualRoleUser, typeId: null).Id).Result);
    }

    [Fact]
    public void Book_MissingOrDeletedSlot_404() {
        var (c, appts) = Make(SeedIds.ClientUser);
        var deleted = Seed(appts, 24);
        appts.SoftDeleteSlot(deleted.Id);

        Assert.IsType<NotFoundResult>(c.Book("missing").Result);
        Assert.IsType<NotFoundResult>(c.Book(deleted.Id).Result);
    }

    [Fact]
    public void Book_SlotOfUnapprovedProvider_404() {
        var users = UsersWith(new User {
            Id = InactiveProvider, FirstName = "Ina", LastName = "Active", Username = "InaActive",
            IsServiceProvider = true, IsActive = false,
        });
        var (c, appts) = Make(SeedIds.ClientUser, users);
        Assert.IsType<NotFoundResult>(c.Book(Seed(appts, 24, providerId: InactiveProvider, typeId: null).Id).Result);
    }

    [Fact]
    public void Book_PastSlot_400() {
        var (c, appts) = Make(SeedIds.ClientUser);
        Assert.IsType<BadRequestObjectResult>(c.Book(Seed(appts, -1).Id).Result);
    }

    [Fact]
    public void Book_SlotNoLongerAvailable_409() {
        var (c, appts) = Make(SeedIds.ClientUser);
        var slot = Seed(appts, 24);
        Booked(c.Book(slot.Id));
        Assert.IsType<ConflictObjectResult>(c.Book(slot.Id).Result);

        var taken = Seed(appts, 48, status: AppointmentStatus.Booked, userId: "someone-else");
        Assert.IsType<ConflictObjectResult>(c.Book(taken.Id).Result);
    }

    [Fact]
    public void Book_OverlapsClientsAppointment_409_ButCanceledAndBackToBackDoNot() {
        var (c, appts) = Make(SeedIds.ClientUser);
        Seed(appts, 24, providerId: OtherProvider, typeId: null,
            status: AppointmentStatus.Booked, userId: SeedIds.ClientUser); // 24h -> 24h30
        Seed(appts, 48, providerId: OtherProvider, typeId: null,
            status: AppointmentStatus.Canceled, userId: SeedIds.ClientUser);
        var overlapping = Seed(appts, 24.25);
        var backToBack = Seed(appts, 24.5);
        var overCanceled = Seed(appts, 48);

        Assert.IsType<ConflictObjectResult>(c.Book(overlapping.Id).Result);
        Assert.Equal(AppointmentStatus.Available, appts.GetById(overlapping.Id)!.Status);
        Booked(c.Book(backToBack.Id));
        Booked(c.Book(overCanceled.Id));
    }

    [Fact]
    public void Book_ProviderSeesBookingInAppointmentsList() {
        var (c, appts) = Make(SeedIds.ClientUser);
        var slot = Seed(appts, 24);
        Booked(c.Book(slot.Id));

        var list = new AppointmentsController(appts).List(
            from: null, to: null, category: null, status: null, providerId: SeedIds.ProviderUser);
        var page = Assert.IsType<PagedResult<Appointment>>(Assert.IsType<OkObjectResult>(list.Result).Value);
        var item = Assert.Single(page.Items);
        Assert.Equal(slot.Id, item.Id);
        Assert.Equal(AppointmentStatus.Booked, item.Status);
        Assert.Equal(SeedIds.ClientUser, item.UserId);
    }
}
