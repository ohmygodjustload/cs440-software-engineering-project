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

    [Fact]
    public void UpdateBookedNotes_OnlyWhileBookedForClient() {
        var store = new InMemoryAppointmentStore();
        var slot = Slot(store);
        Assert.False(store.UpdateBookedNotes(slot.Id, SeedIds.ClientUser, "too early"));
        Assert.True(store.BookSlot(slot.Id, SeedIds.ClientUser, "first"));
        Assert.True(store.UpdateBookedNotes(slot.Id, SeedIds.ClientUser, "updated"));
        Assert.False(store.UpdateBookedNotes(slot.Id, "someone-else", "nope"));
        Assert.Equal("updated", store.GetById(slot.Id)!.Notes);
    }

    [Fact]
    public void ReleaseBooking_ReturnsSlotToAvailable() {
        var store = new InMemoryAppointmentStore();
        var slot = Slot(store);
        Assert.True(store.BookSlot(slot.Id, SeedIds.ClientUser, "note"));
        Assert.True(store.ReleaseBooking(slot.Id, SeedIds.ClientUser));
        var released = store.GetById(slot.Id)!;
        Assert.Equal(AppointmentStatus.Available, released.Status);
        Assert.Null(released.UserId);
        Assert.Equal("", released.Notes);
        Assert.False(store.ReleaseBooking(slot.Id, SeedIds.ClientUser));
    }

    [Fact]
    public void RescheduleBooked_MovesTimes() {
        var store = new InMemoryAppointmentStore();
        var slot = Slot(store);
        Assert.True(store.BookSlot(slot.Id, SeedIds.ClientUser, ""));
        var start = DateTimeOffset.UtcNow.AddDays(2);
        var end = start.AddMinutes(45);
        Assert.True(store.RescheduleBooked(slot.Id, SeedIds.ClientUser, start, end));
        var moved = store.GetById(slot.Id)!;
        Assert.Equal(start, moved.StartDateTime);
        Assert.Equal(end, moved.EndDateTime);
        Assert.Equal(SeedIds.ClientUser, moved.UserId);
        Assert.Equal(AppointmentStatus.Booked, moved.Status);
    }

    [Fact]
    public void CancelBooked_SetsCanceled() {
        var store = new InMemoryAppointmentStore();
        var slot = Slot(store);
        Assert.False(store.CancelBooked(slot.Id));
        Assert.True(store.BookSlot(slot.Id, SeedIds.ClientUser, ""));
        Assert.True(store.CancelBooked(slot.Id));
        Assert.Equal(AppointmentStatus.Canceled, store.GetById(slot.Id)!.Status);
        Assert.False(store.CancelBooked(slot.Id));
    }
}
