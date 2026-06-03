using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorAssignmentToAppointmentRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DoctorProfileId",
                table: "AppointmentRequests",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentRequests_DoctorProfileId",
                table: "AppointmentRequests",
                column: "DoctorProfileId");

            migrationBuilder.AddForeignKey(
                name: "FK_AppointmentRequests_DoctorProfiles_DoctorProfileId",
                table: "AppointmentRequests",
                column: "DoctorProfileId",
                principalTable: "DoctorProfiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AppointmentRequests_DoctorProfiles_DoctorProfileId",
                table: "AppointmentRequests");

            migrationBuilder.DropIndex(
                name: "IX_AppointmentRequests_DoctorProfileId",
                table: "AppointmentRequests");

            migrationBuilder.DropColumn(
                name: "DoctorProfileId",
                table: "AppointmentRequests");
        }
    }
}
