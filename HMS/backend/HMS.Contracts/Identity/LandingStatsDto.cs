namespace HMS.Contracts.Identity;

public sealed class LandingStatsDto
{
    public int Patients { get; init; }
    public int Staff { get; init; }
    public int Doctors { get; init; }
    public int Departments { get; init; }
    public int Specialties { get; init; }
    public int Appointments { get; init; }
}
