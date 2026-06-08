namespace HMS.Persistence.Configuration;

public static class DotEnvLoader
{
    public static string? Load()
    {
        var path = FindEnvFile();
        if (path is null)
            return null;

        foreach (var rawLine in File.ReadLines(path))
        {
            var line = rawLine.Trim();
            if (line.Length == 0 || line.StartsWith('#'))
                continue;

            if (line.StartsWith("export ", StringComparison.Ordinal))
                line = line["export ".Length..].TrimStart();

            var separatorIndex = line.IndexOf('=');
            if (separatorIndex <= 0)
                continue;

            var key = line[..separatorIndex].Trim();
            if (key.Length == 0 || Environment.GetEnvironmentVariable(key) is not null)
                continue;

            var value = line[(separatorIndex + 1)..].Trim();
            if (value.Length >= 2 &&
                ((value[0] == '"' && value[^1] == '"') ||
                 (value[0] == '\'' && value[^1] == '\'')))
            {
                value = value[1..^1];
            }

            Environment.SetEnvironmentVariable(key, value);
        }

        return path;
    }

    private static string? FindEnvFile()
    {
        var explicitPath = Environment.GetEnvironmentVariable("HMS_ENV_FILE");
        if (!string.IsNullOrWhiteSpace(explicitPath))
        {
            var fullPath = Path.GetFullPath(explicitPath);
            if (!File.Exists(fullPath))
                throw new FileNotFoundException($"HMS_ENV_FILE does not exist: {fullPath}", fullPath);

            return fullPath;
        }

        return CandidateDirectories()
            .SelectMany(directory => new[]
            {
                Path.Combine(directory, ".env"),
                Path.Combine(directory, "backend", ".env")
            })
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(File.Exists);
    }

    private static IEnumerable<string> CandidateDirectories()
    {
        foreach (var startPath in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var directory = new DirectoryInfo(startPath);
            while (directory is not null)
            {
                yield return directory.FullName;
                directory = directory.Parent;
            }
        }
    }
}
