using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HMS.Contracts.Identity
{
    public class PatientAppointmentDto
    {
        public int Id { get; set; } // keep it (hidden in UI)

        public DateTime ScheduledStart { get; set; }
        public DateTime ScheduledEnd { get; set; }

        public string Status { get; set; } = string.Empty;

        public string DoctorName { get; set; } = string.Empty;
        public string? DepartmentName { get; set; }

        public string? AppointmentType { get; set; }
        public string? Reason { get; set; }
    }
}
