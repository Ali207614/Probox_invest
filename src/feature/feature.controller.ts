import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FeatureService } from './feature.service';
import { JwtUserAuthGuard } from '../common/guards/jwt-user.guard';

interface FeaturesMap {
  [key: string]: boolean;
}

@ApiTags('Features')
@Controller('features')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all feature flags',
    description:
      'Retrieves a map of all feature flags and their current activation status. Results are cached for 5 minutes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flags retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: { type: 'boolean' },
      example: {
        dark_mode: true,
        new_dashboard: false,
        beta_features: true,
        maintenance_mode: false,
      },
    },
  })
  async getAll(): Promise<FeaturesMap> {
    return this.featureService.getAllFeatures();
  }

  @Get(':key')
  @ApiOperation({
    summary: 'Get feature flag by key',
    description: 'Retrieves the activation status of a specific feature flag by its unique key.',
  })
  @ApiParam({
    name: 'key',
    description: 'Unique identifier of the feature flag',
    example: 'dark_mode',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string', example: 'dark_mode' },
        is_active: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Feature not found',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '❌ Feature not found.' },
        location: { type: 'string', example: 'feature_missing' },
      },
    },
  })
  async checkFeature(@Param('key') key: string): Promise<{ key: string; is_active: boolean }> {
    const isActive: boolean = await this.featureService.isFeatureActive(key);
    return { key, is_active: isActive };
  }

  @Patch(':key')
  @UseGuards(JwtUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update feature flag status',
    description:
      'Updates the activation status of a specific feature flag. Requires authentication. Invalidates the feature cache after update.',
  })
  @ApiParam({
    name: 'key',
    description: 'Unique identifier of the feature flag to update',
    example: 'dark_mode',
    type: 'string',
  })
  @ApiBody({
    description: 'Feature flag update payload',
    schema: {
      type: 'object',
      properties: {
        is_active: {
          type: 'boolean',
          description: 'New activation status for the feature flag',
          example: true,
        },
      },
      required: ['is_active'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '✅ Feature updated successfully.' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({
    status: 404,
    description: 'Feature not found',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '❌ Feature not found.' },
        location: { type: 'string', example: 'feature_missing' },
      },
    },
  })
  async update(
    @Param('key') key: string,
    @Body() body: { is_active: boolean },
  ): Promise<{ message: string }> {
    return this.featureService.updateFeature(key, body.is_active);
  }
}
