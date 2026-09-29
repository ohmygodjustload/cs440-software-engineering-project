using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class ProvidersControllerTests
{
    [Fact]
    public void List_IncludesSeedProviders()
    {
        var controller = new ProvidersController(new InMemoryProviderStore());

        var result = controller.List();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotEmpty(Assert.IsType<List<Provider>>(ok.Value));
    }

    [Fact]
    public void Create_RejectsMissingName()
    {
        var controller = new ProvidersController(new InMemoryProviderStore());

        var result = controller.Create(new Provider { Name = "  " });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
