using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AppointmentTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DoctorProfile_Specialization_SpecializationId",
                table: "DoctorProfile");

            migrationBuilder.DropForeignKey(
                name: "FK_DoctorProfile_StaffProfile_StaffProfileId",
                table: "DoctorProfile");

            migrationBuilder.DropForeignKey(
                name: "FK_PatientProfiles_DoctorProfile_PrimaryDoctorId",
                table: "PatientProfiles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DoctorProfile",
                table: "DoctorProfile");

            migrationBuilder.RenameTable(
                name: "DoctorProfile",
                newName: "DoctorProfiles");

            migrationBuilder.RenameIndex(
                name: "IX_DoctorProfile_StaffProfileId",
                table: "DoctorProfiles",
                newName: "IX_DoctorProfiles_StaffProfileId");

            migrationBuilder.RenameIndex(
                name: "IX_DoctorProfile_SpecializationId",
                table: "DoctorProfiles",
                newName: "IX_DoctorProfiles_SpecializationId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DoctorProfiles",
                table: "DoctorProfiles",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "Appointments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatientProfileId = table.Column<int>(type: "int", nullable: false),
                    DoctorProfileId = table.Column<int>(type: "int", nullable: false),
                    DepartmentId = table.Column<int>(type: "int", nullable: true),
                    ScheduledStart = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ScheduledEnd = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AppointmentType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CancellationReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ConfirmedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CancelledByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedById = table.Column<int>(type: "int", nullable: true),
                    UpdatedById = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Appointments_Department_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Department",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Appointments_DoctorProfiles_DoctorProfileId",
                        column: x => x.DoctorProfileId,
                        principalTable: "DoctorProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Appointments_PatientProfiles_PatientProfileId",
                        column: x => x.PatientProfileId,
                        principalTable: "PatientProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Appointments_Users_CancelledByUserId",
                        column: x => x.CancelledByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_CancelledByUserId",
                table: "Appointments",
                column: "CancelledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DepartmentId",
                table: "Appointments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_DoctorProfileId",
                table: "Appointments",
                column: "DoctorProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_PatientProfileId",
                table: "Appointments",
                column: "PatientProfileId");

            migrationBuilder.AddForeignKey(
                name: "FK_DoctorProfiles_Specialization_SpecializationId",
                table: "DoctorProfiles",
                column: "SpecializationId",
                principalTable: "Specialization",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DoctorProfiles_StaffProfile_StaffProfileId",
                table: "DoctorProfiles",
                column: "StaffProfileId",
                principalTable: "StaffProfile",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PatientProfiles_DoctorProfiles_PrimaryDoctorId",
                table: "PatientProfiles",
                column: "PrimaryDoctorId",
                principalTable: "DoctorProfiles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DoctorProfiles_Specialization_SpecializationId",
                table: "DoctorProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_DoctorProfiles_StaffProfile_StaffProfileId",
                table: "DoctorProfiles");

            migrationBuilder.DropForeignKey(
                name: "FK_PatientProfiles_DoctorProfiles_PrimaryDoctorId",
                table: "PatientProfiles");

            migrationBuilder.DropTable(
                name: "Appointments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DoctorProfiles",
                table: "DoctorProfiles");

            migrationBuilder.RenameTable(
                name: "DoctorProfiles",
                newName: "DoctorProfile");

            migrationBuilder.RenameIndex(
                name: "IX_DoctorProfiles_StaffProfileId",
                table: "DoctorProfile",
                newName: "IX_DoctorProfile_StaffProfileId");

            migrationBuilder.RenameIndex(
                name: "IX_DoctorProfiles_SpecializationId",
                table: "DoctorProfile",
                newName: "IX_DoctorProfile_SpecializationId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DoctorProfile",
                table: "DoctorProfile",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DoctorProfile_Specialization_SpecializationId",
                table: "DoctorProfile",
                column: "SpecializationId",
                principalTable: "Specialization",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_DoctorProfile_StaffProfile_StaffProfileId",
                table: "DoctorProfile",
                column: "StaffProfileId",
                principalTable: "StaffProfile",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PatientProfiles_DoctorProfile_PrimaryDoctorId",
                table: "PatientProfiles",
                column: "PrimaryDoctorId",
                principalTable: "DoctorProfile",
                principalColumn: "Id");
        }
    }
}
