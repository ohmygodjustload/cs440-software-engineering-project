using AppointmentScheduler.Api.Controllers;
using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;
using Microsoft.AspNetCore.Mvc;

namespace AppointmentScheduler.Api.Tests.Controllers;

public class ProviderRequestsControllerTests
{
    private readonly InMemoryUserStore _users = new();
    private readonly InMemoryProviderRequestStore _requests = new();

    private ProviderRequestsController CreateController() => new(_requests, _users);

    private User AddPendingProvider(string username = "PendingPro")
    {
        var user = _users.Add(new User
        {
            FirstName = "Pending",
            LastName = "Provider",
            Username = username,
            IsServiceProvider = true,
            IsActive = false,
            ServiceTypes = [AppointmentCategory.Fitness],
            FitnessCredentials = new ServiceCredential { Info = "CPT, Fitness Institute" }
        });

        _requests.Add(new ProviderRequest
        {
            UserId = user.Id,
            ProviderName = $"{user.FirstName} {user.LastName}",
            ServiceTypes = user.ServiceTypes,
            FitnessCredentials = user.FitnessCredentials,
            IsReviewed = false,
            IsApproved = false,
            Notes = string.Empty
        });

        return user;
    }

    [Fact]
    public void List_DefaultsToOpenLog()
    {
        AddPendingProvider("OpenPro");
        var reviewed = AddPendingProvider("ClosedPro");
        var closed = _requests.GetLatestByUserId(reviewed.Id)!;
        closed.IsReviewed = true;
        closed.IsApproved = true;
        closed.ReviewedAt = DateTimeOffset.UtcNow;
        _requests.Update(closed);

        var result = CreateController().List();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsType<List<ProviderRequest>>(ok.Value);
        var item = Assert.Single(items);
        Assert.Equal("OpenPro", _users.GetById(item.UserId)!.Username);
        Assert.False(item.IsReviewed);
    }

    [Fact]
    public void List_ClosedLogReturnsReviewedRequests()
    {
        var user = AddPendingProvider("DonePro");
        var closed = _requests.GetLatestByUserId(user.Id)!;
        closed.IsReviewed = true;
        closed.IsApproved = false;
        closed.Notes = "Missing license.";
        closed.ReviewedAt = DateTimeOffset.UtcNow;
        _requests.Update(closed);

        var result = CreateController().List("closed");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var item = Assert.Single(Assert.IsType<List<ProviderRequest>>(ok.Value));
        Assert.True(item.IsReviewed);
        Assert.False(item.IsApproved);
        Assert.Equal("Missing license.", item.Notes);
    }

    [Fact]
    public void List_AllReturnsBothLogs()
    {
        AddPendingProvider("OpenPro");
        var user = AddPendingProvider("ClosedPro");
        var closed = _requests.GetLatestByUserId(user.Id)!;
        closed.IsReviewed = true;
        _requests.Update(closed);

        var result = CreateController().List("all");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(2, Assert.IsType<List<ProviderRequest>>(ok.Value).Count);
    }

    [Fact]
    public void GetById_ReturnsRequestOr404()
    {
        AddPendingProvider();
        var id = Assert.Single(_requests.GetAll()).Id;
        var controller = CreateController();

        var found = Assert.IsType<OkObjectResult>(controller.GetById(id).Result);
        Assert.Equal(id, Assert.IsType<ProviderRequest>(found.Value).Id);

        Assert.IsType<NotFoundResult>(controller.GetById("missing-id").Result);
    }

    [Fact]
    public void Approve_MarksReviewedAndActivatesProvider()
    {
        var user = AddPendingProvider();
        var id = Assert.Single(_requests.GetAll()).Id;

        var result = CreateController().Approve(id, new ProviderRequestDecisionDto { Notes = "  Credentials verified. " });

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ProviderRequest>(ok.Value);
        Assert.True(payload.IsReviewed);
        Assert.True(payload.IsApproved);
        Assert.Equal("Credentials verified.", payload.Notes);
        Assert.NotNull(payload.ReviewedAt);

        Assert.True(_users.GetById(user.Id)!.IsActive);
    }

    [Fact]
    public void Approve_WithoutNoteStoresEmptyString()
    {
        AddPendingProvider();
        var id = Assert.Single(_requests.GetAll()).Id;

        var result = CreateController().Approve(id);

        var payload = Assert.IsType<ProviderRequest>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.True(payload.IsApproved);
        Assert.Equal(string.Empty, payload.Notes);
    }

    [Fact]
    public void Approve_UnknownRequestReturns404()
    {
        Assert.IsType<NotFoundResult>(CreateController().Approve("missing-id").Result);
    }

    [Fact]
    public void Approve_AlreadyReviewedReturns409()
    {
        AddPendingProvider();
        var id = Assert.Single(_requests.GetAll()).Id;
        var controller = CreateController();
        _ = controller.Approve(id);

        Assert.IsType<ConflictObjectResult>(controller.Approve(id).Result);
    }

    [Fact]
    public void Reject_KeepsProviderInactiveAndStoresReason()
    {
        var user = AddPendingProvider();
        var id = Assert.Single(_requests.GetAll()).Id;

        var result = CreateController().Reject(id, new ProviderRequestDecisionDto { Notes = "License could not be verified." });

        var payload = Assert.IsType<ProviderRequest>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.True(payload.IsReviewed);
        Assert.False(payload.IsApproved);
        Assert.Equal("License could not be verified.", payload.Notes);

        Assert.False(_users.GetById(user.Id)!.IsActive);
    }

    [Fact]
    public void Reject_AlreadyReviewedReturns409()
    {
        AddPendingProvider();
        var id = Assert.Single(_requests.GetAll()).Id;
        var controller = CreateController();
        _ = controller.Reject(id);

        Assert.IsType<ConflictObjectResult>(controller.Reject(id).Result);
    }
}

