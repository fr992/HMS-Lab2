using HMS.Application.Abstractions.Identity;
using HMS.Contracts.Identity;
using HMS.Domain.Entities;
using HMS.Persistence.Repositories;
using HMS.Tests.TestSupport;
using Identity.Domain.Entities;
using Identity.Infrastructure.Services.Patients;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace HMS.Tests.Services;

public sealed class OnlineAppointmentWorkflowTests
{
    [Fact]
    public async Task OnlineRequest_FollowsCheckInEncounterAndCompletionWorkflow()
    {
        await using var db = HmsDbContextTestFactory.Create();
        var now = DateTime.UtcNow;
        var patientUser = new User { UserName = "patient", Email = "patient@example.test", PasswordHash = "hash", IsActive = true };
        var patientPerson = new Person
        {
            User = patientUser,
            FirstName = "Pat",
            LastName = "Ient",
            DateOfBirth = new DateTime(1990, 1, 2),
            Phone = "123"
        };
        var patient = new PatientProfile { Person = patientPerson, PatientNumber = "PAT-1" };

        var doctorUser = new User { UserName = "doctor", Email = "doctor@example.test", PasswordHash = "hash", IsActive = true };
        var doctorPerson = new Person { User = doctorUser, FirstName = "Doc", LastName = "Tor" };
        var staff = new StaffProfile { Person = doctorPerson, StaffNumber = "DOC-1", EmploymentStatus = "Active" };
        var doctor = new DoctorProfile { StaffProfile = staff, LicenseNumber = "LIC-1", IsActive = true };
        var request = new AppointmentRequest
        {
            FirstName = patientPerson.FirstName,
            LastName = patientPerson.LastName,
            Email = patientUser.Email,
            Phone = patientPerson.Phone!,
            DateOfBirth = DateOnly.FromDateTime(patientPerson.DateOfBirth!.Value),
            PreferredDate = DateOnly.FromDateTime(now.AddDays(1)),
            DoctorProfile = doctor,
            ReasonForVisit = "Consultation",
            Status = AppointmentRequestStatus.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.AddRange(patient, doctor, request);
        await db.SaveChangesAsync();

        var notifications = new Mock<INotificationService>();
        var externalNotifications = new Mock<IAppointmentNotificationService>();
        externalNotifications
            .Setup(service => service.NotifyAsync(It.IsAny<AppointmentNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        notifications
            .Setup(service => service.CreateAsync(It.IsAny<CreateNotificationRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((CreateNotificationRequestDto dto, CancellationToken _) => new NotificationDto { UserId = dto.UserId });
        var unitOfWork = new EfUnitOfWork(db);
        var appointmentRequests = new AppointmentRequestService(
            new EfHmsRepository(db),
            unitOfWork,
            notifications.Object,
            externalNotifications.Object,
            NullLogger<AppointmentRequestService>.Instance);
        var appointments = new AppointmentService(
            new AppointmentRepository(db),
            unitOfWork,
            notifications.Object,
            NullLogger<AppointmentService>.Instance);
        var encounters = new EncounterService(new EfHmsRepository(db), unitOfWork);
        var scheduledStart = now.AddDays(1);

        var confirmedRequest = await appointmentRequests.UpdateStatusAsync(
            request.Id,
            new UpdateAppointmentRequestStatusDto
            {
                Status = nameof(AppointmentRequestStatus.Confirmed),
                DoctorProfileId = doctor.Id,
                ScheduledStart = scheduledStart
            },
            actorUserId: 99,
            CancellationToken.None);

        Assert.NotNull(confirmedRequest.AppointmentId);
        Assert.Equal(AppointmentStatus.Confirmed, confirmedRequest.AppointmentStatus);
        externalNotifications.Verify(
            service => service.NotifyAsync(
                It.Is<AppointmentNotification>(notification =>
                    notification.AppointmentRequestId == request.Id
                    && notification.Email == request.Email
                    && notification.Status == "Confirmed"),
                It.IsAny<CancellationToken>()),
            Times.Once);

        var checkedIn = await appointments.UpdateStatusAsync(
            confirmedRequest.AppointmentId!.Value,
            new UpdateAppointmentStatusDto { Status = AppointmentStatus.CheckedIn },
            actorUserId: 99,
            CancellationToken.None);
        Assert.Equal(AppointmentStatus.CheckedIn, checkedIn.Status);

        var encounter = await encounters.CreateAsync(
            new CreateEncounterDto
            {
                PatientProfileId = patient.Id,
                DoctorProfileId = doctor.Id,
                AppointmentId = checkedIn.Id,
                EncounterType = EncounterTypes.Outpatient,
                StartedAt = DateTime.UtcNow
            },
            doctorUser.Id,
            CancellationToken.None);

        Assert.Equal(
            AppointmentStatus.InProgress,
            await db.Appointments.Where(a => a.Id == checkedIn.Id).Select(a => a.Status).SingleAsync());

        await Assert.ThrowsAsync<HMS.Application.Exceptions.ConflictException>(() =>
            encounters.CreateAsync(
                new CreateEncounterDto
                {
                    PatientProfileId = patient.Id,
                    DoctorProfileId = doctor.Id,
                    AppointmentId = checkedIn.Id,
                    EncounterType = EncounterTypes.Outpatient,
                    StartedAt = DateTime.UtcNow
                },
                doctorUser.Id,
                CancellationToken.None));

        await encounters.UpdateStatusAsync(
            encounter.Id,
            new UpdateEncounterStatusDto { Status = EncounterStatus.Completed },
            doctorUser.Id,
            CancellationToken.None);

        Assert.Equal(
            AppointmentStatus.Completed,
            await db.Appointments.Where(a => a.Id == checkedIn.Id).Select(a => a.Status).SingleAsync());
        Assert.Equal(
            AppointmentRequestStatus.Completed,
            await db.AppointmentRequests.Where(a => a.Id == request.Id).Select(a => a.Status).SingleAsync());
    }
}
