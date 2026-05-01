namespace HMS.Contracts.Identity
{
    public class CreateAppointmentRequestDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public DateOnly DateOfBirth { get; set; }
        public DateOnly PreferredDate { get; set; }
        public string ReasonForVisit { get; set; } = string.Empty;
    }
}
