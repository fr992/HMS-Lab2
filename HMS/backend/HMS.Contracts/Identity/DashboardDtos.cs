using System.Text.Json.Serialization;

namespace HMS.Contracts.Identity;

public sealed class DashboardTotalStatsDto
{
    public int Total { get; set; }
    public string Change { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty;
}

public sealed class DashboardCountStatsDto
{
    public int Count { get; set; }
    public string Change { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty;
}

public sealed class ActiveDoctorStatsDto
{
    public int Count { get; set; }
    public string Label { get; set; } = string.Empty;
}

public sealed class RevenueMtdStatsDto
{
    public string Formatted { get; set; } = string.Empty;
    public string Change { get; set; } = string.Empty;
    public string Trend { get; set; } = string.Empty;
}

public sealed class PatientTrendDto
{
    public string Month { get; set; } = string.Empty;
    public int Inpatient { get; set; }
    public int Outpatient { get; set; }
}

public sealed class RevenueChartDto
{
    public string Month { get; set; } = string.Empty;
    public int Revenue { get; set; }
}

public sealed class DepartmentChartDto
{
    public string Name { get; set; } = string.Empty;
    public int Patients { get; set; }
}

public sealed class BedOccupancyDto
{
    public int Occupied { get; set; }
    public int Available { get; set; }
    public int Total { get; set; }

    [JsonPropertyName("icu_pct")]
    public int IcuPct { get; set; }

    [JsonPropertyName("emergency_pct")]
    public int EmergencyPct { get; set; }

    [JsonPropertyName("general_pct")]
    public int GeneralPct { get; set; }
}

public sealed class RecentPatientDashboardDto
{
    public string Name { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string Department { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public sealed class UpcomingAppointmentDashboardDto
{
    public string Patient { get; set; } = string.Empty;
    public string Doctor { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

public sealed class DashboardAlertDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Desc { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}
