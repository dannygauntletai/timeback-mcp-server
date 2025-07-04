import axios from 'axios';
import { config } from '../config/index.js';
import { AuthToken } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class AuthService {
  private token: AuthToken | null = null;

  async getAccessToken(): Promise<string> {
    if (this.token && this.token.expires_at > Date.now()) {
      return this.token.access_token;
    }

    if (!config.auth.clientId || !config.auth.clientSecret) {
      throw new Error('OAuth2 credentials not configured. Please set CLIENT_ID and CLIENT_SECRET environment variables.');
    }

    try {
      logger.info('Requesting new access token');
      
      const response = await axios.post(config.auth.tokenUrl, 
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.auth.clientId,
          client_secret: config.auth.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.token = {
        access_token: response.data.access_token,
        token_type: response.data.token_type,
        expires_in: response.data.expires_in,
        expires_at: Date.now() + (response.data.expires_in * 1000) - 60000, // 1 minute buffer
      };

      logger.info('Successfully obtained access token');
      return this.token.access_token;
    } catch (error) {
      logger.error('Failed to obtain access token:', error);
      throw new Error('Authentication failed. Please check your credentials.');
    }
  }

  async makeAuthenticatedRequest(url: string, options: any = {}): Promise<any> {
    const token = await this.getAccessToken();
    
    return axios({
      ...options,
      url,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  isAuthenticated(): boolean {
    return this.token !== null && this.token.expires_at > Date.now();
  }

  clearToken(): void {
    this.token = null;
  }
}
