//i shton kur shton files  ne servies dhe abtractions
//using HMS.Application.Abstractions;
//using HMS.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HMS.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        return services;
    }
}