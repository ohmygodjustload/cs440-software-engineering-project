using System.ComponentModel.DataAnnotations;

namespace AppointmentScheduler.Api.Models;

/// <summary>
/// Body for <c>PUT /api/users/{id}</c>. Only identity and category-notification fields are editable.
/// </summary>
public sealed class UserUpdateDto
{
    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    [MaxLength(320)]
    public string? Email { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    public bool NotifyMedical { get; set; } = true;

    public bool NotifyBeauty { get; set; } = true;

    public bool NotifyFitness { get; set; } = true;
}
