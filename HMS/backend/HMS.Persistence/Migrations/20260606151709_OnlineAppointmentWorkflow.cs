using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OnlineAppointmentWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AppointmentRequestId",
                table: "Appointments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedInAt",
                table: "Appointments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProposedStart",
                table: "AppointmentRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_AppointmentRequestId",
                table: "Appointments",
                column: "AppointmentRequestId",
                unique: true,
                filter: "[AppointmentRequestId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_AppointmentRequests_AppointmentRequestId",
                table: "Appointments",
                column: "AppointmentRequestId",
                principalTable: "AppointmentRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_AppointmentRequests_AppointmentRequestId",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_AppointmentRequestId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "AppointmentRequestId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CheckedInAt",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "ProposedStart",
                table: "AppointmentRequests");

        }
    }
}
