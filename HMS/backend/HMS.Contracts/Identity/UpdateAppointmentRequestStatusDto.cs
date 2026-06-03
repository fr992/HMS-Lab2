namespace HMS.Contracts.Identity
{
    public class UpdateAppointmentRequestStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public int? DoctorProfileId { get; set; }
    }
}
