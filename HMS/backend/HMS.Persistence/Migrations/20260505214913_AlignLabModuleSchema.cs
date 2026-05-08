using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AlignLabModuleSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[LabTests]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [LabTests] (
                        [Id] int NOT NULL IDENTITY,
                        [Name] nvarchar(200) NOT NULL,
                        [Description] nvarchar(1000) NULL,
                        [Price] decimal(18,2) NULL,
                        [IsActive] bit NOT NULL,
                        [CreatedAt] datetime2 NOT NULL,
                        [UpdatedAt] datetime2 NOT NULL,
                        [CreatedById] int NULL,
                        [UpdatedById] int NULL,
                        CONSTRAINT [PK_LabTests] PRIMARY KEY ([Id])
                    );
                END
                """);

            migrationBuilder.Sql("""
                INSERT INTO LabTests (Name, Description, Price, IsActive, CreatedAt, UpdatedAt, CreatedById, UpdatedById)
                SELECT DISTINCT
                    COALESCE(NULLIF(LTRIM(RTRIM(TestName)), ''), 'Migrated lab test') AS Name,
                    NULL AS Description,
                    NULL AS Price,
                    CAST(1 AS bit) AS IsActive,
                    SYSUTCDATETIME() AS CreatedAt,
                    SYSUTCDATETIME() AS UpdatedAt,
                    NULL AS CreatedById,
                    NULL AS UpdatedById
                FROM LabRequestItems
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM LabTests
                    WHERE LabTests.Name = COALESCE(NULLIF(LTRIM(RTRIM(LabRequestItems.TestName)), ''), 'Migrated lab test')
                );
                """);

            migrationBuilder.AddColumn<int>(
                name: "LabTestId",
                table: "LabRequestItems",
                type: "int",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE item
                SET LabTestId = test.Id
                FROM LabRequestItems item
                INNER JOIN LabTests test
                    ON test.Name = COALESCE(NULLIF(LTRIM(RTRIM(item.TestName)), ''), 'Migrated lab test');
                """);

            migrationBuilder.AlterColumn<int>(
                name: "LabTestId",
                table: "LabRequestItems",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "Files",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OriginalFileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    StoredFileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    StoragePath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedById = table.Column<int>(type: "int", nullable: true),
                    UpdatedById = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Files", x => x.Id);
                });

            migrationBuilder.AddColumn<int>(
                name: "FileId",
                table: "LabResults",
                type: "int",
                nullable: true);

            migrationBuilder.Sql("""
                INSERT INTO Files (OriginalFileName, StoredFileName, ContentType, SizeBytes, StoragePath, CreatedAt, UpdatedAt, CreatedById, UpdatedById)
                SELECT
                    COALESCE(NULLIF(AttachmentFileName, ''), 'lab-result-attachment') AS OriginalFileName,
                    AttachmentStoragePath AS StoredFileName,
                    COALESCE(NULLIF(AttachmentContentType, ''), 'application/octet-stream') AS ContentType,
                    COALESCE(AttachmentSizeBytes, 0) AS SizeBytes,
                    AttachmentStoragePath AS StoragePath,
                    CreatedAt,
                    UpdatedAt,
                    CreatedById,
                    UpdatedById
                FROM LabResults
                WHERE AttachmentStoragePath IS NOT NULL
                    AND NOT EXISTS (
                        SELECT 1
                        FROM Files
                        WHERE Files.StoredFileName = LabResults.AttachmentStoragePath
                    );
                """);

            migrationBuilder.Sql("""
                UPDATE result
                SET FileId = fileRecord.Id
                FROM LabResults result
                INNER JOIN Files fileRecord
                    ON fileRecord.StoredFileName = result.AttachmentStoragePath
                WHERE result.AttachmentStoragePath IS NOT NULL;
                """);

            migrationBuilder.DropIndex(
                name: "IX_LabResults_PerformedAt",
                table: "LabResults");

            migrationBuilder.DropIndex(
                name: "IX_LabResults_Status",
                table: "LabResults");

            migrationBuilder.DropIndex(
                name: "IX_LabRequestItems_TestCode",
                table: "LabRequestItems");

            migrationBuilder.DropColumn(
                name: "AttachmentContentType",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "AttachmentFileName",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "AttachmentSizeBytes",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "AttachmentStoragePath",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "PerformedAt",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "SpecimenType",
                table: "LabRequestItems");

            migrationBuilder.DropColumn(
                name: "TestCode",
                table: "LabRequestItems");

            migrationBuilder.DropColumn(
                name: "TestName",
                table: "LabRequestItems");

            migrationBuilder.RenameColumn(
                name: "PublishedAt",
                table: "LabResults",
                newName: "VerifiedAt");

            migrationBuilder.RenameColumn(
                name: "ResultValue",
                table: "LabResults",
                newName: "ResultData");

            migrationBuilder.RenameIndex(
                name: "IX_LabResults_PublishedAt",
                table: "LabResults",
                newName: "IX_LabResults_VerifiedAt");

            migrationBuilder.AlterColumn<string>(
                name: "ResultData",
                table: "LabResults",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AddColumn<int>(
                name: "VerifiedByUserId",
                table: "LabResults",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "LabRequestItems",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "requested");

            migrationBuilder.CreateIndex(
                name: "IX_LabResults_FileId",
                table: "LabResults",
                column: "FileId");

            migrationBuilder.CreateIndex(
                name: "IX_LabResults_VerifiedByUserId",
                table: "LabResults",
                column: "VerifiedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LabRequestItems_LabTestId",
                table: "LabRequestItems",
                column: "LabTestId");

            migrationBuilder.CreateIndex(
                name: "IX_LabRequestItems_Status",
                table: "LabRequestItems",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Files_StoredFileName",
                table: "Files",
                column: "StoredFileName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LabTests_IsActive",
                table: "LabTests",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_LabTests_Name",
                table: "LabTests",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_LabRequestItems_LabTests_LabTestId",
                table: "LabRequestItems",
                column: "LabTestId",
                principalTable: "LabTests",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LabResults_Files_FileId",
                table: "LabResults",
                column: "FileId",
                principalTable: "Files",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_LabResults_Users_VerifiedByUserId",
                table: "LabResults",
                column: "VerifiedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LabRequestItems_LabTests_LabTestId",
                table: "LabRequestItems");

            migrationBuilder.DropForeignKey(
                name: "FK_LabResults_Files_FileId",
                table: "LabResults");

            migrationBuilder.DropForeignKey(
                name: "FK_LabResults_Users_VerifiedByUserId",
                table: "LabResults");

            migrationBuilder.DropTable(
                name: "Files");

            migrationBuilder.DropTable(
                name: "LabTests");

            migrationBuilder.DropIndex(
                name: "IX_LabResults_FileId",
                table: "LabResults");

            migrationBuilder.DropIndex(
                name: "IX_LabResults_VerifiedByUserId",
                table: "LabResults");

            migrationBuilder.DropIndex(
                name: "IX_LabRequestItems_LabTestId",
                table: "LabRequestItems");

            migrationBuilder.DropIndex(
                name: "IX_LabRequestItems_Status",
                table: "LabRequestItems");

            migrationBuilder.DropColumn(
                name: "FileId",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "ResultData",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "VerifiedByUserId",
                table: "LabResults");

            migrationBuilder.DropColumn(
                name: "LabTestId",
                table: "LabRequestItems");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "LabRequestItems");

            migrationBuilder.RenameColumn(
                name: "VerifiedAt",
                table: "LabResults",
                newName: "PublishedAt");

            migrationBuilder.RenameIndex(
                name: "IX_LabResults_VerifiedAt",
                table: "LabResults",
                newName: "IX_LabResults_PublishedAt");

            migrationBuilder.AddColumn<string>(
                name: "AttachmentContentType",
                table: "LabResults",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentFileName",
                table: "LabResults",
                type: "nvarchar(260)",
                maxLength: 260,
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "AttachmentSizeBytes",
                table: "LabResults",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentStoragePath",
                table: "LabResults",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "LabResults",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PerformedAt",
                table: "LabResults",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "ResultValue",
                table: "LabResults",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "LabResults",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "LabResults",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SpecimenType",
                table: "LabRequestItems",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TestCode",
                table: "LabRequestItems",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TestName",
                table: "LabRequestItems",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_LabResults_PerformedAt",
                table: "LabResults",
                column: "PerformedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LabResults_Status",
                table: "LabResults",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LabRequestItems_TestCode",
                table: "LabRequestItems",
                column: "TestCode");
        }
    }
}
