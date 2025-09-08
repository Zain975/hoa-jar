import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto, JobType } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobStatus } from '@prisma/client';
import { TranslationService } from '../common/services/translation.service';

@Injectable()
export class JobService {
  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {}

  async create(createJobDto: CreateJobDto, userId: string, userRole: string) {
    // Verify the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify all services exist
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: createJobDto.serviceIds },
      },
    });

    if (services.length !== createJobDto.serviceIds.length) {
      throw new NotFoundException('One or more services not found');
    }

    let apartmentId: string;
    let leaderId: string | undefined;
    let initialStatus: JobStatus;

    if (createJobDto.jobType === JobType.HOME_SERVICE) {
      if (userRole === 'HOME_OWNER') {
        // Home service: use the home owner's assigned apartment
        if (!user.apartmentId) {
          throw new BadRequestException('Your account is not linked to any apartment');
        }

        // If payload provides apartmentId, ensure it matches the user's apartment
        if (
          createJobDto.apartmentId &&
          createJobDto.apartmentId !== user.apartmentId
        ) {
          throw new ForbiddenException(
            'You can only create home service jobs for your own apartment',
          );
        }

        apartmentId = user.apartmentId;
        leaderId = undefined;
        initialStatus = JobStatus.OPEN; // Visible to service providers immediately
      } else if (userRole === 'LEADER') {
        // Leader posting a home service job (allowed): require apartment they lead
        if (!createJobDto.apartmentId) {
          throw new BadRequestException(
            'Apartment ID is required for leader-created home service jobs',
          );
        }

        const apartment = await this.prisma.apartment.findFirst({
          where: { id: createJobDto.apartmentId, leaderId: userId },
        });
        if (!apartment) {
          throw new ForbiddenException(
            'You are not authorized to post jobs for this apartment',
          );
        }

        apartmentId = apartment.id;
        leaderId = userId;
        initialStatus = JobStatus.OPEN;
      } else {
        throw new ForbiddenException('Invalid role for creating home service job');
      }
    } else if (createJobDto.jobType === JobType.COMMUNITY_SERVICE) {
      // For community service, apartmentId is required
      if (!createJobDto.apartmentId) {
        throw new BadRequestException('Apartment ID is required for community service jobs');
      }

      const apartment = await this.prisma.apartment.findUnique({
        where: { id: createJobDto.apartmentId },
        include: { leader: true },
      });

      if (!apartment) {
        throw new NotFoundException('Apartment not found');
      }

      if (!apartment.leaderId) {
        throw new BadRequestException('This apartment does not have a leader assigned');
      }

      if (userRole === 'HOME_OWNER') {
        // Home owner can only target their own apartment
        if (!user.apartmentId || user.apartmentId !== apartment.id) {
          throw new ForbiddenException(
            'You can only create community service jobs for your own apartment',
          );
        }

        apartmentId = apartment.id;
        leaderId = apartment.leaderId;
        initialStatus = JobStatus.SENT_TO_LEADER; // Sent to leader for approval
      } else if (userRole === 'LEADER') {
        // Leader must be the leader of this apartment
        if (apartment.leaderId !== userId) {
          throw new ForbiddenException(
            'You are not authorized to post jobs for this apartment',
          );
        }

        apartmentId = apartment.id;
        leaderId = userId;
        initialStatus = JobStatus.OPEN; // Directly open when leader posts community job
      } else {
        throw new ForbiddenException('Invalid role for creating community service job');
      }
    } else {
      throw new BadRequestException('Invalid job type');
    }

    // Translate fields BEFORE starting the transaction
    const [
      titleTranslations,
      descriptionTranslations,
      chargesTranslations,
      workDurationTranslations,
      timeSlotTranslations,
      locationTranslations,
      experienceLevelTranslations,
    ] = await Promise.all([
      this.translationService.createTranslationObject(createJobDto.title),
      this.translationService.createTranslationObject(createJobDto.description),
      this.translationService.createTranslationObject(createJobDto.charges),
      this.translationService.createTranslationObject(createJobDto.workDuration),
      this.translationService.createTranslationObject(createJobDto.timeSlot),
      this.translationService.createTranslationObject(createJobDto.location),
      createJobDto.experienceLevel
        ? this.translationService.createTranslationObject(createJobDto.experienceLevel)
        : { en: '', ar: '' },
    ]);

    // Now start the transaction for DB operations only
    const job = await this.prisma.$transaction(async (prisma) => {
      // Create the job
      const createdJob = await prisma.job.create({
        data: {
          title: titleTranslations,
          description: descriptionTranslations,
          charges: chargesTranslations,
          workDuration: workDurationTranslations,
          startDate: new Date(createJobDto.startDate),
          endDate: new Date(createJobDto.endDate),
          timeSlot: timeSlotTranslations,
          location: locationTranslations,
          experienceLevel: createJobDto.experienceLevel ? experienceLevelTranslations : undefined,
          apartmentId: apartmentId,
          leaderId: leaderId,
          createdBy: userId,
          jobType: createJobDto.jobType,
          status: initialStatus,
        },
      });

      // Create job-service relationships
      await Promise.all(
        createJobDto.serviceIds.map(serviceId =>
          prisma.jobService.create({
            data: {
              jobId: createdJob.id,
              serviceId: serviceId,
            },
          })
        )
      );

      return createdJob;
    });

    // Return job with services included
    const jobWithServices = await this.prisma.job.findUnique({
      where: { id: job.id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
      },
    });

    const message =
      createJobDto.jobType === JobType.HOME_SERVICE
        ? 'Home service job created successfully and is now visible to service providers'
        : userRole === 'HOME_OWNER'
          ? 'Community service job request sent to leader for approval'
          : 'Community service job created successfully and is now visible to service providers';

    return {
      message,
      job: jobWithServices,
    };
  }

  async findAll() {
    return this.prisma.job.findMany({
      where: {
        // Only show jobs that are open for bidding or posted by leader
        status: {
          in: ['OPEN', 'POSTED_BY_LEADER'],
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        bids: {
          include: {
            serviceProvider: {
              select: {
                id: true,
                name: true,
                rating: true,
                totalJobs: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            address: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        bids: {
          include: {
            serviceProvider: {
              select: {
                id: true,
                name: true,
                rating: true,
                totalJobs: true,
                totalEarnings: true,
              },
            },
          },
          orderBy: {
            totalPrice: 'asc', // Show lowest bids first
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return job;
  }

  async findByApartment(apartmentId: string) {
    return this.prisma.job.findMany({
      where: { apartmentId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        bids: {
          include: {
            serviceProvider: {
              select: {
                id: true,
                name: true,
                rating: true,
                totalJobs: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByLeader(leaderId: string) {
    // Verify the user is a leader
    const leader = await this.prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!leader || leader.role !== 'LEADER') {
      throw new ForbiddenException('Only leaders can view their posted jobs');
    }

    return this.prisma.job.findMany({
      where: { leaderId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        bids: {
          include: {
            serviceProvider: {
              select: {
                id: true,
                name: true,
                rating: true,
                totalJobs: true,
                totalEarnings: true,
              },
            },
          },
          orderBy: {
            totalPrice: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByCreator(userId: string) {
    return this.prisma.job.findMany({
      where: { createdBy: userId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        bids: {
          include: {
            serviceProvider: {
              select: {
                id: true,
                name: true,
                rating: true,
                totalJobs: true,
                totalEarnings: true,
              },
            },
          },
          orderBy: {
            totalPrice: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPendingCommunityJobs(leaderId: string) {
    // Verify the user is a leader
    const leader = await this.prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!leader || leader.role !== 'LEADER') {
      throw new ForbiddenException('Only leaders can view pending community service jobs');
    }

    return this.prisma.job.findMany({
      where: {
        jobType: 'COMMUNITY_SERVICE',
        status: 'SENT_TO_LEADER',
        apartment: {
          leaderId: leaderId,
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        creator: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, updateJobDto: UpdateJobDto, leaderId: string) {
    // Verify the job exists and belongs to this leader
    const existingJob = await this.prisma.job.findFirst({
      where: {
        id,
        leaderId,
      },
    });

    if (!existingJob) {
      throw new NotFoundException('Job not found or you are not authorized to update it');
    }

    // Only allow updates if job is still open
    if (existingJob.status !== JobStatus.OPEN) {
      throw new BadRequestException('Cannot update job that is not in OPEN status');
    }

    // If serviceIds are being updated, verify all services exist
    if (updateJobDto.serviceIds && updateJobDto.serviceIds.length > 0) {
      const services = await this.prisma.service.findMany({
        where: {
          id: { in: updateJobDto.serviceIds },
        },
      });

      if (services.length !== updateJobDto.serviceIds.length) {
        throw new NotFoundException('One or more services not found');
      }
    }

    // Update the job with transaction to handle service updates
    const updatedJob = await this.prisma.$transaction(async (prisma) => {
      // Update job fields
      const job = await prisma.job.update({
        where: { id },
        data: {
          title: updateJobDto.title,
          description: updateJobDto.description,
          charges: updateJobDto.charges,
          workDuration: updateJobDto.workDuration,
          startDate: updateJobDto.startDate ? new Date(updateJobDto.startDate) : undefined,
          endDate: updateJobDto.endDate ? new Date(updateJobDto.endDate) : undefined,
          timeSlot: updateJobDto.timeSlot,
          location: updateJobDto.location,
          experienceLevel: updateJobDto.experienceLevel,
        },
      });

      // If serviceIds are provided, update the services
      if (updateJobDto.serviceIds) {
        // Remove existing services
        await prisma.jobService.deleteMany({
          where: { jobId: id },
        });

        // Add new services
        await Promise.all(
          updateJobDto.serviceIds.map(serviceId =>
            prisma.jobService.create({
              data: {
                jobId: id,
                serviceId: serviceId,
              },
            })
          )
        );
      }

      return job;
    });

    // Return updated job with services included
    const jobWithServices = await this.prisma.job.findUnique({
      where: { id },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
      },
    });

    return {
      message: 'Job updated successfully',
      job: jobWithServices,
    };
  }

  async remove(id: string, leaderId: string) {
    // Verify the job exists and belongs to this leader
    const existingJob = await this.prisma.job.findFirst({
      where: {
        id,
        leaderId,
      },
    });

    if (!existingJob) {
      throw new NotFoundException('Job not found or you are not authorized to delete it');
    }

    // Only allow deletion if job is still open
    if (existingJob.status !== JobStatus.OPEN) {
      throw new BadRequestException('Cannot delete job that is not in OPEN status');
    }

    // Delete the job with transaction to handle related records
    await this.prisma.$transaction(async (prisma) => {
      // First delete all related JobService records
      await prisma.jobService.deleteMany({
        where: { jobId: id },
      });

      // Then delete all related bids
      await prisma.bid.deleteMany({
        where: { jobId: id },
      });

      // Finally delete the job
      await prisma.job.delete({
        where: { id },
      });
    });

    return {
      message: 'Job deleted successfully',
    };
  }

  async updateStatus(id: string, status: JobStatus, leaderId: string) {
    // Verify the job exists and belongs to this leader
    const existingJob = await this.prisma.job.findFirst({
      where: {
        id,
        leaderId,
      },
    });

    if (!existingJob) {
      throw new NotFoundException('Job not found or you are not authorized to update it');
    }

    const updatedJob = await this.prisma.job.update({
      where: { id },
      data: { status },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
      },
    });

    return {
      message: 'Job status updated successfully',
      job: updatedJob,
    };
  }

  async approveCommunityJob(jobId: string, leaderId: string) {
    // Verify the user is a leader
    const leader = await this.prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!leader || leader.role !== 'LEADER') {
      throw new ForbiddenException('Only leaders can approve community service jobs');
    }

    // Verify the job exists and is a community service job
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        apartment: {
          include: { leader: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.jobType !== 'COMMUNITY_SERVICE') {
      throw new BadRequestException('Only community service jobs can be approved');
    }

    if (job.status !== 'SENT_TO_LEADER') {
      throw new BadRequestException('Job is not in SENT_TO_LEADER status');
    }

    // Verify the leader is authorized to approve this job
    if (job.apartment.leaderId !== leaderId) {
      throw new ForbiddenException('You are not authorized to approve jobs for this apartment');
    }

    // Update job status to POSTED_BY_LEADER
    const updatedJob = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'POSTED_BY_LEADER',
        leaderId: leaderId, // Ensure leader is set
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
      },
    });

    return {
      message: 'Community service job approved and posted successfully',
      job: updatedJob,
    };
  }

  async rejectCommunityJob(jobId: string, leaderId: string, reason?: string) {
    // Verify the user is a leader
    const leader = await this.prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!leader || leader.role !== 'LEADER') {
      throw new ForbiddenException('Only leaders can reject community service jobs');
    }

    // Verify the job exists and is a community service job
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        apartment: {
          include: { leader: true },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.jobType !== 'COMMUNITY_SERVICE') {
      throw new BadRequestException('Only community service jobs can be rejected');
    }

    if (job.status !== 'SENT_TO_LEADER') {
      throw new BadRequestException('Job is not in SENT_TO_LEADER status');
    }

    // Verify the leader is authorized to reject this job
    if (job.apartment.leaderId !== leaderId) {
      throw new ForbiddenException('You are not authorized to reject jobs for this apartment');
    }

    // Update job status to CANCELLED
    const updatedJob = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: {
          select: {
            id: true,
            name: true,
            hoaNumber: true,
            city: true,
          },
        },
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        creator: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
      },
    });

    return {
      message: 'Community service job rejected successfully',
      job: updatedJob,
    };
  }
}
