import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { TranslationService } from '../common/services/translation.service';

@Injectable()
export class ServiceService {
  constructor(
    private prisma: PrismaService,
    private translationService: TranslationService,
  ) {}

  async seedServices() {
    const services = [
      {
        name: 'AC Services',
        description:
          'Air conditioning installation, repair, and maintenance services',
        image: null,
      },
      {
        name: 'Cleaning Services',
        description:
          'House cleaning, office cleaning, and specialized cleaning services',
        image: null,
      },
      {
        name: 'Electrician',
        description:
          'Electrical installation, repair, and maintenance services',
        image: null,
      },
      {
        name: 'Plumber',
        description: 'Plumbing installation, repair, and maintenance services',
        image: null,
      },
      {
        name: 'Painter',
        description: 'Interior and exterior painting services',
        image: null,
      },
      {
        name: 'Pest Control',
        description: 'Pest elimination and prevention services',
        image: null,
      },
    ];

    for (const service of services) {
      // Translate service name and description
      const [nameTranslations, descriptionTranslations] = await Promise.all([
        this.translationService.createTranslationObject(service.name),
        this.translationService.createTranslationObject(service.description),
      ]);

      // Check if service already exists by checking if any service has the same English name
      const existingService = await this.prisma.service.findFirst({
        where: {
          name: {
            path: ['en'],
            equals: service.name,
          },
        },
      });

      if (!existingService) {
        await this.prisma.service.create({
          data: {
            name: nameTranslations,
            description: descriptionTranslations,
            image: service.image,
          },
        });
      }
    }
    return { message: 'Services seeded successfully!' };
  }

  async getAvailableServices() {
    const services = await this.prisma.service.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        image: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return services;
  }

  findOne(id: string) {
    return this.prisma.service.findUnique({ where: { id } });
  }

  update(id: string, data: UpdateServiceDto) {
    return this.prisma.service.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.service.delete({ where: { id } });
  }
}
