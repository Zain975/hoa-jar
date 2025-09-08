import { Injectable, Logger } from '@nestjs/common';
import { Translate } from '@google-cloud/translate/build/src/v2';

export interface TranslationResult {
  en: string;
  ar: string;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private translateClient: Translate;

  constructor() {
    // Initialize Google Translate client
    this.translateClient = new Translate({
      key: process.env.GOOGLE_TRANSLATE_API_KEY,
    });
  }

  /**
   * Detect the language of the input text
   */
  async detectLanguage(text: string): Promise<'en' | 'ar'> {
    try {
      const [detection] = await this.translateClient.detect(text);
      const lang = detection.language;

      // Default to English if detection fails or language is not supported
      if (lang === 'ar' || lang === 'arabic') {
        return 'ar';
      }

      return 'en';
    } catch (error) {
      this.logger.warn(
        `Language detection failed for text: ${text.substring(0, 50)}...`,
        error.message,
      );
      this.logger.warn('Full error:', error); // Add this line
      return 'en'; // Default to English
    }
  }

  /**
   * Translate text from source language to target language
   */
  async translateText(
    text: string,
    targetLanguage: 'en' | 'ar',
    sourceLanguage?: 'en' | 'ar',
  ): Promise<string> {
    try {
      // If source language is not provided, detect it
      if (!sourceLanguage) {
        sourceLanguage = await this.detectLanguage(text);
      }

      // If source and target are the same, return original text
      if (sourceLanguage === targetLanguage) {
        return text;
      }

      const [translation] = await this.translateClient.translate(text, {
        from: sourceLanguage,
        to: targetLanguage,
      });

      return translation || text;
    } catch (error) {
      this.logger.error(
        `Translation failed for text: ${text.substring(0, 50)}...`,
        error.message,
      );
      return text; // Fallback to original text
    }
  }

  /**
   * Get translations for both English and Arabic
   */
  async getTranslations(
    text: string,
    specifiedLanguage?: 'en' | 'ar',
  ): Promise<TranslationResult> {
    try {
      const detectedLanguage =
        specifiedLanguage || (await this.detectLanguage(text));

      if (detectedLanguage === 'en') {
        return {
          en: text,
          ar: await this.translateText(text, 'ar', 'en'),
        };
      } else {
        return {
          en: await this.translateText(text, 'en', 'ar'),
          ar: text,
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to get translations for text: ${text.substring(0, 50)}...`,
        error.message,
      );
      // Fallback: return original text for both languages
      return {
        en: text,
        ar: text,
      };
    }
  }

  /**
   * Batch translate multiple texts
   */
  async batchTranslate(texts: string[]): Promise<TranslationResult[]> {
    // Process texts in parallel for better performance
    const translationPromises = texts.map((text) => this.getTranslations(text));

    try {
      const translations = await Promise.all(translationPromises);
      return translations;
    } catch (error) {
      this.logger.error('Batch translation failed', error.message);
      // Fallback: return original texts for both languages
      return texts.map((text) => ({ en: text, ar: text }));
    }
  }

  /**
   * Create a JSONB object with translations for a single field
   */
  async createTranslationObject(
    text: string,
    specifiedLanguage?: 'en' | 'ar',
  ): Promise<{ en: string; ar: string }> {
    return await this.getTranslations(text, specifiedLanguage);
  }

  /**
   * Translate object properties that need translation and return JSONB format
   */
  async translateObjectToJsonB<T extends Record<string, any>>(
    obj: T,
    translatableFields: (keyof T)[],
    specifiedLanguage?: 'en' | 'ar',
  ): Promise<T & { [K in keyof T]: { en: string; ar: string } }> {
    const result = { ...obj } as any;

    for (const field of translatableFields) {
      const value = obj[field];
      if (typeof value === 'string' && value.trim()) {
        const translations = await this.getTranslations(
          value,
          specifiedLanguage,
        );
        result[field] = translations;
      } else {
        result[field] = { en: value || '', ar: value || '' };
      }
    }

    return result;
  }
}