namespace AppointmentScheduler.Api.Models;

public sealed class Location {
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public int Zip { get; set; }
    public override string ToString() => $"{Street}, {City}, {State}, {Zip}";
}
