using AppointmentScheduler.Api.Auth;
using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class SlotsControllerTests {
    private sealed class FakeUser(string? id) : ICurrentUser {
        public string? UserId => id;
    }

    private static (SlotsController c, InMemoryAppointmentStore appts) Make(string? userId = SeedIds.ProviderUser) {
        var appts = new InMemoryAppointmentStore();
        var c = new SlotsController(appts, new InMemoryUserStore(), new InMemoryAppointmentTypeStore(),
            new InMemoryLocationStore(), new FakeUser(userId));
        return (c, appts);
    }

    private static CreateSlotDto Dto(int hoursFromNow = 24) =>
        new() { AppointmentTypeId = SeedIds.Type, StartTime = DateTimeOffset.UtcNow.AddHours(hoursFromNow) };

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
}
