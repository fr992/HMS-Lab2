using HMS.Contracts.Identity;

namespace HMS.Application.Abstractions.Identity;

public interface IDataTransferService
{
    Task<DataExportFileDto> ExportAsync(
        string module,
        string format,
        IReadOnlyDictionary<string, string?> filters,
        int actorUserId,
        IReadOnlyCollection<string> permissions,
        CancellationToken cancellationToken);

    Task<DataImportResultDto> ImportAsync(
        string module,
        string format,
        string fileName,
        Stream fileStream,
        long fileLength,
        int actorUserId,
        CancellationToken cancellationToken);
}
