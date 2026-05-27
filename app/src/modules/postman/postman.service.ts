import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface PostmanCollection {
  id: string;
  name: string;
  owner: string;
  uid: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostmanCollectionsResponse {
  collections: PostmanCollection[];
}

export interface PostmanCollectionDetailResponse {
  collection: any;
}

@Injectable()
export class PostmanService {
  private readonly logger = new Logger(PostmanService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('postman.apiKey', '');

    if (!this.apiKey) {
      this.logger.warn('POSTMAN_API_KEY is not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: 'https://api.getpostman.com',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Get all collections from Postman workspace
   */
  async getAllCollections(): Promise<PostmanCollection[]> {
    try {
      if (!this.apiKey) {
        throw new HttpException(
          'Postman API key is not configured',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const response =
        await this.axiosInstance.get<PostmanCollectionsResponse>(
          '/collections',
        );

      this.logger.log(
        `Retrieved ${response.data.collections.length} collections`,
      );
      return response.data.collections;
    } catch (error) {
      this.logger.error('Failed to fetch collections from Postman API', error);

      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.error?.message ||
            'Failed to fetch Postman collections',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Failed to fetch Postman collections',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get the latest collection (by updated date)
   */
  async getLatestCollection(): Promise<any> {
    try {
      const collections = await this.getAllCollections();

      if (!collections || collections.length === 0) {
        throw new HttpException(
          'No collections found in Postman workspace',
          HttpStatus.NOT_FOUND,
        );
      }

      // Sort by updatedAt date to get the latest
      const latestCollection = collections.sort((a, b) => {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })[0];

      this.logger.log(
        `Latest collection: ${latestCollection.name} (${latestCollection.uid})`,
      );

      // Fetch full collection details
      return await this.getCollectionById(latestCollection.uid);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Failed to get latest collection', error);
      throw new HttpException(
        'Failed to get latest collection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a specific collection by ID with full details
   */
  async getCollectionById(collectionId: string): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new HttpException(
          'Postman API key is not configured',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const response =
        await this.axiosInstance.get<PostmanCollectionDetailResponse>(
          `/collections/${collectionId}`,
        );

      this.logger.log(`Retrieved collection details for: ${collectionId}`);
      return response.data.collection;
    } catch (error) {
      this.logger.error(
        `Failed to fetch collection ${collectionId} from Postman API`,
        error,
      );

      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.error?.message ||
            'Failed to fetch Postman collection',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Failed to fetch Postman collection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
