using System.ComponentModel.DataAnnotations;

namespace HMS.Contracts.Identity
{
    public class CreateAppointmentRequestDto
    {
        [Required, StringLength(100, MinimumLength = 2)]
        public string FirstName { get; set; } = string.Empty;
        [Required, StringLength(100, MinimumLength = 2)]
        public string LastName { get; set; } = string.Empty;
        [Required, EmailAddress, StringLength(256)]
        public string Email { get; set; } = string.Empty;
        [Required, StringLength(30, MinimumLength = 7)]
        [RegularExpression(@"^\+?[0-9][0-9\s().-]{5,28}[0-9]$", ErrorMessage = "Enter a valid phone number.")]
        public string Phone { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public DateOnly PreferredDate { get; set; }
        public int? DoctorProfileId { get; set; }
        [Required, StringLength(300, MinimumLength = 10)]
        public string ReasonForVisit { get; set; } = string.Empty;
    }
}
