namespace HMS.Contracts.Identity
{
    public class UpdateAppointmentStatusDto
    {
        public string Status { get; set; } = string.Empty;
        public string? CancellationReason { get; set; }
    }
}
