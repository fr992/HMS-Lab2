using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNurseProfilesAndNurseTasks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NurseProfile_StaffProfile_StaffProfileId",
                table: "NurseProfile");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NurseProfile",
                table: "NurseProfile");

            migrationBuilder.RenameTable(
                name: "NurseProfile",
                newName: "NurseProfiles");

            migrationBuilder.RenameIndex(
                name: "IX_NurseProfile_StaffProfileId",
                table: "NurseProfiles",
                newName: "IX_NurseProfiles_StaffProfileId");

            migrationBuilder.AlterColumn<string>(
                name: "LicenseNumber",
                table: "NurseProfiles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_NurseProfiles",
                table: "NurseProfiles",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "NurseTasks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EncounterId = table.Column<int>(type: "int", nullable: false),
                    AssignedByDoctorId = table.Column<int>(type: "int", nullable: false),
                    AssignedToNurseId = table.Column<int>(type: "int", nullable: true),
                    Type = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    DueAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedByUserId = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NurseTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NurseTasks_DoctorProfiles_AssignedByDoctorId",
                        column: x => x.AssignedByDoctorId,
                        principalTable: "DoctorProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NurseTasks_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NurseTasks_NurseProfiles_AssignedToNurseId",
                        column: x => x.AssignedToNurseId,
                        principalTable: "NurseProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NurseTasks_Users_CompletedByUserId",
                        column: x => x.CompletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NurseProfiles_LicenseNumber",
                table: "NurseProfiles",
                column: "LicenseNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NurseTasks_AssignedByDoctorId",
                table: "NurseTasks",
                column: "AssignedByDoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_NurseTasks_AssignedToNurseId",
                table: "NurseTasks",
                column: "AssignedToNurseId");

            migrationBuilder.CreateIndex(
                name: "IX_NurseTasks_CompletedByUserId",
                table: "NurseTasks",
                column: "CompletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NurseTasks_DueAt",
                table: "NurseTasks",
                column: "DueAt");

            migrationBuilder.CreateIndex(
                name: "IX_NurseTasks_EncounterId",
                table: "NurseTasks",
                column: "EncounterId");

            migrationBuilder.CreateIndex(
                name: "IX_NurseTasks_Status",
                table: "NurseTasks",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_NurseProfiles_StaffProfile_StaffProfileId",
                table: "NurseProfiles",
                column: "StaffProfileId",
                principalTable: "StaffProfile",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NurseProfiles_StaffProfile_StaffProfileId",
                table: "NurseProfiles");

            migrationBuilder.DropTable(
                name: "NurseTasks");

            migrationBuilder.DropPrimaryKey(
                name: "PK_NurseProfiles",
                table: "NurseProfiles");

            migrationBuilder.DropIndex(
                name: "IX_NurseProfiles_LicenseNumber",
                table: "NurseProfiles");

            migrationBuilder.RenameTable(
                name: "NurseProfiles",
                newName: "NurseProfile");

            migrationBuilder.RenameIndex(
                name: "IX_NurseProfiles_StaffProfileId",
                table: "NurseProfile",
                newName: "IX_NurseProfile_StaffProfileId");

            migrationBuilder.AlterColumn<string>(
                name: "LicenseNumber",
                table: "NurseProfile",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AddPrimaryKey(
                name: "PK_NurseProfile",
                table: "NurseProfile",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_NurseProfile_StaffProfile_StaffProfileId",
                table: "NurseProfile",
                column: "StaffProfileId",
                principalTable: "StaffProfile",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
