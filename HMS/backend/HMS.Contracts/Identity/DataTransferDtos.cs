namespace HMS.Contracts.Identity;

public sealed class DataExportFileDto
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public byte[] Content { get; set; } = [];
}

public sealed class DataImportResultDto
{
    public int TotalRows { get; set; }
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public int Failed { get; set; }
    public List<DataImportRowErrorDto> Errors { get; set; } = [];
}

public sealed class DataImportRowErrorDto
{
    public int RowNumber { get; set; }
    public string Error { get; set; } = string.Empty;
}
