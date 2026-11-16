using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;

namespace AppointmentScheduler.Api.Tests.Stores;

public class InMemoryAppointmentAuditStoreTests
{
    [Fact]
    public void Query_FiltersAndOrdersNewestFirst()
    {
        var store = new InMemoryAppointmentAuditStore();
        var older = new AppointmentAuditEntry
        {
            AppointmentId = "a1",
            ChangedByUserId = SeedIds.ClientUser,
            Action = AppointmentAuditEntry.Created,
            Timestamp = DateTimeOffset.UtcNow.AddHours(-2),
            NewStatus = AppointmentStatus.Available
        };
        var newer = new AppointmentAuditEntry
        {
            AppointmentId = "a2",
            ChangedByUserId = SeedIds.ProviderUser,
            Action = AppointmentAuditEntry.Cancelled,
            Timestamp = DateTimeOffset.UtcNow.AddHours(-1),
            OldStatus = AppointmentStatus.Booked,
            NewStatus = AppointmentStatus.Canceled
        };
        store.Add(older);
        store.Add(newer);

        var all = store.Query();
        Assert.Equal([newer.Id, older.Id], all.Select(e => e.Id));

        var cancelled = store.Query(action: AppointmentAuditEntry.Cancelled);
        Assert.Equal(newer.Id, Assert.Single(cancelled).Id);

        var window = store.Query(from: DateTimeOffset.UtcNow.AddHours(-1.5), to: DateTimeOffset.UtcNow);
        Assert.Equal(newer.Id, Assert.Single(window).Id);
    }
}
