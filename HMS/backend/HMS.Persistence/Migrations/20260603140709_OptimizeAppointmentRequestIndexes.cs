using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeAppointmentRequestIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Appointments_DoctorProfileId",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_PatientProfileId",
                table: "Appointments");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Appointments",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "AppointmentRequests",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DoctorProfileId_ScheduledStart",
                table: "Appointments",
                columns: new[] { "DoctorProfileId", "ScheduledStart" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DoctorProfileId_Status_ScheduledStart",
                table: "Appointments",
                columns: new[] { "DoctorProfileId", "Status", "ScheduledStart" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PatientProfileId_ScheduledStart",
                table: "Appointments",
                columns: new[] { "PatientProfileId", "ScheduledStart" });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_Status_ScheduledStart",
                table: "Appointments",
                columns: new[] { "Status", "ScheduledStart" });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentRequests_DoctorProfileId_Status_PreferredDate",
                table: "AppointmentRequests",
                columns: new[] { "DoctorProfileId", "Status", "PreferredDate" });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentRequests_PreferredDate",
                table: "AppointmentRequests",
                column: "PreferredDate");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentRequests_Status",
                table: "AppointmentRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentRequests_Status_PreferredDate_CreatedAt",
                table: "AppointmentRequests",
                columns: new[] { "Status", "PreferredDate", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Appointments_DoctorProfileId_ScheduledStart",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_DoctorProfileId_Status_ScheduledStart",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_PatientProfileId_ScheduledStart",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_Status_ScheduledStart",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_AppointmentRequests_DoctorProfileId_Status_PreferredDate",
                table: "AppointmentRequests");

            migrationBuilder.DropIndex(
                name: "IX_AppointmentRequests_PreferredDate",
                table: "AppointmentRequests");

            migrationBuilder.DropIndex(
                name: "IX_AppointmentRequests_Status",
                table: "AppointmentRequests");

            migrationBuilder.DropIndex(
                name: "IX_AppointmentRequests_Status_PreferredDate_CreatedAt",
                table: "AppointmentRequests");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Appointments",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "AppointmentRequests",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DoctorProfileId",
                table: "Appointments",
                column: "DoctorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PatientProfileId",
                table: "Appointments",
                column: "PatientProfileId");
        }
    }
}
