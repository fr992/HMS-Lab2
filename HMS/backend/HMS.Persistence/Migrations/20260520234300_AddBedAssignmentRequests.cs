using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBedAssignmentRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BedAssignmentRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EncounterId = table.Column<int>(type: "int", nullable: false),
                    PatientProfileId = table.Column<int>(type: "int", nullable: false),
                    RequestedByDoctorId = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    PreferredWard = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RequestedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ResolvedByUserId = table.Column<int>(type: "int", nullable: true),
                    BedAssignmentId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedById = table.Column<int>(type: "int", nullable: true),
                    UpdatedById = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BedAssignmentRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BedAssignmentRequests_BedAssignments_BedAssignmentId",
                        column: x => x.BedAssignmentId,
                        principalTable: "BedAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_BedAssignmentRequests_DoctorProfiles_RequestedByDoctorId",
                        column: x => x.RequestedByDoctorId,
                        principalTable: "DoctorProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BedAssignmentRequests_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BedAssignmentRequests_PatientProfiles_PatientProfileId",
                        column: x => x.PatientProfileId,
                        principalTable: "PatientProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BedAssignmentRequests_Users_ResolvedByUserId",
                        column: x => x.ResolvedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignmentRequests_BedAssignmentId",
                table: "BedAssignmentRequests",
                column: "BedAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignmentRequests_EncounterId_PatientProfileId",
                table: "BedAssignmentRequests",
                columns: new[] { "EncounterId", "PatientProfileId" },
                unique: true,
                filter: "[Status] = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignmentRequests_PatientProfileId",
                table: "BedAssignmentRequests",
                column: "PatientProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignmentRequests_RequestedAt",
                table: "BedAssignmentRequests",
                column: "RequestedAt");

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignmentRequests_RequestedByDoctorId",
                table: "BedAssignmentRequests",
                column: "RequestedByDoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignmentRequests_ResolvedAt",
                table: "BedAssignmentRequests",
                column: "ResolvedAt");

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignmentRequests_ResolvedByUserId",
                table: "BedAssignmentRequests",
                column: "ResolvedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BedAssignmentRequests_Status",
                table: "BedAssignmentRequests",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BedAssignmentRequests");
        }
    }
}
