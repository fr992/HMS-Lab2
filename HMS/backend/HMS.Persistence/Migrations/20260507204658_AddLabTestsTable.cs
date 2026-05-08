using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLabTestsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TestCode",
                table: "LabTests",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpecimenType",
                table: "LabTests",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabTests_TestCode",
                table: "LabTests",
                column: "TestCode",
                unique: true,
                filter: "[TestCode] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_LabTests_TestCode",
                table: "LabTests");

            migrationBuilder.DropColumn(
                name: "SpecimenType",
                table: "LabTests");

            migrationBuilder.DropColumn(
                name: "TestCode",
                table: "LabTests");
        }
    }
}
