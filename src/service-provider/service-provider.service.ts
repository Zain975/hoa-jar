import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/common/services/s3.service';
import { JwtService } from '@nestjs/jwt';
import { TranslationService } from 'src/common/services/translation.service';
import {
  ServiceProviderSignupDto,
  ServiceProviderStep1Dto,
  ServiceProviderStep2Dto,
  ServiceProviderStep3Dto,
  ServiceProviderStep4Dto,
  ServiceProviderStep5Dto,
  ServiceProviderStep6Dto,
  ServiceProviderLoginDto,
} from 'src/service-provider/dto/service-provider.dto';

@Injectable()
export class ServiceProviderService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private jwtService: JwtService,
    private translationService: TranslationService,
  ) {}

  // Initial signup
  async signup(dto: ServiceProviderSignupDto) {
    // Check if email already exists
    const existingServiceProvider =
      await this.prisma.serviceProvider.findUnique({
        where: { email: dto.email },
      });

    if (existingServiceProvider) {
      throw new ConflictException(
        'Service provider with this email already exists',
      );
    }

    // Translate service provider name
    const nameTranslations = await this.translationService.createTranslationObject(dto.name);

    // Create service provider directly (no user record needed)
    const serviceProvider = await this.prisma.serviceProvider.create({
      data: {
        name: nameTranslations,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        signupStep: 1,
      },
    });

    return {
      message:
        'Service provider registered successfully. Please proceed to step 1 to upload government document.',
      serviceProvider,
      nextStep: 'step1',
    };
  }

  // Step 1: Upload government document
  async step1(dto: ServiceProviderStep1Dto, document: Express.Multer.File) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: dto.serviceProviderId },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    // Upload document to S3
    const s3Key = this.s3Service.generateS3Key(
      'service-provider-documents',
      serviceProvider.id,
      document.originalname,
    );
    const s3Url = await this.s3Service.uploadFileBuffer(document, s3Key);

    // Update service provider
    await this.prisma.serviceProvider.update({
      where: { id: dto.serviceProviderId },
      data: {
        governmentDocumentUrl: s3Url,
        signupStep: Math.max(serviceProvider.signupStep, 2), // Update step if higher
      },
    });

    return {
      message:
        'Government document uploaded successfully. Please proceed to step 2 to select services.',
      nextStep: 'step2',
    };
  }

  // Step 2: Select services
  async step2(dto: ServiceProviderStep2Dto) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: dto.serviceProviderId },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    // Validate services exist
    const services = await this.prisma.service.findMany({
      where: { id: { in: dto.serviceIds } },
    });

    if (services.length !== dto.serviceIds.length) {
      throw new BadRequestException('Some services do not exist');
    }

    // Clear existing services first, then create new ones
    await this.prisma.serviceProviderService.deleteMany({
      where: { serviceProviderId: dto.serviceProviderId },
    });

    // Create service provider services
    await this.prisma.serviceProviderService.createMany({
      data: dto.serviceIds.map((serviceId) => ({
        serviceProviderId: dto.serviceProviderId,
        serviceId,
      })),
    });

    // Update signup step
    await this.prisma.serviceProvider.update({
      where: { id: dto.serviceProviderId },
      data: { signupStep: Math.max(serviceProvider.signupStep, 3) },
    });

    return {
      message:
        'Services selected successfully. Please proceed to step 3 to set service rates.',
      nextStep: 'step3',
    };
  }

  // Step 3: Set service rates
  async step3(dto: ServiceProviderStep3Dto) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: dto.serviceProviderId },
      include: { services: true },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    // Validate that rates are provided for all selected services
    const selectedServiceIds = serviceProvider.services.map((s) => s.serviceId);
    const rateServiceIds = dto.serviceRates.map((r) => r.serviceId);

    const missingServices = selectedServiceIds.filter(
      (id) => !rateServiceIds.includes(id),
    );
    if (missingServices.length > 0) {
      throw new BadRequestException(
        `Rates are required for all selected services`,
      );
    }

    // Clear existing rates first, then create new ones
    await this.prisma.serviceRate.deleteMany({
      where: { serviceProviderId: dto.serviceProviderId },
    });

    // Create service rates
    for (const rate of dto.serviceRates) {
      await this.prisma.serviceRate.upsert({
        where: {
          serviceProviderId_serviceId: {
            serviceProviderId: dto.serviceProviderId,
            serviceId: rate.serviceId,
          },
        },
        update: {
          rate: rate.rate,
          description: rate.description,
        },
        create: {
          serviceProviderId: dto.serviceProviderId,
          serviceId: rate.serviceId,
          rate: rate.rate,
          description: rate.description,
        },
      });
    }

    // Update signup step
    await this.prisma.serviceProvider.update({
      where: { id: dto.serviceProviderId },
      data: { signupStep: Math.max(serviceProvider.signupStep, 4) },
    });

    return {
      message:
        'Service rates set successfully. Please proceed to step 4 to add locations.',
      nextStep: 'step4',
    };
  }

  // Step 4: Add locations
  async step4(dto: ServiceProviderStep4Dto) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: dto.serviceProviderId },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    // Clear existing locations first, then create new ones
    await this.prisma.serviceProviderLocation.deleteMany({
      where: { serviceProviderId: dto.serviceProviderId },
    });

    // Create locations
    await this.prisma.serviceProviderLocation.createMany({
      data: dto.locations.map((location) => ({
        serviceProviderId: dto.serviceProviderId,
        city: location.city,
        state: location.state,
        country: location.country || 'Saudi Arabia',
      })),
    });

    // Update signup step
    await this.prisma.serviceProvider.update({
      where: { id: dto.serviceProviderId },
      data: { signupStep: Math.max(serviceProvider.signupStep, 5) },
    });

    return {
      message:
        'Locations added successfully. Please proceed to step 5 to add bio and profile picture.',
      nextStep: 'step5',
    };
  }

  // Step 5: Add bio and profile picture
  async step5(
    dto: ServiceProviderStep5Dto,
    profilePicture?: Express.Multer.File,
  ) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: dto.serviceProviderId },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    let profilePictureUrl = serviceProvider.profilePictureUrl;

    // Upload profile picture if provided
    if (profilePicture) {
      const s3Key = this.s3Service.generateS3Key(
        'service-provider-profile-pictures',
        serviceProvider.id,
        profilePicture.originalname,
      );
      profilePictureUrl = await this.s3Service.uploadFileBuffer(
        profilePicture,
        s3Key,
      );
    }

    // Translate bio
    const bioTranslations = await this.translationService.createTranslationObject(dto.bio);

    // Update service provider
    await this.prisma.serviceProvider.update({
      where: { id: dto.serviceProviderId },
      data: {
        bio: bioTranslations,
        profilePictureUrl,
        signupStep: Math.max(serviceProvider.signupStep, 6),
      },
    });

    return {
      message:
        'Bio and profile picture added successfully. Please proceed to step 6 to add bank details.',
      nextStep: 'step6',
    };
  }

  // Step 6: Add bank details
  async step6(
    dto: ServiceProviderStep6Dto,
    bankDocument?: Express.Multer.File,
  ) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: dto.serviceProviderId },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    let bankDocumentUrl = serviceProvider.bankDocumentUrl;

    // Upload bank document if provided
    if (bankDocument) {
      const s3Key = this.s3Service.generateS3Key(
        'service-provider-bank-documents',
        serviceProvider.id,
        bankDocument.originalname,
      );
      bankDocumentUrl = await this.s3Service.uploadFileBuffer(
        bankDocument,
        s3Key,
      );
    }

    // Translate firstName and lastName
    const [firstNameTranslations, lastNameTranslations] = await Promise.all([
      this.translationService.createTranslationObject(dto.firstName),
      this.translationService.createTranslationObject(dto.lastName),
    ]);

    // Update service provider and mark as active
    await this.prisma.serviceProvider.update({
      where: { id: dto.serviceProviderId },
      data: {
        firstName: firstNameTranslations,
        lastName: lastNameTranslations,
        bankAccountNumber: dto.bankAccountNumber,
        bankDocumentUrl,
        signupStep: Math.max(serviceProvider.signupStep, 7),
        isActive: true,
      },
    });

    return {
      message: 'Bank details added successfully. Your account is now active!',
      signupComplete: true,
    };
  }

  // Login
  async login(dto: ServiceProviderLoginDto) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { email: dto.email },
    });

    if (!serviceProvider) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!serviceProvider.isActive) {
      throw new UnauthorizedException(
        'Account is not active. Please complete your registration.',
      );
    }

    // For service providers, we'll use a simple token generation since no password is stored
    // In a real implementation, you might want to add password field to ServiceProvider model
    const payload = {
      id: serviceProvider.id,
      serviceProviderId: serviceProvider.id,
      email: serviceProvider.email,
      role: 'SERVICE_PROVIDER',
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      serviceProvider: {
        id: serviceProvider.id,
        name: serviceProvider.name,
        email: serviceProvider.email,
        phoneNumber: serviceProvider.phoneNumber,
        isActive: serviceProvider.isActive,
        isVerified: serviceProvider.isVerified,
      },
    };
  }

  // Get service provider profile
  async getProfile(serviceProviderId: string) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: serviceProviderId },
      include: {
        services: { include: { service: true } },
        serviceRates: { include: { service: true } },
        locations: true,
      },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    return serviceProvider;
  }

  // Get current step status and progress
  async getStepStatus(serviceProviderId: string) {
    const serviceProvider = await this.prisma.serviceProvider.findUnique({
      where: { id: serviceProviderId },
      include: {
        services: { include: { service: true } },
        serviceRates: { include: { service: true } },
        locations: true,
      },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }

    const steps = [
      {
        step: 1,
        name: 'Government Document',
        completed: !!serviceProvider.governmentDocumentUrl,
      },
      {
        step: 2,
        name: 'Services Selection',
        completed: serviceProvider.services.length > 0,
      },
      {
        step: 3,
        name: 'Service Rates',
        completed: serviceProvider.serviceRates.length > 0,
      },
      {
        step: 4,
        name: 'Locations',
        completed: serviceProvider.locations.length > 0,
      },
      {
        step: 5,
        name: 'Bio & Profile Picture',
        completed: !!serviceProvider.bio,
      },
      {
        step: 6,
        name: 'Bank Details',
        completed: !!serviceProvider.bankAccountNumber,
      },
    ];

    const completedSteps = steps.filter((s) => s.completed).length;
    const totalSteps = steps.length;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    return {
      currentStep: serviceProvider.signupStep,
      progress,
      completedSteps,
      totalSteps,
      steps,
      isActive: serviceProvider.isActive,
      isVerified: serviceProvider.isVerified,
    };
  }
}
