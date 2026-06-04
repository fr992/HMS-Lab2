namespace HMS.Tests.TestSupport;

internal static class AnonymousObjectAssertions
{
    public static T GetProperty<T>(object? value, string propertyName)
    {
        var property = value!.GetType().GetProperty(propertyName);
        Assert.NotNull(property);
        return (T)property.GetValue(value)!;
    }
}
