# 🏢 MongoDB Enterprise Architecture Specification & CRUD Cheat Sheet
**Target Platform:** .NET 8 Core / .NET 9 Core Frameworks  
**Official Database Driver:** `MongoDB.Driver` (NuGet Ecosystem)

---

## 🗺️ System Architecture & Entity Relationships

This system uses a normalized, referenced document methodology. The text block below maps exactly how object references (`ObjectId`) flow across collections:

```text
                                      +--------------------+
                                      |  ProviderRequest   | 
                                      +--------------------+
                                                ^
                                                | (Many)
                                                | 
                                                | (1)
    +-----------------------+          +-----------------+  (1) (1) +------------+
    |    AppointmentType    | <------- |     Provider    | <------- |    User    | 
    +-----------------------+ (M)  (1) +-----------------+          +------------+ 
                |  (1)                                                     | (1)
                |           +---------------+                              |
                +---------> |  Appointment  | <----------------------------+
                  (Many)    +---------------+   (Many)
                                ^   ^   ^                               
                         (Many) |   |   | (Many)
                            (1) |   |   | (1)
                                v   |   v
                     +-----------+  |  +---------------------+
                     | Location  |  |  | AppointmentAuditLog |
                     +-----------+  |  +---------------------+
                                    | (Many)      ^  
                                    | (1)         | (Many)
                              +-----------+       |
                              |  Status   | <-----+
                              +-----------+ (1)

```

---

## ⚖️ Global Database Engineering Policies

1. **Explicit In-Code Timezones (Strict UTC):** No timezone strings are allowed in any database row. All date fields are serialized, evaluated, and saved to collections in strict **Coordinated Universal Time (UTC)**. Conversions to/from user timezones must take place inside C# application running memory before the user interface layer.
2. **Global Soft-Delete Infrastructure:** Destructive database actions (`deleteOne`, `deleteMany`) are strictly forbidden on entity records. Data deletions must switch a document's status flag properties via update actions (`IsDeleted = true` and `DeletedAt = DateTime.UtcNow`).
3. **Implicit Data Exclusion:** Every application query pipeline (`find`, `aggregate`, `$match`) must enforce an automated predicate evaluating `{ IsDeleted: false }` to clean out stale documents from live screens.
4. **Audit Exception:** The `AppointmentAuditLog` collection acts as an immutable, write-only historical ledger. It tracks transactional modifications and explicitly does **not** feature soft-delete parameters.
5. **Notes Baseline Formatting:** Free-text comment elements (such as `Appointment.Notes`) must be saved natively as empty primitive string representations (`""`) rather than `null` values during creation hooks to provide a stable schema baseline.

---

## 1. Strongly Typed C# Data Domain Models

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

public class User : BaseEntity
{
    public string FirstName { get; set; }
    public string LastName { get; set; } 
    public string Password { get; set; } // Enforce cryptographic hashing algorithms (e.g., BCrypt/Argon2)
    public string Username { get; set; }
    public bool IsProvider { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsClient { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted {get; set; } = false; 
    public DateTimeOffset DeletedAt { get; set; }
}

public class Provider : BaseEntity
{
    public ObjectId UserId { get; set; }
    public bool IsApproved { get; set; }
    public bool IsBeauty { get; set; }
    public bool IsMedical { get; set; }
    public bool IsFitness { get; set; }
    public bool IsActive { get; set; }
    public string BeautyQualification { get; set; }
    public string MedicalQualification { get; set; }
    public string FitnessQualification { get; set; }
    public bool IsDeleted {get; set; } = false; 
    public DateTimeOffset DeletedAt { get; set; }
}

public class ProviderRequest : BaseEntity
{
    public ObjectId ProviderId { get; set; }
    public bool IsApproved { get; set; }
    public string Notes { get; set; } = string.Empty; // Natively defaults to "" instead of null
    public bool IsDeleted {get; set; } = false; 
    public DateTimeOffset DeletedAt { get; set; }
}

public class AppointmentType : BaseEntity
{
    public ObjectId ProviderId { get; set; }
    public string CustomServiceName { get; set; }
    public int DurationInMinutes { get; set; }
    public decimal Price { get; set; }
    public ObjectId LocationId { get; set; }
    public string Contact { get; set; }
    public bool IsBeauty { get; set; }
    public bool IsMedical { get; set; }
    public bool IsFitness { get; set; }
    public bool IsDeleted {get; set; } = false; 
    public DateTimeOffset DeletedAt { get; set; }
}

public class Appointment : BaseEntity
{
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTimeOffset StartTime { get; set; }
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTimeOffset EndTime { get; set; }
    public ObjectId StatusId { get; set; }
    public string Notes { get; set; } = string.Empty; // Natively defaults to "" instead of null
    public ObjectId AppointmentTypeId { get; set; }
    public ObjectId UserId { get; set; }
    public bool IsDeleted {get; set; } = false; 
    public DateTimeOffset DeletedAt { get; set; }
}

public class AppointmentAuditLog
{
    [BsonId]
    public ObjectId Id { get; set; }
    public ObjectId AppointmentId { get; set; }
    public ObjectId ChangedByUserId { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTimeOffset Timestamp { get; set; } = DateTime.UtcNow;
    public string Action { get; set; } // Event identifiers: "CREATED", "RESCHEDULED", "STATUS_CHANGE", "CANCELLED"
    public ObjectId OldStatusId { get; set; }
    public ObjectId NewStatusId { get; set; }
}

public class Location : BaseEntity
{
    public string Street { get; set; }
    public string City { get; set; }
    public string State { get; set; }
    public int ZIP { get; set; }
    public bool IsDeleted {get; set; } = false; 
    public DateTimeOffset DeletedAt { get; set; }
}

public class Status
{
    [BsonId]
    public ObjectId Id { get; set; }
    public string Name { get; set; } // Core state lookups: "Scheduled", "Completed", "Canceled", "Available"
}
```

---

## 2. In-Code Timezone Conversion Utilities

All runtime calculations must convert local client time constraints to UTC before database serialization, and map UTC back to local offsets on data rendering routines:

```csharp
// Scenario A: Converting localized calendar picker data to a storage-compliant UTC timestamp
DateTime userSelectedTime = new DateTime(2026, 10, 15, 14, 30, 0); 
TimeZoneInfo applicationContextZone = TimeZoneInfo.FindSystemTimeZoneById("America/Chicago");
DateTime serializedUtcForDatabase = TimeZoneInfo.ConvertTimeToUtc(userSelectedTime, applicationContextZone);

// Scenario B: Converting a database UTC property to readable local system display text
DateTime parsedDatabaseUtc = appointment.StartTime; 
DateTime targetUserDisplayTime = TimeZoneInfo.ConvertTimeFromUtc(parsedDatabaseUtc, applicationContextZone);

Console.WriteLine($"Formatted Local Appointment: {targetUserDisplayTime}"); // Resulting Output: 10/15/2026 2:30:00 PM
```

---

## 3. Database CRUD Actions Matrix

The script examples assume your initialization layer exposes the database driver instances explicitly:

```csharp
using MongoDB.Driver;

IMongoDatabase database = client.GetDatabase("AppointmentSchedulerDB");
var appointmentCollection = database.GetCollection<Appointment>("Appointment");
var logCollection = database.GetCollection<AppointmentAuditLog>("AppointmentAuditLog");
```

### CREATE (Insert Document with Safe Baseline Values)
```csharp
var newAppointment = new Appointment
{
    LocationId = ObjectId.Parse("6abc1bc6a313dfdf8ecc026d"),
    ProviderServiceConfigId = ObjectId.Parse("6abc1deca313dfdf8ecc0278"),
    ServiceProviderId = ObjectId.Parse("6abc1b08a313dfdf8ecc026a"),
    ClientId = ObjectId.Parse("6abc20bda313dfdf8ecc0286"),
    StartTime = serializedUtcForDatabase,
    EndTime = serializedUtcForDatabase.AddMinutes(45), // Computed dynamically via configuration data
    StatusId = ObjectId.Parse("6abc2038a313dfdf8ecc0282"),
    Notes = "", // Expressly initialized as an empty string baseline
    IsDeleted = false,
    DeletedAt = null
};

await appointmentCollection.InsertOneAsync(newAppointment);
```

### READ (Enforcing Non-Deleted Predicates & Target Sort Parameters)
```csharp
// Explicit builder rule: Combine business criteria alongside the soft-delete filter condition
var readFilter = Builders<Appointment>.Filter.And(
    Builders<Appointment>.Filter.Eq(a => a.ClientId, ObjectId.Parse("6abc20bda313dfdf8ecc0286")),
    Builders<Appointment>.Filter.Eq(a => a.IsDeleted, false)
);

var clientTimelineSchedules = await appointmentCollection.Find(readFilter)
                                                          .SortBy(a => a.StartTime)
                                                          .ToListAsync();
```

### MODIFY (Targeted Field Updates Using Atomicity Operators)
```csharp
var targetIdentifier = ObjectId.Parse("6abc1ee4a313dfdf8ecc0280");

var selectionFilter = Builders<Appointment>.Filter.And(
    Builders<Appointment>.Filter.Eq(a => a.Id, targetIdentifier),
    Builders<Appointment>.Filter.Eq(a => a.IsDeleted, false)
);

// Append values safely to the string element without mutating remaining layout fields
var textModification = Builders<Appointment>.Update.Set(a => a.Notes, "Appended notes narrative.");
await appointmentCollection.UpdateOneAsync(selectionFilter, textModification);
```

### TRANSACTION BLOCK: Soft Deletion Execution & Historical Audit Logging
```csharp
using (var transactionSession = await client.StartSessionAsync())
{
    transactionSession.StartTransaction();
    try
    {
        var targetId = ObjectId.Parse("6abc1ee4a313dfdf8ecc0280");
        var activeWorkerId = ObjectId.Parse("6abc1939a313dfdf8ecc0265");

        // 1. Toggle soft-delete state attributes on target record
        var softDeleteQuery = Builders<Appointment>.Update
            .Set(a => a.IsDeleted, true)
            .Set(a => a.DeletedAt, DateTime.UtcNow);

        await appointmentCollection.UpdateOneAsync(transactionSession, a => a.Id == targetId, softDeleteQuery);

        // 2. Append action event to the completely write-only historical audit ledger
        var cancellationTrailLog = new AppointmentAuditLog
        {
            AppointmentId = targetId,
            ChangedByUserId = activeWorkerId,
            Action = "CANCELLED",
            Timestamp = DateTime.UtcNow
        };
        await logCollection.InsertOneAsync(transactionSession, cancellationTrailLog);

        await transactionSession.CommitTransactionAsync();
    }
    catch (Exception)
    {
        await transactionSession.AbortTransactionAsync();
        throw;
    }
}
```

### ROLLBACK (Reversing a Soft Deletion)
```csharp
var recoveryId = ObjectId.Parse("6abc1ee4a313dfdf8ecc0280");

var recoveryQuery = Builders<Appointment>.Update
    .Set(a => a.IsDeleted, false)
    .Set(a => a.DeletedAt, (DateTime?)null);

await appointmentCollection.UpdateOneAsync(a => a.Id == recoveryId, recoveryQuery);
```

---

## ⚡ 4. Enterprise Production Indexes

Have developers run this routine once at application initialization or service startup. It builds performance compound indexes that match the baseline `{ IsDeleted: false }` predicate requirements:

```csharp
public static async Task GenerateSystemPerformanceIndexes(IMongoDatabase contextDatabase)
{
    var collection = contextDatabase.GetCollection<Appointment>("Appointment");

    // Compound Index Configurations: Explicitly pairing foreign IDs with soft-delete indicators
    var indexProviderRule = Builders<Appointment>.IndexKeys.Ascending(a => a.ServiceProviderId).Ascending(a => a.IsDeleted);
    var indexClientRule = Builders<Appointment>.IndexKeys.Ascending(a => a.ClientId).Ascending(a => a.IsDeleted);
    var indexTimelineRule = Builders<Appointment>.IndexKeys.Ascending(a => a.StartTime).Ascending(a => a.IsDeleted);
    
    // Performance Full-Text Indexing Configuration: Optimizes string keyword scans across notes data
    var indexNotesFullText = Builders<Appointment>.IndexKeys.Text(a => a.Notes);

    await collection.Indexes.CreateManyAsync(new[] {
        new CreateIndexModel<Appointment>(indexProviderRule, new CreateIndexOptions { Name = "idx_provider_active" }),
        new CreateIndexModel<Appointment>(indexClientRule, new CreateIndexOptions { Name = "idx_client_active" }),
        new CreateIndexModel<Appointment>(indexTimelineRule, new CreateIndexOptions { Name = "idx_timeline_active" }),
        new CreateIndexModel<Appointment>(indexNotesFullText, new CreateIndexOptions { Name = "idx_notes_text_search" })
    });
}
```
