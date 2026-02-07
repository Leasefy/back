import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { WishlistsService } from './wishlists.service.js';
import { AddWishlistItemDto } from './dto/index.js';

/**
 * Controller for tenant wishlist/favorites management.
 * All endpoints require TENANT role.
 *
 * Requirements: WISH-01 through WISH-04
 */
@ApiTags('wishlists')
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  /**
   * POST /wishlists/items
   * Add a property to the tenant's wishlist.
   * Idempotent: adding same property twice returns existing item without error.
   *
   * WISH-01: Tenant can add a property to favorites
   * WISH-04: Duplicate add is idempotent
   */
  @Post('items')
  @ApiBearerAuth()
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Add property to wishlist' })
  @ApiCreatedResponse({ description: 'Property added to wishlist (or already exists)' })
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistsService.addItem(userId, dto.propertyId);
  }

  /**
   * DELETE /wishlists/items/:propertyId
   * Remove a property from the tenant's wishlist.
   * Idempotent: removing non-existent item returns 204 without error.
   *
   * WISH-02: Tenant can remove a property from favorites
   */
  @Delete('items/:propertyId')
  @ApiBearerAuth()
  @Roles(Role.TENANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove property from wishlist' })
  @ApiNoContentResponse({ description: 'Property removed from wishlist' })
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<void> {
    return this.wishlistsService.removeItem(userId, propertyId);
  }

  /**
   * GET /wishlists
   * Get all wishlist items with full property data.
   * Returns most recently added first.
   *
   * WISH-03: Tenant can list all favorite properties with full property data
   * WISH-05: Favorites persist across devices (server-side)
   */
  @Get()
  @ApiBearerAuth()
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get all wishlist items with property data' })
  @ApiOkResponse({ description: 'List of wishlist items with property details' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.wishlistsService.findAll(userId);
  }
}
