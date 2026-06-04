using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeHighVolumeQueryIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "People",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PersonalNumber",
                table: "People",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LastName",
                table: "People",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Gender",
                table: "People",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "FirstName",
                table: "People",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_People_Gender_LastName_FirstName",
                table: "People",
                columns: new[] { "Gender", "LastName", "FirstName" });

            migrationBuilder.CreateIndex(
                name: "IX_People_LastName_FirstName",
                table: "People",
                columns: new[] { "LastName", "FirstName" });

            migrationBuilder.CreateIndex(
                name: "IX_People_PersonalNumber",
                table: "People",
                column: "PersonalNumber");

            migrationBuilder.CreateIndex(
                name: "IX_People_Phone",
                table: "People",
                column: "Phone");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_Status_PaidAt",
                table: "Payments",
                columns: new[] { "Status", "PaidAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PatientProfiles_CreatedAt",
                table: "PatientProfiles",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PatientProfiles_PrimaryDoctorId_CreatedAt",
                table: "PatientProfiles",
                columns: new[] { "PrimaryDoctorId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NurseTasks_Status_CreatedAt",
                table: "NurseTasks",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NurseTasks_Status_DueAt",
                table: "NurseTasks",
                columns: new[] { "Status", "DueAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LabRequests_EncounterId_RequestedAt",
                table: "LabRequests",
                columns: new[] { "EncounterId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LabRequests_RequestedByDoctorId_RequestedAt",
                table: "LabRequests",
                columns: new[] { "RequestedByDoctorId", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LabRequests_Status_RequestedAt",
                table: "LabRequests",
                columns: new[] { "Status", "RequestedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_LabRequestItems_Status_CreatedAt",
                table: "LabRequestItems",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_DoctorProfileId_Status",
                table: "Encounters",
                columns: new[] { "DoctorProfileId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_PatientProfileId_ClosedAt",
                table: "Encounters",
                columns: new[] { "PatientProfileId", "ClosedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_Status_StartedAt",
                table: "Encounters",
                columns: new[] { "Status", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DoctorProfiles_IsActive_StaffProfileId",
                table: "DoctorProfiles",
                columns: new[] { "IsActive", "StaffProfileId" });

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignments_BedId_ReleasedAt",
                table: "BedAssignments",
                columns: new[] { "BedId", "ReleasedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignments_PatientProfileId_ReleasedAt",
                table: "BedAssignments",
                columns: new[] { "PatientProfileId", "ReleasedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_People_Gender_LastName_FirstName",
                table: "People");

            migrationBuilder.DropIndex(
                name: "IX_People_LastName_FirstName",
                table: "People");

            migrationBuilder.DropIndex(
                name: "IX_People_PersonalNumber",
                table: "People");

            migrationBuilder.DropIndex(
                name: "IX_People_Phone",
                table: "People");

            migrationBuilder.DropIndex(
                name: "IX_Payments_Status_PaidAt",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_PatientProfiles_CreatedAt",
                table: "PatientProfiles");

            migrationBuilder.DropIndex(
                name: "IX_PatientProfiles_PrimaryDoctorId_CreatedAt",
                table: "PatientProfiles");

            migrationBuilder.DropIndex(
                name: "IX_NurseTasks_Status_CreatedAt",
                table: "NurseTasks");

            migrationBuilder.DropIndex(
                name: "IX_NurseTasks_Status_DueAt",
                table: "NurseTasks");

            migrationBuilder.DropIndex(
                name: "IX_LabRequests_EncounterId_RequestedAt",
                table: "LabRequests");

            migrationBuilder.DropIndex(
                name: "IX_LabRequests_RequestedByDoctorId_RequestedAt",
                table: "LabRequests");

            migrationBuilder.DropIndex(
                name: "IX_LabRequests_Status_RequestedAt",
                table: "LabRequests");

            migrationBuilder.DropIndex(
                name: "IX_LabRequestItems_Status_CreatedAt",
                table: "LabRequestItems");

            migrationBuilder.DropIndex(
                name: "IX_Encounters_DoctorProfileId_Status",
                table: "Encounters");

            migrationBuilder.DropIndex(
                name: "IX_Encounters_PatientProfileId_ClosedAt",
                table: "Encounters");

            migrationBuilder.DropIndex(
                name: "IX_Encounters_Status_StartedAt",
                table: "Encounters");

            migrationBuilder.DropIndex(
                name: "IX_DoctorProfiles_IsActive_StaffProfileId",
                table: "DoctorProfiles");

            migrationBuilder.DropIndex(
                name: "IX_BedAssignments_BedId_ReleasedAt",
                table: "BedAssignments");

            migrationBuilder.DropIndex(
                name: "IX_BedAssignments_PatientProfileId_ReleasedAt",
                table: "BedAssignments");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "People",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PersonalNumber",
                table: "People",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "LastName",
                table: "People",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Gender",
                table: "People",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "FirstName",
                table: "People",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);
        }
    }
}
