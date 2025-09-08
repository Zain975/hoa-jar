import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { AddHouseDto } from './dto/add-house.dto';
import { TranslationService } from '../common/services/translation.service';

@Injectable()
export class ApartmentService {
  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {}

  async create(createApartmentDto: CreateApartmentDto, leaderId: string) {
    // Verify the user is a leader
    const leader = await this.prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!leader || leader.role !== 'LEADER') {
      throw new ForbiddenException('Only leaders can create apartments');
    }

    // Check if HOA number already exists
    const existingApartment = await this.prisma.apartment.findUnique({
      where: { hoaNumber: createApartmentDto.hoaNumber },
    });

    if (existingApartment) {
      if (existingApartment.leaderId) {
        throw new ConflictException(
          'HOA number already exists and has a leader',
        );
      } else {
        // Update existing apartment to assign this leader
        const updatedApartment = await this.prisma.apartment.update({
          where: { hoaNumber: createApartmentDto.hoaNumber },
          data: {
            leaderId: leaderId,
            name: createApartmentDto.name,
            address: createApartmentDto.address,
            city: createApartmentDto.city,
            state: createApartmentDto.state,
            country: createApartmentDto.country || 'Saudi Arabia',
          },
          include: {
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
          message: 'Apartment updated and leader assigned successfully',
          apartment: updatedApartment,
        };
      }
    }

    // Translate apartment details
    const [
      nameTranslations,
      addressTranslations,
      cityTranslations,
      stateTranslations,
      countryTranslations,
    ] = await Promise.all([
      this.translationService.createTranslationObject(createApartmentDto.name),
      this.translationService.createTranslationObject(
        createApartmentDto.address,
      ),
      this.translationService.createTranslationObject(createApartmentDto.city),
      createApartmentDto.state
        ? this.translationService.createTranslationObject(
            createApartmentDto.state,
          )
        : { en: '', ar: '' },
      this.translationService.createTranslationObject(
        createApartmentDto.country || 'Saudi Arabia',
      ),
    ]);

    // Create new apartment
    const apartment = await this.prisma.apartment.create({
      data: {
        name: nameTranslations,
        hoaNumber: createApartmentDto.hoaNumber,
        address: addressTranslations,
        city: cityTranslations,
        state: createApartmentDto.state ? stateTranslations : undefined,
        country: countryTranslations,
        leaderId: leaderId,
      },
      include: {
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
      message: 'Apartment created successfully',
      apartment,
    };
  }

  async findAll() {
    return this.prisma.apartment.findMany({
      include: {
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        houses: {
          include: {
            owner: {
              select: {
                id: true,
                nationalId: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            houses: true,
            jobs: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        leader: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
        houses: {
          include: {
            owner: {
              select: {
                id: true,
                nationalId: true,
                role: true,
              },
            },
          },
        },
        jobs: {
          include: {
            services: {
              include: {
                service: true,
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
        },
        _count: {
          select: {
            houses: true,
            jobs: true,
          },
        },
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    return apartment;
  }

  async findByLeader(leaderId: string) {
    // Verify the user is a leader
    const leader = await this.prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!leader || leader.role !== 'LEADER') {
      throw new ForbiddenException('Only leaders can view their apartments');
    }

    return this.prisma.apartment.findMany({
      where: { leaderId },
      include: {
        houses: {
          include: {
            owner: {
              select: {
                id: true,
                nationalId: true,
                role: true,
              },
            },
          },
        },
        jobs: {
          include: {
            services: {
              include: {
                service: true,
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
        },
        _count: {
          select: {
            houses: true,
            jobs: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    updateApartmentDto: CreateApartmentDto,
    leaderId: string,
  ) {
    // Verify the apartment exists and belongs to this leader
    const existingApartment = await this.prisma.apartment.findFirst({
      where: {
        id,
        leaderId,
      },
    });

    if (!existingApartment) {
      throw new NotFoundException(
        'Apartment not found or you are not authorized to update it',
      );
    }

    const updatedApartment = await this.prisma.apartment.update({
      where: { id },
      data: updateApartmentDto,
      include: {
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
      message: 'Apartment updated successfully',
      apartment: updatedApartment,
    };
  }

  async remove(id: string, leaderId: string) {
    // Verify the apartment exists and belongs to this leader
    const existingApartment = await this.prisma.apartment.findFirst({
      where: {
        id,
        leaderId,
      },
    });

    if (!existingApartment) {
      throw new NotFoundException(
        'Apartment not found or you are not authorized to delete it',
      );
    }

    // Check if apartment has houses or jobs
    const apartmentWithRelations = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            houses: true,
            jobs: true,
          },
        },
      },
    });

    if (!apartmentWithRelations) {
      throw new NotFoundException('Apartment not found');
    }

    if (apartmentWithRelations._count.houses > 0) {
      throw new BadRequestException(
        'Cannot delete apartment that has houses. Please remove all houses first.',
      );
    }

    if (apartmentWithRelations._count.jobs > 0) {
      throw new BadRequestException(
        'Cannot delete apartment that has jobs. Please remove all jobs first.',
      );
    }

    await this.prisma.apartment.delete({
      where: { id },
    });

    return {
      message: 'Apartment deleted successfully',
    };
  }

  async addHouse(
    apartmentId: string,
    houseData: AddHouseDto,
    leaderId: string,
  ) {
    // Verify the apartment exists and belongs to this leader
    const apartment = await this.prisma.apartment.findFirst({
      where: {
        id: apartmentId,
        leaderId,
      },
    });

    if (!apartment) {
      throw new NotFoundException(
        'Apartment not found or you are not authorized to add houses to it',
      );
    }

    // Verify the house owner exists and is a home owner
    const houseOwner = await this.prisma.user.findUnique({
      where: { id: houseData.ownerId },
    });

    if (!houseOwner || houseOwner.role !== 'HOME_OWNER') {
      throw new BadRequestException('House owner must be a HOME_OWNER');
    }

    // Create the house
    const house = await this.prisma.house.create({
      data: {
        houseNumber: houseData.houseNumber,
        apartmentId: apartmentId,
        ownerId: houseData.ownerId,
      },
      include: {
        apartment: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        owner: {
          select: {
            id: true,
            nationalId: true,
            role: true,
          },
        },
      },
    });

    return {
      message: 'House added successfully',
      house,
    };
  }

  async removeHouse(houseId: string, leaderId: string) {
    // Verify the house exists and belongs to an apartment managed by this leader
    const house = await this.prisma.house.findFirst({
      where: {
        id: houseId,
        apartment: {
          leaderId: leaderId,
        },
      },
      include: {
        apartment: true,
      },
    });

    if (!house) {
      throw new NotFoundException(
        'House not found or you are not authorized to remove it',
      );
    }

    await this.prisma.house.delete({
      where: { id: houseId },
    });

    return {
      message: 'House removed successfully',
    };
  }

  // Create apartment without leader (for home owners who sign up first)
  async createWithoutLeader(hoaNumber: string) {
    // Use translation service to translate default values
    const nameTranslations =
      await this.translationService.createTranslationObject(`HOA ${hoaNumber}`);
    const addressTranslations =
      await this.translationService.createTranslationObject(
        'Address to be updated by leader',
      );
    const cityTranslations =
      await this.translationService.createTranslationObject(
        'City to be updated by leader',
      );
    const countryTranslations =
      await this.translationService.createTranslationObject('Saudi Arabia');

    return this.prisma.apartment.create({
      data: {
        hoaNumber,
        name: nameTranslations,
        address: addressTranslations,
        city: cityTranslations,
        country: countryTranslations,
      },
    });
  }

  // Assign leader to existing apartment
  async assignLeader(hoaNumber: string, leaderId: string) {
    // Verify the user is a leader
    const leader = await this.prisma.user.findUnique({
      where: { id: leaderId },
    });

    if (!leader || leader.role !== 'LEADER') {
      throw new ForbiddenException(
        'Only leaders can be assigned to apartments',
      );
    }

    // Check if apartment exists
    const apartment = await this.prisma.apartment.findUnique({
      where: { hoaNumber },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    if (apartment.leaderId) {
      throw new ConflictException('Apartment already has a leader');
    }

    // Assign leader to apartment
    const updatedApartment = await this.prisma.apartment.update({
      where: { hoaNumber },
      data: { leaderId },
      include: {
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
      message: 'Leader assigned to apartment successfully',
      apartment: updatedApartment,
    };
  }
}
