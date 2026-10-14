namespace AppointmentScheduler.Api.Models;

public sealed class AppointmentType {
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string ProviderId { get; set; } = string.Empty;
    public string CustomServiceName { get; set; } = string.Empty;
    public int DurationInMinutes { get; set; }
    public decimal Price { get; set; }
    public string LocationId { get; set; }  = string.Empty;
    public string? Contact { get; set; }
    public bool IsMedical { get; set; }
    public bool IsBeauty { get; set; }
    public bool IsFitness { get; set; }
}
