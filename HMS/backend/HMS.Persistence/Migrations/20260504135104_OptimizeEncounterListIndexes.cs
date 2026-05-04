using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeEncounterListIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Encounters_DoctorProfileId",
                table: "Encounters");

            migrationBuilder.DropIndex(
                name: "IX_Encounters_PatientProfileId",
                table: "Encounters");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_DoctorProfileId_StartedAt",
                table: "Encounters",
                columns: new[] { "DoctorProfileId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_PatientProfileId_StartedAt",
                table: "Encounters",
                columns: new[] { "PatientProfileId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_StartedAt",
                table: "Encounters",
                column: "StartedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Encounters_DoctorProfileId_StartedAt",
                table: "Encounters");

            migrationBuilder.DropIndex(
                name: "IX_Encounters_PatientProfileId_StartedAt",
                table: "Encounters");

            migrationBuilder.DropIndex(
                name: "IX_Encounters_StartedAt",
                table: "Encounters");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_DoctorProfileId",
                table: "Encounters",
                column: "DoctorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_PatientProfileId",
                table: "Encounters",
                column: "PatientProfileId");
        }
    }
}
