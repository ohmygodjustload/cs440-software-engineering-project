using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class AppointmentsControllerTests
{
    private static AppointmentsController CreateController()
    {
        return new AppointmentsController(new InMemoryAppointmentStore());
    }

    private static CreateAppointmentDto ValidDto() => new()
    {
        Title = "Dental checkup",
        Category = AppointmentCategory.Medical,
        StartDateTime = DateTimeOffset.UtcNow.AddDays(1),
        EndDateTime = DateTimeOffset.UtcNow.AddDays(1).AddHours(1),
        ProviderId = "provider-1",
        Location = "Clinic A"
    };

    [Fact]
    public void Create_ReturnsCreatedAppointment()
    {
        var controller = CreateController();

        var result = controller.Create(ValidDto());

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<Appointment>(created.Value);
        Assert.Equal("Dental checkup", payload.Title);
        Assert.Equal(AppointmentStatus.Scheduled, payload.Status);
    }

    [Fact]
    public void Create_RejectsEndBeforeStart()
    {
        var controller = CreateController();
        var dto = ValidDto();
        dto.EndDateTime = dto.StartDateTime!.Value.AddHours(-1);

        var result = controller.Create(dto);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public void List_FiltersByCategory()
    {
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
    public void Update_And_Delete_RoundTrip()
    {
        var controller = CreateController();
        var created = Assert.IsType<CreatedAtActionResult>(controller.Create(ValidDto()).Result);
        var id = Assert.IsType<Appointment>(created.Value).Id;

        var updated = controller.Update(id, new UpdateAppointmentDto { Title = "Renamed" });
        Assert.Equal("Renamed", Assert.IsType<Appointment>(Assert.IsType<OkObjectResult>(updated.Result).Value).Title);

        Assert.IsType<NoContentResult>(controller.Delete(id));
        Assert.IsType<NotFoundResult>(controller.GetById(id).Result);
    }
}
