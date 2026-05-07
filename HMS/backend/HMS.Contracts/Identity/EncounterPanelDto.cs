using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace HMS.Contracts.Identity
{
    public class EncounterPanelDto
    {
        public EncounterDto Encounter { get; set; } = default!;
        public PatientProfileDto Patient { get; set; } = default!;
        public List<PrescriptionDto> Prescriptions { get; set; } = new(); // []
        public List<DiagnosisDto> Diagnoses { get; set; } = new(); // [] ose kjo
        public List<LabRequestDto> LabRequests { get; set; } = new();
    }
}
