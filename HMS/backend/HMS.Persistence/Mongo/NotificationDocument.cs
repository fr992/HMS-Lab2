using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace HMS.Persistence.Mongo;

public sealed class NotificationDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public int UserId { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public bool IsRead { get; set; }

    public DateTime? ReadAt { get; set; }

    public string? RelatedEntityType { get; set; }

    public string? RelatedEntityId { get; set; }

    public DateTime CreatedAt { get; set; }
}
