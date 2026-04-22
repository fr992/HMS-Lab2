using System;
using System.Net;
using System.Numerics;
using System.Xml.Linq;

namespace HMS.Shared.Entities;

public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? CreatedById { get; set; }
    public int? UpdatedById { get; set; }
}