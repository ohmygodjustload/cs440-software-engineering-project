using AppointmentScheduler.Api.Models;
using AppointmentScheduler.Api.Stores;

namespace AppointmentScheduler.Api.Tests.Stores;

public class InMemoryAppointmentStoreTests {
    private static Appointment Slot(InMemoryAppointmentStore store) {
        var start = DateTimeOffset.UtcNow.AddDays(1);
        return store.Add(new Appointment {
            ProviderId = SeedIds.ProviderUser, StartDateTime = start, EndDateTime = start.AddMinutes(30),
            Status = AppointmentStatus.Available, UserId = null,
        });
    }

    [Fact]
    public void BookSlot_SucceedsOnlyWhileAvailable() {
        var store = new InMemoryAppointmentStore();
        var slot = Slot(store);

        Assert.True(store.BookSlot(slot.Id, SeedIds.ClientUser, "hi"));
        Assert.False(store.BookSlot(slot.Id, "someone-else", "late"));

        var stored = store.GetById(slot.Id)!;
        Assert.Equal(SeedIds.ClientUser, stored.UserId);
        Assert.Equal(AppointmentStatus.Booked, stored.Status);
        Assert.Equal("hi", stored.Notes);
    }

    [Fact]
    public void BookSlot_MissingOrDeleted_False() {
        var store = new InMemoryAppointmentStore();
        var slot = Slot(store);
        store.SoftDeleteSlot(slot.Id);

        Assert.False(store.BookSlot("missing", SeedIds.ClientUser, ""));
        Assert.False(store.BookSlot(slot.Id, SeedIds.ClientUser, ""));
    }
}
