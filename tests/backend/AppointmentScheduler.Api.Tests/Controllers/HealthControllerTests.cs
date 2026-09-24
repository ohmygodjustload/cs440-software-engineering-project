using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class HealthControllerTests
{
    [Fact]
    public void Get_ReturnsOkWithOkStatus()
    {
        var controller = new HealthController();

        var result = controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<HealthResponse>(ok.Value);
        Assert.Equal("ok", payload.Status);
        Assert.Equal("AppointmentScheduler.Api", payload.Service);
    }

    [Fact]
    public void Get_ReturnsUtcTimestamp()
    {
        var before = DateTimeOffset.UtcNow;

        var result = new HealthController().Get();

        var payload = Assert.IsType<HealthResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(DateTimeOffset.UtcNow.Offset, payload.Timestamp.Offset);
        Assert.InRange(payload.Timestamp, before, DateTimeOffset.UtcNow);
    }
}
