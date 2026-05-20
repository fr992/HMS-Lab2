namespace HMS.Contracts.Identity
{
    public class BedPatientDetailsDto
    {
        public int BedId { get; set; }
        public string BedLabel { get; set; } = string.Empty;
        public string Ward { get; set; } = string.Empty;
        public string RoomNumber { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }

        public string? Floor { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }

        public int? PatientProfileId { get; set; }
        public string? PatientName { get; set; }
        public string? PatientNumber { get; set; }

        public int? EncounterId { get; set; }
        public string? EncounterNumber { get; set; }

        public DateTime? AssignedAt { get; set; }
    }
}
