namespace HMS.Contracts.Identity;

public sealed class DoctorPatientsGroupedDto
{
    public List<PatientProfileDto> PrimaryPatients { get; set; } = [];
    public List<PatientProfileDto> InteractedPatients { get; set; } = [];
}
