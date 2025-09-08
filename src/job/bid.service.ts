import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { CreateBidDto } from './dto/create-bid.dto';
import { BidStatus } from '@prisma/client';
import { TranslationService } from '../common/services/translation.service';

@Injectable()
export class BidService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private translationService: TranslationService,
  ) {}

  async create(createBidDto: CreateBidDto, serviceProviderId: string, document?: Express.Multer.File) {
    // Validate and convert totalPrice to number
    const totalPrice = parseFloat(createBidDto.totalPrice);
    if (isNaN(totalPrice) || totalPrice <= 0) {
      throw new BadRequestException('Total price must be a valid positive number');
    }

    // Verify the service provider exists and is active
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: serviceProviderId },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    if (!serviceProvider.isActive) {
      throw new ForbiddenException('Service provider account is not active');
    }

    // Verify the job exists and is open
    const job = await this.prisma.job.findUnique({
      where: { id: createBidDto.jobId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        apartment: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.status !== 'OPEN') {
      throw new BadRequestException('Cannot bid on job that is not open');
    }

    // Check if service provider already has a bid on this job
    const existingBid = await this.prisma.bid.findUnique({
      where: {
        jobId_serviceProviderId: {
          jobId: createBidDto.jobId,
          serviceProviderId: serviceProviderId,
        },
      },
    });

    if (existingBid) {
      throw new ConflictException('You have already bid on this job');
    }

    // Verify the service provider offers the service required by the job
    const jobServices = await this.prisma.jobService.findMany({
      where: { jobId: createBidDto.jobId },
      include: { service: true },
    });

    if (jobServices.length === 0) {
      throw new BadRequestException('Job has no services defined');
    }

    // Check if service provider offers any of the required services
    const serviceProviderServices = await this.prisma.serviceProviderService.findMany({
      where: {
        serviceProviderId: serviceProviderId,
        serviceId: { in: jobServices.map(js => js.serviceId) },
      },
    });

    if (serviceProviderServices.length === 0) {
      throw new ForbiddenException('You do not offer any of the services required for this job');
    }

    let documentUrl: string | undefined;

    // Upload document to S3 if provided
    if (document) {
      const s3Key = this.s3Service.generateS3Key('bid-documents', serviceProviderId, document.originalname);
      documentUrl = await this.s3Service.uploadFileBuffer(document, s3Key);
    }

    // Create the bid
    // Translate cover letter
    const coverLetterTranslations = await this.translationService.createTranslationObject(createBidDto.coverLetter);

    const bid = await this.prisma.bid.create({
      data: {
        jobId: createBidDto.jobId,
        serviceProviderId: serviceProviderId,
        totalPrice: totalPrice,
        coverLetter: coverLetterTranslations,
        documentUrl: documentUrl,
        status: BidStatus.PENDING,
      },
      include: {
        job: {
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
                city: true,
              },
            },
          },
        },
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
    });

    return {
      message: 'Bid submitted successfully',
      bid,
    };
  }

  async findAll() {
    return this.prisma.bid.findMany({
      include: {
        job: {
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
                city: true,
              },
            },
          },
        },
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
        createdAt: 'desc',
      },
    });
  }

  async findByJob(jobId: string) {
    return this.prisma.bid.findMany({
      where: { jobId },
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
    });
  }

  async findByServiceProvider(serviceProviderId: string) {
    return this.prisma.bid.findMany({
      where: { serviceProviderId },
      include: {
        job: {
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
                city: true,
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
    const bid = await this.prisma.bid.findUnique({
      where: { id },
      include: {
        job: {
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
                city: true,
              },
            },
          },
        },
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
    });

    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    return bid;
  }

  async updateStatus(id: string, status: BidStatus, leaderId: string) {
    // Verify the bid exists
    const bid = await this.prisma.bid.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            leader: true,
          },
        },
      },
    });

    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    // Verify the user is the leader who posted the job
    if (bid.job.leaderId !== leaderId) {
      throw new ForbiddenException('Only the job poster can update bid status');
    }

    // Update the bid status
    const updatedBid = await this.prisma.bid.update({
      where: { id },
      data: { status },
      include: {
        job: {
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
                city: true,
              },
            },
          },
        },
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
    });

    // If bid is accepted, update job status to IN_PROGRESS
    if (status === BidStatus.ACCEPTED) {
      await this.prisma.job.update({
        where: { id: bid.jobId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return {
      message: 'Bid status updated successfully',
      bid: updatedBid,
    };
  }

  async remove(id: string, serviceProviderId: string) {
    // Verify the bid exists and belongs to this service provider
    const existingBid = await this.prisma.bid.findFirst({
      where: {
        id,
        serviceProviderId,
      },
    });

    if (!existingBid) {
      throw new NotFoundException('Bid not found or you are not authorized to delete it');
    }

    // Only allow deletion if bid is still pending
    if (existingBid.status !== BidStatus.PENDING) {
      throw new BadRequestException('Cannot delete bid that is not in PENDING status');
    }

    await this.prisma.bid.delete({
      where: { id },
    });

    return {
      message: 'Bid deleted successfully',
    };
  }
}
