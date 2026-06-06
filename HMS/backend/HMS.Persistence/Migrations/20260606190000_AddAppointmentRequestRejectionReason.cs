using HMS.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations;

[DbContext(typeof(HmsDbContext))]
[Migration("20260606190000_AddAppointmentRequestRejectionReason")]
public partial class AddAppointmentRequestRejectionReason : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "RejectionReason",
            table: "AppointmentRequests",
            type: "nvarchar(500)",
            maxLength: 500,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "RejectionReason",
            table: "AppointmentRequests");
    }
}
