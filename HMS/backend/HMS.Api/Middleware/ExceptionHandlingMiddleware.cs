using HMS.Application.Exceptions;

namespace HMS.Api.Middleware;

public sealed class ExceptionHandlingMiddleware
{
    private const string UnexpectedErrorMessage = "An unexpected error occurred.";

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            if (context.Response.HasStarted)
                throw;

            await WriteErrorResponseAsync(context, exception);
        }
    }

    private async Task WriteErrorResponseAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message, isExpected) = MapException(exception);

        if (isExpected)
        {
            _logger.LogInformation(
                exception,
                "Handled expected application error with status code {StatusCode}.",
                statusCode);
        }
        else
        {
            _logger.LogError(exception, "Unhandled API exception.");
        }

        context.Response.Clear();
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsJsonAsync(
            new ErrorResponse(statusCode, message),
            context.RequestAborted);
    }

    private static (int StatusCode, string Message, bool IsExpected) MapException(Exception exception)
    {
        return exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, exception.Message, true),
            BadRequestException => (StatusCodes.Status400BadRequest, exception.Message, true),
            ConflictException => (StatusCodes.Status409Conflict, exception.Message, true),
            ForbiddenException => (StatusCodes.Status403Forbidden, exception.Message, true),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, exception.Message, true),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, exception.Message, true),
            _ => (StatusCodes.Status500InternalServerError, UnexpectedErrorMessage, false)
        };
    }

    private sealed record ErrorResponse(int StatusCode, string Message);
}
