namespace HMS.Tests.TestSupport;

internal static class AnonymousObjectAssertions
{
    public static T GetProperty<T>(object? value, string propertyName)
    {
        var property = value!.GetType().GetProperty(propertyName)
            ?? value.GetType().GetProperty(
                propertyName,
                System.Reflection.BindingFlags.Instance |
                System.Reflection.BindingFlags.Public |
                System.Reflection.BindingFlags.IgnoreCase);
        Assert.NotNull(property);
        return (T)property.GetValue(value)!;
    }
}
